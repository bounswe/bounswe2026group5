"""Serializers for profile self-service API endpoints."""

from datetime import datetime

from accounts.models import AppUsageMode
from django.contrib.gis.geos import Point
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import AvailabilitySlot, Profile, Skill


class LocationField(serializers.Field):
    """Serialize a PointField as {latitude, longitude} and accept the same on input."""

    def to_representation(self, value):
        if value is None:
            return None
        return {"latitude": value.y, "longitude": value.x}

    def to_internal_value(self, data):
        if data is None:
            return None
        if isinstance(data, str) and not data.strip():
            return None
        if not isinstance(data, dict) or "latitude" not in data or "longitude" not in data:
            raise serializers.ValidationError(
                'Expected {"latitude": <float>, "longitude": <float>}.'
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


class SkillSerializer(serializers.ModelSerializer):
    """Read serializer for skills."""

    class Meta:
        model = Skill
        fields = ("id", "name")
        read_only_fields = fields


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


class MenteeProfileResponseSerializer(serializers.ModelSerializer):
    """Read serializer for mentee profile data."""

    full_name = serializers.CharField(source="display_name", read_only=True)
    hidden = serializers.BooleanField(source="is_visible", read_only=True)
    picture_url = serializers.URLField(read_only=True)
    eager_to_learn = serializers.ListField(
        child=serializers.CharField(), source="skills", read_only=True
    )

    class Meta:
        model = Profile
        fields = (
            "id",
            "full_name",
            "bio",
            "hidden",
            "picture_url",
            "eager_to_learn",
        )
        read_only_fields = fields

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Invert is_visible to get "hidden" semantics
        ret["hidden"] = not instance.is_visible
        return ret


class MentorProfileResponseSerializer(serializers.ModelSerializer):
    """Read serializer for mentor profile data."""

    full_name = serializers.CharField(source="display_name", read_only=True)
    title = serializers.CharField(read_only=True)
    hidden = serializers.BooleanField(source="is_visible", read_only=True)
    picture_url = serializers.URLField(read_only=True)
    expertises = serializers.ListField(
        child=serializers.CharField(), source="skills", read_only=True
    )
    rating = serializers.IntegerField(read_only=True)
    total_mentee_count = serializers.IntegerField(read_only=True)
    available_slots = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = (
            "id",
            "full_name",
            "title",
            "bio",
            "hidden",
            "picture_url",
            "expertises",
            "rating",
            "total_mentee_count",
            "available_slots",
        )
        read_only_fields = fields

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Invert is_visible to get "hidden" semantics
        ret["hidden"] = not instance.is_visible
        return ret

    @extend_schema_field(AvailabilitySlotSerializer(many=True))
    def get_available_slots(self, obj: Profile):
        """Return upcoming unbooked availability slots."""
        upcoming_slots = AvailabilitySlot.objects.filter(
            profile=obj,
            start_at__gte=timezone.now(),
            is_booked=False,
        ).order_by("start_at")
        return AvailabilitySlotSerializer(upcoming_slots, many=True).data


class ProfileResponseSerializer(serializers.ModelSerializer):
    """Fallback read serializer for profile data (when app_usage_mode is not set)."""

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
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Partial update serializer for authenticated user's profile."""

    location = LocationField(required=False, allow_null=True)
    eager_to_learn = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        write_only=True,
    )
    expertises = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        write_only=True,
    )

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
            "eager_to_learn",
            "expertises",
        )

    def validate(self, attrs: dict) -> dict:
        """Validate role-specific aliases for profile skills updates."""
        profile = self.instance
        if profile is None:
            return attrs

        user_mode = profile.user.app_usage_mode
        has_eager_to_learn = "eager_to_learn" in attrs
        has_expertises = "expertises" in attrs

        if has_eager_to_learn and user_mode != AppUsageMode.MENTEE:
            raise serializers.ValidationError(
                {"eager_to_learn": "Only mentee profiles can update eager_to_learn."}
            )

        if has_expertises and user_mode != AppUsageMode.MENTOR:
            raise serializers.ValidationError(
                {"expertises": "Only mentor profiles can update expertises."}
            )

        return attrs

    def update(self, instance: Profile, validated_data: dict) -> Profile:
        """Apply partial updates and map role aliases to the shared skills field."""
        eager_to_learn = validated_data.pop("eager_to_learn", None)
        expertises = validated_data.pop("expertises", None)

        if eager_to_learn is not None:
            validated_data["skills"] = eager_to_learn

        if expertises is not None:
            validated_data["skills"] = expertises

        return super().update(instance, validated_data)


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


def _get_display_initials(display_name: str) -> str:
    """Compute up to 2 initials from a display name."""
    parts = [p for p in display_name.split() if p]
    initials = "".join(p[0] for p in parts).upper()
    return initials[:2]


class PublicMentorProfileSearchResultSerializer(serializers.ModelSerializer):
    """
    Public search result serializer for mentor discovery.

    Notes:
    - Enforces `show_initials_only` by replacing `full_name` with initials.
    - Includes `hidden` (inverse of `is_visible`) for compatibility with the
      existing profile detail endpoints.
    """

    full_name = serializers.SerializerMethodField()
    username = serializers.CharField(read_only=True)
    hidden = serializers.BooleanField(source="is_visible", read_only=True)
    expertises = serializers.ListField(
        child=serializers.CharField(), source="skills", read_only=True
    )
    picture_url = serializers.URLField(read_only=True)
    location = LocationField(read_only=True)
    show_initials_only = serializers.BooleanField(read_only=True)

    class Meta:
        model = Profile
        fields = (
            "id",
            "username",
            "full_name",
            "bio",
            "hidden",
            "picture_url",
            "title",
            "location",
            "show_initials_only",
            "expertises",
            "rating",
            "total_mentee_count",
        )
        read_only_fields = fields

    def get_full_name(self, obj: Profile) -> str:
        if obj.show_initials_only:
            return _get_display_initials(obj.display_name or "")
        return obj.display_name

    def to_representation(self, instance: Profile) -> dict:
        ret = super().to_representation(instance)
        # Invert is_visible to get "hidden" semantics.
        ret["hidden"] = not instance.is_visible
        return ret


class PublicMentorProfileSearchListResponseSerializer(serializers.Serializer):
    """Paginated response wrapper for public mentor discovery."""

    count = serializers.IntegerField()
    page = serializers.IntegerField()
    pageSize = serializers.IntegerField()
    results = PublicMentorProfileSearchResultSerializer(many=True)
