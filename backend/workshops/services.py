"""Service layer for workshop creation and lifecycle operations."""

from datetime import datetime
from typing import Iterable

from django.db.models import Q, QuerySet
from django.utils import timezone

from profiles.models import AvailabilitySlot, Profile

from .models import Workshop


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
