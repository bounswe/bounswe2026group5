"""Domain services for profile-related business operations."""

import uuid
from typing import Any

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .models import AvailabilitySlot, Profile
from mentorship.models import MentorshipRequest


class AvailabilityBookingError(Exception):
    """Base exception for booking-related business rule failures."""


class SlotAlreadyBookedError(AvailabilityBookingError):
    """Raised when attempting to book an already booked slot."""


class SlotInPastError(AvailabilityBookingError):
    """Raised when attempting to book a slot that is already in the past."""


class OwnSlotBookingError(AvailabilityBookingError):
    """Raised when mentor tries to book their own slot."""


class SlotNotBookedError(AvailabilityBookingError):
    """Raised when attempting to cancel an unbooked slot."""


class BookingCancelNotAllowedError(AvailabilityBookingError):
    """Raised when request user cannot cancel this booking."""


class InvalidPrPEventTypeError(Exception):
    """Raised when an unsupported event_type is supplied for a profile post."""


def book_availability_slot(*, profile: Profile, slot_id, actor) -> AvailabilitySlot:
    """Book one slot with row-level locking to prevent race conditions."""
    with transaction.atomic():
        slot = (
            AvailabilitySlot.objects.select_for_update()
            .select_related("profile__user")
            .get(id=slot_id, profile=profile)
        )

        if slot.start_at <= timezone.now():
            raise SlotInPastError("Cannot book a slot in the past.")

        if slot.is_booked or slot.status == AvailabilitySlot.Status.BOOKED:
            raise SlotAlreadyBookedError("Slot is already booked.")

        if slot.profile.user.id == actor.id:
            raise OwnSlotBookingError("Mentors cannot book their own availability slot.")

        slot.mark_booked(actor)
        return slot


def cancel_availability_booking(*, profile: Profile, slot_id, actor) -> AvailabilitySlot:
    """Cancel one booking with row-level locking and ownership checks."""
    with transaction.atomic():
        slot = (
            AvailabilitySlot.objects.select_for_update()
            .select_related("profile__user")
            .get(id=slot_id, profile=profile)
        )

        if not slot.is_booked:
            raise SlotNotBookedError("Slot is not booked.")

        is_slot_owner = slot.profile.user.id == actor.id
        is_booking_owner = slot.booked_by is not None and slot.booked_by.id == actor.id
        if not is_slot_owner and not is_booking_owner:
            raise BookingCancelNotAllowedError(
                "Only booking owner or mentor can cancel this booking."
            )

        # Accepted first-session requests keep a protected FK to the slot.
        # Once the booking is canceled, detach those links so the mentor can
        # delete the now-available slot without triggering ProtectedError.
        # MentorshipRequest moved to top level

        accepted_requests = MentorshipRequest.objects.select_for_update().filter(
            slot=slot,
            status=MentorshipRequest.Status.ACCEPTED,
        )

        for request_obj in accepted_requests:
            if request_obj.initial_session_start_at is None:
                request_obj.initial_session_start_at = slot.start_at
            if request_obj.initial_session_end_at is None:
                request_obj.initial_session_end_at = slot.end_at
            request_obj.slot = None
            request_obj.save(
                update_fields=[
                    "slot",
                    "initial_session_start_at",
                    "initial_session_end_at",
                ]
            )

        slot.mark_available()
        return slot


def list_profile_feed_events(
    *,
    profile: Profile,
    offset: int,
    limit: int,
    category: str | None = None,
    event_type: str | None = None,
) -> dict[str, Any]:
    """Return paginated profile feed events for a profile page.

    Feed includes:
    - Profile posts (PrP) authored by the profile.
    - MCTE events authored by the profile where show_on_profile=True.
    """
    from timeline.models import TimelineEvent

    queryset = (
        TimelineEvent.objects.filter(author=profile, is_deleted=False)
        .filter(
            Q(category=TimelineEvent.Category.PRP)
            | Q(category=TimelineEvent.Category.MCTE, show_on_profile=True)
        )
        .select_related("author")
        .order_by("-timestamp", "-created_at")
    )

    if category is not None:
        queryset = queryset.filter(category=category)

    if event_type is not None:
        queryset = queryset.filter(event_type=event_type)

    total_count = queryset.count()
    events = list(queryset[offset : offset + limit])

    return {
        "count": total_count,
        "offset": offset,
        "limit": limit,
        "results": events,
    }


def create_prp_event(
    *,
    author_profile: Profile,
    event_type: str,
    content: str = "",
    media_url: str | None = None,
    timestamp: Any | None = None,
) -> Any:
    """Create and persist a profile post (PrP).

    If timestamp is omitted, event timestamp is aligned with created_at.
    """
    from timeline.models import TimelineEvent

    if event_type not in TimelineEvent.MCTEEventType.values:
        raise InvalidPrPEventTypeError(
            f"Invalid PrP event_type: '{event_type}'. "
            f"Must be one of {TimelineEvent.MCTEEventType.values}."
        )

    event = TimelineEvent.objects.create(
        source_id=f"prp:{uuid.uuid4()}",
        category=TimelineEvent.Category.PRP,
        event_type=event_type,
        author=author_profile,
        content=content,
        media_url=media_url,
        show_on_profile=True,
        timestamp=timestamp if timestamp is not None else timezone.now(),
    )

    if timestamp is None:
        event.timestamp = event.created_at
        event.save(update_fields=["timestamp"])

    return event


def edit_prp_event(
    *,
    event: Any,
    content: str | None = None,
    event_type: str | None = None,
    media_url: str | None = None,
    update_media_url: bool = False,
) -> Any:
    """Partially update a profile post and set last_edited."""
    from timeline.models import TimelineEvent

    if event_type is not None and event_type not in TimelineEvent.MCTEEventType.values:
        raise InvalidPrPEventTypeError(
            f"Invalid PrP event_type: '{event_type}'. "
            f"Must be one of {TimelineEvent.MCTEEventType.values}."
        )

    update_fields: list[str] = ["last_edited"]

    if content is not None:
        event.content = content
        update_fields.append("content")

    if event_type is not None:
        event.event_type = event_type
        update_fields.append("event_type")

    if update_media_url:
        event.media_url = media_url
        update_fields.append("media_url")

    event.last_edited = timezone.now()
    event.save(update_fields=update_fields)
    return event


def soft_delete_prp_event(*, event: Any) -> None:
    """Soft-delete a profile post by setting is_deleted=True."""
    event.is_deleted = True
    event.save(update_fields=["is_deleted"])
