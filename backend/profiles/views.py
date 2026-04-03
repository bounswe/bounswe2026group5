"""Views for profile self-service API endpoints."""

from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.db import IntegrityError
from django.db.models import Q
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
    PublicMentorProfileSearchListResponseSerializer,
    PublicMentorProfileSearchResultSerializer,
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


class PublicMentorProfilesSearchListAPIView(APIView):
    """Public listing of visible mentor profiles with search and filtering."""

    permission_classes = [AllowAny]

    @staticmethod
    def _parse_terms(request: Request, keys: list[str]) -> list[str]:
        """Parse terms from comma-separated or repeated query params."""
        terms: list[str] = []
        for key in keys:
            for raw in request.query_params.getlist(key):
                for part in raw.split(","):
                    value = part.strip()
                    if value:
                        terms.append(value)
        # Keep stable order while deduplicating.
        seen: set[str] = set()
        deduped: list[str] = []
        for t in terms:
            if t.lower() not in seen:
                seen.add(t.lower())
                deduped.append(t)
        return deduped

    @staticmethod
    def _parse_mode(request: Request) -> list[str]:
        """Map `mentorshipMode` query param to internal app usage mode values."""
        raw_mode = (
            request.query_params.get("mentorshipMode")
            or request.query_params.get("mentorship_mode")
            or request.query_params.get("mode")
        )
        if not raw_mode:
            return [AppUsageMode.MENTOR]

        mode = raw_mode.strip().upper()
        if mode == AppUsageMode.MENTOR:
            return [AppUsageMode.MENTOR]
        if mode == AppUsageMode.MENTEE:
            return [AppUsageMode.MENTEE]

        # "BOTH" isn't a first-class value in our backend, but we treat it as mentor.
        if mode == "BOTH":
            return [AppUsageMode.MENTOR]

        raise ValueError("Invalid mentorshipMode. Expected MENTOR, MENTEE, or BOTH.")

    @staticmethod
    def _maybe_parse_coordinates(request: Request) -> tuple[float, float] | None:
        """Parse lat/lng query params if present."""
        lat_raw = request.query_params.get("lat") or request.query_params.get("latitude")
        lng_raw = request.query_params.get("lng") or request.query_params.get("longitude")
        if lat_raw is None and lng_raw is None:
            return None
        if lat_raw is None or lng_raw is None:
            raise ValueError("Both `lat`/`latitude` and `lng`/`longitude` are required.")

        try:
            lat = float(lat_raw)
            lng = float(lng_raw)
        except (TypeError, ValueError):
            raise ValueError("`lat`/`lng` must be valid numbers.")

        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            raise ValueError("`lat` must be between -90 and 90; `lng` between -180 and 180.")
        return lat, lng

    @staticmethod
    def _maybe_parse_distance_km(request: Request) -> float | None:
        for key in ("distanceKm", "maxDistanceKm", "radiusKm", "distance_km", "radius_km"):
            raw = request.query_params.get(key)
            if raw is None:
                continue
            try:
                return float(raw)
            except (TypeError, ValueError):
                raise ValueError(f"`{key}` must be a valid number.")
        return None

    @extend_schema(
        operation_id="profiles_public_mentor_search",
        responses={200: PublicMentorProfileSearchListResponseSerializer},
        description=(
            "Public listing of visible mentor profiles with optional search and filters. "
            "Supports pagination via `page` and `pageSize` query params."
        ),
        tags=["Profiles"],
    )
    def get(self, request: Request) -> Response:
        try:
            mentorship_modes = self._parse_mode(request)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        q = (
            request.query_params.get("q")
            or request.query_params.get("name")
            or request.query_params.get("keyword")
        )
        q = q.strip() if isinstance(q, str) else ""

        # Skills/topics are matched only via `ExpertiseField` (through ProfileExpertise)
        # using case-insensitive exact match (`__iexact`), so behavior matches other filters.
        skill_terms = self._parse_terms(
            request,
            keys=["skill", "skills", "expertise", "topic"],
        )

        try:
            page = int(request.query_params.get("page", 1))
            page_size = int(request.query_params.get("pageSize", 6))
        except (TypeError, ValueError):
            return Response(
                {"detail": "`page` and `pageSize` must be integers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        page = max(page, 1)
        page_size = max(page_size, 1)
        page_size = min(page_size, 50)

        qs = (
            Profile.objects.select_related("user")
            .filter(is_visible=True, user__app_usage_mode__in=mentorship_modes)
            .prefetch_related("profile_expertise", "profile_expertise__expertise_field")
        )

        if q:
            qs = (
                qs.filter(
                    Q(display_name__icontains=q)
                    | Q(title__icontains=q)
                    | Q(bio__icontains=q)
                    | Q(profile_expertise__expertise_field__name__icontains=q)
                )
                .distinct()
            )

        if skill_terms:
            expertise_field_q = Q()
            for term in skill_terms:
                expertise_field_q |= Q(
                    profile_expertise__expertise_field__name__iexact=term,
                )
            qs = qs.filter(expertise_field_q).distinct()

        # Optional: geographical distance filtering (lat/lng + distanceKm)
        try:
            coords = self._maybe_parse_coordinates(request)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        distance_km = None
        try:
            distance_km = self._maybe_parse_distance_km(request)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if coords is not None and distance_km is not None:
            lat, lng = coords
            point = Point(lng, lat, srid=4326)
            qs = qs.filter(location__distance_lte=(point, D(km=distance_km)))

        total = qs.count()
        offset = (page - 1) * page_size
        items = qs[offset : offset + page_size]

        serializer = PublicMentorProfileSearchResultSerializer(items, many=True)
        return Response(
            {
                "count": total,
                "page": page,
                "pageSize": page_size,
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )
