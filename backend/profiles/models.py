"""Profile-domain models."""

import re
import uuid
from decimal import Decimal

from django.conf import settings
from django.contrib.postgres.constraints import ExclusionConstraint
from django.contrib.postgres.fields.ranges import RangeOperators
from django.db import models
from django.db.models import F, Func, Q, Value
from django.utils import timezone


class MentorshipMode(models.TextChoices):
    """Supported mentoring participation modes for a profile."""

    MENTOR = "MENTOR", "Mentor"
    MENTEE = "MENTEE", "Mentee"
    BOTH = "BOTH", "Both"


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
    location_text = models.CharField(max_length=255, blank=True, default="")
    is_visible = models.BooleanField(default=True)
    show_initials_only = models.BooleanField(default=False)
    mentorship_mode = models.CharField(
        max_length=16,
        choices=MentorshipMode.choices,
        default=MentorshipMode.BOTH,
    )
    expertise_fields = models.ManyToManyField(
        "ExpertiseField",
        through="ProfileExpertise",
        related_name="profiles",
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "profiles"
        ordering = ["display_name", "-created_at"]
        indexes = [
            models.Index(fields=["mentorship_mode"]),
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


class ExpertiseField(models.Model):
    """Catalog of expertise fields that can be attached to profiles."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=80, unique=True)
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "expertise_fields"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class ProfileExpertise(models.Model):
    """Join model for profile-to-expertise relation and rating metadata."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="profile_expertise",
    )
    expertise_field = models.ForeignKey(
        ExpertiseField,
        on_delete=models.CASCADE,
        related_name="profile_expertise",
    )
    proficiency_level = models.PositiveSmallIntegerField(default=1)
    average_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    rating_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "profile_expertise"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["profile", "expertise_field"],
                name="uniq_profile_expertise",
            ),
            models.CheckConstraint(
                condition=Q(proficiency_level__gte=1) & Q(proficiency_level__lte=5),
                name="profile_expertise_proficiency_level_between_1_5",
            ),
            models.CheckConstraint(
                condition=Q(average_rating__gte=0) & Q(average_rating__lte=5),
                name="profile_expertise_average_rating_between_0_5",
            ),
        ]
        indexes = [
            models.Index(fields=["profile", "expertise_field"]),
        ]

    def __str__(self) -> str:
        return f"{self.profile.display_name} - {self.expertise_field.name}"

    def update_rating(self, incoming_rating: float) -> None:
        """Update aggregate rating values using a single incoming rating."""

        if incoming_rating < 0 or incoming_rating > 5:
            raise ValueError("incoming_rating must be between 0 and 5.")

        total_rating = float(self.average_rating) * self.rating_count
        total_rating += incoming_rating
        self.rating_count += 1
        self.average_rating = total_rating / self.rating_count
        self.save(update_fields=["average_rating", "rating_count", "updated_at"])


class AvailabilitySlot(models.Model):
    """Mentor availability time window that can be booked for sessions."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="availability_slots",
    )
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
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
            models.Index(fields=["is_booked", "start_at"]),
            models.Index(fields=["booked_by", "start_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.profile.display_name}: {self.start_at.isoformat()}"

    def mark_booked(self, user=None) -> None:
        """Mark slot as booked and optionally track who booked it."""

        self.is_booked = True
        self.booked_by = user
        self.booked_at = timezone.now()
        self.save(update_fields=["is_booked", "booked_by", "booked_at", "updated_at"])

    def mark_available(self) -> None:
        """Mark slot as available again."""

        self.is_booked = False
        self.booked_by = None
        self.booked_at = None
        self.save(update_fields=["is_booked", "booked_by", "booked_at", "updated_at"])
