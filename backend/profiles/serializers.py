"""Serializers for profile self-service API endpoints."""

from datetime import datetime

from django.contrib.gis.geos import Point
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import AvailabilitySlot, MentorshipMode, Profile


class LocationField(serializers.Field):
    """Serialize a PointField as {latitude, longitude} and accept the same on input."""

    def to_representation(self, value):
        if value is None:
            return None
        return {"latitude": value.y, "longitude": value.x}

    def to_internal_value(self, data):
        if data is None:
            return None
        if not isinstance(data, dict) or "latitude" not in data or "longitude" not in data:
            raise serializers.ValidationError(
                "Expected {\"latitude\": <float>, \"longitude\": <float>}."
            )
        try:
            lat = float(data["latitude"])
            lng = float(data["longitude"])
        except (TypeError, ValueError):
            raise serializers.ValidationError("latitude and longitude must be numbers.")
        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            raise serializers.ValidationError(
                "latitude must be between -90 and 90, longitude between -180 and 180."
            )
        return Point(lng, lat, srid=4326)


class ProfileResponseSerializer(serializers.ModelSerializer):
    """Read serializer for authenticated user's profile data."""

    location = LocationField(read_only=True)

    class Meta:
        model = Profile
        fields = (
            "id",
            "username",
            "display_name",
            "bio",
            "picture_url",
            "title",
            "location",
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
    location = LocationField(required=False, allow_null=True)

    class Meta:
        model = Profile
        fields = (
            "display_name",
            "bio",
            "picture_url",
            "title",
            "location",
            "is_visible",
            "show_initials_only",
            "mentorship_mode",
        )


class AvailabilitySlotSerializer(serializers.ModelSerializer):
    """Read serializer for mentor availability slots."""

    date = serializers.SerializerMethodField()
    startTime = serializers.SerializerMethodField()
    endTime = serializers.SerializerMethodField()
    bookedBy = serializers.SerializerMethodField()
    bookedAt = serializers.DateTimeField(source="booked_at", read_only=True)

    class Meta:
        model = AvailabilitySlot
        fields = (
            "id",
            "date",
            "startTime",
            "endTime",
            "is_booked",
            "bookedBy",
            "bookedAt",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    @extend_schema_field(OpenApiTypes.DATE)
    def get_date(self, obj: AvailabilitySlot) -> str:
        """Return slot date in current timezone."""
        return timezone.localtime(obj.start_at).date().isoformat()

    @extend_schema_field(OpenApiTypes.TIME)
    def get_startTime(self, obj: AvailabilitySlot) -> str:
        """Return slot start time in current timezone."""
        return timezone.localtime(obj.start_at).time().replace(microsecond=0).isoformat()

    @extend_schema_field(OpenApiTypes.TIME)
    def get_endTime(self, obj: AvailabilitySlot) -> str:
        """Return slot end time in current timezone."""
        return timezone.localtime(obj.end_at).time().replace(microsecond=0).isoformat()

    @extend_schema_field(OpenApiTypes.STR)
    def get_bookedBy(self, obj: AvailabilitySlot) -> str | None:
        """Return booking owner's profile username when available."""
        if obj.booked_by is None:
            return None

        booked_profile = getattr(obj.booked_by, "profile", None)
        if booked_profile is None:
            return None

        return booked_profile.username


class AvailabilitySlotWriteSerializer(serializers.Serializer):
    """Create/update serializer for mentor availability slots."""

    date = serializers.DateField(required=False)
    startTime = serializers.TimeField(required=False)
    endTime = serializers.TimeField(required=False)

    def validate(self, attrs: dict) -> dict:
        """Validate date and time constraints for an availability slot."""
        slot_date = attrs.get("date")
        start_time = attrs.get("startTime")
        end_time = attrs.get("endTime")

        if self.instance is not None:
            if slot_date is None:
                slot_date = timezone.localtime(self.instance.start_at).date()
            if start_time is None:
                start_time = timezone.localtime(self.instance.start_at).time()
            if end_time is None:
                end_time = timezone.localtime(self.instance.end_at).time()

        if slot_date is None:
            raise serializers.ValidationError({"date": "Date is required."})

        if start_time is None:
            raise serializers.ValidationError({"startTime": "startTime is required."})

        if end_time is None:
            raise serializers.ValidationError({"endTime": "endTime is required."})

        if slot_date < timezone.localdate():
            raise serializers.ValidationError({"date": "Date cannot be in the past."})

        if end_time <= start_time:
            raise serializers.ValidationError(
                {"endTime": "endTime must be greater than startTime."}
            )

        timezone_info = timezone.get_current_timezone()
        attrs["start_at"] = timezone.make_aware(
            datetime.combine(slot_date, start_time),
            timezone_info,
        )
        attrs["end_at"] = timezone.make_aware(
            datetime.combine(slot_date, end_time),
            timezone_info,
        )
        return attrs

    def create(self, validated_data: dict) -> AvailabilitySlot:
        """Create a slot for the profile passed in serializer context."""
        profile = self.context["profile"]
        return AvailabilitySlot.objects.create(
            profile=profile,
            start_at=validated_data["start_at"],
            end_at=validated_data["end_at"],
        )

    def update(self, instance: AvailabilitySlot, validated_data: dict) -> AvailabilitySlot:
        """Update an existing availability slot."""
        instance.start_at = validated_data["start_at"]
        instance.end_at = validated_data["end_at"]
        instance.save(update_fields=["start_at", "end_at", "updated_at"])
        return instance
