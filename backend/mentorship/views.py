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
    MCTECreateSerializer,
    MCTEEventSerializer,
    MCTEFeedSerializer,
    MCTEListQueryParamsSerializer,
    MCTEUpdateSerializer,
    MeetingSessionSerializer,
    MentorshipRequestCreateSerializer,
    MentorshipRequestSerializer,
    RescheduleSessionSerializer,
    RespondToRequestSerializer,
)
from .services import (
    InvalidMCTEEventTypeError,
    MissingSelectedSlotError,
    NoActiveBookingError,
    SameSlotSelectionError,
    cancel_match_session,
    create_match_feedback,
    create_mcte_event,
    create_mentorship_request,
    deactivate_match,
    delete_match_feedback,
    edit_mcte_event,
    list_match_journey_events,
    reschedule_match_session,
    respond_to_mentorship_request,
    soft_delete_mcte_event,
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
    """Read-only timeline endpoint that serves AGTE and MCTE records for a match."""

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
            "Return the journey timeline for a single match. The feed combines two "
            "categories of timeline event into one chronological list:\n\n"
            "- **AGTE** (Auto-Generated Timeline Events) — materialized automatically "
            "from mentorship lifecycle changes.\n"
            "- **MCTE** (Manually-Created Timeline Events) — user-authored notes that "
            "either participant can add to the shared journey log.\n\n"
            "**Ordering:** All events are sorted newest-first by action metadata "
            "(descending by `created_at`, then `last_edited`) before pagination is applied.\n\n"
            "**Pagination:** Use `offset` (zero-based start index, default 0) and `limit` "
            "(page size, default 50, max 200). Slicing is applied at the database level, "
            "so page boundaries are stable across calls.\n\n"
            "**Visibility:** Journey events are private to the mentorship relationship "
            "and can only be accessed by the mentor or mentee of the match.\n\n"
            "**Common response fields (all events):**\n"
            '- `category` — `"AGTE"` or `"MCTE"`.\n'
            "- `event_type` — discriminator string (see per-category lists below).\n"
            "- `timestamp` — ISO 8601 UTC timestamp of the event itself (session time for "
            "session_* AGTE records).\n"
            "- `created_at` — ISO 8601 UTC timestamp for when the timeline action record "
            "was created.\n"
            "- `last_edited` — ISO 8601 UTC timestamp for latest update metadata. "
            "For AGTE, it is always equal to `created_at`.\n"
            "- `is_editable` — `true` only for MCTE events authored by the requesting "
            "user; `false` for all AGTE events and MCTE events owned by the other "
            "participant.\n"
            "- `content` — free-text body; always present for MCTE, empty string for "
            "AGTE.\n"
            "- `show_on_profile` — boolean; controls whether the event appears on the "
            "author's public profile. Relevant for MCTE only.\n"
            "- `author` — serialized profile summary (`id`, `full_name`, `avatar`) for "
            "MCTE events; `null` for AGTE events.\n"
            "- `media_url` — optional URL for event media or visuals; can be `null`. "
            "Currently only present on MCTE events.\n\n"
            "**AGTE event types and payloads:**\n"
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
            "payload: `match_id`, `notification_id`.\n\n"
            "**MCTE event types** (no structured payload; narrative is carried in "
            "`content`):\n"
            "- `achievement` — a milestone or accomplishment reached during the "
            "mentorship.\n"
            "- `social` — a social interaction or informal meeting between participants.\n"
            "- `progress` — an incremental update on an ongoing goal or skill."
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


class MCTECollectionAPIView(APIView):
    """List and create manually-created timeline events for a match."""

    permission_classes = [IsUser]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="event_type",
                location=OpenApiParameter.QUERY,
                required=False,
                type=OpenApiTypes.STR,
                enum=["achievement", "social", "progress"],
                description="Filter results to a specific event type.",
            ),
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
            200: MCTEFeedSerializer,
            400: OpenApiResponse(description="Invalid query parameters."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Only match participants can view milestones."),
            404: OpenApiResponse(description="Match not found."),
        },
        description=(
            "List manually-created timeline events (milestones) for a match. "
            "Both the mentor and mentee can read all milestones on their match. "
            "Ordered newest-first. Optionally filter by event_type "
            "(achievement, social, progress)."
        ),
        tags=["Mentorship"],
    )
    def get(self, request: Request, match_id: str) -> Response:
        """Return a paginated list of MCTE records for the identified match."""
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)

        try:
            match = Match.objects.select_related("mentor", "mentee").get(id=match_id)
        except Match.DoesNotExist:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

        if profile not in (match.mentor, match.mentee):
            return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)

        params_serializer = MCTEListQueryParamsSerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)
        params = cast(dict[str, Any], params_serializer.validated_data)

        from timeline.models import TimelineEvent

        qs = TimelineEvent.objects.filter(
            mentorship=match,
            category=TimelineEvent.Category.MCTE,
            is_deleted=False,
        ).select_related("author")

        if params["event_type"] is not None:
            qs = qs.filter(event_type=params["event_type"])

        qs = qs.order_by("-timestamp", "-created_at")
        total_count = qs.count()
        offset = params["offset"]
        limit = params["limit"]
        events = list(qs[offset : offset + limit])

        payload = {
            "count": total_count,
            "offset": offset,
            "limit": limit,
            "results": events,
        }
        return Response(MCTEFeedSerializer(payload).data, status=status.HTTP_200_OK)

    @extend_schema(
        request=MCTECreateSerializer,
        responses={
            201: MCTEEventSerializer,
            400: OpenApiResponse(description="Validation error."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Only match participants can log milestones."),
            404: OpenApiResponse(description="Match not found."),
        },
        description=(
            "Log a manually-created timeline event (milestone) on a match. "
            "The author is always derived from the authenticated user's profile "
            "and cannot be overridden via the request body. "
            "event_type must be one of: achievement, social, progress. "
            "`timestamp` is optional; if omitted, null, or empty, it is set to the event's "
            "creation time. If provided, it cannot be more than 1 day in the future. "
            "Optional fields include `media_url` (URL string for event media/visuals, can be null) "
            "and `show_on_profile` (boolean, default false)."
        ),
        tags=["Mentorship"],
    )
    def post(self, request: Request, match_id: str) -> Response:
        """Create a new MCTE record on the identified match."""
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)

        try:
            match = Match.objects.select_related("mentor", "mentee").get(id=match_id)
        except Match.DoesNotExist:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

        if profile not in (match.mentor, match.mentee):
            return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)

        serializer = MCTECreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = cast(dict[str, Any], serializer.validated_data)

        event = create_mcte_event(
            match=match,
            author_profile=profile,
            event_type=validated["event_type"],
            content=validated.get("content", ""),
            media_url=validated.get("media_url"),
            timestamp=validated.get("timestamp"),
            show_on_profile=validated.get("show_on_profile", False),
        )
        event.author = profile  # avoid an extra query in the serializer
        return Response(MCTEEventSerializer(event).data, status=status.HTTP_201_CREATED)


class MCTEEventDetailAPIView(APIView):
    """Edit or soft-delete a single manually-created timeline event."""

    permission_classes = [IsUser]

    def _resolve_event(
        self, request: Request, match_id: str, event_id: str
    ) -> tuple[Any, Any, Any] | Response:
        """Resolve profile, match, and event; return a Response on any access error."""
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)

        try:
            match = Match.objects.select_related("mentor", "mentee").get(id=match_id)
        except Match.DoesNotExist:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

        if profile not in (match.mentor, match.mentee):
            return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)

        from timeline.models import TimelineEvent

        try:
            event = TimelineEvent.objects.select_related("author").get(
                id=event_id,
                mentorship=match,
                category=TimelineEvent.Category.MCTE,
                is_deleted=False,
            )
        except TimelineEvent.DoesNotExist:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

        if event.author != profile:
            return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)

        return profile, match, event

    @extend_schema(
        request=MCTEUpdateSerializer,
        responses={
            200: MCTEEventSerializer,
            400: OpenApiResponse(description="Validation error or no fields provided."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Only the author can edit this milestone."),
            404: OpenApiResponse(description="Match or event not found."),
        },
        description=(
            "Partially update a manually-created timeline event. "
            "Only 'content', 'media_url', and 'show_on_profile' may be changed. "
            "Only the original author can edit."
        ),
        tags=["Mentorship"],
    )
    def patch(self, request: Request, match_id: str, event_id: str) -> Response:
        """Apply a partial update to the identified MCTE record."""
        result = self._resolve_event(request, match_id, event_id)
        if isinstance(result, Response):
            return result
        _profile, _match, event = result

        serializer = MCTEUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = cast(dict[str, Any], serializer.validated_data)

        updated_event = edit_mcte_event(
            event=event,
            content=validated.get("content"),
            media_url=validated.get("media_url"),
            show_on_profile=validated.get("show_on_profile"),
            update_media_url="media_url" in validated,
        )
        return Response(MCTEEventSerializer(updated_event).data, status=status.HTTP_200_OK)

    @extend_schema(
        request=None,
        responses={
            204: OpenApiResponse(description="Milestone deleted."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Only the author can delete this milestone."),
            404: OpenApiResponse(description="Match or event not found."),
        },
        description=(
            "Soft-delete a manually-created timeline event. "
            "The event is hidden from the feed but not permanently removed. "
            "Only the original author can delete."
        ),
        tags=["Mentorship"],
    )
    def delete(self, request: Request, match_id: str, event_id: str) -> Response:
        """Soft-delete the identified MCTE record."""
        result = self._resolve_event(request, match_id, event_id)
        if isinstance(result, Response):
            return result
        _profile, _match, event = result

        soft_delete_mcte_event(event=event)
        return Response(status=status.HTTP_204_NO_CONTENT)
