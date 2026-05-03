from typing import Any, cast

from django.conf import settings
from django.contrib.auth import password_validation
from django.contrib.auth.models import Group
from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from profiles.models import Profile

from .models import AppUsageMode, AuthProvider, PasswordResetToken, User, UserRole


class UserResponseSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    picture_url = serializers.SerializerMethodField()

    def get_display_name(self, obj: User) -> str:
        profile = getattr(obj, "profile", None)
        display_name = getattr(profile, "display_name", "") if profile else ""
        if display_name:
            return display_name
        return obj.username

    def get_picture_url(self, obj: User) -> str:
        profile = getattr(obj, "profile", None)
        picture_url = getattr(profile, "picture_url", "") if profile else ""
        return picture_url or ""

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "username",
            "display_name",
            "picture_url",
            "role",
            "auth_provider",
            "app_usage_mode",
            "is_active",
            "is_email_verified",
            "created_at",
        )
        read_only_fields = fields


class UserAppUsageModeUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("app_usage_mode",)

    def validate_app_usage_mode(self, value: str) -> str:
        """Allow setting role once; prevent switching between mentor and mentee."""
        if not value:
            raise serializers.ValidationError("App usage mode must be either MENTOR or MENTEE.")

        current_mode = getattr(self.instance, "app_usage_mode", "")
        if current_mode in AppUsageMode.values and current_mode != value:
            raise serializers.ValidationError(
                "Account role is immutable. Create a separate account to use the other role."
            )

        return value


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

        is_email_verified = not getattr(settings, "REQUIRE_EMAIL_VERIFICATION", True)

        user: User = cast(
            User,
            User.objects.create_user(
                email=email,
                password=password,
                role=UserRole.USER,
                auth_provider=AuthProvider.LOCAL,
                is_active=True,
                is_email_verified=is_email_verified,
            ),
        )

        display_name = email.split("@", 1)[0].replace(".", " ").replace("_", " ").title()
        Profile.objects.create(
            user=user,
            username=user.username,
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


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value: str) -> str:
        return value.lower()


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField(trim_whitespace=False, write_only=True)
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        trim_whitespace=False,
    )
    confirm_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        new_password = attrs.get("new_password")
        confirm_password = attrs.get("confirm_password")

        if new_password != confirm_password:
            raise serializers.ValidationError(
                {"confirm_password": "Password and confirm password must match."}
            )

        raw_token = attrs.get("token", "")
        token_hash = PasswordResetToken.hash_token(raw_token)
        try:
            reset_token = PasswordResetToken.objects.select_related("user").get(
                token_hash=token_hash
            )
        except PasswordResetToken.DoesNotExist:
            raise serializers.ValidationError({"token": "Invalid or expired token."})

        if not reset_token.is_valid():
            raise serializers.ValidationError({"token": "Invalid or expired token."})

        user = reset_token.user
        if not user.is_active or user.is_banned:
            raise serializers.ValidationError({"token": "Invalid or expired token."})

        password_validation.validate_password(new_password, user=user)

        attrs["reset_token"] = reset_token
        attrs["user"] = user
        return attrs


class VerifyEmailSerializer(serializers.Serializer):
    token = serializers.CharField(trim_whitespace=False)


class BannedAwareTokenRefreshSerializer(TokenRefreshSerializer):
    """Refresh serializer that blocks token refresh for banned users."""

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        refresh_token = RefreshToken(attrs["refresh"])
        user_id = refresh_token.payload.get("user_id")

        if user_id is not None and User.objects.filter(id=user_id, is_banned=True).exists():
            raise PermissionDenied("This account has been banned.")

        return super().validate(attrs)


class OAuthLoginSerializer(serializers.Serializer):
    """Write serializer for OAuth token exchange.

    Provider selection is determined by the URL route, so the serializer
    only validates the presence of the ``id_token`` field.
    """

    id_token = serializers.CharField(trim_whitespace=True)
