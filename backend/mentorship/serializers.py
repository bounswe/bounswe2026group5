"""Serializers for mentorship request and match API endpoints."""

from django.utils import timezone
from rest_framework import serializers

from accounts.models import AppUsageMode
from profiles.models import AvailabilitySlot, Profile

from .models import Match, MentorshipRequest


class ProfileSummarySerializer(serializers.ModelSerializer):
    """Compact profile representation for embedding in request/match responses."""

    class Meta:
        model = Profile
        fields = ("id", "username", "display_name", "picture_url", "title")
        read_only_fields = fields


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
        """Return selected slot date in local timezone."""
        slot_start_at = obj.slot.start_at if obj.slot is not None else obj.initial_session_start_at
        if slot_start_at is None:
            return None
        return timezone.localtime(slot_start_at).date().isoformat()

    def get_slot_start_time(self, obj: MentorshipRequest) -> str | None:
        """Return selected slot start time in local timezone."""
        slot_start_at = obj.slot.start_at if obj.slot is not None else obj.initial_session_start_at
        if slot_start_at is None:
            return None
        return timezone.localtime(slot_start_at).time().replace(microsecond=0).isoformat()

    def get_slot_end_time(self, obj: MentorshipRequest) -> str | None:
        """Return selected slot end time in local timezone."""
        slot_end_at = obj.slot.end_at if obj.slot is not None else obj.initial_session_end_at
        if slot_end_at is None:
            return None
        return timezone.localtime(slot_end_at).time().replace(microsecond=0).isoformat()


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

        if selected_slot.is_booked:
            raise serializers.ValidationError({"slot_id": "Selected slot is already booked."})

        if selected_slot.start_at <= timezone.now():
            raise serializers.ValidationError({"slot_id": "Selected slot is in the past."})

        has_pending_for_slot = MentorshipRequest.objects.filter(
            slot=selected_slot,
            status=MentorshipRequest.Status.PENDING,
        ).exists()
        if has_pending_for_slot:
            raise serializers.ValidationError(
                {"slot_id": "Selected slot already has a pending mentorship request."}
            )

        return attrs

    def create(self, validated_data: dict) -> MentorshipRequest:
        """Create a mentorship request from mentee to mentor."""
        mentee_profile: Profile = self.context["mentee_profile"]
        mentor_profile: Profile = validated_data["mentor_username"]
        selected_slot: AvailabilitySlot = validated_data["slot_id"]
        cover_letter: str = validated_data.get("cover_letter", "")

        return MentorshipRequest.objects.create(
            mentor=mentor_profile,
            mentee=mentee_profile,
            slot=selected_slot,
            cover_letter=cover_letter,
        )


class RespondToRequestSerializer(serializers.Serializer):
    """Write serializer for accepting or rejecting a pending mentorship request."""

    action = serializers.ChoiceField(choices=["accept", "reject"])


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
        """Return session date in local timezone."""
        return timezone.localtime(obj.start_at).date().isoformat()

    def get_slot_start_time(self, obj: AvailabilitySlot) -> str:
        """Return session start time in local timezone."""
        return timezone.localtime(obj.start_at).time().replace(microsecond=0).isoformat()

    def get_slot_end_time(self, obj: AvailabilitySlot) -> str:
        """Return session end time in local timezone."""
        return timezone.localtime(obj.end_at).time().replace(microsecond=0).isoformat()
