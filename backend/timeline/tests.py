"""Tests for timeline AGTE materialization signals."""

from datetime import timedelta
from typing import Any

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.utils import timezone

from accounts.models import AppUsageMode, UserRole
from mentorship.models import Match, MeetingSession, MentorshipRequest
from mentorship.services import deactivate_match, ensure_match_and_initial_session
from profiles.models import Profile

from .models import TimelineEvent

User: Any = get_user_model()


class TimelineSignalTests(TestCase):
    """Verify AGTE records are materialized and updated via signals."""

    def setUp(self) -> None:
        Group.objects.get_or_create(name=UserRole.USER)

        mentor_user = User.objects.create_user(
            email="mentor.timeline@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        mentee_user = User.objects.create_user(
            email="mentee.timeline@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )

        self.mentor_profile = Profile.objects.create(
            user=mentor_user,
            display_name="Mentor Timeline",
        )
        self.mentee_profile = Profile.objects.create(
            user=mentee_user,
            display_name="Mentee Timeline",
        )

        now = timezone.now()
        self.request = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.ACCEPTED,
            responded_at=now,
            initial_session_start_at=now + timedelta(days=1),
            initial_session_end_at=now + timedelta(days=1, hours=1),
        )
        ensure_match_and_initial_session(mentorship_request=self.request)
        self.match = Match.objects.get(request=self.request)

    def test_match_creation_materializes_request_accepted_agte(self) -> None:
        event = TimelineEvent.objects.get(
            source_id=f"request_accepted:{self.request.id}",
            category=TimelineEvent.Category.AGTE,
        )
        self.assertEqual(event.event_type, "request_accepted")
        self.assertFalse(event.show_on_profile)
        self.assertFalse(event.is_deleted)
        self.assertIsNone(event.last_edited)
        self.assertIsNone(event.reposted_from)
        self.assertEqual(event.payload["request_id"], str(self.request.id))

    def test_meeting_session_create_materializes_session_scheduled_agte(self) -> None:
        start_at = timezone.now() + timedelta(days=2)
        session = MeetingSession.objects.create(
            match=self.match,
            mentor=self.match.mentor,
            mentee=self.match.mentee,
            scheduled_start_at_utc=start_at,
            scheduled_end_at_utc=start_at + timedelta(hours=1),
            status=MeetingSession.Status.SCHEDULED,
        )

        event = TimelineEvent.objects.get(source_id=f"session_scheduled:{session.id}")
        self.assertEqual(event.event_type, "session_scheduled")
        self.assertEqual(event.actor_role, "system")

    def test_session_status_change_replaces_old_session_event(self) -> None:
        start_at = timezone.now() + timedelta(days=2)
        session = MeetingSession.objects.create(
            match=self.match,
            mentor=self.match.mentor,
            mentee=self.match.mentee,
            scheduled_start_at_utc=start_at,
            scheduled_end_at_utc=start_at + timedelta(hours=1),
            status=MeetingSession.Status.SCHEDULED,
        )

        session.status = MeetingSession.Status.CANCELED
        session.canceled_by_role = MeetingSession.CanceledByRole.MENTEE
        session.cancel_reason = "No longer needed"
        session.save(update_fields=["status", "canceled_by_role", "cancel_reason", "updated_at"])

        self.assertFalse(
            TimelineEvent.objects.filter(source_id=f"session_scheduled:{session.id}").exists()
        )
        canceled_event = TimelineEvent.objects.get(source_id=f"session_canceled:{session.id}")
        self.assertEqual(canceled_event.actor_role, "mentee")
        self.assertEqual(canceled_event.payload["cancel_reason"], "No longer needed")

    def test_match_deactivation_materializes_single_mentorship_ended_agte(self) -> None:
        deactivate_match(match=self.match, actor_profile=self.mentor_profile)
        events = TimelineEvent.objects.filter(
            source_id=f"mentorship_ended:{self.match.id}",
            category=TimelineEvent.Category.AGTE,
        )
        self.assertEqual(events.count(), 1)

        event = events.first()
        self.assertIsNotNone(event)
        self.assertEqual(event.actor_role, "mentor")
        self.assertEqual(event.payload["match_id"], str(self.match.id))
        self.assertIn("notification_id", event.payload)
