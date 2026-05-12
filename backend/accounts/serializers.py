from typing import Any

from django.conf import settings
from django.contrib.auth import password_validation
from django.contrib.auth.models import Group
from django.db import transaction
from drf_spectacular.utils import extend_schema_field
from drf_spectacular.types import OpenApiTypes
from rest_framework import serializers
from rest_framework.request import Request
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from profiles.models import Profile
from profiles.serializers import LocationField
from profiles.serializers import resolve_picture_url

from .models import AppUsageMode, AuthProvider, PasswordResetToken, User, UserRole, ReportStatus

_INVALID_TOKEN_ERROR = {"token": "Invalid or expired token."}


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
        if profile is None:
            return ""
        return resolve_picture_url(profile)

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
    location = LocationField(required=False, write_only=True)

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
        location = validated_data.pop("location", None)
        password = validated_data.pop("password")
        email = validated_data["email"]

        is_email_verified = not getattr(settings, "REQUIRE_EMAIL_VERIFICATION", True)

        user = User.objects.create_user(
            email=email,
            password=password,
            role=UserRole.USER,
            auth_provider=AuthProvider.LOCAL,
            is_active=True,
            is_email_verified=is_email_verified,
        )

        display_name = email.split("@", 1)[0].replace(".", " ").replace("_", " ").title()
        Profile.objects.create(
            user=user,
            username=user.username,
            display_name=display_name,
            location=location,
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
            raise serializers.ValidationError(_INVALID_TOKEN_ERROR)

        if not reset_token.is_valid():
            raise serializers.ValidationError(_INVALID_TOKEN_ERROR)

        user = reset_token.user
        if not user.is_active or user.is_banned:
            raise serializers.ValidationError(_INVALID_TOKEN_ERROR)

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

        try:
            return super().validate(attrs)
        except User.DoesNotExist:
            raise TokenError("User associated with this token no longer exists.")


class OAuthLoginSerializer(serializers.Serializer):
    """Write serializer for OAuth token exchange.

    Provider selection is determined by the URL route, so the serializer
    only validates the presence of the ``id_token`` field.
    """

    id_token = serializers.CharField(trim_whitespace=True)


class AdminUserUpdateSerializer(serializers.Serializer):
    """Serializer for admin user update (ban/unban)."""

    is_banned = serializers.BooleanField(required=True)


class ReportCreateSerializer(serializers.Serializer):
    """Serializer for users to submit a report."""

    reported_user_id = serializers.UUIDField(required=False)
    reported_username = serializers.CharField(required=False)
    reason = serializers.ChoiceField(
        choices=["SPAM", "HARASSMENT", "INAPPROPRIATE_CONTENT", "OTHER"]
    )
    description = serializers.CharField(required=False, allow_blank=True, default="")
    related_message_id = serializers.UUIDField(required=False, allow_null=True, default=None)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        """Validate reported user and optional related message."""
        reported_user = self._resolve_reported_user(attrs)
        attrs["reported_user_id"] = reported_user.id

        request = self.context.get("request")
        if request and str(request.user.id) == str(reported_user.id):
            raise serializers.ValidationError({"reported_user_id": "You cannot report yourself."})

        self._validate_related_message(attrs, request)
        return attrs

    def _resolve_reported_user(self, attrs: dict[str, Any]) -> User:
        """Resolve the user being reported by ID or username."""
        user_id = attrs.get("reported_user_id")
        username = attrs.get("reported_username")

        if not user_id and not username:
            raise serializers.ValidationError(
                "Either 'reported_user_id' or 'reported_username' must be provided."
            )

        try:
            if user_id:
                return User.objects.get(id=user_id)
            return User.objects.get(username=username)
        except User.DoesNotExist:
            field = "reported_user_id" if user_id else "reported_username"
            raise serializers.ValidationError({field: "User not found."})

    def _validate_related_message(self, attrs: dict[str, Any], request: Request | None) -> None:
        """Ensure the related message exists and the reporter has access to it."""
        related_message_id = attrs.get("related_message_id")
        if not related_message_id:
            return

        from messaging.models import Message
        try:
            message = Message.objects.select_related("conversation__match").get(
                id=related_message_id
            )
        except Message.DoesNotExist:
            raise serializers.ValidationError({"related_message_id": "Message not found."})

        if not request or not request.user:
            return

        profile = getattr(request.user, "profile", None)
        if not profile:
            raise serializers.ValidationError({"related_message_id": "User profile not found."})

        # Admins can report any message; regular users are restricted to their own conversations.
        is_admin = getattr(request.user, "role", None) == UserRole.ADMIN
        match = message.conversation.match
        if not is_admin and profile.id not in [match.mentor_id, match.mentee_id]:
            raise serializers.ValidationError(
                {"related_message_id": "You can only report messages from your own conversations."}
            )


class ReportListSerializer(serializers.Serializer):
    """Read-only serializer for listing reports."""

    id = serializers.UUIDField()
    submitted_by = serializers.SerializerMethodField()
    reported_user = serializers.SerializerMethodField()
    reason = serializers.CharField()
    description = serializers.CharField()
    status = serializers.CharField()
    resolution_note = serializers.CharField()
    resolved_by = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField()
    resolved_at = serializers.DateTimeField()

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_submitted_by(self, obj: Any) -> dict[str, str]:
        return {
            "id": str(obj.submitted_by.id),
            "email": obj.submitted_by.email,
            "username": obj.submitted_by.username,
        }

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_reported_user(self, obj: Any) -> dict[str, str]:
        return {
            "id": str(obj.reported_user.id),
            "email": obj.reported_user.email,
            "username": obj.reported_user.username,
        }

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_resolved_by(self, obj: Any) -> dict[str, str] | None:
        if obj.resolved_by is None:
            return None
        return {
            "id": str(obj.resolved_by.id),
            "email": obj.resolved_by.email,
            "username": obj.resolved_by.username,
        }


class ReportResolveSerializer(serializers.Serializer):
    """Serializer for admin to resolve/dismiss a report."""

    status = serializers.ChoiceField(choices=ReportStatus.choices)
    resolution_note = serializers.CharField(required=False, allow_blank=True, default="")
