"""Profile-domain models."""

import re
import uuid
from decimal import Decimal

from django.conf import settings
from django.contrib.gis.db import models as gis_models
from django.contrib.postgres.constraints import ExclusionConstraint
from django.contrib.postgres.fields import ArrayField
from django.contrib.postgres.fields.ranges import RangeOperators
from django.db import models
from django.db.models import F, Func, Q, Value
from django.utils import timezone


class Skill(models.Model):
    """Catalog of skills available in the system."""

    name = models.CharField(max_length=120, unique=True)

    class Meta:
        db_table = "skills"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Profile(models.Model):
    """Public profile information associated one-to-one with a user."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    username = models.CharField(max_length=50, unique=True)
    display_name = models.CharField(max_length=120)
    bio = models.TextField(blank=True, default="")
    picture_url = models.URLField(blank=True, default="")
    title = models.CharField(max_length=120, blank=True, default="")
    location = gis_models.PointField(geography=True, srid=4326, null=True, blank=True)
    is_visible = models.BooleanField(default=True)
    show_initials_only = models.BooleanField(default=False)
    skills = ArrayField(
        models.CharField(max_length=120),
        blank=True,
        default=list,
    )
    total_mentee_count = models.PositiveIntegerField(default=0)
    average_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    review_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "profiles"
        ordering = ["display_name", "-created_at"]
        indexes = [
            models.Index(fields=["is_visible", "show_initials_only"]),
        ]

    def __str__(self) -> str:
        return f"{self.display_name} ({self.user.email})"

    def save(self, *args, **kwargs) -> None:
        """Generate a unique username when one is not provided."""
        if not self.username:
            email_prefix = (self.user.email or "").split("@", 1)[0]
            self.username = self._generate_unique_username(email_prefix)
        super().save(*args, **kwargs)

    @classmethod
    def _generate_unique_username(cls, source_value: str) -> str:
        """Build a unique username from a source value."""
        sanitized_base = re.sub(r"[^a-z0-9_]+", "_", source_value.lower()).strip("_")
        base_username = (sanitized_base or "user")[:50]
        candidate = base_username
        suffix = 1

        while cls.objects.filter(username=candidate).exists():
            numeric_suffix = f"_{suffix}"
            candidate = f"{base_username[: 50 - len(numeric_suffix)]}{numeric_suffix}"
            suffix += 1

        return candidate


class AvailabilitySlot(models.Model):
    """Mentor availability time window that can be booked for sessions."""

    class Status(models.TextChoices):
        """Lifecycle statuses for an availability slot."""

        AVAILABLE = "AVAILABLE", "Available"
        PENDING = "PENDING", "Pending"
        BOOKED = "BOOKED", "Booked"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="availability_slots",
    )
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.AVAILABLE,
    )
    is_booked = models.BooleanField(default=False)
    booked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="booked_availability_slots",
        null=True,
        blank=True,
    )
    booked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "availability_slots"
        ordering = ["start_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(end_at__gt=models.F("start_at")),
                name="availability_slot_end_after_start",
            ),
            ExclusionConstraint(
                name="availability_slot_no_overlap_per_profile",
                expressions=[
                    ("profile", RangeOperators.EQUAL),
                    (
                        Func(
                            F("start_at"),
                            F("end_at"),
                            Value("[)"),
                            function="tstzrange",
                        ),
                        RangeOperators.OVERLAPS,
                    ),
                ],
            ),
        ]
        indexes = [
            models.Index(fields=["profile", "start_at"]),
            models.Index(fields=["status", "start_at"]),
            models.Index(fields=["is_booked", "start_at"]),
            models.Index(fields=["booked_by", "start_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.profile.display_name}: {self.start_at.isoformat()}"

    def mark_booked(self, user=None) -> None:
        """Mark slot as booked and optionally track who booked it."""

        self.status = self.Status.BOOKED
        self.is_booked = True
        self.booked_by = user
        self.booked_at = timezone.now()
        self.save(update_fields=["status", "is_booked", "booked_by", "booked_at", "updated_at"])

    def mark_pending(self) -> None:
        """Mark slot as pending (requested)."""

        self.status = self.Status.PENDING
        self.save(update_fields=["status", "updated_at"])

    def mark_available(self) -> None:
        """Mark slot as available again."""

        self.status = self.Status.AVAILABLE
        self.is_booked = False
        self.booked_by = None
        self.booked_at = None
        self.save(update_fields=["status", "is_booked", "booked_by", "booked_at", "updated_at"])


class CommunityTag(models.Model):
    """A public community tag that users can join for shared-interest grouping."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=130, unique=True)
    description = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        "profiles.Profile",
        on_delete=models.SET_NULL,
        related_name="created_tags",
        null=True,
        blank=True,
    )
    members = models.ManyToManyField(
        "profiles.Profile",
        through="CommunityTagMembership",
        related_name="community_tags",
        blank=True,
    )
    member_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "community_tags"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["-member_count", "name"]),
        ]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs) -> None:
        """Auto-generate slug from name and enforce case-insensitive uniqueness."""
        from django.utils.text import slugify

        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class CommunityTagMembership(models.Model):
    """Through table recording a profile's membership in a community tag."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(
        "profiles.Profile",
        on_delete=models.CASCADE,
        related_name="tag_memberships",
    )
    tag = models.ForeignKey(
        CommunityTag,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "community_tag_memberships"
        ordering = ["-joined_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["profile", "tag"],
                name="uniq_membership_per_profile_tag",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.profile.display_name} @ {self.tag.name}"
