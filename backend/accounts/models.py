import uuid
from decimal import Decimal
from typing import Any

from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.contrib.postgres.constraints import ExclusionConstraint
from django.contrib.postgres.fields.ranges import RangeOperators
from django.db import models
from django.db.models import F, Func, Q, Value
from django.utils import timezone


class UserRole(models.TextChoices):
    USER = "USER", "User"
    ADMIN = "ADMIN", "Admin"


class AuthProvider(models.TextChoices):
    LOCAL = "LOCAL", "Local"
    GOOGLE = "GOOGLE", "Google"
    APPLE = "APPLE", "Apple"


class MentorshipMode(models.TextChoices):
    """Supported mentoring participation modes for a profile."""

    MENTOR = "MENTOR", "Mentor"
    MENTEE = "MENTEE", "Mentee"
    BOTH = "BOTH", "Both"


class UserManager(BaseUserManager["User"]):
    use_in_migrations = True

    def create_user(self, email: str, password: str | None = None, **extra_fields: Any) -> "User":
        if not email:
            raise ValueError("The email field is required.")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)

        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra_fields: Any) -> "User":
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", UserRole.ADMIN)
        extra_fields.setdefault("auth_provider", AuthProvider.LOCAL)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(
        max_length=16,
        choices=UserRole.choices,
        default=UserRole.USER,
    )
    email = models.EmailField(unique=True)
    auth_provider = models.CharField(
        max_length=16,
        choices=AuthProvider.choices,
        default=AuthProvider.LOCAL,
    )
    is_banned = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects: UserManager = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "users"
        ordering = ["-created_at"]

    def save(self, *args: Any, **kwargs: Any) -> None:
        """Ensure email is always stored in lowercase."""
        self.email = self.email.lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email


class Profile(models.Model):
    """Public profile information associated one-to-one with a user."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
    )
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
        ]

    def __str__(self) -> str:
        return f"{self.profile.display_name}: {self.start_at.isoformat()}"

    def mark_booked(self) -> None:
        """Mark slot as booked."""

        self.is_booked = True
        self.save(update_fields=["is_booked", "updated_at"])

    def mark_available(self) -> None:
        """Mark slot as available again."""

        self.is_booked = False
        self.save(update_fields=["is_booked", "updated_at"])


class MentorshipRequest(models.Model):
    """Request from a mentee profile to a mentor profile."""

    class Status(models.TextChoices):
        """Allowed statuses for a mentorship request."""

        PENDING = "PENDING", "Pending"
        ACCEPTED = "ACCEPTED", "Accepted"
        REJECTED = "REJECTED", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mentor = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="received_requests",
    )
    mentee = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="sent_requests",
    )
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
    )
    cover_letter = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "mentorship_requests"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=~Q(mentor=F("mentee")),
                name="mentorship_request_mentor_not_mentee",
            ),
            models.UniqueConstraint(
                fields=["mentor", "mentee"],
                condition=Q(status="PENDING"),
                name="uniq_pending_request_per_mentor_mentee",
            ),
        ]
        indexes = [
            models.Index(fields=["mentor", "status"]),
            models.Index(fields=["mentee", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.mentee.display_name} -> {self.mentor.display_name} ({self.status})"

    def save(self, *args: Any, **kwargs: Any) -> None:
        """Persist request and create a match when request becomes accepted."""

        previous_status = None
        if self.pk:
            previous_status = (
                MentorshipRequest.objects.filter(pk=self.pk)
                .values_list("status", flat=True)
                .first()
            )

        if self.status in {self.Status.ACCEPTED, self.Status.REJECTED}:
            if previous_status != self.status and self.responded_at is None:
                self.responded_at = timezone.now()
        elif self.status == self.Status.PENDING:
            self.responded_at = None

        super().save(*args, **kwargs)

        if self.status == self.Status.ACCEPTED and previous_status != self.Status.ACCEPTED:
            Match.objects.get_or_create(
                request=self,
                defaults={
                    "mentor": self.mentor,
                    "mentee": self.mentee,
                    "is_active": True,
                },
            )


class Match(models.Model):
    """Represents an accepted mentorship relationship between mentor and mentee."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mentor = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="mentor_matches",
    )
    mentee = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="mentee_matches",
    )
    request = models.OneToOneField(
        MentorshipRequest,
        on_delete=models.CASCADE,
        related_name="match",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "matches"
        ordering = ["-request__created_at"]
        indexes = [
            models.Index(fields=["mentor", "is_active"]),
            models.Index(fields=["mentee", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.mentor.display_name} <> {self.mentee.display_name}"
