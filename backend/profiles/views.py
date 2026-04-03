"""Views for profile self-service API endpoints."""

from django.db import IntegrityError
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import AppUsageMode
from accounts.permissions import IsUser

from .models import AvailabilitySlot, Profile, Skill
from .serializers import (
    AvailabilitySlotSerializer,
    AvailabilitySlotWriteSerializer,
    MenteeProfileResponseSerializer,
    MentorProfileResponseSerializer,
    ProfileResponseSerializer,
    ProfileUpdateSerializer,
    SkillSerializer,
)
from .services import (
    BookingCancelNotAllowedError,
    OwnSlotBookingError,
    SlotAlreadyBookedError,
    SlotInPastError,
    SlotNotBookedError,
    book_availability_slot,
    cancel_availability_booking,
)

NOT_FOUND_DETAIL = {"detail": "Not found."}
OVERLAP_DETAIL = {"detail": "Availability slot overlaps with an existing slot."}
PERMISSION_DENIED_DETAIL = {"detail": "You do not have permission to perform this action."}


class ProfileLookupMixin:
    """Shared profile lookup and mentor checks for profile API views."""

    def _get_profile_or_404(self, username: str) -> Profile | None:
        """Return profile by username when it exists."""
        try:
            return Profile.objects.select_related("user").get(username=username)
        except Profile.DoesNotExist:
            return None

    def _is_mentor_profile(self, profile: Profile) -> bool:
        """Return True when the user's app usage mode is MENTOR."""
        return profile.user.app_usage_mode == AppUsageMode.MENTOR


class SkillListAPIView(APIView):
    """List all available predefined skills in the catalog."""

    permission_classes = [AllowAny]

    @extend_schema(
        responses={200: SkillSerializer(many=True)},
        description="Get a list of all available skills stored in the system catalog.",
        tags=["Profiles"],
    )
    def get(self, request: Request) -> Response:
        """Return all skills ordered by name."""
        qs = Skill.objects.all()
        return Response(SkillSerializer(qs, many=True).data, status=status.HTTP_200_OK)


class AvailabilitySlotLookupMixin(ProfileLookupMixin):
    """Shared availability slot lookup helper."""

    def _get_slot_or_404(self, profile: Profile, slot_id: str) -> AvailabilitySlot | None:
        """Return slot when it belongs to provided profile; otherwise None."""
        try:
            return AvailabilitySlot.objects.get(id=slot_id, profile=profile)
        except AvailabilitySlot.DoesNotExist:
            return None


class ProfileByUsernameAPIView(ProfileLookupMixin, APIView):
    """Retrieve by username and update own profile by username."""

    def get_permissions(self) -> list[BasePermission]:
        """Allow public reads but require auth and role checks for mutations."""
        if self.request.method == "GET":
            return [AllowAny()]

        return [IsUser()]

    def _get_owned_profile_or_404(self, request: Request, username: str) -> Profile | None:
        """Return profile only if it belongs to current user and username matches."""
        try:
            return Profile.objects.get(user=request.user, username=username)
        except Profile.DoesNotExist:
            return None

    @extend_schema(
        responses={
            200: MentorProfileResponseSerializer,
            404: OpenApiResponse(description="Profile not found."),
        },
        description=(
            "Get profile by username. Returns a mentee or mentor profile shape "
            "based on the user's app usage mode. Returns profile when requester "
            "is the owner or when the profile is marked visible."
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

        app_usage_mode = profile.user.app_usage_mode
        if app_usage_mode == AppUsageMode.MENTEE:
            serializer = MenteeProfileResponseSerializer(profile)
        elif app_usage_mode == AppUsageMode.MENTOR:
            serializer = MentorProfileResponseSerializer(profile)
        else:
            # Fallback for users who haven't set their usage mode yet
            serializer = ProfileResponseSerializer(profile)

        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=ProfileUpdateSerializer,
        responses={
            200: ProfileResponseSerializer,
            400: OpenApiResponse(description="Validation error."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Account banned."),
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


class AvailabilitySlotListCreateAPIView(ProfileLookupMixin, APIView):
    """Create and list mentor availability slots scoped by username."""

    permission_classes = [IsUser]

    @extend_schema(
        request=AvailabilitySlotWriteSerializer,
        responses={
            201: AvailabilitySlotSerializer,
            400: OpenApiResponse(description="Validation error."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Permission denied."),
        },
        description=(
            "Create a mentor availability slot using date/startTime/endTime. "
            "endTime must be later than startTime."
        ),
        tags=["Profiles"],
    )
    def post(self, request: Request, username: str) -> Response:
        """Create an availability slot for mentor matching requested username."""
        profile = self._get_profile_or_404(username)
        if profile is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        if request.user != profile.user or not self._is_mentor_profile(profile):
            return Response(PERMISSION_DENIED_DETAIL, status=status.HTTP_403_FORBIDDEN)

        serializer = AvailabilitySlotWriteSerializer(
            data=request.data,
            context={"profile": profile},
        )
        serializer.is_valid(raise_exception=True)

        try:
            slot = serializer.save()
        except IntegrityError:
            return Response(OVERLAP_DETAIL, status=status.HTTP_400_BAD_REQUEST)

        return Response(AvailabilitySlotSerializer(slot).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        responses={
            200: AvailabilitySlotSerializer(many=True),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Permission denied."),
        },
        description="List upcoming availability slots for authenticated mentor.",
        tags=["Profiles"],
    )
    def get(self, request: Request, username: str) -> Response:
        """List upcoming availability slots for the mentor matching username."""
        profile = self._get_profile_or_404(username)
        if profile is None or not self._is_mentor_profile(profile):
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        upcoming_slots = AvailabilitySlot.objects.filter(
            profile=profile,
            start_at__gte=timezone.now(),
        ).order_by("start_at")

        return Response(
            AvailabilitySlotSerializer(upcoming_slots, many=True).data,
            status=status.HTTP_200_OK,
        )


class AvailabilitySlotDetailAPIView(AvailabilitySlotLookupMixin, APIView):
    """Retrieve, update, and delete mentor-owned availability slots."""

    permission_classes = [IsUser]

    @extend_schema(
        responses={
            200: AvailabilitySlotSerializer,
            404: OpenApiResponse(description="Availability slot not found."),
        },
        description="Retrieve a mentor-owned availability slot by ID.",
        tags=["Profiles"],
    )
    def get(self, request: Request, username: str, slot_id: str) -> Response:
        """Retrieve one availability slot for mentor matching username."""
        profile = self._get_profile_or_404(username)
        if profile is None or not self._is_mentor_profile(profile):
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        slot = self._get_slot_or_404(profile, slot_id)
        if slot is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        return Response(AvailabilitySlotSerializer(slot).data, status=status.HTTP_200_OK)

    @extend_schema(
        request=AvailabilitySlotWriteSerializer,
        responses={
            200: AvailabilitySlotSerializer,
            400: OpenApiResponse(description="Validation error."),
            404: OpenApiResponse(description="Availability slot not found."),
        },
        description="Update a mentor-owned availability slot.",
        tags=["Profiles"],
    )
    def patch(self, request: Request, username: str, slot_id: str) -> Response:
        """Partially update one availability slot for owner mentor only."""
        profile = self._get_profile_or_404(username)
        if profile is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        if request.user != profile.user or not self._is_mentor_profile(profile):
            return Response(PERMISSION_DENIED_DETAIL, status=status.HTTP_403_FORBIDDEN)

        slot = self._get_slot_or_404(profile, slot_id)
        if slot is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        serializer = AvailabilitySlotWriteSerializer(slot, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            updated_slot = serializer.save()
        except IntegrityError:
            return Response(OVERLAP_DETAIL, status=status.HTTP_400_BAD_REQUEST)

        return Response(AvailabilitySlotSerializer(updated_slot).data, status=status.HTTP_200_OK)

    @extend_schema(
        request=AvailabilitySlotWriteSerializer,
        responses={
            200: AvailabilitySlotSerializer,
            400: OpenApiResponse(description="Validation error."),
            404: OpenApiResponse(description="Availability slot not found."),
        },
        description="Replace a mentor-owned availability slot.",
        tags=["Profiles"],
    )
    def put(self, request: Request, username: str, slot_id: str) -> Response:
        """Fully update one availability slot for owner mentor only."""
        profile = self._get_profile_or_404(username)
        if profile is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        if request.user != profile.user or not self._is_mentor_profile(profile):
            return Response(PERMISSION_DENIED_DETAIL, status=status.HTTP_403_FORBIDDEN)

        slot = self._get_slot_or_404(profile, slot_id)
        if slot is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        serializer = AvailabilitySlotWriteSerializer(slot, data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            updated_slot = serializer.save()
        except IntegrityError:
            return Response(OVERLAP_DETAIL, status=status.HTTP_400_BAD_REQUEST)

        return Response(AvailabilitySlotSerializer(updated_slot).data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            204: OpenApiResponse(description="Availability slot deleted."),
            404: OpenApiResponse(description="Availability slot not found."),
        },
        description="Delete a mentor-owned availability slot.",
        tags=["Profiles"],
    )
    def delete(self, request: Request, username: str, slot_id: str) -> Response:
        """Delete one availability slot for owner mentor only."""
        profile = self._get_profile_or_404(username)
        if profile is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        if request.user != profile.user or not self._is_mentor_profile(profile):
            return Response(PERMISSION_DENIED_DETAIL, status=status.HTTP_403_FORBIDDEN)

        slot = self._get_slot_or_404(profile, slot_id)
        if slot is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        slot.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AvailabilitySlotBookAPIView(ProfileLookupMixin, APIView):
    """Book an available mentor slot for an authenticated user."""

    permission_classes = [IsUser]

    @extend_schema(
        request=None,
        responses={
            200: AvailabilitySlotSerializer,
            400: OpenApiResponse(description="Booking validation error."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Permission denied."),
            404: OpenApiResponse(description="Availability slot not found."),
        },
        description="Book a mentor availability slot.",
        tags=["Profiles"],
    )
    def post(self, request: Request, username: str, slot_id: str) -> Response:
        """Book a slot for requester when business rules permit."""
        profile = self._get_profile_or_404(username)
        if profile is None or not self._is_mentor_profile(profile):
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        try:
            slot = book_availability_slot(profile=profile, slot_id=slot_id, actor=request.user)
        except AvailabilitySlot.DoesNotExist:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)
        except SlotAlreadyBookedError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except SlotInPastError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except OwnSlotBookingError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response(AvailabilitySlotSerializer(slot).data, status=status.HTTP_200_OK)


class AvailabilitySlotCancelBookingAPIView(ProfileLookupMixin, APIView):
    """Cancel an existing slot booking."""

    permission_classes = [IsUser]

    @extend_schema(
        request=None,
        responses={
            200: AvailabilitySlotSerializer,
            400: OpenApiResponse(description="Cancellation validation error."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Permission denied."),
            404: OpenApiResponse(description="Availability slot not found."),
        },
        description="Cancel a mentor availability slot booking.",
        tags=["Profiles"],
    )
    def post(self, request: Request, username: str, slot_id: str) -> Response:
        """Cancel an existing booking when requester is permitted."""
        profile = self._get_profile_or_404(username)
        if profile is None or not self._is_mentor_profile(profile):
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        try:
            slot = cancel_availability_booking(profile=profile, slot_id=slot_id, actor=request.user)
        except AvailabilitySlot.DoesNotExist:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)
        except SlotNotBookedError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except BookingCancelNotAllowedError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response(AvailabilitySlotSerializer(slot).data, status=status.HTTP_200_OK)
