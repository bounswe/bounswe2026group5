"""Views for mentorship request and match API endpoints."""

from typing import Any, cast

from django.db import IntegrityError, transaction
from django.db.models import CharField, OuterRef, Subquery, Value
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

from .models import Match, MentorshipRequest
from .serializers import (
    MatchSerializer,
    MentorshipRequestCreateSerializer,
    MentorshipRequestSerializer,
    RescheduleSessionSerializer,
    RespondToRequestSerializer,
    UpcomingMenteeSessionSerializer,
)

_NOT_FOUND = {"detail": "Not found."}
_PERMISSION_DENIED = {"detail": "You do not have permission to perform this action."}
_DUPLICATE_PENDING = {"detail": "You already have a pending request with this mentor."}
_NOT_PENDING = {"detail": "Only pending requests can be accepted or rejected."}
_MENTEE_REQUIRED = {"detail": "You need a MENTEE or BOTH profile to send mentorship requests."}
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
            "The caller must have a MENTEE or BOTH profile. "
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
