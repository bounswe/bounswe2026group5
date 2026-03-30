"""Domain services for profile-related business operations."""

from django.db import transaction
from django.utils import timezone

from .models import AvailabilitySlot, Profile


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

        if slot.is_booked:
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

        slot.mark_available()
        return slot
