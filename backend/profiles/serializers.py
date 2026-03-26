"""Serializers for profile self-service API endpoints."""

from rest_framework import serializers

from .models import MentorshipMode, Profile


class ProfileResponseSerializer(serializers.ModelSerializer):
    """Read serializer for authenticated user's profile data."""

    class Meta:
        model = Profile
        fields = (
            "id",
            "username",
            "display_name",
            "bio",
            "picture_url",
            "title",
            "location_text",
            "is_visible",
            "show_initials_only",
            "mentorship_mode",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Partial update serializer for authenticated user's profile."""

    mentorship_mode = serializers.ChoiceField(choices=MentorshipMode.choices)

    class Meta:
        model = Profile
        fields = (
            "display_name",
            "bio",
            "picture_url",
            "title",
            "location_text",
            "is_visible",
            "show_initials_only",
            "mentorship_mode",
        )
