"""Serializers for workshop API endpoints."""

from rest_framework import serializers

from profiles.models import Profile
from profiles.serializers import resolve_picture_url

from .models import Workshop, WorkshopParticipation


class WorkshopMentorSummarySerializer(serializers.ModelSerializer):
    """Compact mentor representation embedded in workshop responses."""

    picture_url = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ("id", "username", "display_name", "title", "picture_url")
        read_only_fields = fields

    def get_picture_url(self, obj: Profile) -> str:
        return resolve_picture_url(obj)


class WorkshopSerializer(serializers.ModelSerializer):
    """Read serializer for workshops."""

    mentor = WorkshopMentorSummarySerializer(read_only=True)
    confirmed_participant_count = serializers.SerializerMethodField()

    class Meta:
        model = Workshop
        fields = (
            "id",
            "mentor",
            "title",
            "description",
            "scheduled_start_at_utc",
            "scheduled_end_at_utc",
            "min_participants",
            "max_participants",
            "status",
            "confirmed_participant_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_confirmed_participant_count(self, obj: Workshop) -> int:
        """Sum of group_size for confirmed participations."""
        total = 0
        for entry in obj.participations.filter(status=WorkshopParticipation.Status.CONFIRMED):
            total += entry.group_size
        return total


class WorkshopCreateSerializer(serializers.Serializer):
    """Write serializer for creating a new workshop."""

    title = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    scheduled_start_at_utc = serializers.DateTimeField()
    scheduled_end_at_utc = serializers.DateTimeField()
    min_participants = serializers.IntegerField(min_value=1, default=1)
    max_participants = serializers.IntegerField(min_value=1)

    def validate(self, attrs: dict) -> dict:
        if attrs["scheduled_end_at_utc"] <= attrs["scheduled_start_at_utc"]:
            raise serializers.ValidationError(
                {"scheduled_end_at_utc": "End time must be after start time."}
            )
        if attrs["max_participants"] < attrs["min_participants"]:
            raise serializers.ValidationError(
                {"max_participants": "max_participants must be >= min_participants."}
            )
        return attrs


class WorkshopUpdateSerializer(serializers.Serializer):
    """Write serializer for partial updates to a workshop."""

    title = serializers.CharField(max_length=200, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    scheduled_start_at_utc = serializers.DateTimeField(required=False)
    scheduled_end_at_utc = serializers.DateTimeField(required=False)
    min_participants = serializers.IntegerField(min_value=1, required=False)
    max_participants = serializers.IntegerField(min_value=1, required=False)
    status = serializers.ChoiceField(
        choices=Workshop.Status.choices,
        required=False,
    )

    def validate(self, attrs: dict) -> dict:
        start = attrs.get("scheduled_start_at_utc")
        end = attrs.get("scheduled_end_at_utc")
        if start is not None and end is not None and end <= start:
            raise serializers.ValidationError(
                {"scheduled_end_at_utc": "End time must be after start time."}
            )
        return attrs


class WorkshopParticipationSerializer(serializers.ModelSerializer):
    """Read serializer for participation entries."""

    mentee = WorkshopMentorSummarySerializer(read_only=True)

    class Meta:
        model = WorkshopParticipation
        fields = (
            "id",
            "workshop",
            "mentee",
            "group_size",
            "status",
            "requested_at",
            "decided_at",
        )
        read_only_fields = fields


class WorkshopGroupJoinSerializer(serializers.Serializer):
    """Write serializer for group join requests."""

    group_size = serializers.IntegerField(min_value=2)


class WorkshopRespondSerializer(serializers.Serializer):
    """Write serializer for mentor decisions on pending participations."""

    accept = serializers.BooleanField()
