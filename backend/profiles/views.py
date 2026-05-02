"""Views for profile self-service API endpoints."""

from datetime import timedelta

from django.conf import settings
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.db import IntegrityError, models, transaction
from django.db.models import Count, Q
from django.db.models.deletion import ProtectedError
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import AppUsageMode, UserRole
from accounts.permissions import IsUser
from mentorship.models import Feedback, MentorshipRequest
from mentorship.services import book_match_session

from .models import AvailabilitySlot, CommunityTag, CommunityTagMembership, Profile, Skill
from .serializers import (
    AvailabilitySlotSerializer,
    AvailabilitySlotWriteSerializer,
    CommunityTagCreateSerializer,
    CommunityTagDetailSerializer,
    CommunityTagListResponseSerializer,
    CommunityTagListSerializer,
    CommunityTagMembershipSerializer,
    CommunityTagUpdateSerializer,
    MenteeProfileResponseSerializer,
    MentorProfileResponseSerializer,
    ProfilePostFeedSerializer,
    ProfilePostListQueryParamsSerializer,
    ProfilePostSerializer,
    ProfileResponseSerializer,
    ProfileUpdateSerializer,
    ProfileUsernameUpdateSerializer,
    PrPCreateSerializer,
    PrPUpdateSerializer,
    PublicMentorProfileSearchListResponseSerializer,
    PublicMentorProfileSearchResultSerializer,
    SkillSerializer,
)
from .services import (
    InvalidPrPEventTypeError,
    OwnSlotBookingError,
    SlotAlreadyBookedError,
    SlotInPastError,
    create_prp_event,
    edit_prp_event,
    list_profile_feed_events,
    soft_delete_prp_event,
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

    def _get_request_profile_or_404(self, request: Request) -> Profile | None:
        """Return profile bound to authenticated request user when it exists."""
        try:
            return Profile.objects.select_related("user").get(user=request.user)
        except Profile.DoesNotExist:
            return None

    def _serialize_profile_by_mode(self, profile: Profile) -> dict[str, object]:
        """Serialize profile response using role-appropriate schema shape."""
        app_usage_mode = profile.user.app_usage_mode
        if app_usage_mode == AppUsageMode.MENTEE:
            serializer = MenteeProfileResponseSerializer(profile)
        elif app_usage_mode == AppUsageMode.MENTOR:
            serializer = MentorProfileResponseSerializer(profile)
        else:
            serializer = ProfileResponseSerializer(profile)

        data = dict(serializer.data)
        data["app_usage_mode"] = app_usage_mode
        return data


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


class ProfileByUsernameAPIView(ProfileLookupMixin, APIView):
    """Retrieve profile by username for public reads."""

    permission_classes = [AllowAny]

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

        return Response(self._serialize_profile_by_mode(profile), status=status.HTTP_200_OK)


class ProfileMeAPIView(ProfileLookupMixin, APIView):
    """Canonical self-scoped profile read/update endpoint."""

    permission_classes = [IsUser]

    @extend_schema(
        responses={
            200: ProfileResponseSerializer,
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Account banned."),
            404: OpenApiResponse(description="Profile not found."),
        },
        description="Get authenticated user's own profile using canonical `/api/profiles/me/`.",
        tags=["Profiles"],
    )
    def get(self, request: Request) -> Response:
        """Return authenticated user's own profile using role-shaped response."""
        profile = self._get_request_profile_or_404(request)
        if profile is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        data = self._serialize_profile_by_mode(profile)
        data["available_catalog_skills"] = list(Skill.objects.values_list("name", flat=True))

        return Response(data, status=status.HTTP_200_OK)

    @extend_schema(
        request=ProfileUpdateSerializer,
        responses={
            200: ProfileResponseSerializer,
            400: OpenApiResponse(description="Validation error."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Account banned."),
            404: OpenApiResponse(description="Profile not found."),
        },
        description="Partially update authenticated user's profile using `/api/profiles/me/`.",
        tags=["Profiles"],
    )
    def patch(self, request: Request) -> Response:
        """Partially update authenticated user's own profile."""
        profile = self._get_request_profile_or_404(request)
        if profile is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        serializer = ProfileUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(ProfileResponseSerializer(profile).data, status=status.HTTP_200_OK)


class ProfilePostsListAPIView(ProfileLookupMixin, APIView):
    """Read profile feed posts for a profile username."""

    permission_classes = [IsUser]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="category",
                location=OpenApiParameter.QUERY,
                required=False,
                type=OpenApiTypes.STR,
                enum=["PrP", "MCTE"],
                description="Filter by event category.",
            ),
            OpenApiParameter(
                name="event_type",
                location=OpenApiParameter.QUERY,
                required=False,
                type=OpenApiTypes.STR,
                enum=["achievement", "social", "progress"],
                description="Filter by event type.",
            ),
            OpenApiParameter(
                name="offset",
                location=OpenApiParameter.QUERY,
                required=False,
                type=OpenApiTypes.INT,
                description="Zero-based index of the first item to include. Default: 0.",
            ),
            OpenApiParameter(
                name="limit",
                location=OpenApiParameter.QUERY,
                required=False,
                type=OpenApiTypes.INT,
                description="Maximum number of items to return. Default: 50. Maximum: 200.",
            ),
        ],
        responses={
            200: ProfilePostFeedSerializer,
            400: OpenApiResponse(description="Invalid query parameters."),
            401: OpenApiResponse(description="Authentication required."),
            404: OpenApiResponse(description="Profile not found."),
        },
        description=(
            "Return profile posts for a username. Includes both PrP posts authored by the "
            "profile and MCTE events authored by the profile where `show_on_profile=true`. "
            "If profile is private, only the owner can access this feed. "
            "Supports optional filtering by `category` and `event_type`."
        ),
        tags=["Profiles"],
    )
    def get(self, request: Request, username: str) -> Response:
        """Return paginated profile feed events for a profile page."""
        profile = self._get_profile_or_404(username)
        if profile is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        is_owner = request.user == profile.user
        if not is_owner and not profile.is_visible:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        params_serializer = ProfilePostListQueryParamsSerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)
        params = params_serializer.validated_data

        payload = list_profile_feed_events(
            profile=profile,
            offset=params["offset"],
            limit=params["limit"],
            category=params.get("category"),
            event_type=params.get("event_type"),
        )
        return Response(ProfilePostFeedSerializer(payload).data, status=status.HTTP_200_OK)


class MyProfilePostsCollectionAPIView(ProfileLookupMixin, APIView):
    """Create profile posts for authenticated user profile."""

    permission_classes = [IsUser]

    @extend_schema(
        request=PrPCreateSerializer,
        responses={
            201: ProfilePostSerializer,
            400: OpenApiResponse(description="Validation error."),
            401: OpenApiResponse(description="Authentication required."),
            404: OpenApiResponse(description="Profile not found."),
        },
        description=(
            "Create a profile post (PrP) for the authenticated user. "
            "`timestamp` is optional; if omitted, null, or empty, it is set to the event's "
            "creation time. If provided, it cannot be more than 1 day in the future."
        ),
        tags=["Profiles"],
    )
    def post(self, request: Request) -> Response:
        """Create a new profile post authored by request.user's profile."""
        profile = self._get_request_profile_or_404(request)
        if profile is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        serializer = PrPCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        try:
            event = create_prp_event(
                author_profile=profile,
                event_type=validated["event_type"],
                content=validated.get("content", ""),
                media_url=validated.get("media_url"),
                timestamp=validated.get("timestamp"),
            )
        except InvalidPrPEventTypeError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        event.author = profile
        return Response(ProfilePostSerializer(event).data, status=status.HTTP_201_CREATED)


class MyProfilePostDetailAPIView(ProfileLookupMixin, APIView):
    """Update or soft-delete profile posts owned by authenticated user."""

    permission_classes = [IsUser]

    def _resolve_owned_post(self, request: Request, event_id: str):
        """Return profile and owned PrP event, or 404 response."""
        profile = self._get_request_profile_or_404(request)
        if profile is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        from timeline.models import TimelineEvent

        try:
            event = TimelineEvent.objects.select_related("author").get(
                id=event_id,
                author=profile,
                category=TimelineEvent.Category.PRP,
                is_deleted=False,
            )
        except TimelineEvent.DoesNotExist:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        return profile, event

    @extend_schema(
        request=PrPUpdateSerializer,
        responses={
            200: ProfilePostSerializer,
            400: OpenApiResponse(description="Validation error or no fields provided."),
            401: OpenApiResponse(description="Authentication required."),
            404: OpenApiResponse(description="Profile post not found."),
        },
        description=(
            "Partially update an owned profile post. Only `content`, `event_type`, "
            "and `media_url` may be changed."
        ),
        tags=["Profiles"],
    )
    def patch(self, request: Request, event_id: str) -> Response:
        """Apply a partial update to an owned profile post."""
        result = self._resolve_owned_post(request, event_id)
        if isinstance(result, Response):
            return result
        _profile, event = result

        serializer = PrPUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        try:
            updated_event = edit_prp_event(
                event=event,
                content=validated.get("content"),
                event_type=validated.get("event_type"),
                media_url=validated.get("media_url"),
                update_media_url="media_url" in validated,
            )
        except InvalidPrPEventTypeError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(ProfilePostSerializer(updated_event).data, status=status.HTTP_200_OK)

    @extend_schema(
        request=None,
        responses={
            204: OpenApiResponse(description="Profile post deleted."),
            401: OpenApiResponse(description="Authentication required."),
            404: OpenApiResponse(description="Profile post not found."),
        },
        description="Soft-delete an owned profile post.",
        tags=["Profiles"],
    )
    def delete(self, request: Request, event_id: str) -> Response:
        """Soft-delete an owned profile post."""
        result = self._resolve_owned_post(request, event_id)
        if isinstance(result, Response):
            return result
        _profile, event = result

        soft_delete_prp_event(event=event)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProfileUsernameUpdateAPIView(ProfileLookupMixin, APIView):
    """Canonical self-scoped username update endpoint."""

    permission_classes = [IsUser]

    @extend_schema(
        request=ProfileUsernameUpdateSerializer,
        responses={
            200: ProfileResponseSerializer,
            400: OpenApiResponse(description="Validation error."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Account banned."),
            404: OpenApiResponse(description="Profile not found."),
        },
        description="Update authenticated user's username using `/api/profiles/me/username/`.",
        tags=["Profiles"],
    )
    def patch(self, request: Request) -> Response:
        """Update authenticated user's username."""
        profile = self._get_request_profile_or_404(request)
        if profile is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        serializer = ProfileUsernameUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(ProfileResponseSerializer(profile).data, status=status.HTTP_200_OK)


class AvailabilitySlotListCreateAPIView(ProfileLookupMixin, APIView):
    """List mentor availability slots scoped by username."""

    permission_classes = [IsUser]

    @extend_schema(
        responses={
            200: AvailabilitySlotSerializer(many=True),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Permission denied."),
            404: OpenApiResponse(description="Profile not found."),
        },
        description="List upcoming availability slots for a mentor by username.",
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


class MyAvailabilitySlotListCreateAPIView(ProfileLookupMixin, APIView):
    """Canonical owner-scoped availability slot list/create endpoint."""

    permission_classes = [IsUser]

    @extend_schema(
        request=AvailabilitySlotWriteSerializer,
        responses={
            201: AvailabilitySlotSerializer,
            400: OpenApiResponse(description="Validation error."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Permission denied."),
            404: OpenApiResponse(description="Profile not found."),
        },
        description=(
            "Create an availability slot for the authenticated mentor using "
            "canonical `/api/profiles/me/availability-slots/`."
        ),
        tags=["Profiles"],
    )
    def post(self, request: Request) -> Response:
        """Create an availability slot for authenticated mentor profile."""
        profile = self._get_request_profile_or_404(request)
        if profile is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        if not self._is_mentor_profile(profile):
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
            404: OpenApiResponse(description="Profile not found."),
        },
        description=(
            "List upcoming availability slots owned by authenticated mentor via "
            "canonical `/api/profiles/me/availability-slots/`."
        ),
        tags=["Profiles"],
    )
    def get(self, request: Request) -> Response:
        """List upcoming availability slots for authenticated mentor profile."""
        profile = self._get_request_profile_or_404(request)
        if profile is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        if not self._is_mentor_profile(profile):
            return Response(PERMISSION_DENIED_DETAIL, status=status.HTTP_403_FORBIDDEN)

        upcoming_slots = AvailabilitySlot.objects.filter(
            profile=profile,
            start_at__gte=timezone.now(),
        ).order_by("start_at")

        return Response(
            AvailabilitySlotSerializer(upcoming_slots, many=True).data,
            status=status.HTTP_200_OK,
        )


class MyAvailabilitySlotDetailAPIView(ProfileLookupMixin, APIView):
    """Canonical owner-scoped availability slot detail/update/delete endpoint."""

    permission_classes = [IsUser]

    def _get_owned_slot_or_404(
        self,
        request: Request,
        slot_id: str,
    ) -> tuple[Profile | None, AvailabilitySlot | None]:
        """Return authenticated mentor profile and owned slot, or None values when missing."""
        profile = self._get_request_profile_or_404(request)
        if profile is None:
            return None, None

        if not self._is_mentor_profile(profile):
            return profile, None

        slot = AvailabilitySlot.objects.filter(id=slot_id, profile=profile).first()
        return profile, slot

    @extend_schema(
        responses={
            200: AvailabilitySlotSerializer,
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Permission denied."),
            404: OpenApiResponse(description="Availability slot not found."),
        },
        description="Retrieve one availability slot owned by authenticated mentor.",
        tags=["Profiles"],
    )
    def get(self, request: Request, slot_id: str) -> Response:
        """Retrieve one availability slot for authenticated mentor."""
        profile, slot = self._get_owned_slot_or_404(request, slot_id)
        if profile is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)
        if not self._is_mentor_profile(profile):
            return Response(PERMISSION_DENIED_DETAIL, status=status.HTTP_403_FORBIDDEN)
        if slot is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        return Response(AvailabilitySlotSerializer(slot).data, status=status.HTTP_200_OK)

    @extend_schema(
        request=AvailabilitySlotWriteSerializer,
        responses={
            200: AvailabilitySlotSerializer,
            400: OpenApiResponse(description="Validation error."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Permission denied."),
            404: OpenApiResponse(description="Availability slot not found."),
        },
        description="Partially update one availability slot owned by authenticated mentor.",
        tags=["Profiles"],
    )
    def patch(self, request: Request, slot_id: str) -> Response:
        """Partially update one availability slot for authenticated mentor."""
        profile, slot = self._get_owned_slot_or_404(request, slot_id)
        if profile is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)
        if not self._is_mentor_profile(profile):
            return Response(PERMISSION_DENIED_DETAIL, status=status.HTTP_403_FORBIDDEN)
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
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Permission denied."),
            404: OpenApiResponse(description="Availability slot not found."),
        },
        description="Replace one availability slot owned by authenticated mentor.",
        tags=["Profiles"],
    )
    def put(self, request: Request, slot_id: str) -> Response:
        """Fully update one availability slot for authenticated mentor."""
        profile, slot = self._get_owned_slot_or_404(request, slot_id)
        if profile is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)
        if not self._is_mentor_profile(profile):
            return Response(PERMISSION_DENIED_DETAIL, status=status.HTTP_403_FORBIDDEN)
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
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Permission denied."),
            404: OpenApiResponse(description="Availability slot not found."),
        },
        description="Delete one availability slot owned by authenticated mentor.",
        tags=["Profiles"],
    )
    def delete(self, request: Request, slot_id: str) -> Response:
        """Delete one availability slot for authenticated mentor."""
        profile, slot = self._get_owned_slot_or_404(request, slot_id)
        if profile is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)
        if not self._is_mentor_profile(profile):
            return Response(PERMISSION_DENIED_DETAIL, status=status.HTTP_403_FORBIDDEN)
        if slot is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        try:
                # MentorshipRequest moved to top level

            with transaction.atomic():
                locked_slot = AvailabilitySlot.objects.select_for_update().get(id=slot.id)

                if locked_slot.is_booked:
                    return Response(
                        {"detail": "Cannot delete a booked slot. Cancel the booking first."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                has_pending_requests = MentorshipRequest.objects.filter(
                    slot=locked_slot,
                    status=MentorshipRequest.Status.PENDING,
                ).exists()
                if has_pending_requests:
                    return Response(
                        {
                            "detail": (
                                "Cannot delete this slot while it has pending mentorship "
                                "requests."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                non_pending_requests = MentorshipRequest.objects.select_for_update().filter(
                    slot=locked_slot
                )
                for request_obj in non_pending_requests:
                    if request_obj.initial_session_start_at is None:
                        request_obj.initial_session_start_at = locked_slot.start_at
                    if request_obj.initial_session_end_at is None:
                        request_obj.initial_session_end_at = locked_slot.end_at
                    request_obj.slot = None
                    request_obj.save(
                        update_fields=[
                            "slot",
                            "initial_session_start_at",
                            "initial_session_end_at",
                        ]
                    )

                locked_slot.delete()
        except ProtectedError:
            return Response(
                {
                    "detail": (
                        "Cannot delete this slot while it is still referenced by an "
                        "existing mentorship request."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

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
        # book_match_session moved to top level

        profile = self._get_profile_or_404(username)
        if profile is None or not self._is_mentor_profile(profile):
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        try:
            slot = book_match_session(mentor_profile=profile, slot_id=slot_id, actor=request.user)
        except AvailabilitySlot.DoesNotExist:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)
        except SlotAlreadyBookedError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except SlotInPastError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except OwnSlotBookingError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response(AvailabilitySlotSerializer(slot).data, status=status.HTTP_200_OK)


class RecentlyAddedMentorsListAPIView(APIView):
    """Public listing of the most recently created visible mentor profiles."""

    permission_classes = [AllowAny]

    @extend_schema(
        responses={
            200: PublicMentorProfileSearchListResponseSerializer,
            400: OpenApiResponse(description="Invalid `limit` value."),
        },
        description=(
            "Return the most recently created visible mentor profiles, "
            "sorted by creation date descending. "
            "Use `limit` (1–50, default 10) to control the list size."
        ),
        tags=["Profiles"],
    )
    def get(self, request: Request) -> Response:
        try:
            limit = int(request.query_params.get("limit", 10))
        except (TypeError, ValueError):
            return Response(
                {"detail": "`limit` must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        limit = max(1, min(limit, 50))

        qs = (
            Profile.objects.select_related("user")
            .filter(
                is_visible=True,
                user__app_usage_mode=AppUsageMode.MENTOR,
                user__is_active=True,
            )
            .order_by("-created_at")[:limit]
        )

        serializer = PublicMentorProfileSearchResultSerializer(qs, many=True)
        return Response({"results": serializer.data}, status=status.HTTP_200_OK)


class PopularMentorsListAPIView(APIView):
    """Public listing of the highest-rated visible mentor profiles."""

    permission_classes = [AllowAny]

    @extend_schema(
        responses={
            200: PublicMentorProfileSearchListResponseSerializer,
            400: OpenApiResponse(description="Invalid `limit` value."),
        },
        description=(
            "Return the most popular visible mentor profiles, sorted by average rating "
            "descending with total mentee count as a tiebreaker. "
            "Use `limit` (1–50, default 10) to control the list size."
        ),
        tags=["Profiles"],
    )
    def get(self, request: Request) -> Response:
        try:
            limit = int(request.query_params.get("limit", 10))
        except (TypeError, ValueError):
            return Response(
                {"detail": "`limit` must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        limit = max(1, min(limit, 50))

        qs = (
            Profile.objects.select_related("user")
            .filter(
                is_visible=True,
                user__app_usage_mode=AppUsageMode.MENTOR,
                user__is_active=True,
            )
            .order_by("-average_rating", "-total_mentee_count")[:limit]
        )

        serializer = PublicMentorProfileSearchResultSerializer(qs, many=True)
        return Response({"results": serializer.data}, status=status.HTTP_200_OK)


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
    def _skills_match_query(skills: list[str], query: str) -> bool:
        """Return True when any skill contains the query text (case-insensitive)."""
        q = query.strip().lower()
        if not q:
            return False
        return any(q in (skill or "").lower() for skill in (skills or []))

    @staticmethod
    def _has_any_skill(skills: list[str], terms: list[str]) -> bool:
        """Return True when any skill exactly matches one term (case-insensitive)."""
        if not terms:
            return False
        wanted = {term.strip().lower() for term in terms if term.strip()}
        if not wanted:
            return False
        return any((skill or "").lower() in wanted for skill in (skills or []))

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

        raise ValueError("Invalid mentorshipMode. Expected MENTOR or MENTEE.")

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

        # Skills/topics are matched through Profile.skills using case-insensitive checks.
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

        qs = Profile.objects.select_related("user").filter(
            is_visible=True, user__app_usage_mode__in=mentorship_modes
        )

        if q:
            base_qs = qs
            text_match_ids = set(
                base_qs.filter(
                    Q(display_name__icontains=q) | Q(title__icontains=q) | Q(bio__icontains=q)
                ).values_list("id", flat=True)
            )
            skill_match_ids = {
                profile_id
                for profile_id, profile_skills in base_qs.values_list("id", "skills")
                if self._skills_match_query(profile_skills or [], q)
            }
            qs = qs.filter(id__in=text_match_ids | skill_match_ids)

        if skill_terms:
            skill_match_ids = {
                profile_id
                for profile_id, profile_skills in qs.values_list("id", "skills")
                if self._has_any_skill(profile_skills or [], skill_terms)
            }
            qs = qs.filter(id__in=skill_match_ids)

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

        # Community tag filtering (matches profiles in ANY of the given tags)
        tag_terms = self._parse_terms(request, keys=["tag", "tags"])
        if tag_terms:
            tagged_profile_ids = CommunityTagMembership.objects.filter(
                Q(tag__slug__in=tag_terms) | Q(tag__name__in=tag_terms)
            ).values_list("profile_id", flat=True)
            qs = qs.filter(id__in=tagged_profile_ids)

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


class MentorPublicAverageRatingAPIView(ProfileLookupMixin, APIView):
    """Return the public batch-updated average rating for a mentor profile."""

    permission_classes = [AllowAny]

    @extend_schema(
        responses={
            200: OpenApiResponse(description="Public average rating data."),
            404: OpenApiResponse(description="Profile not found."),
        },
        description=(
            "Return the public average rating and review count for a mentor profile. "
            "The average rating is updated in batches (per the configured threshold), "
            "not on every individual review."
        ),
        tags=["Profiles"],
    )
    def get(self, request: Request, username: str) -> Response:
        """Return average_rating and review_count for the named profile."""
        profile = self._get_profile_or_404(username)
        if profile is None or not profile.is_visible:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        return Response(
            {
                "username": profile.username,
                "average_rating": str(profile.average_rating),
                "review_count": profile.review_count,
            },
            status=status.HTTP_200_OK,
        )


class PublicProfileReviewSerializer(serializers.Serializer):
    """Public-facing text review payload for profile pages."""

    rating = serializers.IntegerField()
    text = serializers.CharField()
    created_at = serializers.DateTimeField()


class PublicProfileReviewListResponseSerializer(serializers.Serializer):
    """Paginated response for public profile reviews endpoint."""

    count = serializers.IntegerField()
    page = serializers.IntegerField()
    pageSize = serializers.IntegerField()
    results = PublicProfileReviewSerializer(many=True)


class ProfileReviewsByUsernameAPIView(ProfileLookupMixin, APIView):
    """Return public, anonymous mentee text reviews for a visible mentor profile."""

    permission_classes = [AllowAny]

    @extend_schema(
        operation_id="profiles_public_reviews",
        responses={
            200: PublicProfileReviewListResponseSerializer,
            400: OpenApiResponse(description="Invalid pagination params."),
            404: OpenApiResponse(description="Profile not found."),
        },
        description=(
            "Return anonymous text reviews for a visible mentor profile. "
            "Only complete batches of reviews are exposed based on the configured "
            "rating update threshold. Supports pagination via `page` and `pageSize`."
        ),
        tags=["Profiles"],
    )
    def get(self, request: Request, username: str) -> Response:
        profile = self._get_profile_or_404(username)
        if profile is None or not profile.is_visible or not self._is_mentor_profile(profile):
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

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

        threshold = max(1, int(getattr(settings, "RATING_UPDATE_THRESHOLD", 5)))
        allowed_reviews_count = (profile.review_count // threshold) * threshold

        feedback_qs = (
            Feedback.objects.filter(match__mentor=profile)
            .exclude(submitted_by=profile)
            .exclude(text="")
            .order_by("id")
        )

        total = min(feedback_qs.count(), allowed_reviews_count)
        offset = (page - 1) * page_size
        items = feedback_qs[:allowed_reviews_count][offset : offset + page_size]

        return Response(
            {
                "count": total,
                "page": page,
                "pageSize": page_size,
                "results": PublicProfileReviewSerializer(items, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Community Tags Views
# ---------------------------------------------------------------------------


class CommunityTagListCreateAPIView(APIView):
    """List all community tags (public) or create a new one (auth required)."""

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsUser()]
        return [AllowAny()]

    @extend_schema(
        operation_id="community_tags_list",
        responses={200: CommunityTagListResponseSerializer},
        description=(
            "List all community tags, ordered by name. "
            "Supports search via `q` query param and pagination via `page`/`pageSize`."
        ),
        tags=["Community Tags"],
    )
    def get(self, request: Request) -> Response:
        """Return paginated list of community tags with optional search."""
        q = (request.query_params.get("q") or "").strip()

        try:
            page = int(request.query_params.get("page", 1))
            page_size = int(request.query_params.get("pageSize", 20))
        except (TypeError, ValueError):
            return Response(
                {"detail": "`page` and `pageSize` must be integers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        page = max(page, 1)
        page_size = max(1, min(page_size, 50))

        qs = CommunityTag.objects.all()
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q))

        total = qs.count()
        offset = (page - 1) * page_size
        items = qs[offset : offset + page_size]

        serializer = CommunityTagListSerializer(items, many=True)
        return Response(
            {
                "count": total,
                "page": page,
                "pageSize": page_size,
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        operation_id="community_tags_create",
        request=CommunityTagCreateSerializer,
        responses={
            201: CommunityTagDetailSerializer,
            400: OpenApiResponse(description="Validation error."),
            401: OpenApiResponse(description="Authentication required."),
        },
        description="Create a new community tag. Tag names are unique (case-insensitive).",
        tags=["Community Tags"],
    )
    def post(self, request: Request) -> Response:
        """Create a new community tag."""
        profile = self._get_profile(request)
        if profile is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        serializer = CommunityTagCreateSerializer(
            data=request.data,
            context={"profile": profile},
        )
        serializer.is_valid(raise_exception=True)
        tag = serializer.save()

        return Response(
            CommunityTagDetailSerializer(tag, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @staticmethod
    def _get_profile(request: Request):
        try:
            return Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return None


class CommunityTagDetailAPIView(APIView):
    """Retrieve or delete a community tag."""

    def get_permissions(self):
        if self.request.method in ("DELETE", "PATCH"):
            return [IsUser()]
        return [AllowAny()]

    @extend_schema(
        operation_id="community_tags_detail",
        responses={
            200: CommunityTagDetailSerializer,
            404: OpenApiResponse(description="Tag not found."),
        },
        description="Retrieve a community tag by ID, including member count and creator info.",
        tags=["Community Tags"],
    )
    def get(self, request: Request, tag_id: str) -> Response:
        tag = CommunityTag.objects.select_related("created_by").filter(id=tag_id).first()
        if tag is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        return Response(
            CommunityTagDetailSerializer(tag, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        operation_id="community_tags_update",
        request=CommunityTagUpdateSerializer,
        responses={
            200: CommunityTagDetailSerializer,
            400: OpenApiResponse(description="Validation error."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Permission denied."),
            404: OpenApiResponse(description="Tag not found."),
        },
        description=(
            "Update a community tag's description. Only the tag's creator and "
            "admins can edit. The tag name and slug are immutable; any attempt "
            "to change them is silently ignored to keep tag URLs stable."
        ),
        tags=["Community Tags"],
    )
    def patch(self, request: Request, tag_id: str) -> Response:
        tag = CommunityTag.objects.select_related("created_by").filter(id=tag_id).first()
        if tag is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        is_admin = request.user.role == UserRole.ADMIN
        actor_profile_id = None
        try:
            actor_profile_id = Profile.objects.get(user=request.user).id
        except Profile.DoesNotExist:
            if not is_admin:
                return Response(PERMISSION_DENIED_DETAIL, status=status.HTTP_403_FORBIDDEN)
        if not is_admin and tag.created_by_id != actor_profile_id:
            return Response(PERMISSION_DENIED_DETAIL, status=status.HTTP_403_FORBIDDEN)

        tag._actor_profile_id = actor_profile_id
        serializer = CommunityTagUpdateSerializer(tag, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            CommunityTagDetailSerializer(tag, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        operation_id="community_tags_delete",
        responses={
            204: OpenApiResponse(description="Tag deleted."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Permission denied."),
            404: OpenApiResponse(description="Tag not found."),
        },
        description=(
            "Delete a community tag. Admins can delete any tag. "
            "Regular creators can only delete their own tag if it has no members."
        ),
        tags=["Community Tags"],
    )
    def delete(self, request: Request, tag_id: str) -> Response:
        tag = CommunityTag.objects.select_related("created_by").filter(id=tag_id).first()
        if tag is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        is_admin = request.user.role == UserRole.ADMIN
        actor_profile_id = (
            Profile.objects.filter(user=request.user).values_list("id", flat=True).first()
        )

        if is_admin:
            tag._actor_profile_id = actor_profile_id
            tag.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        # Non-admin: must be creator and tag must be empty
        if actor_profile_id is None or tag.created_by_id != actor_profile_id:
            return Response(PERMISSION_DENIED_DETAIL, status=status.HTTP_403_FORBIDDEN)

        if tag.member_count > 0:
            return Response(
                {"detail": "Cannot delete a tag that still has members."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tag._actor_profile_id = actor_profile_id
        tag.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CommunityTagJoinAPIView(APIView):
    """Join a community tag."""

    permission_classes = [IsUser]

    @extend_schema(
        operation_id="community_tags_join",
        request=None,
        responses={
            200: CommunityTagMembershipSerializer,
            400: OpenApiResponse(description="Already a member."),
            401: OpenApiResponse(description="Authentication required."),
            404: OpenApiResponse(description="Tag not found."),
        },
        description="Join a community tag. Authenticated users only.",
        tags=["Community Tags"],
    )
    def post(self, request: Request, tag_id: str) -> Response:
        tag = CommunityTag.objects.filter(id=tag_id).first()
        if tag is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            _, created = CommunityTagMembership.objects.get_or_create(
                profile=profile,
                tag=tag,
            )
            if not created:
                return Response(
                    {"detail": "You are already a member of this tag."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            CommunityTag.objects.filter(id=tag.id).update(member_count=models.F("member_count") + 1)

        return Response(
            CommunityTagMembershipSerializer(
                {
                    "tag_id": tag.id,
                    "tag_name": tag.name,
                    "tag_slug": tag.slug,
                    "joined": True,
                }
            ).data,
            status=status.HTTP_200_OK,
        )


class CommunityTagLeaveAPIView(APIView):
    """Leave a community tag."""

    permission_classes = [IsUser]

    @extend_schema(
        operation_id="community_tags_leave",
        responses={
            200: CommunityTagMembershipSerializer,
            400: OpenApiResponse(description="Not a member."),
            401: OpenApiResponse(description="Authentication required."),
            404: OpenApiResponse(description="Tag not found."),
        },
        description="Leave a community tag. Authenticated users only.",
        tags=["Community Tags"],
    )
    def delete(self, request: Request, tag_id: str) -> Response:
        tag = CommunityTag.objects.filter(id=tag_id).first()
        if tag is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            deleted_count, _ = CommunityTagMembership.objects.filter(
                profile=profile,
                tag=tag,
            ).delete()
            if deleted_count == 0:
                return Response(
                    {"detail": "You are not a member of this tag."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            CommunityTag.objects.filter(id=tag.id).update(member_count=models.F("member_count") - 1)

        return Response(
            CommunityTagMembershipSerializer(
                {
                    "tag_id": tag.id,
                    "tag_name": tag.name,
                    "tag_slug": tag.slug,
                    "joined": False,
                }
            ).data,
            status=status.HTTP_200_OK,
        )


class MyTagsListAPIView(ProfileLookupMixin, APIView):
    """List community tags the authenticated user belongs to."""

    permission_classes = [IsUser]

    @extend_schema(
        operation_id="community_tags_my_list",
        responses={
            200: CommunityTagListSerializer(many=True),
            401: OpenApiResponse(description="Authentication required."),
            404: OpenApiResponse(description="Profile not found."),
        },
        description="List community tags the authenticated user has joined.",
        tags=["Community Tags"],
    )
    def get(self, request: Request) -> Response:
        profile = self._get_request_profile_or_404(request)
        if profile is None:
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        tags = CommunityTag.objects.filter(
            memberships__profile=profile,
        ).order_by("name")

        return Response(
            CommunityTagListSerializer(tags, many=True).data,
            status=status.HTTP_200_OK,
        )


POPULAR_TAGS_WINDOWS = {"all": None, "7d": 7, "30d": 30}
POPULAR_TAGS_DEFAULT_LIMIT = 10
POPULAR_TAGS_MAX_LIMIT = 50


class PopularTagsListAPIView(APIView):
    """List the most popular community tags by member count."""

    permission_classes = [AllowAny]

    @extend_schema(
        operation_id="community_tags_popular",
        responses={
            200: CommunityTagListSerializer(many=True),
            400: OpenApiResponse(description="Invalid limit or window value."),
        },
        description=(
            "List the top community tags by member count. "
            "Supports `limit` (default 10, capped at 50) and `window` "
            "(`all`, `7d`, `30d`; defaults to `all`). Ties break on most recent creation."
        ),
        tags=["Community Tags"],
    )
    def get(self, request: Request) -> Response:
        try:
            limit = int(request.query_params.get("limit", POPULAR_TAGS_DEFAULT_LIMIT))
        except (TypeError, ValueError):
            return Response(
                {"detail": "`limit` must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        limit = max(1, min(limit, POPULAR_TAGS_MAX_LIMIT))

        window = (request.query_params.get("window") or "all").strip().lower()
        if window not in POPULAR_TAGS_WINDOWS:
            allowed = ", ".join(sorted(POPULAR_TAGS_WINDOWS.keys()))
            return Response(
                {"detail": f"`window` must be one of: {allowed}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        days = POPULAR_TAGS_WINDOWS[window]
        if days is None:
            qs = CommunityTag.objects.filter(member_count__gt=0).order_by(
                "-member_count", "-created_at"
            )
        else:
            cutoff = timezone.now() - timedelta(days=days)
            qs = (
                CommunityTag.objects.annotate(
                    window_count=Count(
                        "memberships",
                        filter=Q(memberships__joined_at__gte=cutoff),
                    )
                )
                .filter(window_count__gt=0)
                .order_by("-window_count", "-created_at")
            )

        items = list(qs[:limit])
        return Response(
            CommunityTagListSerializer(items, many=True).data,
            status=status.HTTP_200_OK,
        )


class CommunityTagMembersListAPIView(APIView):
    """List the visible profiles enrolled in a community tag."""

    permission_classes = [AllowAny]

    @extend_schema(
        operation_id="community_tags_members_list",
        responses={
            200: PublicMentorProfileSearchListResponseSerializer,
            400: OpenApiResponse(description="Invalid pagination params."),
            404: OpenApiResponse(description="Tag not found."),
        },
        description=(
            "List the profiles that have joined a given community tag, ordered by "
            "most recently joined first. Hidden profiles are excluded. Pagination via "
            "`page` and `pageSize`."
        ),
        tags=["Community Tags"],
    )
    def get(self, request: Request, tag_id: str) -> Response:
        if not CommunityTag.objects.filter(id=tag_id).exists():
            return Response(NOT_FOUND_DETAIL, status=status.HTTP_404_NOT_FOUND)

        try:
            page = int(request.query_params.get("page", 1))
            page_size = int(request.query_params.get("pageSize", 20))
        except (TypeError, ValueError):
            return Response(
                {"detail": "`page` and `pageSize` must be integers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        page = max(page, 1)
        page_size = max(1, min(page_size, 50))

        memberships = (
            CommunityTagMembership.objects.filter(tag_id=tag_id, profile__is_visible=True)
            .select_related("profile__user")
            .order_by("-joined_at")
        )

        total = memberships.count()
        offset = (page - 1) * page_size
        page_items = memberships[offset : offset + page_size]
        profiles = [m.profile for m in page_items]

        serializer = PublicMentorProfileSearchResultSerializer(profiles, many=True)
        return Response(
            {
                "count": total,
                "page": page,
                "pageSize": page_size,
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )
