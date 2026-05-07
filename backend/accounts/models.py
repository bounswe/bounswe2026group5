import hashlib
import re
import secrets
import uuid
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models, transaction
from django.utils import timezone


class UserRole(models.TextChoices):
    GUEST = "GUEST", "Guest"
    USER = "USER", "User"
    ADMIN = "ADMIN", "Admin"


class AuthProvider(models.TextChoices):
    LOCAL = "LOCAL", "Local"
    GOOGLE = "GOOGLE", "Google"


class AppUsageMode(models.TextChoices):
    MENTEE = "MENTEE", "Mentee"
    MENTOR = "MENTOR", "Mentor"
    ADMIN = "ADMIN", "Admin"


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
    username = models.CharField(max_length=50, unique=True)
    auth_provider = models.CharField(
        max_length=16,
        choices=AuthProvider.choices,
        default=AuthProvider.LOCAL,
    )
    app_usage_mode = models.CharField(
        max_length=16,
        choices=AppUsageMode.choices,
        blank=True,
        null=True,
    )
    is_banned = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects: UserManager = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "users"
        ordering = ["-created_at"]

    def save(self, *args: Any, **kwargs: Any) -> None:
        """Ensure email is lowercase and generate a unique username when needed."""
        self.email = self.email.lower()
        if not self.username:
            email_prefix = (self.email or "").split("@", 1)[0]
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

    def __str__(self):
        return self.email


class PasswordResetToken(models.Model):
    """Stores hashed password-reset tokens. Raw token is only delivered via email."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="password_reset_tokens",
    )
    token_hash = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "password_reset_tokens"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "used_at"]),
        ]

    def __str__(self) -> str:
        return f"PasswordResetToken(user={self.user_id}, used={self.used_at is not None})"

    @staticmethod
    def hash_token(raw_token: str) -> str:
        return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    def is_valid(self) -> bool:
        return self.used_at is None and self.expires_at > timezone.now()

    def mark_used(self) -> None:
        self.used_at = timezone.now()
        self.save(update_fields=["used_at"])

    @classmethod
    @transaction.atomic
    def issue_for_user(cls, user: User) -> tuple[str, "PasswordResetToken"]:
        """Invalidate outstanding tokens for the user and issue a new one.

        Returns (raw_token, instance). The raw token is never persisted.
        """
        cls.objects.filter(user=user, used_at__isnull=True).update(used_at=timezone.now())

        raw_token = secrets.token_urlsafe(48)
        lifetime_minutes = getattr(settings, "PASSWORD_RESET_TOKEN_LIFETIME_MINUTES", 30)
        instance = cls.objects.create(
            user=user,
            token_hash=cls.hash_token(raw_token),
            expires_at=timezone.now() + timedelta(minutes=lifetime_minutes),
        )
        return raw_token, instance


class EmailVerificationToken(models.Model):
    """Stores hashed email-verification tokens. Raw token is only delivered via email."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="email_verification_tokens",
    )
    token_hash = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "email_verification_tokens"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "used_at"]),
        ]

    def __str__(self) -> str:
        return f"EmailVerificationToken(user={self.user_id}, used={self.used_at is not None})"

    @staticmethod
    def hash_token(raw_token: str) -> str:
        return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    def is_valid(self) -> bool:
        return self.used_at is None and self.expires_at > timezone.now()

    def mark_used(self) -> None:
        self.used_at = timezone.now()
        self.save(update_fields=["used_at"])

    @classmethod
    @transaction.atomic
    def issue_for_user(cls, user: User) -> tuple[str, "EmailVerificationToken"]:
        """Invalidate outstanding tokens for the user and issue a new one.

        Returns (raw_token, instance). The raw token is never persisted.
        """
        cls.objects.filter(user=user, used_at__isnull=True).update(used_at=timezone.now())

        raw_token = secrets.token_urlsafe(48)
        lifetime_hours = getattr(settings, "EMAIL_VERIFICATION_TOKEN_LIFETIME_HOURS", 24)
        instance = cls.objects.create(
            user=user,
            token_hash=cls.hash_token(raw_token),
            expires_at=timezone.now() + timedelta(hours=lifetime_hours),
        )
        return raw_token, instance


class ReportReason(models.TextChoices):
    SPAM = "SPAM", "Spam"
    HARASSMENT = "HARASSMENT", "Harassment"
    INAPPROPRIATE_CONTENT = "INAPPROPRIATE_CONTENT", "Inappropriate Content"
    OTHER = "OTHER", "Other"


class ReportStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    IN_REVIEW = "IN_REVIEW", "In Review"
    RESOLVED = "RESOLVED", "Resolved"
    DISMISSED = "DISMISSED", "Dismissed"


class Report(models.Model):
    """User-submitted report about inappropriate or problematic behavior."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submitted_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="submitted_reports",
    )
    reported_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="received_reports",
    )
    related_message = models.ForeignKey(
        "messaging.Message",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="account_reports",
    )
    reason = models.CharField(
        max_length=32,
        choices=ReportReason.choices,
    )
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=ReportStatus.choices,
        default=ReportStatus.OPEN,
    )
    resolution_note = models.TextField(blank=True)
    resolved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_reports",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "reports"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Report({self.reason}, {self.status}, by={self.submitted_by_id})"
