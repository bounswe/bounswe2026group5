from datetime import datetime, timedelta
from typing import Any, cast

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from django.core import validators
from django.db import transaction
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from core.utils.image import resize_image
from core.utils.timezone import get_project_timezone, to_local_time
from core.utils.validators import validate_file_size, validate_image_content_type
from mentorship.models import MeetingSession
from timeline.models import TimelineEvent

from .models import AvailabilitySlot, CommunityTag, Profile, Skill

User = get_user_model()


@extend_schema_field(OpenApiTypes.OBJECT)
def resolve_picture_url(profile: Profile) -> str:
    """Return the best available picture URL for a profile.

    Priority:
    1. Uploaded picture file (ImageField) — when present, return its URL.
    2. External picture_url (URLField) — e.g. Google OAuth avatar.
    3. Empty string — no picture available.
    """
    if profile.picture and hasattr(profile.picture, "url"):
        try:
            return profile.picture.url
        except ValueError:
            pass
    return profile.picture_url or ""


@extend_schema_field(
    {
        "type": "object",
        "properties": {
            "latitude": {"type": "number", "format": "float"},
            "longitude": {"type": "number", "format": "float"},
        },
        "nullable": True,
    }
)
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


class ProfilePictureUploadSerializer(serializers.Serializer):
    """Write serializer for uploading a profile picture."""

    picture = serializers.ImageField(required=True)

    def validate_picture(self, picture):
        """Validate image content-type and enforce a size limit."""
        from django.conf import settings

        validate_image_content_type(picture)
        validate_file_size(
            picture,
            settings.MAX_PROFILE_PICTURE_SIZE_BYTES,
            label="Profile picture",
        )
        return picture

    def save_picture(self, profile: Profile):
        """Resize the image and persist it on the profile."""
        from django.conf import settings

        picture = self.validated_data["picture"]
        resized = resize_image(
            picture,
            max_dimension=settings.PROFILE_PICTURE_MAX_DIMENSION,
            output_format="JPEG",
        )

        # Delete old uploaded picture file if it exists
        if profile.picture:
            try:
                profile.picture.delete(save=False)
            except Exception:
                pass

        profile.picture.save(resized.name, resized, save=True)
        return profile


class PostMediaUploadSerializer(serializers.Serializer):
    """Write serializer for uploading media files attached to posts."""

    file = serializers.FileField(required=True)

    def validate_file(self, file):
        """Validate content-type (image or PDF) and enforce a size limit."""
        from django.conf import settings

        from core.utils.validators import validate_media_content_type

        validate_media_content_type(file)
        validate_file_size(
            file,
            settings.MAX_POST_MEDIA_SIZE_BYTES,
            label="Post media",
        )
        return file

    def save_file(self):
        """Resize (if image) and persist the file, returning the public URL."""
        from django.conf import settings
        from django.core.files.storage import default_storage

        from core.utils.validators import IMAGE_CONTENT_TYPES

        uploaded = self.validated_data["file"]

        # If it's an image, resize; otherwise save as-is
        if uploaded.content_type in IMAGE_CONTENT_TYPES:
            processed = resize_image(
                uploaded,
                max_dimension=settings.POST_MEDIA_MAX_DIMENSION,
                output_format="JPEG",
            )
        else:
            processed = uploaded

        import uuid as _uuid

        from django.utils import timezone as _tz

        now = _tz.now()
        filename = f"{_uuid.uuid4().hex}_{processed.name}"
        path = f"post_media/{now.year}/{now.month:02d}" f"/{now.day:02d}/{filename}"
        saved_path = default_storage.save(path, processed)
        return default_storage.url(saved_path)


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
        if obj.status != AvailabilitySlot.Status.BOOKED:
            return None

        session = MeetingSession.objects.filter(
            source_slot=obj,
            status__in=[MeetingSession.Status.SCHEDULED, MeetingSession.Status.RESCHEDULED],
        ).first()
        return str(session.id) if session else None


class MenteeProfileResponseSerializer(serializers.ModelSerializer):
    """Read serializer for mentee profile data."""

    full_name = serializers.SerializerMethodField()
    picture_url = serializers.SerializerMethodField()
    skills = serializers.ListField(child=serializers.CharField(), read_only=True)
    show_initials_only = serializers.BooleanField(read_only=True)

    class Meta:
        model = Profile
        fields = (
            "id",
            "username",
            "full_name",
            "bio",
            "show_initials_only",
            "picture_url",
            "skills",
        )
        read_only_fields = fields

    @extend_schema_field(OpenApiTypes.STR)
    def get_full_name(self, obj: Profile) -> str:
        """Return display name or initials based on 'show_initials_only' setting."""
        if obj.show_initials_only:
            return _get_display_initials(obj.display_name or "")
        return obj.display_name

    @extend_schema_field(OpenApiTypes.URI)
    def get_picture_url(self, obj: Profile) -> str:
        """Return uploaded picture URL or external URL fallback, respecting privacy."""
        if obj.show_initials_only:
            request = self.context.get("request")
            if request and request.user.is_authenticated and request.user == obj.user:
                return resolve_picture_url(obj)
            return ""
        return resolve_picture_url(obj)


class MentorProfileResponseSerializer(serializers.ModelSerializer):
    """Read serializer for mentor profile data."""

    full_name = serializers.SerializerMethodField()
    title = serializers.CharField(read_only=True)
    picture_url = serializers.SerializerMethodField()
    skills = serializers.ListField(child=serializers.CharField(), read_only=True)
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2, read_only=True)
    total_mentee_count = serializers.IntegerField(read_only=True)
    show_initials_only = serializers.BooleanField(read_only=True)

    class Meta:
        model = Profile
        fields = (
            "id",
            "username",
            "full_name",
            "title",
            "bio",
            "show_initials_only",
            "picture_url",
            "skills",
            "average_rating",
            "total_mentee_count",
        )
        read_only_fields = fields

    @extend_schema_field(OpenApiTypes.STR)
    def get_full_name(self, obj: Profile) -> str:
        """Return display name or initials based on 'show_initials_only' setting."""
        if obj.show_initials_only:
            return _get_display_initials(obj.display_name or "")
        return obj.display_name

    @extend_schema_field(OpenApiTypes.URI)
    def get_picture_url(self, obj: Profile) -> str:
        """Return uploaded picture URL or external URL fallback, respecting privacy."""
        if obj.show_initials_only:
            request = self.context.get("request")
            if request and request.user.is_authenticated and request.user == obj.user:
                return resolve_picture_url(obj)
            return ""
        return resolve_picture_url(obj)


class ProfileResponseSerializer(serializers.ModelSerializer):
    """Fallback read serializer for profile data (when app_usage_mode is not set)."""

    location = LocationField(read_only=True)
    skills = serializers.ListField(child=serializers.CharField(), read_only=True)
    picture_url = serializers.SerializerMethodField()

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
            "show_initials_only",
            "skills",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    @extend_schema_field(OpenApiTypes.URI)
    def get_picture_url(self, obj: Profile) -> str:
        """Return uploaded picture URL or external URL fallback, respecting privacy."""
        if obj.show_initials_only:
            request = self.context.get("request")
            if request and request.user.is_authenticated and request.user == obj.user:
                return resolve_picture_url(obj)
            return ""
        return resolve_picture_url(obj)


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
    share_precise_location = serializers.BooleanField(required=False)
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
            "share_precise_location",
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
    """

    full_name = serializers.SerializerMethodField()
    username = serializers.CharField(read_only=True)
    skills = serializers.ListField(child=serializers.CharField(), read_only=True)
    location = serializers.SerializerMethodField()
    picture_url = serializers.SerializerMethodField()
    show_initials_only = serializers.BooleanField(read_only=True)
    distance_km = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = (
            "id",
            "username",
            "full_name",
            "bio",
            "picture_url",
            "title",
            "location",
            "show_initials_only",
            "skills",
            "average_rating",
            "total_mentee_count",
            "distance_km",
        )
        read_only_fields = fields

    def get_full_name(self, obj: Profile) -> str:
        """Return display name or initials based on 'show_initials_only' setting."""
        if obj.show_initials_only:
            return _get_display_initials(obj.display_name or "")
        return obj.display_name

    @extend_schema_field(OpenApiTypes.URI)
    def get_picture_url(self, obj: Profile) -> str:
        """Return uploaded picture URL or external URL fallback, respecting privacy."""
        if obj.show_initials_only:
            request = self.context.get("request")
            if request and request.user.is_authenticated and request.user == obj.user:
                return resolve_picture_url(obj)
            return ""
        return resolve_picture_url(obj)

    @extend_schema_field(LocationField)
    def get_location(self, obj: Profile) -> dict[str, float] | None:
        """Return location with privacy jitter if precise location is not shared."""
        if not obj.location:
            return None
        lat = obj.location.y
        lng = obj.location.x
        if not obj.share_precise_location:
            import random

            # Apply a random shift of up to ~4km (roughly 0.04 degrees)
            lat += random.uniform(-0.04, 0.04)
            lng += random.uniform(-0.04, 0.04)
        return {"latitude": lat, "longitude": lng}

    @extend_schema_field(OpenApiTypes.FLOAT)
    def get_distance_km(self, obj: Profile) -> float | None:
        """Return distance annotated by the view."""
        distance = getattr(obj, "distance", None)
        if distance is not None:
            return round(distance.km, 2)
        return None


class PublicMentorProfileSearchListResponseSerializer(serializers.Serializer):
    """Paginated response wrapper for public mentor discovery."""

    count = serializers.IntegerField()
    page = serializers.IntegerField()
    pageSize = serializers.IntegerField()
    results = PublicMentorProfileSearchResultSerializer(many=True)


_PROFILE_POST_EVENT_TYPE_CHOICES = ["achievement", "social", "progress"]
_PROFILE_POST_CATEGORY_CHOICES = ["PrP", "MCTE", "CoP"]


class ProfilePostAuthorSerializer(serializers.ModelSerializer):
    """Compact profile representation for profile post responses."""

    display_name = serializers.SerializerMethodField()
    picture_url = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ("id", "username", "display_name", "picture_url", "title", "show_initials_only")
        read_only_fields = fields

    @extend_schema_field(OpenApiTypes.STR)
    def get_display_name(self, obj: Profile) -> str:
        """Return display name or initials based on 'show_initials_only' setting."""
        if obj.show_initials_only:
            return _get_display_initials(obj.display_name or "")
        return obj.display_name

    @extend_schema_field(OpenApiTypes.URI)
    def get_picture_url(self, obj: Profile) -> str:
        """Return uploaded picture URL or external URL fallback, respecting privacy."""
        if obj.show_initials_only:
            request = self.context.get("request")
            if request and request.user.is_authenticated and request.user == obj.user:
                return resolve_picture_url(obj)
            return ""
        return resolve_picture_url(obj)


class PrPCreateSerializer(serializers.Serializer):
    """Write serializer for creating a profile post (PrP)."""

    event_type = serializers.ChoiceField(choices=_PROFILE_POST_EVENT_TYPE_CHOICES)
    content = serializers.CharField(required=True, max_length=2000)
    media_url = serializers.URLField(required=False, allow_null=True, default=None)
    timestamp = serializers.DateTimeField(required=False, allow_null=True, default=None)

    def to_internal_value(self, data: Any) -> dict:
        """Normalize empty timestamp values to null so fallback logic can be applied."""
        if isinstance(data, dict) and data.get("timestamp") == "":
            data = {**data, "timestamp": None}
        return super().to_internal_value(data)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        """Reject timestamps more than 1 day in the future when provided."""
        timestamp = attrs.get("timestamp")
        if timestamp is not None and timestamp > timezone.now() + timedelta(days=1):
            raise serializers.ValidationError(
                {"timestamp": "Timestamp cannot be more than 1 day in the future."}
            )
        return attrs


class PrPUpdateSerializer(serializers.Serializer):
    """Write serializer for partially updating a profile post."""

    content = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    event_type = serializers.ChoiceField(choices=_PROFILE_POST_EVENT_TYPE_CHOICES, required=False)
    media_url = serializers.URLField(required=False, allow_null=True)

    def validate(self, attrs: dict) -> dict:
        """Require at least one editable field to be provided."""
        if not attrs:
            raise serializers.ValidationError(
                "At least one of 'content', 'event_type', or 'media_url' must be provided."
            )
        return attrs


class ProfilePostListQueryParamsSerializer(serializers.Serializer):
    """Validate query parameters for profile post listing endpoint."""

    category = serializers.ChoiceField(
        choices=_PROFILE_POST_CATEGORY_CHOICES,
        required=False,
        allow_null=True,
        default=None,
    )
    event_type = serializers.ChoiceField(
        choices=_PROFILE_POST_EVENT_TYPE_CHOICES,
        required=False,
        allow_null=True,
        default=None,
    )
    offset = serializers.IntegerField(required=False, min_value=0, default=0)
    limit = serializers.IntegerField(required=False, min_value=1, max_value=200, default=50)


class ProfilePostSerializer(serializers.Serializer):
    """Read serializer for profile feed items (PrP, visible MCTE, and visible CoP).

    ``community_id``, ``community_name``, ``community_slug``, and ``tagged_users`` are
    populated only for CoP posts. ``community_name`` and ``community_slug`` are fetched
    live; if the community has been deleted they fall back to snapshotted values in
    ``payload`` at creation time. ``tagged_users``
    is a list of ``{user_id, username}`` dicts; usernames are snapshots captured at
    tag-time and fall back to the stored snapshot if a user was later deleted.
    ``mentorship_partner`` is populated only for MCTE posts and contains the username of
    the mentorship partner (mentor or mentee, depending on the author's role).
    Clients can use ``community_id`` to navigate to ``/api/profiles/tags/{community_id}/`` or link
    to the community feed at ``/api/profiles/tags/{community_id}/posts/``.
    """

    id = serializers.UUIDField(read_only=True)
    source_id = serializers.CharField(read_only=True)
    category = serializers.CharField(read_only=True)
    event_type = serializers.CharField(read_only=True)
    content = serializers.CharField(read_only=True)
    media_url = serializers.URLField(read_only=True, allow_null=True)
    timestamp = serializers.DateTimeField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    last_edited = serializers.DateTimeField(read_only=True, allow_null=True)
    show_on_profile = serializers.BooleanField(read_only=True)
    community_id = serializers.UUIDField(read_only=True, allow_null=True)
    community_name = serializers.SerializerMethodField()
    community_slug = serializers.SerializerMethodField()
    tagged_users = serializers.SerializerMethodField()
    actor_role = serializers.CharField(read_only=True)
    mentorship_partner = serializers.SerializerMethodField()
    author = ProfilePostAuthorSerializer(read_only=True)

    @extend_schema_field({"type": "string", "nullable": True})
    def get_community_name(self, obj: TimelineEvent) -> str | None:
        """Return the community name for CoP events.

        First tries to fetch the live name from the database. Falls back to the
        name stored in payload at creation time if the community has been deleted.
        """
        if obj.category != TimelineEvent.Category.COP or obj.community_id is None:
            return None

        community = CommunityTag.objects.filter(id=obj.community_id).values("name").first()
        if community is not None:
            return community["name"]

        # Community was deleted — fall back to snapshot stored at creation time
        payload = obj.payload or {}
        return payload.get("community_name")

    @extend_schema_field({"type": "string", "nullable": True})
    def get_community_slug(self, obj: TimelineEvent) -> str | None:
        """Return the community slug for CoP events.

        First tries to fetch the live slug from the database. Falls back to the
        slug stored in payload at creation time if the community has been deleted.
        """
        if obj.category != TimelineEvent.Category.COP or obj.community_id is None:
            return None

        community = CommunityTag.objects.filter(id=obj.community_id).values("slug").first()
        if community is not None:
            return community["slug"]

        payload = obj.payload or {}
        return payload.get("community_slug")

    @extend_schema_field(
        {
            "type": "array",
            "nullable": True,
            "items": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "string", "format": "uuid"},
                    "username": {"type": "string"},
                },
            },
        }
    )
    def get_tagged_users(self, obj: TimelineEvent) -> list[dict[str, str]] | None:
        """Return tagged users for CoP events.

        Returns a list of ``{user_id, username}`` dicts extracted from the event
        payload. Usernames are captured as snapshots at tag-time; if a tagged user
        has since been deleted, the stored snapshot username is returned.
        Returns ``None`` for non-CoP events.
        """
        if obj.category != TimelineEvent.Category.COP:
            return None

        payload = obj.payload or {}
        tagged_users_list = payload.get("tagged_users", [])
        return [
            {"user_id": tag["user_id"], "username": tag["username"]} for tag in tagged_users_list
        ]

    @extend_schema_field({"type": "string", "nullable": True})
    def get_mentorship_partner(self, obj: TimelineEvent) -> str | None:
        """Return the username of the mentorship partner for MCTE events.

        For MCTE events, returns the username of the mentee or mentor (whichever is not
        the author). For other event types, returns None.

        The username is resolved from the live mentorship relation.
        """
        if obj.category != TimelineEvent.Category.MCTE:
            return None

        if obj.author is None:
            return None

        if obj.mentorship is None:
            return None

        # Determine partner based on author's role.
        if obj.author == obj.mentorship.mentor:
            return obj.mentorship.mentee.username
        if obj.author == obj.mentorship.mentee:
            return obj.mentorship.mentor.username

        return None


class ProfilePostFeedSerializer(serializers.Serializer):
    """Paginated response wrapper for profile posts feed."""

    count = serializers.IntegerField(read_only=True)
    offset = serializers.IntegerField(read_only=True)
    limit = serializers.IntegerField(read_only=True)
    results = ProfilePostSerializer(many=True, read_only=True)


# ---------------------------------------------------------------------------
# Community Tags
# ---------------------------------------------------------------------------


class CommunityTagListSerializer(serializers.ModelSerializer):
    """Read serializer for community tag list items."""

    location = LocationField(read_only=True)

    class Meta:
        model = CommunityTag
        fields = ("id", "name", "slug", "description", "location", "member_count", "created_at")
        read_only_fields = fields


class CommunityTagDetailSerializer(serializers.ModelSerializer):
    """Read serializer for community tag detail, includes creator info."""

    created_by_username = serializers.SerializerMethodField()
    is_member = serializers.SerializerMethodField()
    location = LocationField(read_only=True)

    class Meta:
        model = CommunityTag
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "location",
            "member_count",
            "created_by_username",
            "is_member",
            "created_at",
        )
        read_only_fields = fields

    @extend_schema_field(OpenApiTypes.STR)
    def get_created_by_username(self, obj) -> str | None:
        if obj.created_by is not None:
            return obj.created_by.username
        return None

    @extend_schema_field(OpenApiTypes.BOOL)
    def get_is_member(self, obj) -> bool:
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return False
        profile = getattr(request.user, "profile", None)
        if profile is None:
            return False
        return obj.memberships.filter(profile=profile).exists()


class CommunityTagCreateSerializer(serializers.Serializer):
    """Write serializer for creating a new community tag."""

    name = serializers.CharField(max_length=120)
    description = serializers.CharField(required=False, default="", allow_blank=True)

    def validate_name(self, value: str) -> str:
        name = value.strip()
        if not name:
            raise serializers.ValidationError("Tag name must not be empty.")
        if CommunityTag.objects.filter(name__iexact=name).exists():
            raise serializers.ValidationError("A community tag with this name already exists.")
        return name

    def create(self, validated_data: dict) -> "CommunityTag":
        profile = self.context.get("profile")
        location = profile.location if profile else None
        return CommunityTag.objects.create(
            name=validated_data["name"],
            description=validated_data.get("description", ""),
            created_by=profile,
            location=location,
        )


class CommunityTagUpdateSerializer(serializers.Serializer):
    """Write serializer for updating an existing community tag.

    Only `description` is writable. Any other fields in the payload
    (e.g. `name`, `slug`) are silently ignored to keep tag URLs stable.
    """

    description = serializers.CharField(required=False, allow_blank=True)

    def update(self, instance: "CommunityTag", validated_data: dict) -> "CommunityTag":
        if "description" in validated_data:
            instance.description = validated_data["description"]
            instance.save(update_fields=["description"])
        return instance


class CommunityTagMembershipSerializer(serializers.Serializer):
    """Response serializer for join/leave operations."""

    tag_id = serializers.UUIDField()
    tag_name = serializers.CharField()
    tag_slug = serializers.CharField()
    joined = serializers.BooleanField()


class CommunityTagListResponseSerializer(serializers.Serializer):
    """Paginated response wrapper for community tag listing."""

    count = serializers.IntegerField()
    page = serializers.IntegerField()
    pageSize = serializers.IntegerField()
    results = CommunityTagListSerializer(many=True)


class TaggableUserSerializer(serializers.Serializer):
    """Response item for a user taggable in a community post."""

    username = serializers.CharField(read_only=True)
    display_name = serializers.CharField(read_only=True)


class TaggableUsersResponseSerializer(serializers.Serializer):
    """Response wrapper for taggable users in a community."""

    count = serializers.IntegerField(read_only=True)
    results = TaggableUserSerializer(many=True, read_only=True)


# ---------------------------------------------------------------------------
# Community Posts (CoP)
# ---------------------------------------------------------------------------


class CoPCreateSerializer(serializers.Serializer):
    """Write serializer for creating a community post (CoP)."""

    event_type = serializers.ChoiceField(choices=_PROFILE_POST_EVENT_TYPE_CHOICES)
    content = serializers.CharField(required=True, max_length=2000)
    media_url = serializers.URLField(required=False, allow_null=True, default=None)
    show_on_profile = serializers.BooleanField(required=False, default=False)
    timestamp = serializers.DateTimeField(required=False, allow_null=True, default=None)
    tagged_users = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        default=list,
    )

    def to_internal_value(self, data: Any) -> dict:
        """Normalize empty timestamp values to null so fallback logic can be applied."""
        if isinstance(data, dict) and data.get("timestamp") == "":
            data = {**data, "timestamp": None}
        return super().to_internal_value(data)

    def validate_tagged_users(self, value: list) -> list:
        """Validate tagged_users field (usernames as strings)."""
        # Validation logic will be handled in the view/service layer
        # where we have access to author and community context
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        """Reject timestamps more than 1 day in the future when provided."""
        timestamp = attrs.get("timestamp")
        if timestamp is not None and timestamp > timezone.now() + timedelta(days=1):
            raise serializers.ValidationError(
                {"timestamp": "Timestamp cannot be more than 1 day in the future."}
            )
        return attrs


class CoPUpdateSerializer(serializers.Serializer):
    """Write serializer for partially updating a community post."""

    content = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    event_type = serializers.ChoiceField(choices=_PROFILE_POST_EVENT_TYPE_CHOICES, required=False)
    media_url = serializers.URLField(required=False, allow_null=True)
    show_on_profile = serializers.BooleanField(required=False)
    tagged_users = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
    )

    def validate_tagged_users(self, value: list) -> list:
        """Validate tagged_users field (usernames as strings)."""
        # Validation logic will be handled in the view/service layer
        # where we have access to author and community context
        return value

    def validate(self, attrs: dict) -> dict:
        """Require at least one editable field to be provided."""
        if not attrs:
            raise serializers.ValidationError(
                "At least one of 'content', 'event_type', 'media_url', "
                "'show_on_profile', or 'tagged_users' must be provided."
            )
        return attrs


class CommunityPostListQueryParamsSerializer(serializers.Serializer):
    """Validate query parameters for community post listing endpoint."""

    event_type = serializers.ChoiceField(
        choices=_PROFILE_POST_EVENT_TYPE_CHOICES,
        required=False,
        allow_null=True,
        default=None,
    )
    offset = serializers.IntegerField(required=False, min_value=0, default=0)
    limit = serializers.IntegerField(required=False, min_value=1, max_value=200, default=50)


class CommunityPostSerializer(serializers.Serializer):
    """Read serializer for community feed items (CoP)."""

    id = serializers.UUIDField(read_only=True)
    source_id = serializers.CharField(read_only=True)
    category = serializers.CharField(read_only=True)
    event_type = serializers.CharField(read_only=True)
    content = serializers.CharField(read_only=True)
    media_url = serializers.URLField(read_only=True, allow_null=True)
    timestamp = serializers.DateTimeField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    last_edited = serializers.DateTimeField(read_only=True, allow_null=True)
    show_on_profile = serializers.BooleanField(read_only=True)
    community_id = serializers.UUIDField(read_only=True)
    community_slug = serializers.SerializerMethodField()
    author = ProfilePostAuthorSerializer(read_only=True)
    tagged_users = serializers.SerializerMethodField()

    @extend_schema_field({"type": "string", "nullable": True})
    def get_community_slug(self, obj: Any) -> str | None:
        """Return the community slug for CoP events.

        Falls back to payload snapshot when the community no longer exists.
        """
        if obj.community_id is None:
            return None

        community = CommunityTag.objects.filter(id=obj.community_id).values("slug").first()
        if community is not None:
            return community["slug"]

        payload = obj.payload or {}
        return payload.get("community_slug")

    def get_tagged_users(self, obj: Any) -> list[dict[str, str]]:
        """Extract and return tagged users from payload.

        Returns only user_id and username fields for each tagged user.
        """
        payload = obj.payload or {}
        tagged_users_list = payload.get("tagged_users", [])

        return [
            {"user_id": tag["user_id"], "username": tag["username"]} for tag in tagged_users_list
        ]


class CommunityPostFeedSerializer(serializers.Serializer):
    """Paginated response wrapper for community posts feed."""

    count = serializers.IntegerField(read_only=True)
    offset = serializers.IntegerField(read_only=True)
    limit = serializers.IntegerField(read_only=True)
    results = CommunityPostSerializer(many=True, read_only=True)
