from typing import Any, cast

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
    UserResponseSerializer,
)


def build_auth_response(user: User) -> dict[str, object]:
    refresh = RefreshToken.for_user(user)
    return {
        "access_token": str(refresh.access_token),
        "refresh_token": str(refresh),
        "user": UserResponseSerializer(user).data,
    }


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

        return Response(
            AuthResponseSerializer(build_auth_response(user)).data,
            status=status.HTTP_201_CREATED,
        )


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

        return Response(
            AuthResponseSerializer(build_auth_response(user)).data,
            status=status.HTTP_200_OK,
        )


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
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        validated_data = cast(dict[str, Any], serializer.validated_data)
        refresh_token = cast(str, validated_data["refresh_token"])
        try:
            token = RefreshToken(cast(Any, refresh_token))
            token.blacklist()
        except TokenError as error:
            return Response(
                {"detail": f"Invalid token: {str(error)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_205_RESET_CONTENT)


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
        return cast(Response, super().post(request, *args, **kwargs))


class AdminUsersListAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

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
