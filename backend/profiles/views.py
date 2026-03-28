"""Views for profile self-service API endpoints."""

from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Profile
from .serializers import ProfileResponseSerializer, ProfileUpdateSerializer

NOT_FOUND_DETAIL = {"detail": "Not found."}


class ProfileByUsernameAPIView(APIView):
    """Retrieve by username and update own profile by username."""

    def get_permissions(self) -> list[BasePermission]:
        """Allow public reads but require auth for mutations."""
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated()]

    def _get_owned_profile_or_404(self, request: Request, username: str) -> Profile | None:
        """Return profile only if it belongs to current user and username matches."""
        try:
            return Profile.objects.get(user=request.user, username=username)
        except Profile.DoesNotExist:
            return None

    def _get_profile_or_404(self, username: str) -> Profile | None:
        """Return profile by username when it exists."""
        try:
            return Profile.objects.get(username=username)
        except Profile.DoesNotExist:
            return None

    @extend_schema(
        responses={
            200: ProfileResponseSerializer,
            404: OpenApiResponse(description="Profile not found."),
        },
        description=(
            "Get profile by username. Returns profile when requester is the owner or "
            "when the profile is marked visible."
        ),
        tags=["Profiles"],
    )
    def get(self, request: Request, username: str) -> Response:
        """Handle GET requests by applying visibility and ownership rules."""
        profile = self._get_profile_or_404(username)
        if profile is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        is_owner = request.user.is_authenticated and request.user == profile.user
        if not is_owner and not profile.is_visible:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        return Response(ProfileResponseSerializer(profile).data, status=status.HTTP_200_OK)

    @extend_schema(
        request=ProfileUpdateSerializer,
        responses={
            200: ProfileResponseSerializer,
            400: OpenApiResponse(description="Validation error."),
            401: OpenApiResponse(description="Authentication required."),
            404: OpenApiResponse(description="Profile not found."),
        },
        description="Partially update authenticated user's profile by username.",
        tags=["Profiles"],
    )
    def patch(self, request: Request, username: str) -> Response:
        """Handle PATCH requests for own profile by username."""
        profile = self._get_owned_profile_or_404(request, username)
        if profile is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        serializer = ProfileUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(ProfileResponseSerializer(profile).data, status=status.HTTP_200_OK)
