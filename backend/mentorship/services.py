"""Domain services for mentorship lifecycle operations."""

from decimal import Decimal
from typing import Any

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Avg, F
from django.utils import timezone

from notifications.models import Notification, NotificationType
from profiles.models import AvailabilitySlot, Profile
from profiles.services import (
    BookingCancelNotAllowedError,
    OwnSlotBookingError,
    SlotAlreadyBookedError,
    SlotInPastError,
    SlotNotBookedError,
    book_availability_slot,
    cancel_availability_booking,
)

from .models import Feedback, Match, MeetingSession, MentorshipRequest


class MentorshipServiceError(Exception):
    """Base exception for mentorship service-layer failures."""


class MissingSelectedSlotError(MentorshipServiceError):
    """Raised when an accepted request has no selected slot to book."""


class NoActiveBookingError(MentorshipServiceError):
    """Raised when attempting to cancel a session without active booking."""


class SameSlotSelectionError(MentorshipServiceError):
    """Raised when rescheduling selects the same slot as current."""


def create_mentorship_request(
    *,
    mentee_profile: Profile,
    mentor_profile: Profile,
    selected_slot: AvailabilitySlot,
    cover_letter: str = "",
) -> MentorshipRequest:
    """Create and persist a mentorship request for the given profiles and slot."""
    mentorship_request = MentorshipRequest.objects.create(
        mentor=mentor_profile,
        mentee=mentee_profile,
        slot=selected_slot,
        cover_letter=cover_letter,
    )
    
    # Notify the mentor about the new request
    Notification.objects.create(
        user=mentor_profile.user,
        type=NotificationType.NEW_MENTORSHIP_REQUEST,
        message=f'{mentee_profile.display_name} has sent you a mentorship request.',
    )
    
    return mentorship_request


def respond_to_mentorship_request(
    *,
    mentorship_request: MentorshipRequest,
    action: str,
) -> MentorshipRequest:
    """Accept or reject a pending request and run required booking side effects."""
    new_status = (
        MentorshipRequest.Status.ACCEPTED
        if action == "accept"
        else MentorshipRequest.Status.REJECTED
    )

    with transaction.atomic():
        if new_status == MentorshipRequest.Status.ACCEPTED:
            selected_slot = mentorship_request.slot
            if selected_slot is None:
                raise MissingSelectedSlotError("Accepted request requires a selected slot.")

            book_availability_slot(
                profile=mentorship_request.mentor,
                slot_id=selected_slot.id,
                actor=mentorship_request.mentee.user,
            )

        mentorship_request.status = new_status
        mentorship_request.save()

        if new_status == MentorshipRequest.Status.ACCEPTED:
            ensure_match_and_initial_session(mentorship_request=mentorship_request)
            
            # Notify the mentee about the acceptance
            Notification.objects.create(
                user=mentorship_request.mentee.user,
                type=NotificationType.NEW_MATCH,
                message='Your mentorship request has been accepted.',
            )
        elif new_status == MentorshipRequest.Status.REJECTED:
            # Notify the mentee about the rejection
            Notification.objects.create(
                user=mentorship_request.mentee.user,
                type=NotificationType.MENTORSHIP_REQUEST_REJECTED,
                message='Your mentorship request has been denied.',
            )

    return mentorship_request


def _resolve_session_window(*, mentorship_request: MentorshipRequest) -> tuple[Any, Any]:
    """Resolve session window from current slot reference or immutable snapshot."""
    if mentorship_request.slot is not None:
        return mentorship_request.slot.start_at, mentorship_request.slot.end_at
    return mentorship_request.initial_session_start_at, mentorship_request.initial_session_end_at


def ensure_match_and_initial_session(*, mentorship_request: MentorshipRequest) -> Match:
    """Ensure accepted requests have a canonical match and initial meeting session."""
    if mentorship_request.status != MentorshipRequest.Status.ACCEPTED:
        raise ValueError("Match/session materialization requires an accepted request.")

    match, _ = Match.objects.get_or_create(
        request=mentorship_request,
        defaults={
            "mentor": mentorship_request.mentor,
            "mentee": mentorship_request.mentee,
            "is_active": True,
        },
    )

    if MeetingSession.objects.filter(match=match).exists():
        return match

    session_start_at, session_end_at = _resolve_session_window(
        mentorship_request=mentorship_request
    )
    if session_start_at is None or session_end_at is None:
        return match

    session_status = (
        MeetingSession.Status.COMPLETED
        if session_end_at <= timezone.now()
        else MeetingSession.Status.SCHEDULED
    )
    MeetingSession.objects.create(
        match=match,
        mentor=mentorship_request.mentor,
        mentee=mentorship_request.mentee,
        source_slot=mentorship_request.slot,
        scheduled_start_at_utc=session_start_at,
        scheduled_end_at_utc=session_end_at,
        status=session_status,
    )
    return match


def book_match_session(*, mentor_profile: Profile, slot_id: Any, actor: Any) -> AvailabilitySlot:
    """Book a slot and ensure a MeetingSession exists if a mentorship match is active."""
    with transaction.atomic():
        slot = book_availability_slot(profile=mentor_profile, slot_id=slot_id, actor=actor)

        # Resolve actor's profile to check for matches
        try:
            mentee_profile = Profile.objects.get(user=actor)
            active_match = Match.objects.filter(
                mentor=mentor_profile,
                mentee=mentee_profile,
                is_active=True
            ).first()

            if active_match:
                # Direct booking within an active match bypasses the request flow
                # but should still manifest as a MeetingSession for dashboard visibility.
                MeetingSession.objects.get_or_create(
                    match=active_match,
                    source_slot=slot,
                    defaults={
                        "mentor": mentor_profile,
                        "mentee": mentee_profile,
                        "scheduled_start_at_utc": slot.start_at,
                        "scheduled_end_at_utc": slot.end_at,
                        "status": MeetingSession.Status.SCHEDULED,
                    },
                )
                
                # Notify the mentor about the booking
                Notification.objects.create(
                    user=mentor_profile.user,
                    type=NotificationType.SLOT_BOOKED,
                    message=f'{mentee_profile.display_name} has booked a slot on {slot.start_at.strftime("%B %d, %Y at %I:%M %p")} - {slot.end_at.strftime("%I:%M %p")}.',
                )
        except Profile.DoesNotExist:
            pass

        return slot


def _mark_latest_meeting_session_canceled(*, match: Match, canceled_by: Profile) -> None:
    """Mark the latest canonical session for the match as canceled."""
    meeting_session = MeetingSession.objects.filter(match=match).order_by("-created_at").first()
    if meeting_session is None:
        return

    canceled_by_role = (
        MeetingSession.CanceledByRole.MENTOR
        if canceled_by == match.mentor
        else MeetingSession.CanceledByRole.MENTEE
    )
    meeting_session.status = MeetingSession.Status.CANCELED
    meeting_session.source_slot = None
    meeting_session.canceled_by_role = canceled_by_role
    meeting_session.cancel_reason = "Session canceled by participant."
    meeting_session.save(
        update_fields=[
            "status",
            "source_slot",
            "canceled_by_role",
            "cancel_reason",
            "updated_at",
        ]
    )


def cancel_match_session(
    *,
    session: MeetingSession,
    actor: Any,
    actor_profile: Profile,
) -> MentorshipRequest:
    """Cancel the currently booked slot for a session and sync canonical session state."""
    match = session.match
    mentorship_request = match.request
    slot = session.source_slot

    if slot is None or not slot.is_booked:
        raise NoActiveBookingError("This session has no active booking to cancel.")

    with transaction.atomic():
        cancel_availability_booking(
            profile=match.mentor,
            slot_id=slot.id,
            actor=actor,
        )
        _mark_latest_meeting_session_canceled(match=match, canceled_by=actor_profile)

        # Notify the other participant
        other_user = match.mentor.user if actor == match.mentee.user else match.mentee.user
        Notification.objects.create(
            user=other_user,
            type=NotificationType.SESSION_CANCELED,
            message='The session has been canceled.',
        )

    mentorship_request.refresh_from_db()
    return mentorship_request


def _upsert_rescheduled_meeting_session(*, match: Match, new_slot: AvailabilitySlot) -> None:
    """Create or update the latest canonical session after a successful reschedule."""
    meeting_session = (
        MeetingSession.objects.select_for_update()
        .filter(match=match)
        .order_by("-created_at")
        .first()
    )
    if meeting_session is None:
        MeetingSession.objects.create(
            match=match,
            mentor=match.mentor,
            mentee=match.mentee,
            source_slot=new_slot,
            scheduled_start_at_utc=new_slot.start_at,
            scheduled_end_at_utc=new_slot.end_at,
            status=MeetingSession.Status.RESCHEDULED,
        )
        return

    meeting_session.source_slot = new_slot
    meeting_session.scheduled_start_at_utc = new_slot.start_at
    meeting_session.scheduled_end_at_utc = new_slot.end_at
    meeting_session.status = MeetingSession.Status.RESCHEDULED
    meeting_session.canceled_by_role = ""
    meeting_session.cancel_reason = ""
    meeting_session.save(
        update_fields=[
            "source_slot",
            "scheduled_start_at_utc",
            "scheduled_end_at_utc",
            "status",
            "canceled_by_role",
            "cancel_reason",
            "updated_at",
        ]
    )


def reschedule_match_session(
    *,
    match: Match,
    actor: Any,
    new_slot: AvailabilitySlot,
) -> MentorshipRequest:
    """Reschedule a match to a new slot and synchronize canonical session data."""
    mentorship_request = match.request
    old_slot = mentorship_request.slot

    if new_slot == old_slot:
        raise SameSlotSelectionError("New slot is the same as the current slot.")

    with transaction.atomic():
        if old_slot is not None and old_slot.is_booked:
            cancel_availability_booking(
                profile=match.mentor,
                slot_id=old_slot.id,
                actor=actor,
            )

        book_availability_slot(
            profile=match.mentor,
            slot_id=new_slot.id,
            actor=actor,
        )
        mentorship_request.slot = new_slot
        mentorship_request.save(update_fields=["slot"])

        _upsert_rescheduled_meeting_session(match=match, new_slot=new_slot)
        
        # Notify the mentor
        Notification.objects.create(
            user=match.mentor.user,
            type=NotificationType.SESSION_RESCHEDULED,
            message='The session has been rescheduled.',
        )

    mentorship_request.refresh_from_db()
    return mentorship_request


def deactivate_match(*, match: Match, actor_profile: Profile) -> Match:
    """Set a match as inactive and return the updated in-memory instance."""
    with transaction.atomic():
        Match.objects.filter(pk=match.pk).update(is_active=False)
        match.is_active = False
        
        # Notify the other participant about the deactivation
        other_user = match.mentor.user if actor_profile == match.mentee else match.mentee.user
        Notification.objects.create(
            user=other_user,
            type=NotificationType.MATCH_DEACTIVATED,
            message='Your mentorship match has been deactivated.',
        )

    return match


def _update_mentor_public_rating(*, mentor: Profile) -> None:
    """Increment mentor review count and refresh average rating on threshold boundaries."""
    with transaction.atomic():
        Profile.objects.filter(pk=mentor.pk).update(review_count=F("review_count") + 1)
        mentor.refresh_from_db(fields=["review_count"])

        threshold = getattr(settings, "RATING_UPDATE_THRESHOLD", 5)
        if threshold <= 0 or mentor.review_count % threshold != 0:
            return

        avg_rating = (
            Feedback.objects.filter(match__mentor=mentor)
            .exclude(submitted_by=mentor)
            .aggregate(avg=Avg("rating"))["avg"]
        )
        quantized_rating = (
            Decimal(str(avg_rating)).quantize(Decimal("0.01"))
            if avg_rating is not None
            else Decimal("0.00")
        )
        Profile.objects.filter(pk=mentor.pk).update(average_rating=quantized_rating)


def create_match_feedback(
    *,
    match: Match,
    submitted_by: Profile,
    rating: int,
    text: str,
) -> Feedback:
    """Create feedback for a match participant and update mentor public rating counters."""
    feedback = Feedback.objects.create(
        match=match,
        submitted_by=submitted_by,
        rating=rating,
        text=text,
    )

    if submitted_by == match.mentee:
        _update_mentor_public_rating(mentor=match.mentor)

    return feedback


__all__ = [
    "NoActiveBookingError",
    "SameSlotSelectionError",
    "MissingSelectedSlotError",
    "create_mentorship_request",
    "respond_to_mentorship_request",
    "ensure_match_and_initial_session",
    "cancel_match_session",
    "reschedule_match_session",
    "deactivate_match",
    "create_match_feedback",
    "book_match_session",
    "BookingCancelNotAllowedError",
    "SlotNotBookedError",
    "SlotAlreadyBookedError",
    "SlotInPastError",
    "OwnSlotBookingError",
    "IntegrityError",
]
