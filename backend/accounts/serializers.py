from typing import Any, cast

from django.contrib.auth import password_validation
from django.contrib.auth.models import Group
from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from profiles.models import Profile

from .models import AuthProvider, User, UserRole


class UserResponseSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()

    def get_username(self, obj: User) -> str | None:
        """Return linked profile username for route navigation compatibility."""
        profile = getattr(obj, "profile", None)
        if profile is None:
            return None
        return cast(str, profile.username)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "username",
            "role",
            "auth_provider",
            "is_active",
            "created_at",
        )
        read_only_fields = fields


class AuthResponseSerializer(serializers.Serializer):
    access_token = serializers.CharField(read_only=True)
    refresh_token = serializers.CharField(read_only=True)
    user = UserResponseSerializer(read_only=True)


class LogoutSerializer(serializers.Serializer):
    refresh_token = serializers.CharField(trim_whitespace=True)


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        trim_whitespace=False,
    )
    confirm_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate_email(self, value: str) -> str:
        email = value.lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        password: str | None = attrs.get("password")
        confirm_password: str | None = attrs.get("confirm_password")

        if password != confirm_password:
            raise serializers.ValidationError(
                {"confirm_password": ("Password and confirm password must match.")}
            )

        if password:
            password_validation.validate_password(password)
        return attrs

    @transaction.atomic
    def create(self, validated_data: dict[str, Any]) -> User:
        validated_data.pop("confirm_password", None)
        password = validated_data.pop("password")
        email = validated_data["email"]

        user: User = cast(
            User,
            User.objects.create_user(
                email=email,
                password=password,
                role=UserRole.USER,
                auth_provider=AuthProvider.LOCAL,
                is_active=True,
            ),
        )

        display_name = email.split("@", 1)[0].replace(".", " ").replace("_", " ").title()
        Profile.objects.create(
            user=user,
            display_name=display_name,
        )

        default_group, _ = Group.objects.get_or_create(name=UserRole.USER)
        user.groups.add(default_group)

        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        email = attrs.get("email", "").lower()
        password: str | None = attrs.get("password")

        if not password:
            raise serializers.ValidationError("Password is required.")

        try:
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid email or password.")

        if not user_obj.is_active:
            raise serializers.ValidationError("This account is inactive.")

        if user_obj.is_banned:
            raise serializers.ValidationError("This account is banned.")

        if not user_obj.check_password(password):
            raise serializers.ValidationError("Invalid email or password.")

        attrs["user"] = user_obj
        return attrs


class BannedAwareTokenRefreshSerializer(TokenRefreshSerializer):
    """Refresh serializer that blocks token refresh for banned users."""

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        refresh_token = RefreshToken(attrs["refresh"])
        user_id = refresh_token.payload.get("user_id")

        if user_id is not None and User.objects.filter(id=user_id, is_banned=True).exists():
            raise PermissionDenied("This account has been banned.")

        return super().validate(attrs)
