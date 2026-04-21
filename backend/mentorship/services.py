"""Domain services for mentorship lifecycle operations."""

from decimal import Decimal
from typing import Any

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Avg, F
from django.utils import timezone
from core.utils.timezone import to_local_time

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
import logging


class MentorshipServiceError(Exception):
    """Base exception for mentorship service-layer failures."""


class MissingSelectedSlotError(MentorshipServiceError):
    """Raised when an accepted request has no selected slot to book."""


class NoActiveBookingError(MentorshipServiceError):
    """Raised when attempting to cancel a session without active booking."""


class SameSlotSelectionError(MentorshipServiceError):
    """Raised when rescheduling selects the same slot as current."""


def _create_notification(
    *,
    user: Any,
    notification_type: NotificationType,
    title: str,
    message: str,
    actor: Profile | None = None,
    resource_type: str = "",
    resource_id: Any = None,
    extra_metadata: dict[str, Any] | None = None,
) -> None:
    """Create a structured notification payload for client consumption, never raise."""
    try:
        Notification.objects.create(
            user=user,
            type=notification_type,
            title=title,
            message=message,
            actor=actor,
            resource_type=resource_type,
            resource_id=resource_id,
            extra_metadata=extra_metadata or {},
        )
    except IntegrityError as exc:
        logging.getLogger(__name__).warning(
            "Notification persistence skipped due to integrity error: %s", exc
        )
    except Exception:
        logging.getLogger(__name__).exception(
            "Notification persistence failed for mentorship flow."
        )


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

    _create_notification(
        user=mentor_profile.user,
        notification_type=NotificationType.NEW_MENTORSHIP_REQUEST,
        title="New Mentorship Request",
        message=f"{mentee_profile.display_name} has sent you a mentorship request.",
        actor=mentee_profile,
        resource_type="mentorship_request",
        resource_id=mentorship_request.id,
        extra_metadata={
            "mentee_display_name": mentee_profile.display_name,
            "mentor_display_name": mentor_profile.display_name,
        },
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
            match = ensure_match_and_initial_session(mentorship_request=mentorship_request)
            _create_notification(
                user=mentorship_request.mentee.user,
                notification_type=NotificationType.NEW_MATCH,
                title="Request Accepted",
                message=(
                    f"Your mentorship request to {mentorship_request.mentor.display_name} "
                    "was accepted."
                ),
                actor=mentorship_request.mentor,
                resource_type="match",
                resource_id=match.id,
                extra_metadata={
                    "request_id": str(mentorship_request.id),
                    "mentor_display_name": mentorship_request.mentor.display_name,
                },
            )
        elif new_status == MentorshipRequest.Status.REJECTED:
            _create_notification(
                user=mentorship_request.mentee.user,
                notification_type=NotificationType.MENTORSHIP_REQUEST_REJECTED,
                title="Request Rejected",
                message=(
                    f"Your mentorship request to {mentorship_request.mentor.display_name} "
                    "was rejected."
                ),
                actor=mentorship_request.mentor,
                resource_type="mentorship_request",
                resource_id=mentorship_request.id,
                extra_metadata={
                    "mentor_display_name": mentorship_request.mentor.display_name,
                },
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

        # Resolve actor's profile to check for matches.
        try:
            mentee_profile = Profile.objects.get(user=actor)
            active_match = Match.objects.filter(
                mentor=mentor_profile,
                mentee=mentee_profile,
                is_active=True,
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
                _create_notification(
                    user=mentor_profile.user,
                    notification_type=NotificationType.SLOT_BOOKED,
                    title="Slot Booked",
                    message=(
                        f"{mentee_profile.display_name} booked a slot on "
                        f"{to_local_time(slot.start_at).strftime('%B %d, %Y at %H:%M')} - "
                        f"{to_local_time(slot.end_at).strftime('%H:%M')}."
                    ),
                    actor=mentee_profile,
                    resource_type="availability_slot",
                    resource_id=slot.id,
                    extra_metadata={
                        "match_id": str(active_match.id),
                        "mentor_display_name": mentor_profile.display_name,
                        "mentee_display_name": mentee_profile.display_name,
                        "slot_start_at": slot.start_at.isoformat(),
                        "slot_end_at": slot.end_at.isoformat(),
                    },
                )
        except Profile.DoesNotExist:
            pass

        return slot


def _mark_meeting_session_canceled(*, session: MeetingSession, canceled_by: Profile) -> None:
    """Mark the provided meeting session as canceled and detach its slot link."""
    canceled_by_role = (
        MeetingSession.CanceledByRole.MENTOR
        if canceled_by == session.match.mentor
        else MeetingSession.CanceledByRole.MENTEE
    )
    session.status = MeetingSession.Status.CANCELED
    session.source_slot = None
    session.canceled_by_role = canceled_by_role
    session.cancel_reason = "Session canceled by participant."
    session.save(
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
    """Cancel the booked slot for the provided session and sync session state."""
    match = session.match
    mentorship_request = match.request
    slot = session.source_slot

    # Idempotent behavior: repeated cancellation on an already canceled session
    # should not fail with a client-visible error.
    if session.status == MeetingSession.Status.CANCELED:
        mentorship_request.refresh_from_db()
        return mentorship_request

    with transaction.atomic():
        # If slot booking is still active, cancel it first.
        # If booking was already released but session remained scheduled/rescheduled,
        # proceed to cancel the session to repair consistency.
        if slot is not None and slot.is_booked:
            cancel_availability_booking(
                profile=match.mentor,
                slot_id=slot.id,
                actor=actor,
            )
        _mark_meeting_session_canceled(session=session, canceled_by=actor_profile)

        for recipient in (match.mentor, match.mentee):
            _create_notification(
                user=recipient.user,
                notification_type=NotificationType.SESSION_CANCELED,
                title="Session Canceled",
                message=(
                    f"Your session between {match.mentor.display_name} and "
                    f"{match.mentee.display_name} was canceled."
                ),
                actor=actor_profile,
                resource_type="meeting_session",
                resource_id=session.id,
                extra_metadata={
                    "match_id": str(match.id),
                    "mentor_display_name": match.mentor.display_name,
                    "mentee_display_name": match.mentee.display_name,
                },
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

        latest_session = MeetingSession.objects.filter(match=match).order_by("-created_at").first()
        for recipient in (match.mentor, match.mentee):
            _create_notification(
                user=recipient.user,
                notification_type=NotificationType.SESSION_RESCHEDULED,
                title="Session Rescheduled",
                message=(
                    f"Your session between {match.mentor.display_name} and "
                    f"{match.mentee.display_name} was rescheduled."
                ),
                actor=match.mentee,
                resource_type="meeting_session",
                resource_id=latest_session.id if latest_session is not None else None,
                extra_metadata={
                    "match_id": str(match.id),
                    "old_slot_id": str(old_slot.id) if old_slot is not None else "",
                    "new_slot_id": str(new_slot.id),
                    "new_slot_start_at": new_slot.start_at.isoformat(),
                    "new_slot_end_at": new_slot.end_at.isoformat(),
                },
            )

    mentorship_request.refresh_from_db()
    return mentorship_request


def deactivate_match(*, match: Match, actor_profile: Profile) -> Match:
    """Set a match as inactive, emit notifications, and return the updated instance."""
    if not match.is_active:
        return match

    Match.objects.filter(pk=match.pk).update(is_active=False)
    match.is_active = False

    for recipient in (match.mentor, match.mentee):
        _create_notification(
            user=recipient.user,
            notification_type=NotificationType.MATCH_DEACTIVATED,
            title="Match Deactivated",
            message=(
                f"Your mentorship match between {match.mentor.display_name} and "
                f"{match.mentee.display_name} has ended."
            ),
            actor=actor_profile,
            resource_type="match",
            resource_id=match.id,
            extra_metadata={
                "mentor_display_name": match.mentor.display_name,
                "mentee_display_name": match.mentee.display_name,
            },
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

    feedback_recipient = match.mentor if submitted_by == match.mentee else match.mentee
    _create_notification(
        user=feedback_recipient.user,
        notification_type=NotificationType.NEW_FEEDBACK_AVAILABLE,
        title="New Feedback Available",
        message="You received new feedback.",
        actor=submitted_by,
        resource_type="profile",
        resource_id=feedback_recipient.id,
        extra_metadata={
            "match_id": str(match.id),
            "feedback_id": str(feedback.id),
            "rating": rating,
        },
    )

    return feedback


def delete_match_feedback(*, feedback: Feedback) -> None:
    """Delete feedback and keep mentor review batch visibility semantics intact."""
    match = feedback.match
    if feedback.submitted_by != match.mentee:
        feedback.delete()
        return

    mentor = match.mentor
    threshold = max(1, int(getattr(settings, "RATING_UPDATE_THRESHOLD", 5)))

    # Determine whether this feedback was already in a visible threshold batch.
    mentee_feedback_ids = list(
        Feedback.objects.filter(match__mentor=mentor).exclude(submitted_by=mentor).order_by("id")
    )
    visible_limit = (mentor.review_count // threshold) * threshold
    feedback_index = next(
        (idx for idx, item in enumerate(mentee_feedback_ids) if item.id == feedback.id),
        None,
    )

    with transaction.atomic():
        feedback.delete()
        if feedback_index is None:
            return

        if feedback_index >= visible_limit:
            Profile.objects.filter(pk=mentor.pk, review_count__gt=0).update(
                review_count=F("review_count") - 1
            )


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
    "delete_match_feedback",
    "book_match_session",
    "BookingCancelNotAllowedError",
    "SlotNotBookedError",
    "SlotAlreadyBookedError",
    "SlotInPastError",
    "OwnSlotBookingError",
    "IntegrityError",
]
