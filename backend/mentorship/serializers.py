"""Serializers for mentorship request and match API endpoints."""

from datetime import timedelta
from typing import Any

from django.utils import timezone
from rest_framework import serializers

from accounts.models import AppUsageMode
from core.utils.timezone import to_local_time
from profiles.models import AvailabilitySlot, Profile
from profiles.serializers import resolve_picture_url

from .models import Feedback, Match, MeetingSession, MentorshipRequest


class ProfileSummarySerializer(serializers.ModelSerializer):
    """Compact profile representation for embedding in request/match responses."""

    picture_url = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ("id", "username", "display_name", "picture_url", "title")
        read_only_fields = fields

    def get_picture_url(self, obj: Profile) -> str:
        """Return uploaded picture URL or external URL fallback."""
        return resolve_picture_url(obj)


class MentorshipRequestSerializer(serializers.ModelSerializer):
    """Read serializer for mentorship requests."""

    slot_id = serializers.UUIDField(source="slot.id", read_only=True)
    slot_date = serializers.SerializerMethodField()
    slot_start_time = serializers.SerializerMethodField()
    slot_end_time = serializers.SerializerMethodField()
    mentor = ProfileSummarySerializer(read_only=True)
    mentee = ProfileSummarySerializer(read_only=True)

    class Meta:
        model = MentorshipRequest
        fields = (
            "id",
            "mentor",
            "mentee",
            "slot_id",
            "slot_date",
            "slot_start_time",
            "slot_end_time",
            "status",
            "cover_letter",
            "created_at",
            "responded_at",
        )
        read_only_fields = fields

    def get_slot_date(self, obj: MentorshipRequest) -> str | None:
        """Return selected slot date in project local timezone."""
        slot_start_at = obj.slot.start_at if obj.slot is not None else obj.initial_session_start_at
        if slot_start_at is None:
            return None
        return to_local_time(slot_start_at).date().isoformat()

    def get_slot_start_time(self, obj: MentorshipRequest) -> str | None:
        """Return selected slot start time in project local timezone."""
        slot_start_at = obj.slot.start_at if obj.slot is not None else obj.initial_session_start_at
        if slot_start_at is None:
            return None
        return to_local_time(slot_start_at).time().replace(microsecond=0).isoformat()

    def get_slot_end_time(self, obj: MentorshipRequest) -> str | None:
        """Return selected slot end time in project local timezone."""
        slot_end_at = obj.slot.end_at if obj.slot is not None else obj.initial_session_end_at
        if slot_end_at is None:
            return None
        return to_local_time(slot_end_at).time().replace(microsecond=0).isoformat()


class MentorshipRequestCreateSerializer(serializers.Serializer):
    """Write serializer for creating a new mentorship request."""

    mentor_username = serializers.SlugField()
    slot_id = serializers.UUIDField()
    cover_letter = serializers.CharField(required=False, default="", allow_blank=True)

    def validate_mentor_username(self, value: str) -> Profile:
        """Resolve username to a Profile and verify it supports mentoring."""
        try:
            profile = Profile.objects.get(username=value)
        except Profile.DoesNotExist:
            raise serializers.ValidationError("Mentor profile not found.")

        if profile.user.app_usage_mode != AppUsageMode.MENTOR:
            raise serializers.ValidationError("This user is not available as a mentor.")

        return profile

    def validate_slot_id(self, value):
        """Resolve slot UUID and ensure selected slot exists."""
        try:
            return AvailabilitySlot.objects.select_related("profile").get(id=value)
        except AvailabilitySlot.DoesNotExist:
            raise serializers.ValidationError("Selected availability slot was not found.")

    def validate(self, attrs: dict) -> dict:
        """Validate role/ownership constraints and selected slot availability."""
        mentee_profile: Profile = self.context["mentee_profile"]
        mentor_profile: Profile = attrs["mentor_username"]
        selected_slot: AvailabilitySlot = attrs["slot_id"]

        if mentor_profile == mentee_profile:
            raise serializers.ValidationError(
                {"mentor_username": "You cannot send a mentorship request to yourself."}
            )

        if selected_slot.profile != mentor_profile:
            raise serializers.ValidationError(
                {"slot_id": "Selected slot does not belong to the requested mentor."}
            )

        if selected_slot.status != AvailabilitySlot.Status.AVAILABLE:
            if selected_slot.status == AvailabilitySlot.Status.BOOKED:
                raise serializers.ValidationError({"slot_id": "Selected slot is already booked."})
            raise serializers.ValidationError(
                {"slot_id": "Selected slot already has a pending mentorship request."}
            )

        if selected_slot.start_at <= timezone.now():
            raise serializers.ValidationError({"slot_id": "Selected slot is in the past."})

        return attrs

    def create(self, validated_data: dict) -> MentorshipRequest:
        """Create a mentorship request from mentee to mentor."""
        mentee_profile: Profile = self.context["mentee_profile"]
        mentor_profile: Profile = validated_data["mentor_username"]
        selected_slot: AvailabilitySlot = validated_data["slot_id"]
        cover_letter: str = validated_data.get("cover_letter", "")

        request_obj = MentorshipRequest.objects.create(
            mentor=mentor_profile,
            mentee=mentee_profile,
            slot=selected_slot,
            cover_letter=cover_letter,
        )
        selected_slot.mark_pending()
        return request_obj


class RespondToRequestSerializer(serializers.Serializer):
    """Write serializer for accepting or rejecting a pending mentorship request."""

    action = serializers.ChoiceField(choices=["accept", "reject"])


class RescheduleSessionSerializer(serializers.Serializer):
    """Write serializer for rescheduling a session to a new availability slot."""

    new_slot_id = serializers.UUIDField()


class MatchSerializer(serializers.ModelSerializer):
    """Read serializer for mentorship matches."""

    mentor = ProfileSummarySerializer(read_only=True)
    mentee = ProfileSummarySerializer(read_only=True)
    request_id = serializers.UUIDField(source="request.id", read_only=True)

    class Meta:
        model = Match
        fields = ("id", "mentor", "mentee", "request_id", "is_active")
        read_only_fields = fields


class UpcomingMenteeSessionSerializer(serializers.ModelSerializer):
    """Read serializer for upcoming sessions booked by the current mentee."""

    slot_id = serializers.UUIDField(source="id", read_only=True)
    mentor = ProfileSummarySerializer(source="profile", read_only=True)
    slot_date = serializers.SerializerMethodField()
    slot_start_time = serializers.SerializerMethodField()
    slot_end_time = serializers.SerializerMethodField()
    status = serializers.CharField(source="request_status", read_only=True)

    class Meta:
        model = AvailabilitySlot
        fields = (
            "slot_id",
            "mentor",
            "slot_date",
            "slot_start_time",
            "slot_end_time",
            "status",
            "booked_at",
        )
        read_only_fields = fields

    def get_slot_date(self, obj: AvailabilitySlot) -> str:
        """Return session date in project local timezone."""
        return to_local_time(obj.start_at).date().isoformat()

    def get_slot_start_time(self, obj: AvailabilitySlot) -> str:
        """Return session start time in project local timezone."""
        return to_local_time(obj.start_at).time().replace(microsecond=0).isoformat()

    def get_slot_end_time(self, obj: AvailabilitySlot) -> str:
        """Return session end time in project local timezone."""
        return to_local_time(obj.end_at).time().replace(microsecond=0).isoformat()


class UpcomingMentorSessionSerializer(serializers.ModelSerializer):
    """Read serializer for upcoming booked sessions viewed from the mentor's perspective."""

    slot_id = serializers.UUIDField(source="id", read_only=True)
    mentee = serializers.SerializerMethodField()
    slot_date = serializers.SerializerMethodField()
    slot_start_time = serializers.SerializerMethodField()
    slot_end_time = serializers.SerializerMethodField()

    class Meta:
        model = AvailabilitySlot
        fields = (
            "slot_id",
            "mentee",
            "slot_date",
            "slot_start_time",
            "slot_end_time",
            "booked_at",
        )
        read_only_fields = fields

    def get_mentee(self, obj: AvailabilitySlot) -> dict | None:
        """Return the mentee's profile summary derived from the booking user."""
        if obj.booked_by is None:
            return None
        try:
            return ProfileSummarySerializer(obj.booked_by.profile).data
        except Profile.DoesNotExist:
            return None

    def get_slot_date(self, obj: AvailabilitySlot) -> str:
        """Return session date in project local timezone."""
        return to_local_time(obj.start_at).date().isoformat()

    def get_slot_start_time(self, obj: AvailabilitySlot) -> str:
        """Return session start time in project local timezone."""
        return to_local_time(obj.start_at).time().replace(microsecond=0).isoformat()

    def get_slot_end_time(self, obj: AvailabilitySlot) -> str:
        """Return session end time in project local timezone."""
        return to_local_time(obj.end_at).time().replace(microsecond=0).isoformat()


class MeetingSessionSerializer(serializers.ModelSerializer):
    """Read serializer for canonical mentorship meeting sessions."""

    session_id = serializers.UUIDField(source="id", read_only=True)
    match_id = serializers.UUIDField(source="match.id", read_only=True)
    mentor = ProfileSummarySerializer(read_only=True)
    mentee = ProfileSummarySerializer(read_only=True)
    source_slot_id = serializers.UUIDField(source="source_slot.id", read_only=True, allow_null=True)
    scheduled_start_at = serializers.SerializerMethodField()
    scheduled_end_at = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()
    display_status = serializers.SerializerMethodField()
    allowed_actions = serializers.SerializerMethodField()

    class Meta:
        model = MeetingSession
        fields = (
            "session_id",
            "match_id",
            "mentor",
            "mentee",
            "source_slot_id",
            "scheduled_start_at",
            "scheduled_end_at",
            "status",
            "display_status",
            "my_role",
            "allowed_actions",
            "canceled_by_role",
            "cancel_reason",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_scheduled_start_at(self, obj: MeetingSession) -> str:
        """Return session start time in project local timezone."""
        return to_local_time(obj.scheduled_start_at_utc).isoformat()

    def get_scheduled_end_at(self, obj: MeetingSession) -> str:
        """Return session end time in project local timezone."""
        return to_local_time(obj.scheduled_end_at_utc).isoformat()

    def get_my_role(self, obj: MeetingSession) -> str:
        """Return the authenticated caller role for this session."""
        request = self.context.get("request")
        if request is None or request.user.is_anonymous:
            return "UNKNOWN"

        if request.user.id == obj.mentor.user_id:
            return "MENTOR"
        if request.user.id == obj.mentee.user_id:
            return "MENTEE"
        return "UNKNOWN"

    def get_display_status(self, obj: MeetingSession) -> str:
        """Return computed status including implicit completion for past sessions."""
        if (
            obj.status in {MeetingSession.Status.SCHEDULED, MeetingSession.Status.RESCHEDULED}
            and obj.scheduled_end_at_utc <= timezone.now()
        ):
            return MeetingSession.Status.COMPLETED
        return obj.status

    def get_allowed_actions(self, obj: MeetingSession) -> list[str]:
        """Return allowed actions for the authenticated caller."""
        display_status = self.get_display_status(obj)
        if display_status in {MeetingSession.Status.CANCELED, MeetingSession.Status.COMPLETED}:
            return []

        my_role = self.get_my_role(obj)
        if my_role == "MENTEE":
            return ["cancel", "reschedule"]
        if my_role == "MENTOR":
            return ["cancel"]
        return []


class FeedbackSerializer(serializers.ModelSerializer):
    """Read serializer for feedback entries."""

    submitted_by = ProfileSummarySerializer(read_only=True)

    class Meta:
        model = Feedback
        fields = ("id", "match", "submitted_by", "rating", "text", "created_at")
        read_only_fields = fields


class FeedbackCreateSerializer(serializers.Serializer):
    """Write serializer for submitting feedback on a match."""

    rating = serializers.IntegerField(min_value=1, max_value=5)
    text = serializers.CharField(required=False, default="", allow_blank=True)


class JourneyQueryParamsSerializer(serializers.Serializer):
    """Validate offset/limit query parameters for match journey feed."""

    offset = serializers.IntegerField(required=False, min_value=0, default=0)
    limit = serializers.IntegerField(required=False, min_value=1, max_value=200, default=50)


class JourneyEventSerializer(serializers.Serializer):
    """Read serializer for a single match journey event item."""

    id = serializers.CharField(read_only=True)
    type = serializers.CharField(read_only=True)
    category = serializers.CharField(read_only=True)
    timestamp = serializers.DateTimeField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    last_edited = serializers.DateTimeField(read_only=True, allow_null=True)
    actor_role = serializers.CharField(read_only=True)
    payload = serializers.JSONField(read_only=True)
    content = serializers.CharField(read_only=True, default="")
    media_url = serializers.URLField(read_only=True, allow_null=True, default=None)
    show_on_profile = serializers.BooleanField(read_only=True, default=False)
    author = serializers.SerializerMethodField()
    is_editable = serializers.SerializerMethodField()

    def get_author(self, obj: dict) -> dict | None:
        """Return compact profile summary for the event author, or None for AGTE events."""
        author_id = obj.get("author_id")
        if not author_id:
            return None
        try:
            profile = Profile.objects.get(id=author_id)
        except Profile.DoesNotExist:
            return None
        return ProfileSummarySerializer(profile).data

    def get_is_editable(self, obj: dict) -> bool:
        """Return True only for MCTE events (soft-deleted ones are excluded from feed)."""
        from timeline.models import TimelineEvent

        return obj.get("category") == TimelineEvent.Category.MCTE


class JourneyFeedSerializer(serializers.Serializer):
    """Read serializer for the paginated match journey feed envelope."""

    ordering = serializers.ChoiceField(choices=["desc"], read_only=True)
    count = serializers.IntegerField(read_only=True)
    offset = serializers.IntegerField(read_only=True)
    limit = serializers.IntegerField(read_only=True)
    results = JourneyEventSerializer(many=True, read_only=True)


_MCTE_EVENT_TYPE_CHOICES = ["achievement", "social", "progress"]


class MCTECreateSerializer(serializers.Serializer):
    """Write serializer for creating a manually-created timeline event."""

    event_type = serializers.ChoiceField(choices=_MCTE_EVENT_TYPE_CHOICES)
    content = serializers.CharField(required=True, max_length=2000)
    media_url = serializers.URLField(required=False, allow_null=True, default=None)
    timestamp = serializers.DateTimeField(required=False, allow_null=True, default=None)
    show_on_profile = serializers.BooleanField(required=False, default=False)

    def to_internal_value(self, data: Any) -> dict:
        """Normalize empty timestamp values to null so fallback logic can be applied."""
        if isinstance(data, dict) and data.get("timestamp") == "":
            data = {**data, "timestamp": None}
        return super().to_internal_value(data)

    def validate_timestamp(self, value: Any) -> Any:
        """Reject timestamps more than 1 day in the future when provided."""
        if value is None:
            return value
        if value > timezone.now() + timedelta(days=1):
            raise serializers.ValidationError("Timestamp cannot be more than 1 day in the future.")
        return value


class MCTEUpdateSerializer(serializers.Serializer):
    """Write serializer for partially updating a manually-created timeline event."""

    content = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    media_url = serializers.URLField(required=False, allow_null=True)
    show_on_profile = serializers.BooleanField(required=False)

    def validate(self, attrs: dict) -> dict:
        """Require at least one editable field to be provided."""
        if not attrs:
            raise serializers.ValidationError(
                "At least one of 'content', 'media_url', or 'show_on_profile' must be provided."
            )
        return attrs


class MCTEListQueryParamsSerializer(serializers.Serializer):
    """Validate query parameters for the MCTE event list endpoint."""

    event_type = serializers.ChoiceField(
        choices=_MCTE_EVENT_TYPE_CHOICES, required=False, allow_null=True, default=None
    )
    offset = serializers.IntegerField(required=False, min_value=0, default=0)
    limit = serializers.IntegerField(required=False, min_value=1, max_value=200, default=50)


class MCTEEventSerializer(serializers.Serializer):
    """Read serializer for a single MCTE event item."""

    id = serializers.UUIDField(read_only=True)
    source_id = serializers.CharField(read_only=True)
    event_type = serializers.CharField(read_only=True)
    content = serializers.CharField(read_only=True)
    media_url = serializers.URLField(read_only=True, allow_null=True)
    timestamp = serializers.DateTimeField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    last_edited = serializers.DateTimeField(read_only=True, allow_null=True)
    show_on_profile = serializers.BooleanField(read_only=True)
    actor_role = serializers.CharField(read_only=True)
    author = serializers.SerializerMethodField()

    def get_author(self, obj: Any) -> dict | None:
        """Return compact profile summary for the event author."""
        if obj.author is None:
            return None
        return ProfileSummarySerializer(obj.author).data


class MCTEFeedSerializer(serializers.Serializer):
    """Read serializer for the paginated MCTE event list envelope."""

    count = serializers.IntegerField(read_only=True)
    offset = serializers.IntegerField(read_only=True)
    limit = serializers.IntegerField(read_only=True)
    results = MCTEEventSerializer(many=True, read_only=True)
