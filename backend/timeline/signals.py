"""Signals for AGTE timeline event materialization."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from django.db.models.signals import post_save
from django.dispatch import receiver

from mentorship.models import Match, MeetingSession, MentorshipRequest
from notifications.models import Notification, NotificationType

from .models import TimelineEvent


def _actor_role_from_canceled_by(canceled_by_role: str) -> str:
    """Normalize canceled-by role values to public actor role values."""
    if canceled_by_role == MeetingSession.CanceledByRole.MENTOR:
        return "mentor"
    if canceled_by_role == MeetingSession.CanceledByRole.MENTEE:
        return "mentee"
    return "system"


def _actor_role_for_match(*, actor_id: Any, match: Match) -> str:
    """Resolve actor role from match participants."""
    if actor_id == match.mentor_id:
        return "mentor"
    if actor_id == match.mentee_id:
        return "mentee"
    return "system"


def _serialize_optional_datetime(value: datetime | None) -> str | None:
    """Serialize an optional datetime to ISO 8601."""
    if value is None:
        return None
    return value.isoformat()


def _upsert_agte(
    *,
    source_id: str,
    event_type: str,
    mentorship: Match,
    timestamp: datetime,
    actor_role: str,
    payload: dict[str, Any],
    last_edited: datetime | None = None,
) -> None:
    """Create or update an AGTE record keyed by source id."""
    event, _ = TimelineEvent.objects.update_or_create(
        source_id=source_id,
        defaults={
            "category": TimelineEvent.Category.AGTE,
            "event_type": event_type,
            "author": None,
            "mentorship": mentorship,
            "community_id": None,
            "show_on_profile": False,
            "content": "",
            "payload": payload,
            "actor_role": actor_role,
            "timestamp": timestamp,
            "last_edited": last_edited,
            "reposted_from": None,
        },
    )
    # AGTE update metadata mirrors creation metadata by product requirement.
    if event.last_edited != event.created_at:
        TimelineEvent.objects.filter(id=event.id).update(last_edited=event.created_at)


def _build_session_event_source_id(*, event_type: str, session: MeetingSession) -> str:
    """Return unique source id for a concrete session lifecycle action."""
    action_micros = int(session.updated_at.timestamp() * 1_000_000)
    entropy = uuid.uuid4().hex[:8]
    return f"{event_type}:{session.id}:{action_micros}:{entropy}"


@receiver(
    post_save,
    sender=MentorshipRequest,
    dispatch_uid="timeline.materialize_request_accepted_agte",
)
def materialize_request_accepted_agte(
    sender: type[MentorshipRequest],
    instance: MentorshipRequest,
    created: bool,
    **kwargs: Any,
) -> None:
    """Persist request_accepted AGTE when a mentorship request is accepted."""
    del sender, created
    if kwargs.get("raw", False):
        return

    if instance.status != MentorshipRequest.Status.ACCEPTED or instance.responded_at is None:
        return

    if not hasattr(instance, "match"):
        return

    _upsert_agte(
        source_id=f"request_accepted:{instance.id}",
        event_type="request_accepted",
        mentorship=instance.match,
        timestamp=instance.responded_at,
        actor_role="mentor",
        payload={
            "request_id": str(instance.id),
            "initial_session_start_at": _serialize_optional_datetime(
                instance.initial_session_start_at
            ),
            "initial_session_end_at": _serialize_optional_datetime(instance.initial_session_end_at),
        },
    )


@receiver(
    post_save,
    sender=Match,
    dispatch_uid="timeline.materialize_request_accepted_on_match_create",
)
def materialize_request_accepted_on_match_create(
    sender: type[Match],
    instance: Match,
    created: bool,
    **kwargs: Any,
) -> None:
    """Persist request_accepted AGTE when an accepted request first creates a match."""
    del sender
    if not created or kwargs.get("raw", False):
        return

    mentorship_request = instance.request
    if (
        mentorship_request.status != MentorshipRequest.Status.ACCEPTED
        or mentorship_request.responded_at is None
    ):
        return

    _upsert_agte(
        source_id=f"request_accepted:{mentorship_request.id}",
        event_type="request_accepted",
        mentorship=instance,
        timestamp=mentorship_request.responded_at,
        actor_role="mentor",
        payload={
            "request_id": str(mentorship_request.id),
            "initial_session_start_at": _serialize_optional_datetime(
                mentorship_request.initial_session_start_at
            ),
            "initial_session_end_at": _serialize_optional_datetime(
                mentorship_request.initial_session_end_at
            ),
        },
    )


@receiver(
    post_save,
    sender=MeetingSession,
    dispatch_uid="timeline.materialize_session_agte",
)
def materialize_session_agte(
    sender: type[MeetingSession],
    instance: MeetingSession,
    created: bool,
    **kwargs: Any,
) -> None:
    """Persist session_* AGTE from canonical meeting session status."""
    del sender, created
    if kwargs.get("raw", False):
        return

    payload = {
        "session_id": str(instance.id),
        "scheduled_start_at_utc": instance.scheduled_start_at_utc.isoformat(),
        "scheduled_end_at_utc": instance.scheduled_end_at_utc.isoformat(),
    }

    event_type = ""
    actor_role = "system"
    event_timestamp = instance.scheduled_start_at_utc

    if instance.status == MeetingSession.Status.SCHEDULED:
        event_type = "session_scheduled"
    elif instance.status == MeetingSession.Status.RESCHEDULED:
        event_type = "session_rescheduled"
        actor_role = "mentee"
    elif instance.status == MeetingSession.Status.CANCELED:
        event_type = "session_canceled"
        actor_role = _actor_role_from_canceled_by(instance.canceled_by_role)
        payload = {
            **payload,
            "cancel_reason": instance.cancel_reason,
        }
    elif instance.status == MeetingSession.Status.COMPLETED:
        event_type = "session_completed"

    if event_type == "":
        return

    source_id = _build_session_event_source_id(event_type=event_type, session=instance)
    event = TimelineEvent.objects.create(
        source_id=source_id,
        category=TimelineEvent.Category.AGTE,
        event_type=event_type,
        author=None,
        mentorship=instance.match,
        community_id=None,
        show_on_profile=False,
        content="",
        payload=payload,
        actor_role=actor_role,
        timestamp=event_timestamp,
        last_edited=None,
        reposted_from=None,
    )
    TimelineEvent.objects.filter(id=event.id).update(last_edited=event.created_at)


@receiver(
    post_save,
    sender=Notification,
    dispatch_uid="timeline.materialize_mentorship_ended_agte",
)
def materialize_mentorship_ended_agte(
    sender: type[Notification],
    instance: Notification,
    created: bool,
    **kwargs: Any,
) -> None:
    """Persist mentorship_ended AGTE from deactivation notifications."""
    del sender
    if not created or kwargs.get("raw", False):
        return

    if instance.type != NotificationType.MATCH_DEACTIVATED:
        return

    if instance.resource_type != "match" or instance.resource_id is None:
        return

    match = Match.objects.select_related("mentor", "mentee").filter(id=instance.resource_id).first()
    if match is None:
        return

    _upsert_agte(
        source_id=f"mentorship_ended:{match.id}",
        event_type="mentorship_ended",
        mentorship=match,
        timestamp=instance.created_at,
        actor_role=_actor_role_for_match(actor_id=instance.actor_id, match=match),
        payload={
            "match_id": str(match.id),
            "notification_id": str(instance.id),
        },
    )
