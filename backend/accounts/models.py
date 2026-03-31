import re
import uuid
from typing import Any

from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models


class UserRole(models.TextChoices):
    GUEST = "GUEST", "Guest"
    USER = "USER", "User"
    ADMIN = "ADMIN", "Admin"


class AuthProvider(models.TextChoices):
    LOCAL = "LOCAL", "Local"
    GOOGLE = "GOOGLE", "Google"
    APPLE = "APPLE", "Apple"


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
