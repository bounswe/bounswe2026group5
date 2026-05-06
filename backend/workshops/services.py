"""Service layer for workshop creation and lifecycle operations."""

from datetime import datetime
from typing import Iterable

from django.db import transaction
from django.db.models import QuerySet, Sum
from django.utils import timezone

from profiles.models import AvailabilitySlot, Profile

from .models import Workshop, WorkshopParticipation


class WorkshopNotFoundError(Exception):
    """Raised when a workshop cannot be located."""


class WorkshopOwnershipRequiredError(Exception):
    """Raised when a non-owner attempts to mutate a workshop."""


class WorkshopScheduleConflictError(Exception):
    """Raised when the proposed schedule overlaps with the mentor's existing commitments."""


class WorkshopInPastError(Exception):
    """Raised when the proposed schedule starts in the past."""


class WorkshopNotEditableError(Exception):
    """Raised when a workshop cannot be modified due to its current state."""


class WorkshopNotJoinableError(Exception):
    """Raised when a workshop cannot be joined (canceled or already started)."""


class WorkshopFullError(Exception):
    """Raised when joining would exceed max_participants."""


class AlreadyParticipatingError(Exception):
    """Raised when the mentee already has a participation entry for the workshop."""


class OwnWorkshopJoinError(Exception):
    """Raised when a mentor tries to join their own workshop."""


class ParticipationNotFoundError(Exception):
    """Raised when a participation cannot be located."""


class ParticipationNotPendingError(Exception):
    """Raised when an action requires PENDING_APPROVAL but the entry has another status."""


def _validate_schedule(
    mentor: Profile,
    start_at: datetime,
    end_at: datetime,
    exclude_workshop_id: str | None = None,
) -> None:
    """Reject windows that are in the past or overlap mentor's slots/workshops."""
    now = timezone.now()
    if start_at <= now:
        raise WorkshopInPastError()

    overlapping_slots = AvailabilitySlot.objects.filter(
        profile=mentor,
        start_at__lt=end_at,
        end_at__gt=start_at,
    ).exists()
    if overlapping_slots:
        raise WorkshopScheduleConflictError()

    other_workshops = Workshop.objects.filter(
        mentor=mentor,
        status=Workshop.Status.SCHEDULED,
        scheduled_start_at_utc__lt=end_at,
        scheduled_end_at_utc__gt=start_at,
    )
    if exclude_workshop_id is not None:
        other_workshops = other_workshops.exclude(id=exclude_workshop_id)
    if other_workshops.exists():
        raise WorkshopScheduleConflictError()


def create_workshop(
    *,
    mentor: Profile,
    title: str,
    description: str,
    scheduled_start_at_utc: datetime,
    scheduled_end_at_utc: datetime,
    min_participants: int,
    max_participants: int,
) -> Workshop:
    """Persist a new workshop after validating schedule and thresholds."""
    _validate_schedule(mentor, scheduled_start_at_utc, scheduled_end_at_utc)

    return Workshop.objects.create(
        mentor=mentor,
        title=title,
        description=description,
        scheduled_start_at_utc=scheduled_start_at_utc,
        scheduled_end_at_utc=scheduled_end_at_utc,
        min_participants=min_participants,
        max_participants=max_participants,
    )


def update_workshop(
    *,
    workshop: Workshop,
    actor: Profile,
    fields: dict,
) -> Workshop:
    """Apply partial updates to a workshop owned by the actor."""
    if workshop.mentor_id != actor.id:
        raise WorkshopOwnershipRequiredError()

    if workshop.status != Workshop.Status.SCHEDULED:
        raise WorkshopNotEditableError()

    new_start = fields.get("scheduled_start_at_utc", workshop.scheduled_start_at_utc)
    new_end = fields.get("scheduled_end_at_utc", workshop.scheduled_end_at_utc)
    if (
        "scheduled_start_at_utc" in fields
        or "scheduled_end_at_utc" in fields
    ):
        _validate_schedule(
            workshop.mentor,
            new_start,
            new_end,
            exclude_workshop_id=str(workshop.id),
        )

    new_min = fields.get("min_participants", workshop.min_participants)
    new_max = fields.get("max_participants", workshop.max_participants)
    if new_max < new_min:
        raise ValueError("max_participants must be >= min_participants")

    for attr, value in fields.items():
        setattr(workshop, attr, value)
    workshop.save()
    return workshop


def list_workshops(*, status: str | None = None, mentor: Profile | None = None) -> QuerySet[Workshop]:
    """Return a queryset of workshops, optionally filtered by status or mentor."""
    qs = Workshop.objects.select_related("mentor").all()
    if status is not None:
        qs = qs.filter(status=status)
    if mentor is not None:
        qs = qs.filter(mentor=mentor)
    return qs


def get_workshop(workshop_id) -> Workshop:
    """Retrieve a workshop by id or raise WorkshopNotFoundError."""
    try:
        return Workshop.objects.select_related("mentor").get(id=workshop_id)
    except Workshop.DoesNotExist as exc:
        raise WorkshopNotFoundError() from exc


def _confirmed_seat_count(workshop: Workshop) -> int:
    total = (
        WorkshopParticipation.objects.filter(
            workshop=workshop,
            status=WorkshopParticipation.Status.CONFIRMED,
        ).aggregate(total=Sum("group_size"))
    )["total"]
    return int(total or 0)


def _ensure_workshop_joinable(workshop: Workshop, mentee: Profile) -> None:
    if workshop.status != Workshop.Status.SCHEDULED:
        raise WorkshopNotJoinableError()
    if workshop.scheduled_start_at_utc <= timezone.now():
        raise WorkshopNotJoinableError()
    if workshop.mentor_id == mentee.id:
        raise OwnWorkshopJoinError()


def join_workshop(*, workshop: Workshop, mentee: Profile) -> WorkshopParticipation:
    """Create a CONFIRMED participation for a single mentee."""
    _ensure_workshop_joinable(workshop, mentee)

    with transaction.atomic():
        if WorkshopParticipation.objects.filter(workshop=workshop, mentee=mentee).exists():
            raise AlreadyParticipatingError()

        if _confirmed_seat_count(workshop) + 1 > workshop.max_participants:
            raise WorkshopFullError()

        return WorkshopParticipation.objects.create(
            workshop=workshop,
            mentee=mentee,
            group_size=1,
            status=WorkshopParticipation.Status.CONFIRMED,
            decided_at=timezone.now(),
        )


def request_group_attendance(
    *,
    workshop: Workshop,
    mentee: Profile,
    group_size: int,
) -> WorkshopParticipation:
    """Create a PENDING_APPROVAL participation for a mentee bringing companions."""
    if group_size < 2:
        raise ValueError("group_size must be at least 2 for a group request.")

    _ensure_workshop_joinable(workshop, mentee)

    with transaction.atomic():
        if WorkshopParticipation.objects.filter(workshop=workshop, mentee=mentee).exists():
            raise AlreadyParticipatingError()

        if group_size > workshop.max_participants:
            raise WorkshopFullError()

        return WorkshopParticipation.objects.create(
            workshop=workshop,
            mentee=mentee,
            group_size=group_size,
            status=WorkshopParticipation.Status.PENDING_APPROVAL,
        )


def respond_to_participation(
    *,
    workshop: Workshop,
    actor: Profile,
    participation_id,
    accept: bool,
) -> WorkshopParticipation:
    """Mentor approves or rejects a PENDING_APPROVAL group attendance request."""
    if workshop.mentor_id != actor.id:
        raise WorkshopOwnershipRequiredError()

    with transaction.atomic():
        try:
            participation = WorkshopParticipation.objects.select_for_update().get(
                id=participation_id, workshop=workshop
            )
        except WorkshopParticipation.DoesNotExist as exc:
            raise ParticipationNotFoundError() from exc

        if participation.status != WorkshopParticipation.Status.PENDING_APPROVAL:
            raise ParticipationNotPendingError()

        if accept:
            if (
                _confirmed_seat_count(workshop) + participation.group_size
                > workshop.max_participants
            ):
                raise WorkshopFullError()
            participation.status = WorkshopParticipation.Status.CONFIRMED
        else:
            participation.status = WorkshopParticipation.Status.REJECTED

        participation.decided_at = timezone.now()
        participation.save(update_fields=["status", "decided_at"])
        return participation
