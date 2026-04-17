"""Views for mentorship request and match API endpoints."""

from decimal import Decimal
from typing import Any, cast

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Avg, CharField, OuterRef, Subquery, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import AppUsageMode
from accounts.permissions import IsUser
from profiles.models import AvailabilitySlot, Profile
from profiles.services import (
    BookingCancelNotAllowedError,
    OwnSlotBookingError,
    SlotAlreadyBookedError,
    SlotInPastError,
    SlotNotBookedError,
    book_availability_slot,
    cancel_availability_booking,
)

from .models import Feedback, Match, MentorshipRequest
from .serializers import (
    FeedbackCreateSerializer,
    FeedbackSerializer,
    MatchSerializer,
    MentorshipRequestCreateSerializer,
    MentorshipRequestSerializer,
    RescheduleSessionSerializer,
    RespondToRequestSerializer,
    UpcomingMenteeSessionSerializer,
    UpcomingMentorSessionSerializer,
)

_NOT_FOUND = {"detail": "Not found."}
_PERMISSION_DENIED = {"detail": "You do not have permission to perform this action."}
_DUPLICATE_PENDING = {"detail": "You already have a pending request with this mentor."}
_NOT_PENDING = {"detail": "Only pending requests can be accepted or rejected."}
_MENTEE_REQUIRED = {"detail": "You need a MENTEE profile to send mentorship requests."}
_MENTOR_REQUIRED = {"detail": "You need a MENTOR profile to access this resource."}
_NO_PROFILE = {"detail": "Profile not found."}
_SLOT_BOOKING_FAILED = {"detail": "Selected slot could not be booked while accepting this request."}


class MyRequestsListAPIView(APIView):
    """List all mentorship requests where the caller is mentor or mentee."""

    permission_classes = [IsUser]

    @extend_schema(
        responses={
            200: MentorshipRequestSerializer(many=True),
            401: OpenApiResponse(description="Authentication required."),
        },
        description=(
            "List all mentorship requests where the authenticated user is either "
            "the mentor or the mentee. Ordered by most recent first."
        ),
        tags=["Mentorship"],
    )
    def get(self, request: Request) -> Response:
        """Return all requests involving the current user's profile."""
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)

        qs = (
            (
                MentorshipRequest.objects.filter(mentor=profile)
                | MentorshipRequest.objects.filter(mentee=profile)
            )
            .order_by("-created_at")
            .select_related("mentor", "mentee", "slot")
        )

        return Response(MentorshipRequestSerializer(qs, many=True).data, status=status.HTTP_200_OK)


class CreateRequestAPIView(APIView):
    """Send a mentorship request to a mentor."""

    permission_classes = [IsUser]

    @extend_schema(
        request=MentorshipRequestCreateSerializer,
        responses={
            201: MentorshipRequestSerializer,
            400: OpenApiResponse(description="Validation error or duplicate pending request."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Caller's profile does not support the mentee role."),
            404: OpenApiResponse(description="Caller's profile not found."),
        },
        description=(
            "Send a mentorship request to a mentor by their username. "
            "The caller must have a MENTEE profile. "
            "Only one pending request per mentor is allowed at a time."
        ),
        tags=["Mentorship"],
    )
    def post(self, request: Request) -> Response:
        """Create a mentorship request from the authenticated user to the given mentor."""
        try:
            mentee_profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response(_NO_PROFILE, status=status.HTTP_404_NOT_FOUND)

        if mentee_profile.user.app_usage_mode != AppUsageMode.MENTEE:
            return Response(_MENTEE_REQUIRED, status=status.HTTP_403_FORBIDDEN)

        serializer = MentorshipRequestCreateSerializer(
            data=request.data,
            context={"request": request, "mentee_profile": mentee_profile},
        )
        serializer.is_valid(raise_exception=True)

        try:
            mentorship_request = serializer.save()
        except IntegrityError:
            return Response(_DUPLICATE_PENDING, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            MentorshipRequestSerializer(mentorship_request).data,
            status=status.HTTP_201_CREATED,
        )


class RespondToRequestAPIView(APIView):
    """Accept or reject a pending mentorship request (mentor only)."""

    permission_classes = [IsUser]

    @extend_schema(
        request=RespondToRequestSerializer,
        responses={
            200: MentorshipRequestSerializer,
            400: OpenApiResponse(description="Request is not pending, or invalid action."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Caller is not the target mentor."),
            404: OpenApiResponse(description="Request not found."),
        },
        description=(
            "Accept or reject a pending mentorship request. "
            "Only the mentor targeted by the request can respond. "
            "Accepting automatically creates a Match record."
        ),
        tags=["Mentorship"],
    )
    def post(self, request: Request, request_id: str) -> Response:
        """Accept or reject the identified pending mentorship request."""
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response(_NO_PROFILE, status=status.HTTP_404_NOT_FOUND)

        try:
            mentorship_request = MentorshipRequest.objects.select_related(
                "mentor", "mentee", "slot"
            ).get(id=request_id)
        except MentorshipRequest.DoesNotExist:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

        if mentorship_request.mentor != profile:
            return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)

        if mentorship_request.status != MentorshipRequest.Status.PENDING:
            return Response(_NOT_PENDING, status=status.HTTP_400_BAD_REQUEST)

        serializer = RespondToRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = cast(dict[str, Any], serializer.validated_data)
        action = validated_data.get("action")

        new_status = (
            MentorshipRequest.Status.ACCEPTED
            if action == "accept"
            else MentorshipRequest.Status.REJECTED
        )

        with transaction.atomic():
            if new_status == MentorshipRequest.Status.ACCEPTED:
                selected_slot = mentorship_request.slot
                if selected_slot is None:
                    return Response(_SLOT_BOOKING_FAILED, status=status.HTTP_400_BAD_REQUEST)

                try:
                    book_availability_slot(
                        profile=mentorship_request.mentor,
                        slot_id=selected_slot.id,
                        actor=mentorship_request.mentee.user,
                    )
                except (SlotAlreadyBookedError, SlotInPastError):
                    return Response(_SLOT_BOOKING_FAILED, status=status.HTTP_400_BAD_REQUEST)
                except OwnSlotBookingError:
                    return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)
                except AvailabilitySlot.DoesNotExist:
                    return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

            mentorship_request.status = new_status
            mentorship_request.save()

        return Response(
            MentorshipRequestSerializer(mentorship_request).data,
            status=status.HTTP_200_OK,
        )


class MyMatchesListAPIView(APIView):
    """List all active matches where the caller is mentor or mentee."""

    permission_classes = [IsUser]

    @extend_schema(
        responses={
            200: MatchSerializer(many=True),
            401: OpenApiResponse(description="Authentication required."),
        },
        description=(
            "List all active mentorship matches where the authenticated user is "
            "either the mentor or the mentee."
        ),
        tags=["Mentorship"],
    )
    def get(self, request: Request) -> Response:
        """Return all active matches involving the current user's profile."""
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)

        qs = (
            (Match.objects.filter(mentor=profile) | Match.objects.filter(mentee=profile))
            .filter(is_active=True)
            .select_related("mentor", "mentee", "request")
        )

        return Response(MatchSerializer(qs, many=True).data, status=status.HTTP_200_OK)


class CancelSessionAPIView(APIView):
    """Cancel a booked session for an active match."""

    permission_classes = [IsUser]

    @extend_schema(
        request=None,
        responses={
            200: MentorshipRequestSerializer,
            400: OpenApiResponse(description="Session is not booked or already cancelled."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Only the mentor or mentee of this match can cancel."),
            404: OpenApiResponse(description="Match not found."),
        },
        description=(
            "Cancel the booked session for an active match. "
            "Both the mentor and the mentee can cancel. "
            "The slot is freed and the match's request slot reference is cleared."
        ),
        tags=["Mentorship"],
    )
    def post(self, request: Request, match_id: str) -> Response:
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response(_NO_PROFILE, status=status.HTTP_404_NOT_FOUND)

        try:
            match = Match.objects.select_related("mentor", "mentee", "request__slot").get(
                id=match_id, is_active=True
            )
        except Match.DoesNotExist:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

        if profile not in (match.mentor, match.mentee):
            return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)

        mentorship_request = match.request
        slot = mentorship_request.slot

        if slot is None or not slot.is_booked:
            return Response(
                {"detail": "This session has no active booking to cancel."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                cancel_availability_booking(
                    profile=match.mentor,
                    slot_id=slot.id,
                    actor=request.user,
                )
        except SlotNotBookedError:
            return Response(
                {"detail": "This session has no active booking to cancel."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except BookingCancelNotAllowedError:
            return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)
        except AvailabilitySlot.DoesNotExist:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

        mentorship_request.refresh_from_db()
        return Response(
            MentorshipRequestSerializer(mentorship_request).data,
            status=status.HTTP_200_OK,
        )


class RescheduleSessionAPIView(APIView):
    """Reschedule a booked session to a new availability slot."""

    permission_classes = [IsUser]

    @extend_schema(
        request=RescheduleSessionSerializer,
        responses={
            200: MentorshipRequestSerializer,
            400: OpenApiResponse(description="New slot is invalid or unavailable."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Only the mentee can reschedule."),
            404: OpenApiResponse(description="Match or new slot not found."),
        },
        description=(
            "Reschedule the session for an active match to a new mentor availability slot. "
            "Only the mentee can reschedule. "
            "The old slot is freed and the new slot is booked atomically."
        ),
        tags=["Mentorship"],
    )
    def post(self, request: Request, match_id: str) -> Response:
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response(_NO_PROFILE, status=status.HTTP_404_NOT_FOUND)

        try:
            match = Match.objects.select_related("mentor", "mentee", "request__slot").get(
                id=match_id, is_active=True
            )
        except Match.DoesNotExist:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

        if profile != match.mentee:
            return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)

        serializer = RescheduleSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_slot_id = serializer.validated_data["new_slot_id"]

        try:
            new_slot = AvailabilitySlot.objects.get(id=new_slot_id, profile=match.mentor)
        except AvailabilitySlot.DoesNotExist:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

        mentorship_request = match.request
        old_slot = mentorship_request.slot

        if new_slot == old_slot:
            return Response(
                {"detail": "New slot is the same as the current slot."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                if old_slot is not None and old_slot.is_booked:
                    cancel_availability_booking(
                        profile=match.mentor,
                        slot_id=old_slot.id,
                        actor=request.user,
                    )

                book_availability_slot(
                    profile=match.mentor,
                    slot_id=new_slot.id,
                    actor=request.user,
                )
                mentorship_request.slot = new_slot
                mentorship_request.save(update_fields=["slot"])
        except SlotNotBookedError:
            return Response(
                {"detail": "Current slot is no longer booked."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except BookingCancelNotAllowedError:
            return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)
        except SlotAlreadyBookedError:
            return Response(
                {"detail": "New slot is already booked."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except SlotInPastError:
            return Response(
                {"detail": "New slot is in the past."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except OwnSlotBookingError:
            return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)
        except AvailabilitySlot.DoesNotExist:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

        mentorship_request.refresh_from_db()
        return Response(
            MentorshipRequestSerializer(mentorship_request).data,
            status=status.HTTP_200_OK,
        )


class MyUpcomingSessionsListAPIView(APIView):
    """List upcoming booked sessions for the authenticated mentee."""

    permission_classes = [IsUser]

    @extend_schema(
        responses={
            200: UpcomingMenteeSessionSerializer(many=True),
            401: OpenApiResponse(description="Authentication required."),
        },
        description=(
            "List upcoming booked sessions for the authenticated user as mentee. "
            "Sessions are resolved from active matches and mentor availability slots "
            "booked by the current user."
        ),
        tags=["Mentorship"],
    )
    def get(self, request: Request) -> Response:
        """Return future booked slots by mentors who have an active match with caller."""
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)

        mentor_profile_ids = Match.objects.filter(mentee=profile, is_active=True).values_list(
            "mentor_id", flat=True
        )

        upcoming_slots = (
            AvailabilitySlot.objects.filter(
                profile_id__in=mentor_profile_ids,
                is_booked=True,
                booked_by=request.user,
                start_at__gte=timezone.now(),
            )
            .annotate(
                request_status=Coalesce(
                    Subquery(
                        MentorshipRequest.objects.filter(
                            slot_id=OuterRef("pk"),
                            mentee=profile,
                        )
                        .order_by("-created_at")
                        .values("status")[:1]
                    ),
                    Value(MentorshipRequest.Status.ACCEPTED),
                    output_field=CharField(),
                )
            )
            .select_related("profile")
            .order_by("start_at")
        )

        return Response(
            UpcomingMenteeSessionSerializer(upcoming_slots, many=True).data,
            status=status.HTTP_200_OK,
        )


class MyPastSessionsListAPIView(APIView):
    """List past booked sessions for the authenticated mentee."""

    permission_classes = [IsUser]

    @extend_schema(
        responses={
            200: UpcomingMenteeSessionSerializer(many=True),
            401: OpenApiResponse(description="Authentication required."),
        },
        description=(
            "List past booked sessions for the authenticated user as mentee. "
            "Sessions are resolved from both active and inactive matches and mentor "
            "availability slots booked by the current user whose start time has passed. "
            "Ordered by most recent first."
        ),
        tags=["Mentorship"],
    )
    def get(self, request: Request) -> Response:
        """Return past booked slots by mentors who have or had a match with the caller."""
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)

        mentor_profile_ids = Match.objects.filter(mentee=profile).values_list(
            "mentor_id", flat=True
        )

        past_slots = (
            AvailabilitySlot.objects.filter(
                profile_id__in=mentor_profile_ids,
                is_booked=True,
                booked_by=request.user,
                start_at__lt=timezone.now(),
            )
            .annotate(
                request_status=Coalesce(
                    Subquery(
                        MentorshipRequest.objects.filter(
                            slot_id=OuterRef("pk"),
                            mentee=profile,
                        )
                        .order_by("-created_at")
                        .values("status")[:1]
                    ),
                    Value(MentorshipRequest.Status.ACCEPTED),
                    output_field=CharField(),
                )
            )
            .select_related("profile")
            .order_by("-start_at")
        )

        return Response(
            UpcomingMenteeSessionSerializer(past_slots, many=True).data,
            status=status.HTTP_200_OK,
        )


class MentorUpcomingSessionsListAPIView(APIView):
    """List upcoming booked sessions for the authenticated mentor."""

    permission_classes = [IsUser]

    @extend_schema(
        responses={
            200: UpcomingMentorSessionSerializer(many=True),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Caller does not have a MENTOR profile."),
        },
        description=(
            "List upcoming booked sessions for the authenticated user as mentor. "
            "Returns the caller's own availability slots that are booked and have not "
            "yet started, ordered by start time ascending. "
            "Only accessible to users with a MENTOR app usage mode."
        ),
        tags=["Mentorship"],
    )
    def get(self, request: Request) -> Response:
        """Return future booked slots owned by the caller's mentor profile."""
        if request.user.app_usage_mode != AppUsageMode.MENTOR:
            return Response(_MENTOR_REQUIRED, status=status.HTTP_403_FORBIDDEN)

        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)

        upcoming_slots = (
            AvailabilitySlot.objects.filter(
                profile=profile,
                is_booked=True,
                start_at__gte=timezone.now(),
            )
            .select_related("booked_by__profile")
            .order_by("start_at")
        )

        return Response(
            UpcomingMentorSessionSerializer(upcoming_slots, many=True).data,
            status=status.HTTP_200_OK,
        )


class MentorPastSessionsListAPIView(APIView):
    """List past booked sessions for the authenticated mentor."""

    permission_classes = [IsUser]

    @extend_schema(
        responses={
            200: UpcomingMentorSessionSerializer(many=True),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Caller does not have a MENTOR profile."),
        },
        description=(
            "List past booked sessions for the authenticated user as mentor. "
            "Returns the caller's own availability slots that are booked and whose "
            "start time has already passed, ordered by most recent first. "
            "Only accessible to users with a MENTOR app usage mode."
        ),
        tags=["Mentorship"],
    )
    def get(self, request: Request) -> Response:
        """Return past booked slots owned by the caller's mentor profile."""
        if request.user.app_usage_mode != AppUsageMode.MENTOR:
            return Response(_MENTOR_REQUIRED, status=status.HTTP_403_FORBIDDEN)

        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)

        past_slots = (
            AvailabilitySlot.objects.filter(
                profile=profile,
                is_booked=True,
                start_at__lt=timezone.now(),
            )
            .select_related("booked_by__profile")
            .order_by("-start_at")
        )

        return Response(
            UpcomingMentorSessionSerializer(past_slots, many=True).data,
            status=status.HTTP_200_OK,
        )


class DeactivateMatchAPIView(APIView):
    """End an active mentorship relationship by setting the match to inactive."""

    permission_classes = [IsUser]

    @extend_schema(
        request=None,
        responses={
            200: MatchSerializer,
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Caller is not a participant of this match."),
            404: OpenApiResponse(description="Match not found."),
        },
        description=(
            "Deactivate a mentorship match, formally ending the relationship. "
            "Either the mentor or the mentee of the match may call this endpoint. "
            "The operation is idempotent: deactivating an already-inactive match returns 200."
        ),
        tags=["Mentorship"],
    )
    def post(self, request: Request, match_id: str) -> Response:
        """Set the identified match to inactive."""
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response(_NO_PROFILE, status=status.HTTP_404_NOT_FOUND)

        try:
            match = Match.objects.select_related("mentor", "mentee", "request").get(id=match_id)
        except Match.DoesNotExist:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

        if profile not in (match.mentor, match.mentee):
            return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)

        Match.objects.filter(pk=match.pk).update(is_active=False)
        match.is_active = False

        return Response(MatchSerializer(match).data, status=status.HTTP_200_OK)


class MatchFeedbackListCreateAPIView(APIView):
    """List and submit feedback for a match (participants only)."""

    permission_classes = [IsUser]

    @extend_schema(
        responses={
            200: FeedbackSerializer(many=True),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Only match participants can view feedback."),
            404: OpenApiResponse(description="Match not found."),
        },
        description=(
            "List all feedback submitted for the given match. "
            "Only the mentor or mentee of the match can view feedback."
        ),
        tags=["Mentorship"],
    )
    def get(self, request: Request, match_id: str) -> Response:
        """Return all feedback entries for the identified match."""
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response(_NO_PROFILE, status=status.HTTP_404_NOT_FOUND)

        try:
            match = Match.objects.select_related("mentor", "mentee").get(id=match_id)
        except Match.DoesNotExist:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

        if profile not in (match.mentor, match.mentee):
            return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)

        feedbacks = (
            Feedback.objects.filter(match=match)
            .select_related("submitted_by")
            .order_by("-created_at")
        )
        return Response(FeedbackSerializer(feedbacks, many=True).data, status=status.HTTP_200_OK)

    @extend_schema(
        request=FeedbackCreateSerializer,
        responses={
            201: FeedbackSerializer,
            400: OpenApiResponse(description="Validation error or duplicate feedback."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Only match participants can submit feedback."),
            404: OpenApiResponse(description="Match not found."),
        },
        description=(
            "Submit feedback (rating 1–5 and optional text) for a match. "
            "Each participant (mentor and mentee) can submit feedback once. "
            "When the mentee submits, the mentor's public rating may be updated "
            "once the review count reaches a configured threshold."
        ),
        tags=["Mentorship"],
    )
    def post(self, request: Request, match_id: str) -> Response:
        """Create feedback for the identified match from the authenticated participant."""
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response(_NO_PROFILE, status=status.HTTP_404_NOT_FOUND)

        try:
            match = Match.objects.select_related("mentor", "mentee").get(id=match_id)
        except Match.DoesNotExist:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

        if profile not in (match.mentor, match.mentee):
            return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)

        serializer = FeedbackCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            feedback = Feedback.objects.create(
                match=match,
                submitted_by=profile,
                rating=serializer.validated_data["rating"],
                text=serializer.validated_data.get("text", ""),
            )
        except IntegrityError:
            return Response(
                {"detail": "You have already submitted feedback for this match."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # When the mentee submits, update the mentor's rating counter and
        # recalculate the public average every RATING_UPDATE_THRESHOLD reviews.
        if profile == match.mentee:
            mentor = match.mentor
            with transaction.atomic():
                Profile.objects.filter(pk=mentor.pk).update(review_count=mentor.review_count + 1)
                mentor.refresh_from_db(fields=["review_count"])

                threshold = getattr(settings, "RATING_UPDATE_THRESHOLD", 5)
                if mentor.review_count % threshold == 0:
                    avg = (
                        Feedback.objects.filter(match__mentor=mentor)
                        .exclude(submitted_by=mentor)
                        .aggregate(avg=Avg("rating"))["avg"]
                    )
                    Profile.objects.filter(pk=mentor.pk).update(
                        average_rating=(
                            Decimal(str(avg)).quantize(Decimal("0.01"))
                            if avg is not None
                            else Decimal("0.00")
                        )
                    )

        return Response(
            FeedbackSerializer(feedback).data,
            status=status.HTTP_201_CREATED,
        )
