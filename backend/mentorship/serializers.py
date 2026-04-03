"""Serializers for mentorship request and match API endpoints."""

from rest_framework import serializers

from accounts.models import AppUsageMode
from profiles.models import Profile

from .models import Match, MentorshipRequest


class ProfileSummarySerializer(serializers.ModelSerializer):
    """Compact profile representation for embedding in request/match responses."""

    class Meta:
        model = Profile
        fields = ("id", "username", "display_name", "picture_url", "title")
        read_only_fields = fields


class MentorshipRequestSerializer(serializers.ModelSerializer):
    """Read serializer for mentorship requests."""

    mentor = ProfileSummarySerializer(read_only=True)
    mentee = ProfileSummarySerializer(read_only=True)

    class Meta:
        model = MentorshipRequest
        fields = (
            "id",
            "mentor",
            "mentee",
            "status",
            "cover_letter",
            "created_at",
            "responded_at",
        )
        read_only_fields = fields


class MentorshipRequestCreateSerializer(serializers.Serializer):
    """Write serializer for creating a new mentorship request."""

    mentor_username = serializers.SlugField()
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

    def validate(self, attrs: dict) -> dict:
        """Reject self-requests."""
        mentee_profile: Profile = self.context["mentee_profile"]
        mentor_profile: Profile = attrs["mentor_username"]

        if mentor_profile == mentee_profile:
            raise serializers.ValidationError(
                {"mentor_username": "You cannot send a mentorship request to yourself."}
            )

        return attrs

    def create(self, validated_data: dict) -> MentorshipRequest:
        """Create a mentorship request from mentee to mentor."""
        mentee_profile: Profile = self.context["mentee_profile"]
        mentor_profile: Profile = validated_data["mentor_username"]
        cover_letter: str = validated_data.get("cover_letter", "")

        return MentorshipRequest.objects.create(
            mentor=mentor_profile,
            mentee=mentee_profile,
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
