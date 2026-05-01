"""Views for mentorship request and match API endpoints."""

import logging
from typing import Any, cast

from django.db import IntegrityError
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import AppUsageMode
from accounts.permissions import IsEmailVerified, IsUser
from profiles.models import AvailabilitySlot, Profile
from profiles.services import (
    BookingCancelNotAllowedError,
    OwnSlotBookingError,
    SlotAlreadyBookedError,
    SlotInPastError,
    SlotNotBookedError,
)

from .models import Feedback, Match, MeetingSession, MentorshipRequest
from .serializers import (
    FeedbackCreateSerializer,
    FeedbackSerializer,
    JourneyFeedSerializer,
    JourneyQueryParamsSerializer,
    MatchSerializer,
    MeetingSessionSerializer,
    MentorshipRequestCreateSerializer,
    MentorshipRequestSerializer,
    RescheduleSessionSerializer,
    RespondToRequestSerializer,
)
from .services import (
    MissingSelectedSlotError,
    NoActiveBookingError,
    SameSlotSelectionError,
    cancel_match_session,
    create_match_feedback,
    create_mentorship_request,
    deactivate_match,
    delete_match_feedback,
    list_match_journey_events,
    reschedule_match_session,
    respond_to_mentorship_request,
)

_NOT_FOUND = {"detail": "Not found."}
_PERMISSION_DENIED = {"detail": "You do not have permission to perform this action."}
_DUPLICATE_PENDING = {"detail": "You already have a pending request with this mentor."}
_NOT_PENDING = {"detail": "Only pending requests can be accepted or rejected."}
_MENTEE_REQUIRED = {"detail": "You need a MENTEE profile to send mentorship requests."}
_MENTOR_REQUIRED = {"detail": "You need a MENTOR profile to access this resource."}
_NO_PROFILE = {"detail": "Profile not found."}
_SLOT_BOOKING_FAILED = {"detail": "Selected slot could not be booked while accepting this request."}
_NO_ACTIVE_BOOKING = {"detail": "This session has no active booking to cancel."}
_INVALID_MEETING_SESSION_STATUS = {
    "detail": (
        "Invalid status. Use one of: upcoming, past, scheduled, rescheduled, canceled, completed."
    )
}
_INVALID_MEETING_SESSION_ROLE = {"detail": "Invalid role. Use one of: mentor, mentee, all."}

logger = logging.getLogger(__name__)


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

    permission_classes = [IsUser, IsEmailVerified]

    @extend_schema(
        request=MentorshipRequestCreateSerializer,
        responses={
            201: MentorshipRequestSerializer,
            400: OpenApiResponse(description="Validation error or duplicate pending request."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(
                description=(
                    "Caller's profile does not support the mentee role, "
                    "or the caller has not verified their email."
                )
            ),
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
        validated_data = cast(dict[str, Any], serializer.validated_data)

        try:
            mentorship_request = create_mentorship_request(
                mentee_profile=mentee_profile,
                mentor_profile=cast(Profile, validated_data["mentor_username"]),
                selected_slot=cast(AvailabilitySlot, validated_data["slot_id"]),
                cover_letter=cast(str, validated_data.get("cover_letter", "")),
            )
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
        action = cast(str, validated_data.get("action"))

        try:
            mentorship_request = respond_to_mentorship_request(
                mentorship_request=mentorship_request,
                action=action,
            )
        except (MissingSelectedSlotError, SlotAlreadyBookedError, SlotInPastError):
            return Response(_SLOT_BOOKING_FAILED, status=status.HTTP_400_BAD_REQUEST)
        except OwnSlotBookingError:
            return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)
        except AvailabilitySlot.DoesNotExist:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

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


class MyMeetingSessionsListAPIView(APIView):
    """List canonical meeting sessions for the authenticated user profile."""

    permission_classes = [IsUser]

    @extend_schema(
        responses={
            200: MeetingSessionSerializer(many=True),
            400: OpenApiResponse(description="Invalid query parameters."),
            401: OpenApiResponse(description="Authentication required."),
        },
        description=(
            "List canonical mentorship sessions for the authenticated user. "
            "Optional query params: role={mentor|mentee|all} and "
            "status={upcoming|past|scheduled|rescheduled|canceled|completed}."
        ),
        tags=["Mentorship"],
    )
    def get(self, request: Request) -> Response:
        """Return canonical sessions with optional role and status filtering."""
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)

        qs = MeetingSession.objects.filter(Q(mentor=profile) | Q(mentee=profile)).select_related(
            "mentor__user", "mentee__user", "match", "source_slot"
        )

        role_filter = request.query_params.get("role", "all").strip().lower()
        if role_filter == "mentor":
            qs = qs.filter(mentor=profile)
        elif role_filter == "mentee":
            qs = qs.filter(mentee=profile)
        elif role_filter != "all":
            return Response(_INVALID_MEETING_SESSION_ROLE, status=status.HTTP_400_BAD_REQUEST)

        status_filter = request.query_params.get("status", "").strip().lower()
        now = timezone.now()
        if status_filter == "upcoming":
            qs = qs.exclude(status=MeetingSession.Status.CANCELED).filter(
                scheduled_start_at_utc__gte=now
            )
            qs = qs.order_by("scheduled_start_at_utc")
        elif status_filter == "past":
            qs = qs.filter(scheduled_start_at_utc__lt=now).order_by("-scheduled_start_at_utc")
        elif status_filter == "scheduled":
            qs = qs.filter(status=MeetingSession.Status.SCHEDULED).order_by(
                "scheduled_start_at_utc"
            )
        elif status_filter == "rescheduled":
            qs = qs.filter(status=MeetingSession.Status.RESCHEDULED).order_by(
                "scheduled_start_at_utc"
            )
        elif status_filter == "canceled":
            qs = qs.filter(status=MeetingSession.Status.CANCELED).order_by("-updated_at")
        elif status_filter == "completed":
            qs = qs.filter(
                Q(status=MeetingSession.Status.COMPLETED)
                | (
                    Q(
                        status__in=[
                            MeetingSession.Status.SCHEDULED,
                            MeetingSession.Status.RESCHEDULED,
                        ]
                    )
                    & Q(scheduled_end_at_utc__lt=now)
                )
            ).order_by("-scheduled_start_at_utc")
        elif status_filter:
            return Response(_INVALID_MEETING_SESSION_STATUS, status=status.HTTP_400_BAD_REQUEST)
        else:
            qs = qs.order_by("scheduled_start_at_utc")

        serializer = MeetingSessionSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


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
    def post(self, request: Request, session_id: str) -> Response:
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response(_NO_PROFILE, status=status.HTTP_404_NOT_FOUND)

        try:
            session = MeetingSession.objects.select_related(
                "match__mentor", "match__mentee", "match__request__slot"
            ).get(id=session_id, match__is_active=True)
            match = session.match
        except MeetingSession.DoesNotExist:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

        if profile not in (match.mentor, match.mentee):
            return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)

        try:
            mentorship_request = cancel_match_session(
                session=session,
                actor=request.user,
                actor_profile=profile,
            )
        except (NoActiveBookingError, SlotNotBookedError):
            return Response(_NO_ACTIVE_BOOKING, status=status.HTTP_400_BAD_REQUEST)
        except BookingCancelNotAllowedError:
            return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)
        except AvailabilitySlot.DoesNotExist:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

        mentorship_request.refresh_from_db()

        # Notification is handled in the service layer; no need to duplicate here.

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
    def post(self, request: Request, session_id: str) -> Response:
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response(_NO_PROFILE, status=status.HTTP_404_NOT_FOUND)

        try:
            session = MeetingSession.objects.select_related(
                "match__mentor", "match__mentee", "match__request__slot"
            ).get(id=session_id, match__is_active=True)
            match = session.match
        except MeetingSession.DoesNotExist:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

        if profile != match.mentee:
            return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)

        serializer = RescheduleSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = cast(dict[str, Any], serializer.validated_data)
        new_slot_id = validated_data["new_slot_id"]

        try:
            new_slot = AvailabilitySlot.objects.get(id=new_slot_id, profile=match.mentor)
        except AvailabilitySlot.DoesNotExist:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

        try:
            mentorship_request = reschedule_match_session(
                match=match,
                actor=request.user,
                new_slot=new_slot,
            )
        except SameSlotSelectionError:
            return Response(
                {"detail": "New slot is the same as the current slot."},
                status=status.HTTP_400_BAD_REQUEST,
            )
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

        # Notification is handled in the service layer; no need to duplicate here.

        return Response(
            MentorshipRequestSerializer(mentorship_request).data,
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

        match = deactivate_match(match=match, actor_profile=profile)

        return Response(MatchSerializer(match).data, status=status.HTTP_200_OK)


class MatchJourneyAPIView(APIView):
    """Read-only timeline endpoint that serves stored AGTE records for a match."""

    permission_classes = [IsUser]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="offset",
                location=OpenApiParameter.QUERY,
                required=False,
                type=OpenApiTypes.INT,
                description="Zero-based index of the first item to include. Default: 0.",
            ),
            OpenApiParameter(
                name="limit",
                location=OpenApiParameter.QUERY,
                required=False,
                type=OpenApiTypes.INT,
                description="Maximum number of items to return. Default: 50. Maximum: 200.",
            ),
        ],
        responses={
            200: JourneyFeedSerializer,
            400: OpenApiResponse(description="Invalid offset/limit query params."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Only match participants can view journey events."),
            404: OpenApiResponse(description="Match not found."),
        },
        description=(
            "Return the journey timeline for a single match. The feed is read from "
            "stored AGTE timeline records materialized from mentorship lifecycle "
            "changes, so clients receive a single chronological list without "
            "stitching multiple endpoints together.\n\n"
            "**Ordering:** All events are sorted newest-first (descending by timestamp) "
            "before pagination is applied.\n\n"
            "**Pagination:** Use `offset` (zero-based start index, default 0) and `limit` "
            "(page size, default 50, max 200). Slicing is applied at the database level, "
            "so page boundaries are stable across calls.\n\n"
            "**Visibility:** Journey events are private to the mentorship relationship "
            "and can only be accessed by the mentor or mentee of the match.\n\n"
            "**Event types and payloads:**\n"
            "- `request_accepted` — emitted when the mentor accepts the request; "
            "payload: `request_id`, `initial_session_start_at`, `initial_session_end_at`.\n"
            "- `session_scheduled` — emitted when a MeetingSession is created in SCHEDULED; "
            "payload: `session_id`, `scheduled_start_at_utc`, `scheduled_end_at_utc`.\n"
            "- `session_rescheduled` — emitted when a session is moved to a new slot; "
            "payload: `session_id`, `scheduled_start_at_utc`, `scheduled_end_at_utc`.\n"
            "- `session_canceled` — emitted when a session is canceled; "
            "payload adds `cancel_reason` to the standard session fields.\n"
            "- `session_completed` — emitted when a session transitions to COMPLETED; "
            "payload: `session_id`, `scheduled_start_at_utc`, `scheduled_end_at_utc`.\n"
            "- `mentorship_ended` — emitted when the match is deactivated; "
            "payload: `match_id`, `notification_id`."
        ),
        tags=["Mentorship"],
    )
    def get(self, request: Request, match_id: str) -> Response:
        """Return a paginated cross-source journey feed for the identified match."""
        params_serializer = JourneyQueryParamsSerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)
        params = cast(dict[str, int], params_serializer.validated_data)

        try:
            match = Match.objects.select_related("mentor", "mentee", "request").get(id=match_id)
        except Match.DoesNotExist:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)

        if profile not in (match.mentor, match.mentee):
            return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)

        payload = list_match_journey_events(
            match=match,
            offset=params["offset"],
            limit=params["limit"],
        )
        return Response(JourneyFeedSerializer(payload).data, status=status.HTTP_200_OK)


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
        validated_data = cast(dict[str, Any], serializer.validated_data)

        try:
            feedback = create_match_feedback(
                match=match,
                submitted_by=profile,
                rating=cast(int, validated_data["rating"]),
                text=cast(str, validated_data.get("text", "")),
            )
        except IntegrityError:
            return Response(
                {"detail": "You have already submitted feedback for this match."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            FeedbackSerializer(feedback).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        responses={
            204: OpenApiResponse(description="Feedback deleted."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Only match participants can delete feedback."),
            404: OpenApiResponse(description="Match or feedback not found."),
        },
        description=(
            "Delete authenticated participant's own feedback for the given match. "
            "Deleting pre-threshold feedback removes it from pending batch counts, "
            "while deleting already visible feedback does not reduce batch visibility."
        ),
        tags=["Mentorship"],
    )
    def delete(self, request: Request, match_id: str) -> Response:
        """Delete the caller's own feedback entry for the identified match."""
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

        feedback = Feedback.objects.filter(match=match, submitted_by=profile).first()
        if feedback is None:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

        delete_match_feedback(feedback=feedback)
        return Response(status=status.HTTP_204_NO_CONTENT)
