from datetime import datetime
from typing import Any, TYPE_CHECKING, cast

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from django.core import validators
from django.db import transaction
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import AvailabilitySlot, Profile, Skill
from core.utils.timezone import get_project_timezone, to_local_time

if TYPE_CHECKING:
    from accounts.models import User as UserType
else:
    UserType = Any

User = get_user_model()


class LocationField(serializers.Field):
    """Serialize a PointField as {latitude, longitude} and accept the same on input."""

    def to_representation(self, value: Any) -> dict[str, float] | None:
        """Convert PointField to {latitude, longitude} dictionary."""
        if value is None:
            return None
        return {"latitude": value.y, "longitude": value.x}

    def to_internal_value(self, data: Any) -> Point | None:
        """Convert {latitude, longitude} dictionary to PointField."""
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
    sessionId = serializers.SerializerMethodField()

    class Meta:
        model = AvailabilitySlot
        fields = (
            "id",
            "date",
            "startTime",
            "endTime",
            "status",
            "is_booked",
            "bookedBy",
            "bookedAt",
            "sessionId",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    @extend_schema_field(OpenApiTypes.DATE)
    def get_date(self, obj: AvailabilitySlot) -> str:
        """Return slot date in project timezone."""
        return to_local_time(obj.start_at).date().isoformat()

    @extend_schema_field(OpenApiTypes.TIME)
    def get_startTime(self, obj: AvailabilitySlot) -> str:
        """Return slot start time in project timezone."""
        return to_local_time(obj.start_at).time().replace(microsecond=0).isoformat()

    @extend_schema_field(OpenApiTypes.TIME)
    def get_endTime(self, obj: AvailabilitySlot) -> str:
        """Return slot end time in project timezone."""
        return to_local_time(obj.end_at).time().replace(microsecond=0).isoformat()

    @extend_schema_field(OpenApiTypes.STR)
    def get_bookedBy(self, obj: AvailabilitySlot) -> str | None:
        """Return booking owner's profile username when available."""
        if obj.booked_by is None:
            return None

        booked_profile = getattr(obj.booked_by, "profile", None)
        if booked_profile is None:
            return None

        return booked_profile.username

    @extend_schema_field(OpenApiTypes.STR)
    def get_sessionId(self, obj: AvailabilitySlot) -> str | None:
        """Return the ID of an active MeetingSession associated with this slot."""
        if not obj.is_booked:
            return None

        # Inline import to avoid circular dependency
        from mentorship.models import MeetingSession

        session = MeetingSession.objects.filter(
            source_slot=obj,
            status__in=[MeetingSession.Status.SCHEDULED, MeetingSession.Status.RESCHEDULED],
        ).first()
        return str(session.id) if session else None


class MenteeProfileResponseSerializer(serializers.ModelSerializer):
    """Read serializer for mentee profile data."""

    full_name = serializers.CharField(source="display_name", read_only=True)
    hidden = serializers.BooleanField(source="is_visible", read_only=True)
    picture_url = serializers.URLField(read_only=True)
    skills = serializers.ListField(child=serializers.CharField(), read_only=True)

    class Meta:
        model = Profile
        fields = (
            "id",
            "username",
            "full_name",
            "bio",
            "hidden",
            "picture_url",
            "skills",
        )
        read_only_fields = fields

    def to_representation(self, instance: Profile) -> dict[str, Any]:
        """Add 'hidden' field to the output representation."""
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
    skills = serializers.ListField(child=serializers.CharField(), read_only=True)
    rating = serializers.IntegerField(read_only=True)
    total_mentee_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Profile
        fields = (
            "id",
            "username",
            "full_name",
            "title",
            "bio",
            "hidden",
            "picture_url",
            "skills",
            "rating",
            "total_mentee_count",
        )
        read_only_fields = fields

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Invert is_visible to get "hidden" semantics
        ret["hidden"] = not instance.is_visible
        return ret


class ProfileResponseSerializer(serializers.ModelSerializer):
    """Fallback read serializer for profile data (when app_usage_mode is not set)."""

    location = LocationField(read_only=True)
    skills = serializers.ListField(child=serializers.CharField(), read_only=True)

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
            "skills",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class UsernameUpdateMixin:
    """Shared logic for username validation and cross-model synchronization."""

    def _validate_unique_username(self, value: str, instance: Profile) -> str:
        """Ensure username is unique across both Profile and User models."""
        username = value.lower()
        # Check Profile uniqueness
        if Profile.objects.filter(username=username).exclude(id=instance.id).exists():
            raise serializers.ValidationError("This username is already taken.")
        # Check User uniqueness
        if User.objects.filter(username=username).exclude(id=instance.user.id).exists():
            raise serializers.ValidationError("This username is already taken.")
        return username

    def _sync_user_username(self, user: Any, new_username: str) -> None:
        """Update the username on the User model if it has changed."""
        if user.username != new_username:
            user.username = new_username
            user.save(update_fields=["username"])


class ProfileUpdateSerializer(UsernameUpdateMixin, serializers.ModelSerializer):
    """Partial update serializer for authenticated user's profile."""

    location = LocationField(required=False, allow_null=True)
    skills = serializers.ListField(
        child=serializers.CharField(),
        required=False,
    )

    username = serializers.CharField(
        max_length=50,
        required=False,
        validators=[
            validators.RegexValidator(
                regex=r"^[a-zA-Z0-9_]+$",
                message="Username can only contain alphanumeric characters and underscores.",
            )
        ],
    )

    class Meta:
        model = Profile
        fields = (
            "username",
            "display_name",
            "bio",
            "picture_url",
            "title",
            "location",
            "is_visible",
            "show_initials_only",
            "skills",
        )

    def validate_username(self, value: str) -> str:
        """Ensure username is unique across both Profile and User models."""
        if self.instance is None:
            return value.lower()
        return self._validate_unique_username(value, cast(Profile, self.instance))

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        """Validate profile update payload."""
        return attrs

    @transaction.atomic
    def update(self, instance: Profile, validated_data: dict[str, Any]) -> Profile:
        """Apply partial updates and sync username to User model if changed."""
        new_username = validated_data.get("username")
        if new_username:
            self._sync_user_username(instance.user, new_username)

        return super().update(instance, validated_data)


class ProfileUsernameUpdateSerializer(UsernameUpdateMixin, serializers.ModelSerializer):
    """Dedicated serializer for updating only the username."""

    username = serializers.CharField(
        max_length=50,
        validators=[
            validators.RegexValidator(
                regex=r"^[a-zA-Z0-9_]+$",
                message="Username can only contain alphanumeric characters and underscores.",
            )
        ],
    )

    class Meta:
        model = Profile
        fields = ("username",)

    def validate_username(self, value: str) -> str:
        """Ensure username is unique across both Profile and User models."""
        if self.instance is None:
            return value.lower()
        return self._validate_unique_username(value, cast(Profile, self.instance))

    @transaction.atomic
    def update(self, instance: Profile, validated_data: dict[str, Any]) -> Profile:
        """Update username on both Profile and User models."""
        new_username = validated_data["username"]
        self._sync_user_username(instance.user, new_username)
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
                slot_date = to_local_time(self.instance.start_at).date()
            if start_time is None:
                start_time = to_local_time(self.instance.start_at).time()
            if end_time is None:
                end_time = to_local_time(self.instance.end_at).time()

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

        timezone_info = get_project_timezone()
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
    skills = serializers.ListField(child=serializers.CharField(), read_only=True)
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
            "skills",
            "rating",
            "total_mentee_count",
        )
        read_only_fields = fields

    def get_full_name(self, obj: Profile) -> str:
        """Return display name or initials based on 'show_initials_only' setting."""
        if obj.show_initials_only:
            return _get_display_initials(obj.display_name or "")
        return obj.display_name

    def to_representation(self, instance: Profile) -> dict[str, Any]:
        """Add 'hidden' field to the output representation."""
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
