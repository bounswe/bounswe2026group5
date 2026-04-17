from typing import Any, cast
from uuid import UUID

from django.conf import settings
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .models import User
from .permissions import IsAdmin, IsNotBanned
from .serializers import (
    AuthResponseSerializer,
    BannedAwareTokenRefreshSerializer,
    LoginSerializer,
    LogoutSerializer,
    RegisterSerializer,
    UserAppUsageModeUpdateSerializer,
    UserResponseSerializer,
)


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


DEPRECATED_ALIAS_SUNSET = "Wed, 31 Dec 2026 23:59:59 GMT"


def _add_deprecation_headers(response: Response, successor_path: str) -> Response:
    """Attach deprecation metadata headers to temporary compatibility aliases."""
    response["Deprecation"] = "true"
    response["Sunset"] = DEPRECATED_ALIAS_SUNSET
    response["Link"] = f'<{successor_path}>; rel="successor-version"'
    return response


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

        response = Response(
            AuthResponseSerializer(build_auth_response(user, refresh)).data,
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
            AuthResponseSerializer(build_auth_response(user, refresh)).data,
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


class AuthUserByIdAPIView(AuthMeAPIView):
    """Legacy alias for authenticated user metadata by user id."""

    @extend_schema(
        responses={
            200: UserResponseSerializer,
            401: OpenApiResponse(description="Authentication required."),
            404: OpenApiResponse(description="User not found."),
            403: OpenApiResponse(description="Account banned."),
        },
        description=(
            "Deprecated alias. Get authenticated user details by own user id route. "
            "Use `/api/auth/me/` instead."
        ),
        deprecated=True,
        tags=["Auth"],
    )
    def get(self, request: Request, user_id: UUID) -> Response:
        request_user_id = getattr(request.user, "id", None) or getattr(request.user, "pk", None)

        if str(request_user_id) != str(user_id):
            response = Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
            return _add_deprecation_headers(response, "/api/auth/me/")

        response = super().get(request)
        return _add_deprecation_headers(response, "/api/auth/me/")


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


class UserAppUsageModeAPIView(UserAppUsageModeMeAPIView):
    """Legacy alias for app usage mode update by user id."""

    @extend_schema(
        request=UserAppUsageModeUpdateSerializer,
        responses={
            200: UserResponseSerializer,
            400: OpenApiResponse(description="Validation error."),
            401: OpenApiResponse(description="Authentication required."),
            404: OpenApiResponse(description="User not found."),
        },
        description=(
            "Deprecated alias. Set app usage mode for the authenticated user. "
            "Use `/api/auth/me/role/` instead."
        ),
        deprecated=True,
        tags=["Auth"],
    )
    def patch(self, request: Request, user_id: UUID) -> Response:
        request_user_id = getattr(request.user, "id", None) or getattr(request.user, "pk", None)

        if str(request_user_id) != str(user_id):
            response = Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
            return _add_deprecation_headers(response, "/api/auth/me/role/")

        response = super().patch(request)
        return _add_deprecation_headers(response, "/api/auth/me/role/")


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
        users = User.objects.all().values(
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
                "count": User.objects.count(),
                "results": list(users),
            },
            status=status.HTTP_200_OK,
        )
