import logging
from typing import Any, cast

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .models import AuthProvider, EmailVerificationToken, PasswordResetToken, Report, User
from .oauth import OAuthVerificationError, verify_google_id_token
from .permissions import IsAdmin, IsNotBanned, IsUser
from .serializers import (
    AdminUserUpdateSerializer,
    AuthResponseSerializer,
    BannedAwareTokenRefreshSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    LogoutSerializer,
    OAuthLoginSerializer,
    RegisterSerializer,
    ReportCreateSerializer,
    ReportListSerializer,
    ReportResolveSerializer,
    ResetPasswordSerializer,
    UserAppUsageModeUpdateSerializer,
    UserResponseSerializer,
    VerifyEmailSerializer,
)

logger = logging.getLogger(__name__)

_GENERIC_FORGOT_PASSWORD_RESPONSE = {
    "detail": "If an account exists for that email, a password reset link has been sent."
}


def build_auth_response(user: User, refresh: RefreshToken | None = None) -> dict[str, object]:
    """Build a consistent auth response payload for both web and mobile clients."""
    if refresh is None:
        refresh = RefreshToken.for_user(user)

    return {
        "access_token": str(refresh.access_token),
        "refresh_token": str(refresh),
        "user": UserResponseSerializer(user).data,
    }


def _set_auth_cookies(response: Response, refresh: RefreshToken) -> None:
    """Attach secure HttpOnly auth cookies to the response."""
    access_max_age = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
    refresh_max_age = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
    cookie_secure = settings.AUTH_COOKIE_SECURE
    cookie_samesite = settings.AUTH_COOKIE_SAMESITE

    response.set_cookie(
        key=settings.AUTH_ACCESS_COOKIE_NAME,
        value=str(refresh.access_token),
        max_age=access_max_age,
        httponly=True,
        secure=cookie_secure,
        samesite=cookie_samesite,
    )
    response.set_cookie(
        key=settings.AUTH_REFRESH_COOKIE_NAME,
        value=str(refresh),
        max_age=refresh_max_age,
        httponly=True,
        secure=cookie_secure,
        samesite=cookie_samesite,
    )


def _clear_auth_cookies(response: Response) -> None:
    """Clear auth cookies on logout or token invalidation."""
    response.delete_cookie(key=settings.AUTH_ACCESS_COOKIE_NAME)
    response.delete_cookie(key=settings.AUTH_REFRESH_COOKIE_NAME)


class RegisterAPIView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=RegisterSerializer,
        responses={
            201: AuthResponseSerializer,
            400: OpenApiResponse(description="Validation error."),
        },
        description="Register a new local user account and return JWT tokens.",
        tags=["Auth"],
    )
    def post(self, request: Request) -> Response:
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = cast(User, serializer.save())
        refresh = RefreshToken.for_user(user)

        try:
            raw_token, _ = EmailVerificationToken.issue_for_user(user)
            _send_email_verification_email(user, raw_token)
        except Exception:
            logger.exception("Failed to issue verification email for user %s", user.id)

        response = Response(
            build_auth_response(user, refresh),
            status=status.HTTP_201_CREATED,
        )
        _set_auth_cookies(response, refresh)

        return response


class LoginAPIView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=LoginSerializer,
        responses={
            200: AuthResponseSerializer,
            400: OpenApiResponse(description="Validation error."),
        },
        description="Authenticate an existing local account and return JWT tokens.",
        tags=["Auth"],
    )
    def post(self, request: Request) -> Response:
        serializer = LoginSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        validated_data = cast(dict[str, Any], serializer.validated_data)
        user = cast(User, validated_data["user"])
        refresh = RefreshToken.for_user(user)

        response = Response(
            build_auth_response(user, refresh),
            status=status.HTTP_200_OK,
        )
        _set_auth_cookies(response, refresh)

        return response


class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated, IsNotBanned]

    @extend_schema(
        request=LogoutSerializer,
        responses={
            205: OpenApiResponse(description="Logout successful."),
            400: OpenApiResponse(description="Validation error."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Account banned."),
        },
        description="Logout by blacklisting the provided refresh token.",
        tags=["Auth"],
    )
    def post(self, request: Request) -> Response:
        request_data = cast(dict[str, Any], request.data)
        refresh_token = cast(str | None, request_data.get("refresh_token"))
        if not refresh_token:
            refresh_token = request.COOKIES.get(settings.AUTH_REFRESH_COOKIE_NAME)

        if not refresh_token:
            return Response(
                {"refresh_token": ["This field is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(cast(Any, refresh_token))
            token.blacklist()
        except TokenError as error:
            return Response(
                {"detail": f"Invalid token: {str(error)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response = Response(status=status.HTTP_205_RESET_CONTENT)
        _clear_auth_cookies(response)
        return response


class TokenRefreshAPIView(TokenRefreshView):
    serializer_class = BannedAwareTokenRefreshSerializer

    @extend_schema(
        responses={
            200: OpenApiResponse(description="Token refresh successful."),
            401: OpenApiResponse(description="Invalid or expired refresh token."),
            403: OpenApiResponse(description="Account banned."),
        },
        description="Refresh access token using refresh token. Banned users are blocked.",
        tags=["Auth"],
    )
    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        payload = cast(dict[str, Any], request.data).copy()

        if not payload.get("refresh"):
            cookie_refresh = request.COOKIES.get(settings.AUTH_REFRESH_COOKIE_NAME)
            if cookie_refresh:
                payload["refresh"] = cookie_refresh

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        data = cast(dict[str, Any], serializer.validated_data)
        response = Response(data, status=status.HTTP_200_OK)

        refresh_token_value = cast(str | None, data.get("refresh"))
        if refresh_token_value is not None:
            _set_auth_cookies(response, RefreshToken(refresh_token_value))
        else:
            access_token = cast(str, data["access"])
            access_max_age = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
            response.set_cookie(
                key=settings.AUTH_ACCESS_COOKIE_NAME,
                value=access_token,
                max_age=access_max_age,
                httponly=True,
                secure=settings.AUTH_COOKIE_SECURE,
                samesite=settings.AUTH_COOKIE_SAMESITE,
            )

        return response


class AuthMeAPIView(APIView):
    """Return authenticated user metadata from a canonical self-scoped route."""

    permission_classes = [IsAuthenticated, IsNotBanned]

    @extend_schema(
        responses={
            200: UserResponseSerializer,
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Account banned."),
        },
        description="Get authenticated user details from the canonical `/api/auth/me/` route.",
        tags=["Auth"],
    )
    def get(self, request: Request) -> Response:
        """Return the currently authenticated user's metadata."""
        return Response(
            UserResponseSerializer(cast(User, request.user)).data,
            status=status.HTTP_200_OK,
        )


class UserAppUsageModeMeAPIView(APIView):
    """Set app usage mode from canonical self-scoped route."""

    permission_classes = [IsAuthenticated, IsNotBanned]

    @extend_schema(
        request=UserAppUsageModeUpdateSerializer,
        responses={
            200: UserResponseSerializer,
            400: OpenApiResponse(description="Validation error."),
            401: OpenApiResponse(description="Authentication required."),
        },
        description=(
            "Set app usage mode for the authenticated user. "
            "Role can be assigned once and cannot be switched after assignment."
        ),
        tags=["Auth"],
    )
    def patch(self, request: Request) -> Response:
        """Set app usage mode for the currently authenticated user."""
        serializer = UserAppUsageModeUpdateSerializer(request.user, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            UserResponseSerializer(cast(User, request.user)).data,
            status=status.HTTP_200_OK,
        )


def _send_email_verification_email(user: User, raw_token: str) -> None:
    verify_path = getattr(settings, "EMAIL_VERIFICATION_URL_PATH", "/verify-email")
    base_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    verify_link = f"{base_url}{verify_path}?token={raw_token}"
    lifetime_hours = getattr(settings, "EMAIL_VERIFICATION_TOKEN_LIFETIME_HOURS", 24)

    subject = "Verify your Neighborship email address"
    body = (
        f"Welcome to Neighborship!\n\n"
        f"Please confirm your email address by clicking the link below. "
        f"This link will expire in {lifetime_hours} hours.\n\n"
        f"{verify_link}\n\n"
        f"If you did not create a Neighborship account, you can safely ignore this email.\n"
    )

    send_mail(
        subject=subject,
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def _send_password_reset_email(user: User, raw_token: str) -> None:
    reset_path = getattr(settings, "PASSWORD_RESET_URL_PATH", "/reset-password")
    base_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    reset_link = f"{base_url}{reset_path}?token={raw_token}"
    lifetime = getattr(settings, "PASSWORD_RESET_TOKEN_LIFETIME_MINUTES", 30)

    subject = "Reset your Neighborship password"
    body = (
        f"Hi,\n\n"
        f"We received a request to reset the password for your Neighborship account.\n"
        f"Use the link below to choose a new password. "
        f"This link will expire in {lifetime} minutes.\n\n"
        f"{reset_link}\n\n"
        f"If you did not request a password reset, you can safely ignore this email.\n"
    )

    send_mail(
        subject=subject,
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def _blacklist_user_refresh_tokens(user: User) -> None:
    """Blacklist all outstanding JWT refresh tokens for a user."""
    outstanding = OutstandingToken.objects.filter(user=user)
    for token_record in outstanding:
        try:
            RefreshToken(cast(Any, token_record.token)).blacklist()
        except TokenError:
            continue


class ForgotPasswordAPIView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=ForgotPasswordSerializer,
        responses={
            200: OpenApiResponse(description="Generic acknowledgement (no account enumeration)."),
            400: OpenApiResponse(description="Validation error."),
        },
        description=(
            "Request a password reset link. Always returns a generic success "
            "response, regardless of whether the email matches an account, to "
            "avoid user enumeration."
        ),
        tags=["Auth"],
    )
    def post(self, request: Request) -> Response:
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = cast(str, serializer.validated_data["email"])

        user = User.objects.filter(email=email, is_active=True, is_banned=False).first()
        if user is not None:
            try:
                raw_token, _ = PasswordResetToken.issue_for_user(user)
                _send_password_reset_email(user, raw_token)
            except Exception:
                logger.exception("Failed to issue password reset email for user %s", user.id)

        return Response(_GENERIC_FORGOT_PASSWORD_RESPONSE, status=status.HTTP_200_OK)


class ResetPasswordAPIView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=ResetPasswordSerializer,
        responses={
            200: OpenApiResponse(description="Password reset successful."),
            400: OpenApiResponse(description="Invalid or expired token, or validation error."),
        },
        description=(
            "Reset the user's password using a token delivered via email. "
            "On success the token is invalidated and existing JWT refresh "
            "tokens for the user are blacklisted."
        ),
        tags=["Auth"],
    )
    def post(self, request: Request) -> Response:
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = cast(dict[str, Any], serializer.validated_data)
        user = cast(User, validated_data["user"])
        reset_token = cast(PasswordResetToken, validated_data["reset_token"])
        new_password = cast(str, validated_data["new_password"])

        with transaction.atomic():
            user.set_password(new_password)
            user.save(update_fields=["password", "updated_at"])
            reset_token.mark_used()

        _blacklist_user_refresh_tokens(user)

        return Response(
            {"detail": "Password has been reset successfully."},
            status=status.HTTP_200_OK,
        )


class VerifyEmailAPIView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        parameters=[VerifyEmailSerializer],
        responses={
            200: OpenApiResponse(description="Email verification successful."),
            400: OpenApiResponse(description="Invalid or expired token."),
        },
        description=(
            "Verify a user's email address using a token delivered via email. "
            "On success the user's `is_email_verified` flag is set and the "
            "token is invalidated."
        ),
        tags=["Auth"],
    )
    def get(self, request: Request) -> Response:
        raw_token = cast(str | None, request.query_params.get("token"))
        if not raw_token:
            return Response(
                {"token": "This field is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token_hash = EmailVerificationToken.hash_token(raw_token)
        try:
            verification = EmailVerificationToken.objects.select_related("user").get(
                token_hash=token_hash
            )
        except EmailVerificationToken.DoesNotExist:
            return Response(
                {"token": "Invalid or expired token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not verification.is_valid():
            return Response(
                {"token": "Invalid or expired token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = verification.user
        if not user.is_active or user.is_banned:
            return Response(
                {"token": "Invalid or expired token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            if not user.is_email_verified:
                user.is_email_verified = True
                user.email_verified_at = timezone.now()
                user.save(update_fields=["is_email_verified", "email_verified_at", "updated_at"])
            verification.mark_used()

        return Response(
            {"detail": "Email has been verified successfully."},
            status=status.HTTP_200_OK,
        )


class ResendVerificationAPIView(APIView):
    permission_classes = [IsAuthenticated, IsNotBanned]

    @extend_schema(
        request=None,
        responses={
            200: OpenApiResponse(
                description="Verification email sent if the account is unverified."
            ),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Account banned."),
        },
        description=(
            "Issue a new email-verification token for the authenticated user "
            "and send the verification link. Returns a generic success response "
            "even when the account is already verified, to avoid leaking state."
        ),
        tags=["Auth"],
    )
    def post(self, request: Request) -> Response:
        user = cast(User, request.user)
        if not user.is_email_verified:
            try:
                raw_token, _ = EmailVerificationToken.issue_for_user(user)
                _send_email_verification_email(user, raw_token)
            except Exception:
                logger.exception("Failed to resend verification email for user %s", user.id)

        return Response(
            {"detail": "If your email is unverified, a new verification link has been sent."},
            status=status.HTTP_200_OK,
        )


class AdminUsersListAPIView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(
        responses={
            200: OpenApiResponse(description="List of all users (admin only)."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Admin access required."),
        },
        description="Admin only: list all users and their roles.",
        tags=["Admin"],
    )
    def get(self, request: Request) -> Response:
        users_qs = User.objects.all().order_by("-created_at")
        
        # Manual pagination
        try:
            page = max(int(request.query_params.get("page", 1)), 1)
            page_size = min(max(int(request.query_params.get("pageSize", 50)), 1), 100)
        except ValueError:
            page = 1
            page_size = 50
            
        offset = (page - 1) * page_size
        users = users_qs[offset : offset + page_size].values(
            "id",
            "email",
            "username",
            "role",
            "is_banned",
            "is_active",
            "created_at",
            "updated_at",
        )

        return Response(
            {
                "count": users_qs.count(),
                "results": list(users),
            },
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# OAuth2 login helpers & views
# ---------------------------------------------------------------------------


@transaction.atomic
def _get_or_create_oauth_user(
    email: str,
    provider: AuthProvider,
    display_name: str = "",
    picture_url: str = "",
) -> User:
    """Find an existing user by email or create a new OAuth user with Profile.

    Account-linking policy:
    - If a user with this email already exists (regardless of auth_provider),
      log them in. We do NOT overwrite auth_provider so local-password
      users keep their credentials intact.
    - If no user exists, create one with ``set_unusable_password()``,
      ``is_email_verified=True``, and a matching ``Profile``.
    """
    from django.contrib.auth.models import Group

    from profiles.models import Profile

    from .models import UserRole

    existing_user = User.objects.filter(email=email).first()
    if existing_user is not None:
        if not existing_user.is_active:
            raise OAuthVerificationError("This account is inactive.")
        if existing_user.is_banned:
            raise OAuthVerificationError("This account has been banned.")
        return existing_user

    # --- New user ---
    user = User.objects.create_user(
        email=email,
        password=None,  # set_unusable_password
        role=UserRole.USER,
        auth_provider=provider,
        is_active=True,
        is_email_verified=True,
    )
    user.email_verified_at = timezone.now()
    user.save(update_fields=["email_verified_at"])

    profile_display_name = display_name or (
        email.split("@", 1)[0].replace(".", " ").replace("_", " ").title()
    )
    Profile.objects.create(
        user=user,
        username=user.username,
        display_name=profile_display_name,
        picture_url=picture_url or "",
    )

    default_group, _ = Group.objects.get_or_create(name=UserRole.USER)
    user.groups.add(default_group)

    return user


class GoogleOAuthLoginAPIView(APIView):
    """Exchange a Google ID-token for local JWT tokens."""

    permission_classes = [AllowAny]

    @extend_schema(
        request=OAuthLoginSerializer,
        responses={
            200: AuthResponseSerializer,
            400: OpenApiResponse(description="Invalid or expired token."),
        },
        description=(
            "Authenticate using a Google-issued ID token. "
            "If no account exists for the token's email, a new user and "
            "profile are created automatically. Returns JWT tokens."
        ),
        tags=["Auth"],
    )
    def post(self, request: Request) -> Response:
        serializer = OAuthLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        raw_token = serializer.validated_data["id_token"]

        try:
            token_data = verify_google_id_token(raw_token)
        except OAuthVerificationError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Build display name from Google's given/family names
        parts = [token_data.get("given_name", ""), token_data.get("family_name", "")]
        display_name = " ".join(p for p in parts if p).strip() or token_data.get("name", "").strip()

        try:
            user = _get_or_create_oauth_user(
                email=token_data["email"],
                provider=AuthProvider.GOOGLE,
                display_name=display_name,
                picture_url=token_data.get("picture", ""),
            )
        except OAuthVerificationError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)
        response = Response(
            build_auth_response(user, refresh),
            status=status.HTTP_200_OK,
        )
        _set_auth_cookies(response, refresh)
        return response


# ---------------------------------------------------------------------------
# Admin – user management
# ---------------------------------------------------------------------------


class AdminUserUpdateAPIView(APIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminUserUpdateSerializer

    @extend_schema(
        request=AdminUserUpdateSerializer,
        responses={
            200: UserResponseSerializer,
            400: OpenApiResponse(description="Validation error."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Admin access required."),
            404: OpenApiResponse(description="User not found."),
        },
        description="Admin only: update a user's ban status.",
        tags=["Admin"],
    )
    def patch(self, request: Request, user_id: str) -> Response:
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        admin = cast(User, request.user)
        if str(target_user.id) == str(admin.id):
            return Response(
                {"detail": "You cannot modify your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AdminUserUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        is_banned = serializer.validated_data["is_banned"]
        target_user.is_banned = is_banned
        target_user.save(update_fields=["is_banned", "updated_at"])

        if is_banned:
            _blacklist_user_refresh_tokens(target_user)

        return Response(
            UserResponseSerializer(target_user).data,
            status=status.HTTP_200_OK,
        )

    # Support PUT as well for backward compatibility with E2E tests
    def put(self, request: Request, user_id: str) -> Response:
        return self.patch(request, user_id)


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------


class ReportCreateAPIView(APIView):
    permission_classes = [IsUser]

    @extend_schema(
        request=ReportCreateSerializer,
        responses={
            201: ReportListSerializer,
            400: OpenApiResponse(description="Validation error."),
            401: OpenApiResponse(description="Authentication required."),
        },
        description="Submit a report against another user.",
        tags=["Reports"],
    )
    def post(self, request: Request) -> Response:
        serializer = ReportCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        report = Report.objects.create(
            submitted_by=cast(User, request.user),
            reported_user_id=serializer.validated_data["reported_user_id"],
            reason=serializer.validated_data["reason"],
            description=serializer.validated_data.get("description", ""),
            related_message_id=serializer.validated_data.get("related_message_id"),
        )

        return Response(
            ReportListSerializer(report).data,
            status=status.HTTP_201_CREATED,
        )


class AdminReportListAPIView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(
        responses={
            200: OpenApiResponse(description="List of reports."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Admin access required."),
        },
        description="Admin only: list all reports. Filterable by ?status=OPEN.",
        tags=["Admin"],
    )
    def get(self, request: Request) -> Response:
        queryset = Report.objects.select_related(
            "submitted_by", "reported_user", "resolved_by"
        ).order_by("-created_at")

        status_filter = request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())

        # Manual pagination
        try:
            page = max(int(request.query_params.get("page", 1)), 1)
            page_size = min(max(int(request.query_params.get("pageSize", 50)), 1), 100)
        except ValueError:
            page = 1
            page_size = 50
            
        offset = (page - 1) * page_size
        paginated_reports = queryset[offset : offset + page_size]

        reports = ReportListSerializer(paginated_reports, many=True).data
        return Response(
            {
                "count": queryset.count(),
                "results": reports,
            },
            status=status.HTTP_200_OK,
        )


class AdminReportUpdateAPIView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(
        request=ReportResolveSerializer,
        responses={
            200: ReportListSerializer,
            400: OpenApiResponse(description="Validation error."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Admin access required."),
            404: OpenApiResponse(description="Report not found."),
        },
        description="Admin only: update a report's status and resolution note.",
        tags=["Admin"],
    )
    def patch(self, request: Request, report_id: str) -> Response:
        try:
            report = Report.objects.select_related(
                "submitted_by", "reported_user", "resolved_by"
            ).get(id=report_id)
        except Report.DoesNotExist:
            return Response(
                {"detail": "Report not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ReportResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["status"]
        report.status = new_status
        report.resolution_note = serializer.validated_data.get("resolution_note", "")

        if new_status in ("RESOLVED", "DISMISSED"):
            report.resolved_by = cast(User, request.user)
            report.resolved_at = timezone.now()

        report.save()

        return Response(
            ReportListSerializer(report).data,
            status=status.HTTP_200_OK,
        )

