"""Views for workshop API endpoints."""

from typing import Any

from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import AppUsageMode
from accounts.permissions import IsEmailVerified, IsUser
from profiles.models import Profile

from .models import Workshop
from .serializers import (
    WorkshopCreateSerializer,
    WorkshopGroupJoinSerializer,
    WorkshopParticipationSerializer,
    WorkshopRespondSerializer,
    WorkshopSerializer,
    WorkshopUpdateSerializer,
)
from .services import (
    AlreadyParticipatingError,
    OwnWorkshopJoinError,
    ParticipationNotFoundError,
    ParticipationNotPendingError,
    WorkshopFullError,
    WorkshopInPastError,
    WorkshopNotEditableError,
    WorkshopNotFoundError,
    WorkshopNotJoinableError,
    WorkshopOwnershipRequiredError,
    WorkshopScheduleConflictError,
    create_workshop,
    get_workshop,
    join_workshop,
    list_workshops,
    request_group_attendance,
    respond_to_participation,
    update_workshop,
)

_NOT_FOUND = {"detail": "Workshop not found."}
_PERMISSION_DENIED = {"detail": "You do not have permission to perform this action."}
_NO_PROFILE = {"detail": "Profile not found."}
_MENTOR_REQUIRED = {"detail": "You need a MENTOR profile to create or manage workshops."}
_SCHEDULE_CONFLICT = {
    "detail": (
        "Workshop time overlaps with one of your existing availability slots or workshops."
    )
}
_SCHEDULE_PAST = {"detail": "Workshop must be scheduled in the future."}
_NOT_EDITABLE = {"detail": "This workshop can no longer be edited."}
_NOT_JOINABLE = {"detail": "This workshop is no longer joinable."}
_WORKSHOP_FULL = {"detail": "This workshop has reached its maximum participant count."}
_ALREADY_PARTICIPATING = {"detail": "You already have a participation entry for this workshop."}
_OWN_WORKSHOP = {"detail": "You cannot join your own workshop."}
_PARTICIPATION_NOT_FOUND = {"detail": "Participation not found."}
_PARTICIPATION_NOT_PENDING = {"detail": "Only pending participations can be approved or rejected."}


def _get_actor_profile(request: Request) -> Profile | None:
    try:
        return Profile.objects.get(user=request.user)
    except Profile.DoesNotExist:
        return None


class WorkshopListCreateAPIView(APIView):
    """List workshops (public) or create a workshop (mentor)."""

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsUser(), IsEmailVerified()]
        return [AllowAny()]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="status",
                description="Filter by workshop status (SCHEDULED or CANCELED).",
                required=False,
                type=str,
            ),
        ],
        responses={200: WorkshopSerializer(many=True)},
        description="List all workshops. Public endpoint; no authentication required.",
        tags=["Workshops"],
    )
    def get(self, request: Request) -> Response:
        status_filter = request.query_params.get("status")
        qs = list_workshops(status=status_filter)
        return Response(WorkshopSerializer(qs, many=True).data, status=status.HTTP_200_OK)

    @extend_schema(
        request=WorkshopCreateSerializer,
        responses={
            201: WorkshopSerializer,
            400: OpenApiResponse(description="Validation error."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Mentor profile required."),
            409: OpenApiResponse(description="Schedule conflict with existing slots/workshops."),
        },
        description="Create a new workshop. Caller must have a MENTOR profile.",
        tags=["Workshops"],
    )
    def post(self, request: Request) -> Response:
        if request.user.app_usage_mode != AppUsageMode.MENTOR:
            return Response(_MENTOR_REQUIRED, status=status.HTTP_403_FORBIDDEN)

        actor = _get_actor_profile(request)
        if actor is None:
            return Response(_NO_PROFILE, status=status.HTTP_403_FORBIDDEN)

        serializer = WorkshopCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            workshop = create_workshop(
                mentor=actor,
                title=data["title"],
                description=data.get("description", ""),
                scheduled_start_at_utc=data["scheduled_start_at_utc"],
                scheduled_end_at_utc=data["scheduled_end_at_utc"],
                min_participants=data["min_participants"],
                max_participants=data["max_participants"],
            )
        except WorkshopInPastError:
            return Response(_SCHEDULE_PAST, status=status.HTTP_400_BAD_REQUEST)
        except WorkshopScheduleConflictError:
            return Response(_SCHEDULE_CONFLICT, status=status.HTTP_409_CONFLICT)

        return Response(WorkshopSerializer(workshop).data, status=status.HTTP_201_CREATED)


class WorkshopDetailAPIView(APIView):
    """Retrieve or update a single workshop."""

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT"):
            return [IsUser(), IsEmailVerified()]
        return [AllowAny()]

    @extend_schema(
        responses={200: WorkshopSerializer, 404: OpenApiResponse(description="Workshop not found.")},
        description="Retrieve workshop details.",
        tags=["Workshops"],
    )
    def get(self, request: Request, workshop_id) -> Response:
        try:
            workshop = get_workshop(workshop_id)
        except WorkshopNotFoundError:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)
        return Response(WorkshopSerializer(workshop).data, status=status.HTTP_200_OK)

    @extend_schema(
        request=WorkshopUpdateSerializer,
        responses={
            200: WorkshopSerializer,
            400: OpenApiResponse(description="Validation error."),
            403: OpenApiResponse(description="Only the workshop owner may update it."),
            404: OpenApiResponse(description="Workshop not found."),
            409: OpenApiResponse(description="Schedule conflict with existing slots/workshops."),
        },
        description="Partially update a workshop. Only the owning mentor may call this.",
        tags=["Workshops"],
    )
    def patch(self, request: Request, workshop_id) -> Response:
        actor = _get_actor_profile(request)
        if actor is None:
            return Response(_NO_PROFILE, status=status.HTTP_403_FORBIDDEN)

        try:
            workshop = get_workshop(workshop_id)
        except WorkshopNotFoundError:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

        serializer = WorkshopUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        fields = dict(serializer.validated_data)

        try:
            workshop = update_workshop(workshop=workshop, actor=actor, fields=fields)
        except WorkshopOwnershipRequiredError:
            return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)
        except WorkshopNotEditableError:
            return Response(_NOT_EDITABLE, status=status.HTTP_400_BAD_REQUEST)
        except WorkshopInPastError:
            return Response(_SCHEDULE_PAST, status=status.HTTP_400_BAD_REQUEST)
        except WorkshopScheduleConflictError:
            return Response(_SCHEDULE_CONFLICT, status=status.HTTP_409_CONFLICT)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(WorkshopSerializer(workshop).data, status=status.HTTP_200_OK)


class WorkshopJoinAPIView(APIView):
    """Mentee joins a workshop as a single participant."""

    permission_classes = [IsUser, IsEmailVerified]

    @extend_schema(
        request=None,
        responses={
            201: WorkshopParticipationSerializer,
            400: OpenApiResponse(description="Workshop full or not joinable."),
            403: OpenApiResponse(description="Cannot join own workshop."),
            404: OpenApiResponse(description="Workshop not found."),
            409: OpenApiResponse(description="Already participating."),
        },
        description="Join a workshop as a single participant. Adds a CONFIRMED entry.",
        tags=["Workshops"],
    )
    def post(self, request: Request, workshop_id) -> Response:
        actor = _get_actor_profile(request)
        if actor is None:
            return Response(_NO_PROFILE, status=status.HTTP_403_FORBIDDEN)

        try:
            workshop = get_workshop(workshop_id)
        except WorkshopNotFoundError:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

        try:
            participation = join_workshop(workshop=workshop, mentee=actor)
        except OwnWorkshopJoinError:
            return Response(_OWN_WORKSHOP, status=status.HTTP_403_FORBIDDEN)
        except WorkshopNotJoinableError:
            return Response(_NOT_JOINABLE, status=status.HTTP_400_BAD_REQUEST)
        except AlreadyParticipatingError:
            return Response(_ALREADY_PARTICIPATING, status=status.HTTP_409_CONFLICT)
        except WorkshopFullError:
            return Response(_WORKSHOP_FULL, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            WorkshopParticipationSerializer(participation).data,
            status=status.HTTP_201_CREATED,
        )


class WorkshopGroupJoinAPIView(APIView):
    """Mentee requests group attendance pending mentor approval."""

    permission_classes = [IsUser, IsEmailVerified]

    @extend_schema(
        request=WorkshopGroupJoinSerializer,
        responses={
            201: WorkshopParticipationSerializer,
            400: OpenApiResponse(description="Group exceeds max or workshop not joinable."),
            403: OpenApiResponse(description="Cannot join own workshop."),
            404: OpenApiResponse(description="Workshop not found."),
            409: OpenApiResponse(description="Already participating."),
        },
        description=(
            "Request to attend a workshop as a group (e.g., bringing friends). "
            "Creates a PENDING_APPROVAL entry that the mentor must approve."
        ),
        tags=["Workshops"],
    )
    def post(self, request: Request, workshop_id) -> Response:
        actor = _get_actor_profile(request)
        if actor is None:
            return Response(_NO_PROFILE, status=status.HTTP_403_FORBIDDEN)

        try:
            workshop = get_workshop(workshop_id)
        except WorkshopNotFoundError:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

        serializer = WorkshopGroupJoinSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            participation = request_group_attendance(
                workshop=workshop,
                mentee=actor,
                group_size=serializer.validated_data["group_size"],
            )
        except OwnWorkshopJoinError:
            return Response(_OWN_WORKSHOP, status=status.HTTP_403_FORBIDDEN)
        except WorkshopNotJoinableError:
            return Response(_NOT_JOINABLE, status=status.HTTP_400_BAD_REQUEST)
        except AlreadyParticipatingError:
            return Response(_ALREADY_PARTICIPATING, status=status.HTTP_409_CONFLICT)
        except WorkshopFullError:
            return Response(_WORKSHOP_FULL, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            WorkshopParticipationSerializer(participation).data,
            status=status.HTTP_201_CREATED,
        )


class WorkshopParticipationRespondAPIView(APIView):
    """Mentor approves or rejects a pending group attendance request."""

    permission_classes = [IsUser, IsEmailVerified]

    @extend_schema(
        request=WorkshopRespondSerializer,
        responses={
            200: WorkshopParticipationSerializer,
            400: OpenApiResponse(
                description="Participation is not pending or workshop full on accept."
            ),
            403: OpenApiResponse(description="Only the workshop owner may respond."),
            404: OpenApiResponse(description="Workshop or participation not found."),
        },
        description="Approve or reject a pending group attendance request.",
        tags=["Workshops"],
    )
    def post(self, request: Request, workshop_id, participation_id) -> Response:
        actor = _get_actor_profile(request)
        if actor is None:
            return Response(_NO_PROFILE, status=status.HTTP_403_FORBIDDEN)

        try:
            workshop = get_workshop(workshop_id)
        except WorkshopNotFoundError:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

        serializer = WorkshopRespondSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            participation = respond_to_participation(
                workshop=workshop,
                actor=actor,
                participation_id=participation_id,
                accept=serializer.validated_data["accept"],
            )
        except WorkshopOwnershipRequiredError:
            return Response(_PERMISSION_DENIED, status=status.HTTP_403_FORBIDDEN)
        except ParticipationNotFoundError:
            return Response(_PARTICIPATION_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)
        except ParticipationNotPendingError:
            return Response(_PARTICIPATION_NOT_PENDING, status=status.HTTP_400_BAD_REQUEST)
        except WorkshopFullError:
            return Response(_WORKSHOP_FULL, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            WorkshopParticipationSerializer(participation).data,
            status=status.HTTP_200_OK,
        )
