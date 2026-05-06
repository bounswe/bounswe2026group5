"""Tests for mentorship domain models and API endpoints."""

import uuid
from datetime import timedelta
from decimal import Decimal
from typing import Any, cast
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import IntegrityError, connection, transaction
from django.test import TestCase, override_settings
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import AppUsageMode, UserRole
from mentorship.models import Feedback, Match, MeetingSession, MentorshipRequest
from mentorship.serializers import (
    MeetingSessionSerializer,
    MentorshipRequestCreateSerializer,
    UpcomingMenteeSessionSerializer,
    UpcomingMentorSessionSerializer,
)
from mentorship.services import (
    MissingSelectedSlotError,
    _mark_meeting_session_canceled,
    book_match_session,
    cancel_match_session,
    create_match_feedback,
    create_mentorship_request,
    deactivate_match,
    ensure_match_and_initial_session,
    reschedule_match_session,
    respond_to_mentorship_request,
)
from notifications.models import Notification, NotificationType
from profiles.models import AvailabilitySlot, Profile
from profiles.services import OwnSlotBookingError
from timeline.models import TimelineEvent

User: Any = get_user_model()


def _create_accepted_request(**kwargs: Any) -> MentorshipRequest:
    """Create an accepted request and explicitly materialize its match/session state."""
    request_obj = MentorshipRequest.objects.create(
        status=MentorshipRequest.Status.ACCEPTED,
        **kwargs,
    )
    ensure_match_and_initial_session(mentorship_request=request_obj)
    return request_obj


class MentorshipRequestModelTests(TestCase):
    """Unit tests for MentorshipRequest and Match domain logic."""

    def setUp(self) -> None:
        """Prepare mentor and mentee profiles for request/match tests."""
        mentor_user = User.objects.create_user(
            email="mentor.request@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        mentee_user = User.objects.create_user(
            email="mentee.request@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )

        self.mentor_profile = Profile.objects.create(
            user=mentor_user,
            display_name="Mentor Request",
        )
        self.mentee_profile = Profile.objects.create(
            user=mentee_user,
            display_name="Mentee Request",
        )

    def test_default_status_is_pending(self) -> None:
        """New mentorship requests default to PENDING."""
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            cover_letter="Can we discuss backend architecture?",
        )

        self.assertEqual(request_obj.status, MentorshipRequest.Status.PENDING)

    def test_self_request_violates_constraint(self) -> None:
        """A mentor cannot send a mentorship request to themselves."""
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                MentorshipRequest.objects.create(
                    mentor=self.mentor_profile,
                    mentee=self.mentor_profile,
                )

    def test_unique_pending_request_constraint(self) -> None:
        """A mentee cannot create duplicate pending requests for the same mentor."""
        MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.PENDING,
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                MentorshipRequest.objects.create(
                    mentor=self.mentor_profile,
                    mentee=self.mentee_profile,
                    status=MentorshipRequest.Status.PENDING,
                )

    def test_non_pending_request_does_not_trigger_pending_constraint(self) -> None:
        """Rejected requests can coexist because uniqueness applies only to PENDING."""
        MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.REJECTED,
        )

        second_request = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.REJECTED,
        )

        self.assertEqual(second_request.status, MentorshipRequest.Status.REJECTED)

    def test_match_materialized_on_explicit_service_sync(self) -> None:
        """Accepted requests produce a match when synchronized by service."""
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.PENDING,
        )
        self.assertFalse(Match.objects.filter(request=request_obj).exists())

        request_obj.status = MentorshipRequest.Status.ACCEPTED
        request_obj.save()
        ensure_match_and_initial_session(mentorship_request=request_obj)

        self.assertTrue(Match.objects.filter(request=request_obj).exists())
        match = Match.objects.get(request=request_obj)
        self.assertEqual(match.mentor, self.mentor_profile)
        self.assertEqual(match.mentee, self.mentee_profile)
        self.assertTrue(match.is_active)

    def test_match_not_duplicated_on_repeated_service_sync(self) -> None:
        """Repeated service synchronization does not create duplicate matches."""
        request_obj = _create_accepted_request(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
        )

        ensure_match_and_initial_session(mentorship_request=request_obj)
        ensure_match_and_initial_session(mentorship_request=request_obj)

        self.assertEqual(Match.objects.filter(request=request_obj).count(), 1)

    def test_match_creation_refreshes_total_mentee_count(self) -> None:
        """Creating a new accepted match refreshes mentor active mentee count."""
        self.mentor_profile.total_mentee_count = 0
        self.mentor_profile.save(update_fields=["total_mentee_count"])

        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.ACCEPTED,
        )

        ensure_match_and_initial_session(mentorship_request=request_obj)
        self.mentor_profile.refresh_from_db(fields=["total_mentee_count"])

        self.assertEqual(self.mentor_profile.total_mentee_count, 1)

    def test_repeated_sync_does_not_double_increment_total_mentee_count(self) -> None:
        """Repeated sync for same request keeps mentee count stable."""
        request_obj = _create_accepted_request(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
        )

        self.mentor_profile.refresh_from_db(fields=["total_mentee_count"])
        self.assertEqual(self.mentor_profile.total_mentee_count, 1)

        ensure_match_and_initial_session(mentorship_request=request_obj)
        self.mentor_profile.refresh_from_db(fields=["total_mentee_count"])

        self.assertEqual(self.mentor_profile.total_mentee_count, 1)

    def test_responded_at_set_when_request_accepted(self) -> None:
        """responded_at is auto-populated when request becomes ACCEPTED."""
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
        )

        self.assertIsNone(request_obj.responded_at)

        request_obj.status = MentorshipRequest.Status.ACCEPTED
        request_obj.save()
        request_obj.refresh_from_db(from_queryset=None)

        self.assertIsNotNone(request_obj.responded_at)

    def test_responded_at_set_when_request_rejected(self) -> None:
        """responded_at is auto-populated when request becomes REJECTED."""
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
        )

        request_obj.status = MentorshipRequest.Status.REJECTED
        request_obj.save()
        request_obj.refresh_from_db(from_queryset=None)

        self.assertIsNotNone(request_obj.responded_at)

    def test_responded_at_cleared_when_status_back_to_pending(self) -> None:
        """responded_at is cleared if a request is moved back to PENDING."""
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.ACCEPTED,
        )
        self.assertIsNotNone(request_obj.responded_at)

        request_obj.status = MentorshipRequest.Status.PENDING
        request_obj.save()
        request_obj.refresh_from_db(from_queryset=None)

        self.assertIsNone(request_obj.responded_at)

    def test_get_previous_status_for_unsaved_request_returns_none(self) -> None:
        """Unsaved mentorship requests have no previous persisted status."""
        unsaved_request = MentorshipRequest(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
        )

        self.assertIsNone(unsaved_request._get_previous_status())

    def test_string_representations(self) -> None:
        """String representations include useful identity details."""
        start_at = timezone.now() + timedelta(days=2)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=start_at,
            end_at=start_at + timedelta(hours=1),
        )
        request_obj = _create_accepted_request(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=slot,
        )
        match = Match.objects.get(request=request_obj)
        session = MeetingSession.objects.get(match=match)
        feedback = Feedback.objects.create(
            match=match,
            submitted_by=self.mentee_profile,
            rating=5,
            text="Very helpful",
        )

        self.assertIn(self.mentee_profile.display_name, str(request_obj))
        self.assertIn(self.mentor_profile.display_name, str(match))
        self.assertIn(session.scheduled_start_at_utc.isoformat(), str(session))
        self.assertIn(f"({feedback.rating}/5)", str(feedback))


def _token_for(user: Any) -> str:
    """Return a JWT access token string for the given user."""
    return str(RefreshToken.for_user(user).access_token)


class MentorshipRequestAPIBaseTestCase(TestCase):
    """Shared fixtures for mentorship API tests."""

    REQUESTS_URL = "/api/mentorship/requests/"
    REQUESTS_ME_URL = "/api/mentorship/requests/me/"
    MATCHES_ME_URL = "/api/mentorship/matches/me/"
    MEETING_SESSIONS_ME_URL = "/api/mentorship/meeting-sessions/me/"

    def setUp(self) -> None:
        """Create mentor and mentee users with matching profiles."""
        # UserRole moved to top level

        Group.objects.get_or_create(name=UserRole.USER)

        self.mentor_user = User.objects.create_user(
            email="mentor.api@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
            is_email_verified=True,
        )
        self.mentee_user = User.objects.create_user(
            email="mentee.api@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
            is_email_verified=True,
        )
        self.other_user = User.objects.create_user(
            email="other.api@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
            is_email_verified=True,
        )

        self.mentor_profile = Profile.objects.create(
            user=self.mentor_user,
            display_name="API Mentor",
        )
        self.mentee_profile = Profile.objects.create(
            user=self.mentee_user,
            display_name="API Mentee",
        )
        self.other_profile = Profile.objects.create(
            user=self.other_user,
            display_name="API Other",
        )

        start_at = timezone.now() + timedelta(days=2)
        self.mentor_slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=start_at,
            end_at=start_at + timedelta(hours=1),
        )

        other_start_at = timezone.now() + timedelta(days=3)
        self.other_mentor_slot = AvailabilitySlot.objects.create(
            profile=self.other_profile,
            start_at=other_start_at,
            end_at=other_start_at + timedelta(hours=1),
        )

        self.mentor_client: Any = APIClient()
        self.mentee_client: Any = APIClient()
        self.other_client: Any = APIClient()
        self.anon_client: Any = APIClient()

        self.mentor_client.credentials(HTTP_AUTHORIZATION=f"Bearer {_token_for(self.mentor_user)}")
        self.mentee_client.credentials(HTTP_AUTHORIZATION=f"Bearer {_token_for(self.mentee_user)}")
        self.other_client.credentials(HTTP_AUTHORIZATION=f"Bearer {_token_for(self.other_user)}")

    def _respond_url(self, request_id) -> str:
        return f"/api/mentorship/requests/{request_id}/respond/"


class MyRequestsListAPIViewTests(MentorshipRequestAPIBaseTestCase):
    """Tests for GET /api/mentorship/requests/me/."""

    def test_unauthenticated_returns_401(self) -> None:
        response = self.anon_client.get(self.REQUESTS_ME_URL)
        self.assertEqual(response.status_code, 401)

    def test_mentee_sees_sent_requests(self) -> None:
        MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
        )
        response = self.mentee_client.get(self.REQUESTS_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["mentee"]["username"], self.mentee_profile.username)

    def test_mentor_sees_received_requests(self) -> None:
        MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
        )
        response = self.mentor_client.get(self.REQUESTS_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["mentor"]["username"], self.mentor_profile.username)

    def test_user_sees_requests_as_mentor_and_mentee_parties(self) -> None:
        """Users see requests where they are involved as mentor or mentee."""
        MentorshipRequest.objects.create(
            mentor=self.other_profile,
            mentee=self.mentee_profile,
        )
        MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.other_profile,
        )
        response = self.other_client.get(self.REQUESTS_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

    def test_slot_time_fields_fallback_to_snapshot_when_slot_unlinked(self) -> None:
        """Request response keeps first-session time values after slot unlink."""
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=self.mentor_slot,
            status=MentorshipRequest.Status.ACCEPTED,
        )
        request_obj.slot = None
        request_obj.save(update_fields=["slot"])

        response = self.mentee_client.get(self.REQUESTS_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(str(response.data[0]["id"]), str(request_obj.id))
        slot_id_value = response.data[0].get("slot_id", response.data[0].get("slotId"))
        self.assertIsNone(slot_id_value)
        self.assertEqual(
            response.data[0]["slot_date"],
            timezone.localtime(self.mentor_slot.start_at).date().isoformat(),
        )
        self.assertEqual(
            response.data[0]["slot_start_time"],
            timezone.localtime(self.mentor_slot.start_at).time().replace(microsecond=0).isoformat(),
        )
        self.assertEqual(
            response.data[0]["slot_end_time"],
            timezone.localtime(self.mentor_slot.end_at).time().replace(microsecond=0).isoformat(),
        )


@override_settings(REQUIRE_EMAIL_VERIFICATION=True)
class CreateRequestAPIViewTests(MentorshipRequestAPIBaseTestCase):
    """Tests for POST /api/mentorship/requests/."""

    def test_unauthenticated_returns_401(self) -> None:
        response = self.anon_client.post(
            self.REQUESTS_URL,
            {
                "mentor_username": self.mentor_profile.username,
                "slot_id": str(self.mentor_slot.id),
            },
        )
        self.assertEqual(response.status_code, 401)

    def test_unverified_email_mentee_cannot_create_request(self) -> None:
        """Issue #228: gated endpoints must reject users with unverified email."""
        self.mentee_user.is_email_verified = False
        self.mentee_user.save(update_fields=["is_email_verified"])

        response = self.mentee_client.post(
            self.REQUESTS_URL,
            {
                "mentor_username": self.mentor_profile.username,
                "slot_id": str(self.mentor_slot.id),
            },
        )
        self.assertEqual(response.status_code, 403)

    def test_mentee_creates_request_successfully(self) -> None:
        response = self.mentee_client.post(
            self.REQUESTS_URL,
            {
                "mentor_username": self.mentor_profile.username,
                "slot_id": str(self.mentor_slot.id),
                "cover_letter": "Hi!",
            },
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "PENDING")
        self.assertEqual(response.data["mentor"]["username"], self.mentor_profile.username)
        self.assertEqual(str(response.data["slot_id"]), str(self.mentor_slot.id))
        self.assertEqual(response.data["cover_letter"], "Hi!")

    def test_mentor_only_profile_cannot_send_request(self) -> None:
        response = self.mentor_client.post(
            self.REQUESTS_URL,
            {
                "mentor_username": self.other_profile.username,
                "slot_id": str(self.other_mentor_slot.id),
            },
        )
        self.assertEqual(response.status_code, 403)

    def test_nonexistent_mentor_username_returns_400(self) -> None:
        response = self.mentee_client.post(
            self.REQUESTS_URL,
            {"mentor_username": "does_not_exist", "slot_id": str(self.mentor_slot.id)},
        )
        self.assertEqual(response.status_code, 400)

    def test_target_without_mentor_mode_returns_400(self) -> None:
        """Cannot send a request to a MENTEE-only profile."""
        response = self.mentee_client.post(
            self.REQUESTS_URL,
            {
                "mentor_username": self.mentee_profile.username,
                "slot_id": str(self.mentor_slot.id),
            },
        )
        self.assertEqual(response.status_code, 400)

    def test_duplicate_pending_returns_400(self) -> None:
        self.mentee_client.post(
            self.REQUESTS_URL,
            {
                "mentor_username": self.mentor_profile.username,
                "slot_id": str(self.mentor_slot.id),
            },
        )
        response = self.mentee_client.post(
            self.REQUESTS_URL,
            {
                "mentor_username": self.mentor_profile.username,
                "slot_id": str(self.mentor_slot.id),
            },
        )
        self.assertEqual(response.status_code, 400)

    def test_cover_letter_optional(self) -> None:
        response = self.mentee_client.post(
            self.REQUESTS_URL,
            {
                "mentor_username": self.mentor_profile.username,
                "slot_id": str(self.mentor_slot.id),
            },
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["cover_letter"], "")

    def test_slot_belongs_to_requested_mentor(self) -> None:
        """Selected slot must belong to the mentor in mentor_username."""
        response = self.mentee_client.post(
            self.REQUESTS_URL,
            {
                "mentor_username": self.mentor_profile.username,
                "slot_id": str(self.other_mentor_slot.id),
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("slot_id", response.data)


class RespondToRequestAPIViewTests(MentorshipRequestAPIBaseTestCase):
    """Tests for POST /api/mentorship/requests/{id}/respond/."""

    def setUp(self) -> None:
        super().setUp()
        self.pending_request = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=self.mentor_slot,
        )
        self.respond_url = self._respond_url(self.pending_request.id)

    def test_unauthenticated_returns_401(self) -> None:
        response = self.anon_client.post(self.respond_url, {"action": "accept"})
        self.assertEqual(response.status_code, 401)

    def test_non_mentor_cannot_respond(self) -> None:
        response = self.mentee_client.post(self.respond_url, {"action": "accept"})
        self.assertEqual(response.status_code, 403)

    def test_unrelated_user_cannot_respond(self) -> None:
        response = self.other_client.post(self.respond_url, {"action": "accept"})
        self.assertEqual(response.status_code, 403)

    def test_mentor_accepts_request(self) -> None:
        response = self.mentor_client.post(self.respond_url, {"action": "accept"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ACCEPTED")
        self.mentor_slot.refresh_from_db(from_queryset=None)
        self.assertTrue(self.mentor_slot.is_booked)
        self.assertEqual(self.mentor_slot.booked_by, self.mentee_user)
        self.assertTrue(Match.objects.filter(request=self.pending_request).exists())

    def test_mentor_rejects_request(self) -> None:
        response = self.mentor_client.post(self.respond_url, {"action": "reject"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "REJECTED")
        self.assertFalse(Match.objects.filter(request=self.pending_request).exists())

    def test_responding_to_already_accepted_returns_400(self) -> None:
        self.pending_request.status = MentorshipRequest.Status.ACCEPTED
        self.pending_request.save()
        response = self.mentor_client.post(self.respond_url, {"action": "reject"})
        self.assertEqual(response.status_code, 400)

    def test_invalid_action_returns_400(self) -> None:
        response = self.mentor_client.post(self.respond_url, {"action": "maybe"})
        self.assertEqual(response.status_code, 400)

    def test_nonexistent_request_returns_404(self) -> None:
        url = self._respond_url(uuid.uuid4())
        response = self.mentor_client.post(url, {"action": "accept"})
        self.assertEqual(response.status_code, 404)


class MyMatchesListAPIViewTests(MentorshipRequestAPIBaseTestCase):
    """Tests for GET /api/mentorship/matches/me/."""

    def test_unauthenticated_returns_401(self) -> None:
        response = self.anon_client.get(self.MATCHES_ME_URL)
        self.assertEqual(response.status_code, 401)


class MeetingSessionPhaseTwoTests(MentorshipRequestAPIBaseTestCase):
    """Phase 2 tests for canonical MeetingSession creation and sync behavior."""

    def setUp(self) -> None:
        super().setUp()
        new_start = timezone.now() + timedelta(days=5)
        self.second_slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=new_start,
            end_at=new_start + timedelta(hours=1),
        )

    def _create_pending_request(self) -> MentorshipRequest:
        return MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=self.mentor_slot,
        )

    def test_accept_creates_meeting_session(self) -> None:
        request_obj = self._create_pending_request()
        respond_url = self._respond_url(request_obj.id)

        response = self.mentor_client.post(respond_url, {"action": "accept"})
        self.assertEqual(response.status_code, 200)

        match = Match.objects.get(request=request_obj)
        session = MeetingSession.objects.get(match=match)
        self.assertEqual(session.status, MeetingSession.Status.SCHEDULED)
        self.assertEqual(session.source_slot, self.mentor_slot)
        self.assertEqual(session.scheduled_start_at_utc, self.mentor_slot.start_at)
        self.assertEqual(session.scheduled_end_at_utc, self.mentor_slot.end_at)

    def test_cancel_marks_meeting_session_canceled(self) -> None:
        request_obj = self._create_pending_request()
        self.mentor_client.post(self._respond_url(request_obj.id), {"action": "accept"})

        match = Match.objects.get(request=request_obj)
        session = MeetingSession.objects.get(match=match)
        cancel_url = f"/api/mentorship/sessions/{session.id}/cancel/"
        response = self.mentee_client.post(cancel_url)
        self.assertEqual(response.status_code, 200)

        session = MeetingSession.objects.get(match=match)
        self.assertEqual(session.status, MeetingSession.Status.CANCELED)
        self.assertIsNone(session.source_slot)
        self.assertEqual(session.canceled_by_role, MeetingSession.CanceledByRole.MENTEE)

    def test_reschedule_updates_meeting_session(self) -> None:
        request_obj = self._create_pending_request()
        self.mentor_client.post(self._respond_url(request_obj.id), {"action": "accept"})

        match = Match.objects.get(request=request_obj)
        session = MeetingSession.objects.get(match=match)
        reschedule_url = f"/api/mentorship/sessions/{session.id}/reschedule/"
        response = self.mentee_client.post(
            reschedule_url,
            {"new_slot_id": str(self.second_slot.id)},
        )
        self.assertEqual(response.status_code, 200)

        session = MeetingSession.objects.get(match=match)
        self.assertEqual(session.status, MeetingSession.Status.RESCHEDULED)
        self.assertEqual(session.source_slot, self.second_slot)
        self.assertEqual(session.scheduled_start_at_utc, self.second_slot.start_at)
        self.assertEqual(session.scheduled_end_at_utc, self.second_slot.end_at)

    def test_meeting_sessions_me_endpoint_returns_canonical_payload(self) -> None:
        request_obj = self._create_pending_request()
        self.mentor_client.post(self._respond_url(request_obj.id), {"action": "accept"})

        response = self.mentee_client.get(self.MEETING_SESSIONS_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["my_role"], "MENTEE")
        self.assertIn("allowed_actions", response.data[0])

    def test_meeting_sessions_me_endpoint_rejects_invalid_status(self) -> None:
        response = self.mentee_client.get(self.MEETING_SESSIONS_ME_URL, {"status": "invalid"})
        self.assertEqual(response.status_code, 400)

    def test_accepted_request_appears_in_matches(self) -> None:
        req = _create_accepted_request(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
        )
        response = self.mentee_client.get(self.MATCHES_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(str(response.data[0]["request_id"]), str(req.id))

    def test_inactive_match_excluded(self) -> None:
        req = _create_accepted_request(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
        )
        Match.objects.filter(request=req).update(is_active=False)
        response = self.mentee_client.get(self.MATCHES_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_pending_request_not_in_matches(self) -> None:
        MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
        )
        response = self.mentee_client.get(self.MATCHES_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])


class FeedbackAPIBaseTestCase(MentorshipRequestAPIBaseTestCase):
    """Shared fixtures for feedback API tests: an active match between mentor and mentee."""

    def setUp(self) -> None:
        super().setUp()
        # Create accepted request and explicitly materialize match/session state.
        self.mentorship_request = _create_accepted_request(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
        )
        self.match = Match.objects.get(request=self.mentorship_request)
        self.feedback_url = f"/api/mentorship/matches/{self.match.id}/feedback/"


class DeactivateMatchAPIViewTests(FeedbackAPIBaseTestCase):
    """Tests for POST /api/mentorship/matches/<match_id>/deactivate/."""

    def setUp(self) -> None:
        super().setUp()
        self.deactivate_url = f"/api/mentorship/matches/{self.match.id}/deactivate/"

    def test_unauthenticated_returns_401(self) -> None:
        response = self.anon_client.post(self.deactivate_url)
        self.assertEqual(response.status_code, 401)

    def test_outsider_returns_403(self) -> None:
        response = self.other_client.post(self.deactivate_url)
        self.assertEqual(response.status_code, 403)

    def test_mentor_can_deactivate_match(self) -> None:
        response = self.mentor_client.post(self.deactivate_url)
        self.assertEqual(response.status_code, 200)
        self.match.refresh_from_db()
        self.assertFalse(self.match.is_active)

    def test_mentee_can_deactivate_match(self) -> None:
        response = self.mentee_client.post(self.deactivate_url)
        self.assertEqual(response.status_code, 200)
        self.match.refresh_from_db()
        self.assertFalse(self.match.is_active)

    def test_deactivate_idempotent(self) -> None:
        self.mentor_client.post(self.deactivate_url)
        response = self.mentor_client.post(self.deactivate_url)
        self.assertEqual(response.status_code, 200)
        self.match.refresh_from_db()
        self.assertFalse(self.match.is_active)

    def test_nonexistent_match_returns_404(self) -> None:
        url = f"/api/mentorship/matches/{uuid.uuid4()}/deactivate/"
        response = self.mentor_client.post(url)
        self.assertEqual(response.status_code, 404)

    def test_deactivated_match_excluded_from_active_list(self) -> None:
        self.mentor_client.post(self.deactivate_url)
        response = self.mentor_client.get(self.MATCHES_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_deactivation_refreshes_total_mentee_count(self) -> None:
        """Deactivation updates mentor active mentee count to exclude the match."""
        self.mentor_profile.refresh_from_db(fields=["total_mentee_count"])
        self.assertEqual(self.mentor_profile.total_mentee_count, 1)

        deactivate_match(match=self.match, actor_profile=self.mentor_profile)

        self.mentor_profile.refresh_from_db(fields=["total_mentee_count"])
        self.assertEqual(self.mentor_profile.total_mentee_count, 0)

    def test_idempotent_deactivation_keeps_total_mentee_count_stable(self) -> None:
        """Second deactivation call remains a no-op for mentee count."""
        deactivate_match(match=self.match, actor_profile=self.mentor_profile)
        self.mentor_profile.refresh_from_db(fields=["total_mentee_count"])
        self.assertEqual(self.mentor_profile.total_mentee_count, 0)

        deactivate_match(match=self.match, actor_profile=self.mentor_profile)
        self.mentor_profile.refresh_from_db(fields=["total_mentee_count"])
        self.assertEqual(self.mentor_profile.total_mentee_count, 0)


class MatchJourneyAPIViewTests(FeedbackAPIBaseTestCase):
    """Tests for GET /api/mentorship/matches/<match_id>/journey/."""

    def setUp(self) -> None:
        super().setUp()
        self.journey_url = f"/api/mentorship/matches/{self.match.id}/journey/"

    def _set_request_accepted_time(self, dt) -> None:
        self.mentorship_request.responded_at = dt
        self.mentorship_request.save(update_fields=["responded_at"])

    def _sync_session_event_timestamp(self, *, session: MeetingSession, event_time) -> None:
        event_type_by_status = {
            MeetingSession.Status.SCHEDULED: "session_scheduled",
            MeetingSession.Status.RESCHEDULED: "session_rescheduled",
            MeetingSession.Status.CANCELED: "session_canceled",
            MeetingSession.Status.COMPLETED: "session_completed",
        }
        event_type = event_type_by_status.get(session.status)
        if event_type is None:
            return

        TimelineEvent.objects.filter(
            source_id__startswith=f"{event_type}:{session.id}:",
            category=TimelineEvent.Category.AGTE,
        ).update(
            created_at=event_time,
            last_edited=event_time,
        )

    def _create_session(
        self,
        *,
        status: str,
        start_offset_days: int,
        event_time,
        canceled_by_role: str = "",
        cancel_reason: str = "",
    ) -> MeetingSession:
        start_at = timezone.now() + timedelta(days=start_offset_days)
        session = MeetingSession.objects.create(
            match=self.match,
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            scheduled_start_at_utc=start_at,
            scheduled_end_at_utc=start_at + timedelta(hours=1),
            status=status,
            canceled_by_role=canceled_by_role,
            cancel_reason=cancel_reason,
        )
        MeetingSession.objects.filter(id=session.id).update(
            created_at=event_time,
            updated_at=event_time,
        )
        session.refresh_from_db()
        self._sync_session_event_timestamp(session=session, event_time=event_time)
        return session

    def test_unauthenticated_returns_401(self) -> None:
        response = self.anon_client.get(self.journey_url)
        self.assertEqual(response.status_code, 401)

    def test_authenticated_outsider_returns_403(self) -> None:
        response = self.other_client.get(self.journey_url)
        self.assertEqual(response.status_code, 403)

    def test_fresh_match_with_only_request_returns_single_request_accepted(self) -> None:
        response = self.mentor_client.get(self.journey_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["type"], "request_accepted")
        self.assertIn("created_at", response.data["results"][0])
        self.assertIn("last_edited", response.data["results"][0])

    def test_full_lifecycle_includes_all_scoped_event_types(self) -> None:
        base_time = timezone.now() - timedelta(days=2)
        self._set_request_accepted_time(base_time)

        self._create_session(
            status=MeetingSession.Status.SCHEDULED,
            start_offset_days=1,
            event_time=base_time + timedelta(hours=1),
        )
        self._create_session(
            status=MeetingSession.Status.RESCHEDULED,
            start_offset_days=2,
            event_time=base_time + timedelta(hours=2),
        )
        self._create_session(
            status=MeetingSession.Status.CANCELED,
            start_offset_days=3,
            event_time=base_time + timedelta(hours=3),
            canceled_by_role=MeetingSession.CanceledByRole.MENTOR,
            cancel_reason="Conflict",
        )
        self._create_session(
            status=MeetingSession.Status.COMPLETED,
            start_offset_days=-1,
            event_time=base_time + timedelta(hours=4),
        )
        self.mentor_client.post(f"/api/mentorship/matches/{self.match.id}/deactivate/")

        response = self.mentor_client.get(self.journey_url)
        self.assertEqual(response.status_code, 200)
        event_types = {item["type"] for item in response.data["results"]}

        self.assertIn("request_accepted", event_types)
        self.assertIn("session_scheduled", event_types)
        self.assertIn("session_rescheduled", event_types)
        self.assertIn("session_canceled", event_types)
        self.assertIn("session_completed", event_types)
        self.assertIn("mentorship_ended", event_types)
        self.assertNotIn("request_created", event_types)

    def test_cross_type_ordering_is_descending_by_created_at(self) -> None:
        base_time = timezone.now() - timedelta(days=1)
        self._set_request_accepted_time(base_time)

        self._create_session(
            status=MeetingSession.Status.SCHEDULED,
            start_offset_days=1,
            event_time=base_time + timedelta(hours=1),
        )
        self._create_session(
            status=MeetingSession.Status.COMPLETED,
            start_offset_days=-1,
            event_time=base_time + timedelta(hours=2),
        )

        response = self.mentor_client.get(self.journey_url)
        self.assertEqual(response.status_code, 200)
        created_at_values = [item["created_at"] for item in response.data["results"]]
        self.assertEqual(created_at_values, sorted(created_at_values, reverse=True))

    def test_offset_limit_slices_results(self) -> None:
        base_time = timezone.now() - timedelta(days=1)
        self._set_request_accepted_time(base_time)

        self._create_session(
            status=MeetingSession.Status.SCHEDULED,
            start_offset_days=1,
            event_time=base_time + timedelta(hours=1),
        )
        self._create_session(
            status=MeetingSession.Status.COMPLETED,
            start_offset_days=-1,
            event_time=base_time + timedelta(hours=2),
        )
        self._create_session(
            status=MeetingSession.Status.CANCELED,
            start_offset_days=2,
            event_time=base_time + timedelta(hours=3),
            canceled_by_role=MeetingSession.CanceledByRole.MENTEE,
            cancel_reason="No longer needed",
        )

        response = self.mentor_client.get(self.journey_url, {"offset": 1, "limit": 2})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["offset"], 1)
        self.assertEqual(response.data["limit"], 2)
        self.assertEqual(len(response.data["results"]), 2)

    def test_invalid_offset_or_limit_returns_400(self) -> None:
        offset_response = self.mentor_client.get(self.journey_url, {"offset": -1, "limit": 10})
        self.assertEqual(offset_response.status_code, 400)

        limit_response = self.mentor_client.get(self.journey_url, {"offset": 0, "limit": 0})
        self.assertEqual(limit_response.status_code, 400)

        cap_response = self.mentor_client.get(self.journey_url, {"offset": 0, "limit": 999})
        self.assertEqual(cap_response.status_code, 400)

    def test_query_count_stays_bounded_with_more_sessions(self) -> None:
        with CaptureQueriesContext(connection) as baseline_ctx:
            baseline_response = self.mentor_client.get(self.journey_url)
        self.assertEqual(baseline_response.status_code, 200)

        now = timezone.now()
        for i in range(40):
            self._create_session(
                status=MeetingSession.Status.SCHEDULED,
                start_offset_days=i + 1,
                event_time=now + timedelta(minutes=i),
            )

        with CaptureQueriesContext(connection) as heavy_ctx:
            heavy_response = self.mentor_client.get(self.journey_url)
        self.assertEqual(heavy_response.status_code, 200)
        self.assertEqual(len(heavy_ctx), len(baseline_ctx))

    def test_is_deleted_event_excluded_from_journey(self) -> None:
        base_time = timezone.now() - timedelta(days=1)
        self._set_request_accepted_time(base_time)
        session = self._create_session(
            status=MeetingSession.Status.SCHEDULED,
            start_offset_days=1,
            event_time=base_time + timedelta(hours=1),
        )

        event = (
            TimelineEvent.objects.filter(
                source_id__startswith=f"session_scheduled:{session.id}:",
                category=TimelineEvent.Category.AGTE,
            )
            .order_by("-created_at")
            .first()
        )
        self.assertIsNotNone(event)
        assert event is not None
        TimelineEvent.objects.filter(id=event.id).update(is_deleted=True)

        response = self.mentor_client.get(self.journey_url)
        self.assertEqual(response.status_code, 200)
        event_ids = {item["id"] for item in response.data["results"]}
        self.assertNotIn(event.source_id, event_ids)


@override_settings(RATING_UPDATE_THRESHOLD=5)
class FeedbackSubmitAndListAPITests(FeedbackAPIBaseTestCase):
    """Tests for POST and GET /api/mentorship/matches/{match_id}/feedback/."""

    def test_unauthenticated_post_returns_401(self) -> None:
        response = self.anon_client.post(self.feedback_url, {"rating": 4}, format="json")
        self.assertEqual(response.status_code, 401)

    def test_unauthenticated_get_returns_401(self) -> None:
        response = self.anon_client.get(self.feedback_url)
        self.assertEqual(response.status_code, 401)

    def test_unauthenticated_delete_returns_401(self) -> None:
        response = self.anon_client.delete(self.feedback_url)
        self.assertEqual(response.status_code, 401)

    def test_nonexistent_match_post_returns_404(self) -> None:
        url = f"/api/mentorship/matches/{uuid.uuid4()}/feedback/"
        response = self.mentee_client.post(url, {"rating": 4}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_nonexistent_match_get_returns_404(self) -> None:
        url = f"/api/mentorship/matches/{uuid.uuid4()}/feedback/"
        response = self.mentee_client.get(url)
        self.assertEqual(response.status_code, 404)

    def test_unrelated_user_cannot_submit_feedback(self) -> None:
        response = self.other_client.post(self.feedback_url, {"rating": 3}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_unrelated_user_cannot_view_feedback(self) -> None:
        response = self.other_client.get(self.feedback_url)
        self.assertEqual(response.status_code, 403)

    def test_unrelated_user_cannot_delete_feedback(self) -> None:
        Feedback.objects.create(
            match=self.match, submitted_by=self.mentee_profile, rating=4, text="Good"
        )
        response = self.other_client.delete(self.feedback_url)
        self.assertEqual(response.status_code, 403)

    def test_mentee_can_submit_feedback(self) -> None:
        response = self.mentee_client.post(
            self.feedback_url, {"rating": 5, "text": "Great mentor!"}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["rating"], 5)
        self.assertEqual(response.data["text"], "Great mentor!")

    def test_mentor_can_submit_feedback(self) -> None:
        response = self.mentor_client.post(
            self.feedback_url, {"rating": 4, "text": "Motivated mentee."}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["rating"], 4)

    def test_duplicate_feedback_returns_400(self) -> None:
        self.mentee_client.post(self.feedback_url, {"rating": 5}, format="json")
        response = self.mentee_client.post(self.feedback_url, {"rating": 3}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_delete_own_feedback_returns_204(self) -> None:
        Feedback.objects.create(
            match=self.match,
            submitted_by=self.mentee_profile,
            rating=5,
            text="Delete me",
        )
        response = self.mentee_client.delete(self.feedback_url)
        self.assertEqual(response.status_code, 204)
        self.assertFalse(
            Feedback.objects.filter(match=self.match, submitted_by=self.mentee_profile).exists()
        )

    def test_delete_missing_feedback_returns_404(self) -> None:
        response = self.mentee_client.delete(self.feedback_url)
        self.assertEqual(response.status_code, 404)

    def test_delete_mentor_feedback_does_not_change_review_count(self) -> None:
        self.mentor_client.post(
            self.feedback_url, {"rating": 4, "text": "Mentor note"}, format="json"
        )
        self.mentor_profile.refresh_from_db()
        self.assertEqual(self.mentor_profile.review_count, 0)

        delete_response = self.mentor_client.delete(self.feedback_url)
        self.assertEqual(delete_response.status_code, 204)
        self.mentor_profile.refresh_from_db()
        self.assertEqual(self.mentor_profile.review_count, 0)

    def test_delete_feedback_twice_returns_404_second_time(self) -> None:
        self.mentee_client.post(
            self.feedback_url, {"rating": 5, "text": "Delete twice"}, format="json"
        )
        first_delete = self.mentee_client.delete(self.feedback_url)
        second_delete = self.mentee_client.delete(self.feedback_url)

        self.assertEqual(first_delete.status_code, 204)
        self.assertEqual(second_delete.status_code, 404)

    def test_rating_below_1_returns_400(self) -> None:
        response = self.mentee_client.post(self.feedback_url, {"rating": 0}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_rating_above_5_returns_400(self) -> None:
        response = self.mentee_client.post(self.feedback_url, {"rating": 6}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_mentor_can_list_feedback(self) -> None:
        Feedback.objects.create(
            match=self.match, submitted_by=self.mentee_profile, rating=4, text="Good"
        )
        response = self.mentor_client.get(self.feedback_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_mentee_can_list_feedback(self) -> None:
        Feedback.objects.create(
            match=self.match, submitted_by=self.mentor_profile, rating=5, text="Great"
        )
        response = self.mentee_client.get(self.feedback_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_review_count_incremented_when_mentee_submits(self) -> None:
        self.mentee_client.post(self.feedback_url, {"rating": 4}, format="json")
        self.mentor_profile.refresh_from_db()
        self.assertEqual(self.mentor_profile.review_count, 1)

    def test_mentor_feedback_does_not_increment_review_count(self) -> None:
        self.mentor_client.post(self.feedback_url, {"rating": 4}, format="json")
        self.mentor_profile.refresh_from_db()
        self.assertEqual(self.mentor_profile.review_count, 0)

    @override_settings(RATING_UPDATE_THRESHOLD=2)
    def test_average_rating_updated_at_threshold(self) -> None:
        """After every 2 mentee reviews, the public average_rating is recalculated."""
        # Decimal moved to top level

        # Use two different mentees to avoid duplicate feedback constraint.
        second_mentee_user = User.objects.create_user(
            email="mentee2.feedback@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        second_mentee_profile = Profile.objects.create(
            user=second_mentee_user, display_name="Second Mentee"
        )
        second_request = _create_accepted_request(
            mentor=self.mentor_profile,
            mentee=second_mentee_profile,
        )
        second_match = Match.objects.get(request=second_request)
        second_feedback_url = f"/api/mentorship/matches/{second_match.id}/feedback/"
        second_mentee_client = APIClient()
        second_mentee_client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {_token_for(second_mentee_user)}"
        )

        # First review (threshold=2, not yet reached).
        self.mentee_client.post(self.feedback_url, {"rating": 4}, format="json")
        self.mentor_profile.refresh_from_db()
        self.assertEqual(self.mentor_profile.average_rating, Decimal("0.00"))

        # Second review reaches threshold → average should update to (4+2)/2 = 3.00.
        second_mentee_client.post(second_feedback_url, {"rating": 2}, format="json")
        self.mentor_profile.refresh_from_db()
        self.assertEqual(self.mentor_profile.average_rating, Decimal("3.00"))

    @override_settings(RATING_UPDATE_THRESHOLD=2)
    def test_delete_visible_feedback_keeps_batch_visibility(self) -> None:
        """Deleting already visible feedback should not reduce visible batch count."""
        second_mentee_user = User.objects.create_user(
            email="mentee.visible2@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        second_mentee_profile = Profile.objects.create(
            user=second_mentee_user, display_name="Second Visible Mentee"
        )
        second_request = _create_accepted_request(
            mentor=self.mentor_profile,
            mentee=second_mentee_profile,
        )
        second_match = Match.objects.get(request=second_request)
        second_feedback_url = f"/api/mentorship/matches/{second_match.id}/feedback/"
        second_mentee_client = APIClient()
        second_mentee_client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {_token_for(second_mentee_user)}"
        )

        self.mentee_client.post(self.feedback_url, {"rating": 5, "text": "First"}, format="json")
        second_mentee_client.post(
            second_feedback_url, {"rating": 4, "text": "Second"}, format="json"
        )

        self.mentor_profile.refresh_from_db()
        self.assertEqual(self.mentor_profile.review_count, 2)

        delete_response = self.mentee_client.delete(self.feedback_url)
        self.assertEqual(delete_response.status_code, 204)
        self.mentor_profile.refresh_from_db()
        self.assertEqual(self.mentor_profile.review_count, 2)

    @override_settings(RATING_UPDATE_THRESHOLD=2)
    def test_delete_hidden_feedback_reduces_pending_batch_count(self) -> None:
        """Deleting not-yet-visible feedback should remove it from pending threshold progress."""
        self.mentee_client.post(self.feedback_url, {"rating": 5, "text": "Only one"}, format="json")
        self.mentor_profile.refresh_from_db()
        self.assertEqual(self.mentor_profile.review_count, 1)

        delete_response = self.mentee_client.delete(self.feedback_url)
        self.assertEqual(delete_response.status_code, 204)
        self.mentor_profile.refresh_from_db()
        self.assertEqual(self.mentor_profile.review_count, 0)


class CancelSessionAPIViewTests(MentorshipRequestAPIBaseTestCase):
    """Tests for POST /api/mentorship/sessions/<session_id>/cancel/"""

    def _setup_active_match_with_booking(self):
        """Create an accepted request with a booked slot and return (match, session)."""
        request_obj = _create_accepted_request(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=self.mentor_slot,
        )
        self.mentor_slot.mark_booked(self.mentee_user)
        match = Match.objects.get(request=request_obj)
        session = MeetingSession.objects.get(match=match)
        return match, session

    def _cancel_url(self, session_id) -> str:
        return f"/api/mentorship/sessions/{session_id}/cancel/"

    def test_mentee_can_cancel(self) -> None:
        match, session = self._setup_active_match_with_booking()
        response = self.mentee_client.post(self._cancel_url(session.id))
        self.assertEqual(response.status_code, 200)
        self.mentor_slot.refresh_from_db()
        self.assertFalse(self.mentor_slot.is_booked)

    def test_mentor_can_cancel(self) -> None:
        match, session = self._setup_active_match_with_booking()
        response = self.mentor_client.post(self._cancel_url(session.id))
        self.assertEqual(response.status_code, 200)
        self.mentor_slot.refresh_from_db()
        self.assertFalse(self.mentor_slot.is_booked)

    def test_slot_reference_cleared_after_cancel(self) -> None:
        match, session = self._setup_active_match_with_booking()
        request_obj = match.request
        self.mentee_client.post(self._cancel_url(session.id))
        request_obj.refresh_from_db()
        self.assertIsNone(request_obj.slot)

    def test_unrelated_user_cannot_cancel(self) -> None:
        match, session = self._setup_active_match_with_booking()
        response = self.other_client.post(self._cancel_url(session.id))
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_returns_401(self) -> None:
        match, session = self._setup_active_match_with_booking()
        response = self.anon_client.post(self._cancel_url(session.id))
        self.assertEqual(response.status_code, 401)

    def test_cancel_unbooked_slot_marks_session_canceled(self) -> None:
        match, session = self._setup_active_match_with_booking()
        # Free the slot manually
        self.mentor_slot.mark_available()
        response = self.mentee_client.post(self._cancel_url(session.id))
        self.assertEqual(response.status_code, 200)

        session.refresh_from_db()
        self.assertEqual(session.status, MeetingSession.Status.CANCELED)
        self.assertIsNone(session.source_slot)

    def test_nonexistent_session_returns_404(self) -> None:
        response = self.mentee_client.post(self._cancel_url(uuid.uuid4()))
        self.assertEqual(response.status_code, 404)

    def test_canceling_older_session_keeps_newer_session_linked(self) -> None:
        """Canceling one session must not detach source_slot from another newer session."""
        request_obj = _create_accepted_request(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=self.mentor_slot,
        )
        self.mentor_slot.mark_booked(self.mentee_user)

        match = Match.objects.get(request=request_obj)
        session_a = MeetingSession.objects.get(match=match, source_slot=self.mentor_slot)

        slot_b_start = timezone.now() + timedelta(days=4)
        slot_b = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_b_start,
            end_at=slot_b_start + timedelta(hours=1),
        )
        slot_c_start = timezone.now() + timedelta(days=5)
        slot_c = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_c_start,
            end_at=slot_c_start + timedelta(hours=1),
        )

        book_slot_b_response = self.mentee_client.post(
            f"/api/profiles/{self.mentor_profile.username}/availability-slots/{slot_b.id}/book/"
        )
        self.assertEqual(book_slot_b_response.status_code, 200)
        session_b = MeetingSession.objects.get(match=match, source_slot=slot_b)

        first_cancel_response = self.mentee_client.post(self._cancel_url(session_b.id))
        self.assertEqual(first_cancel_response.status_code, 200)

        book_slot_c_response = self.mentee_client.post(
            f"/api/profiles/{self.mentor_profile.username}/availability-slots/{slot_c.id}/book/"
        )
        self.assertEqual(book_slot_c_response.status_code, 200)
        session_c = MeetingSession.objects.get(match=match, source_slot=slot_c)

        second_cancel_response = self.mentee_client.post(self._cancel_url(session_a.id))
        self.assertEqual(second_cancel_response.status_code, 200)

        session_c.refresh_from_db()
        self.assertEqual(session_c.status, MeetingSession.Status.SCHEDULED)
        self.assertEqual(session_c.source_slot, slot_c)

        availability_response = self.mentee_client.get(
            f"/api/profiles/{self.mentor_profile.username}/availability-slots/"
        )
        self.assertEqual(availability_response.status_code, 200)
        slot_c_payload = next(
            item for item in availability_response.data if str(item["id"]) == str(slot_c.id)
        )
        self.assertTrue(slot_c_payload["is_booked"])
        self.assertIsNotNone(slot_c_payload["sessionId"])
        self.assertEqual(slot_c_payload["sessionId"], str(session_c.id))

        third_cancel_response = self.mentee_client.post(self._cancel_url(session_c.id))
        self.assertEqual(third_cancel_response.status_code, 200)
        slot_c.refresh_from_db()
        self.assertFalse(slot_c.is_booked)


class RescheduleSessionAPIViewTests(MentorshipRequestAPIBaseTestCase):
    """Tests for POST /api/mentorship/sessions/<match_id>/reschedule/"""

    def setUp(self) -> None:
        super().setUp()
        # Create a second slot on the mentor for rescheduling
        new_start = timezone.now() + timedelta(days=5)
        self.mentor_slot_2 = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=new_start,
            end_at=new_start + timedelta(hours=1),
        )

    def _setup_active_match_with_booking(self):
        request_obj = _create_accepted_request(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=self.mentor_slot,
        )
        self.mentor_slot.mark_booked(self.mentee_user)
        match = Match.objects.get(request=request_obj)
        session = MeetingSession.objects.get(match=match)
        return match, request_obj, session

    def _reschedule_url(self, match_id) -> str:
        return f"/api/mentorship/sessions/{match_id}/reschedule/"

    def test_mentee_can_reschedule(self) -> None:
        _, _, session = self._setup_active_match_with_booking()
        response = self.mentee_client.post(
            self._reschedule_url(session.id),
            {"new_slot_id": str(self.mentor_slot_2.id)},
        )
        self.assertEqual(response.status_code, 200)

    def test_old_slot_freed_after_reschedule(self) -> None:
        _, _, session = self._setup_active_match_with_booking()
        self.mentee_client.post(
            self._reschedule_url(session.id),
            {"new_slot_id": str(self.mentor_slot_2.id)},
        )
        self.mentor_slot.refresh_from_db()
        self.assertFalse(self.mentor_slot.is_booked)

    def test_new_slot_booked_after_reschedule(self) -> None:
        _, _, session = self._setup_active_match_with_booking()
        self.mentee_client.post(
            self._reschedule_url(session.id),
            {"new_slot_id": str(self.mentor_slot_2.id)},
        )
        self.mentor_slot_2.refresh_from_db()
        self.assertTrue(self.mentor_slot_2.is_booked)

    def test_request_slot_updated_after_reschedule(self) -> None:
        _, request_obj, session = self._setup_active_match_with_booking()
        self.mentee_client.post(
            self._reschedule_url(session.id),
            {"new_slot_id": str(self.mentor_slot_2.id)},
        )
        request_obj.refresh_from_db()
        self.assertEqual(request_obj.slot, self.mentor_slot_2)

    def test_mentor_cannot_reschedule(self) -> None:
        _, _, session = self._setup_active_match_with_booking()
        response = self.mentor_client.post(
            self._reschedule_url(session.id),
            {"new_slot_id": str(self.mentor_slot_2.id)},
        )
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_returns_401(self) -> None:
        _, _, session = self._setup_active_match_with_booking()
        response = self.anon_client.post(
            self._reschedule_url(session.id),
            {"new_slot_id": str(self.mentor_slot_2.id)},
        )
        self.assertEqual(response.status_code, 401)

    def test_same_slot_returns_400(self) -> None:
        _, _, session = self._setup_active_match_with_booking()
        response = self.mentee_client.post(
            self._reschedule_url(session.id),
            {"new_slot_id": str(self.mentor_slot.id)},
        )
        self.assertEqual(response.status_code, 400)

    def test_slot_belonging_to_different_mentor_returns_404(self) -> None:
        _, _, session = self._setup_active_match_with_booking()
        # other_mentor_slot belongs to other_profile, not the match's mentor
        response = self.mentee_client.post(
            self._reschedule_url(session.id),
            {"new_slot_id": str(self.other_mentor_slot.id)},
        )
        self.assertEqual(response.status_code, 404)

    def test_already_booked_slot_returns_400(self) -> None:
        _, _, session = self._setup_active_match_with_booking()
        # Book the second slot with someone else
        self.mentor_slot_2.mark_booked(self.other_user)
        response = self.mentee_client.post(
            self._reschedule_url(session.id),
            {"new_slot_id": str(self.mentor_slot_2.id)},
        )
        self.assertEqual(response.status_code, 400)

    def test_failed_reschedule_keeps_existing_booking(self) -> None:
        """Failed reschedule must keep the current slot booking and request slot unchanged."""
        _, request_obj, session = self._setup_active_match_with_booking()
        self.mentor_slot_2.mark_booked(self.other_user)

        response = self.mentee_client.post(
            self._reschedule_url(session.id),
            {"new_slot_id": str(self.mentor_slot_2.id)},
        )

        self.assertEqual(response.status_code, 400)

        self.mentor_slot.refresh_from_db()
        self.assertTrue(self.mentor_slot.is_booked)
        self.assertEqual(self.mentor_slot.booked_by, self.mentee_user)

        self.mentor_slot_2.refresh_from_db()
        self.assertTrue(self.mentor_slot_2.is_booked)
        self.assertEqual(self.mentor_slot_2.booked_by, self.other_user)

        request_obj.refresh_from_db()
        self.assertEqual(request_obj.slot, self.mentor_slot)

    def test_nonexistent_match_returns_404(self) -> None:
        response = self.mentee_client.post(
            self._reschedule_url(uuid.uuid4()),
            {"new_slot_id": str(self.mentor_slot_2.id)},
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["detail"], "Not found.")


class MentorshipServiceTests(TestCase):
    """Integrity tests for cross-domain mentorship services."""

    def setUp(self) -> None:
        self.mentor_user = User.objects.create_user(
            email="mentor.service@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.mentee_user = User.objects.create_user(
            email="mentee.service@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        self.mentor_profile = Profile.objects.create(
            user=self.mentor_user,
            display_name="Service Mentor",
        )
        self.mentee_profile = Profile.objects.create(
            user=self.mentee_user,
            display_name="Service Mentee",
        )

    def test_book_match_session_creates_canonical_session(self) -> None:
        """Directly booking a slot for an active match creates a MeetingSession."""
        # 1. Establish an active match
        request_obj = _create_accepted_request(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
        )
        match = Match.objects.get(request=request_obj)
        self.assertTrue(match.is_active)

        # 2. Setup a new availability slot
        new_slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=timezone.now() + timedelta(days=5),
            end_at=timezone.now() + timedelta(days=5, hours=1),
        )

        # 3. Book the slot via the combined service
        slot = book_match_session(
            mentor_profile=self.mentor_profile,
            slot_id=new_slot.id,
            actor=self.mentee_user,
        )

        # 4. Assert sync
        self.assertTrue(slot.is_booked)
        self.assertEqual(slot.booked_by, self.mentee_user)

        session = MeetingSession.objects.filter(match=match, source_slot=slot).first()
        self.assertIsNotNone(session)
        assert session is not None
        self.assertEqual(session.status, MeetingSession.Status.SCHEDULED)
        self.assertEqual(session.scheduled_start_at_utc.isoformat(), slot.start_at.isoformat())

    def test_respond_to_request_without_slot_raises_missing_selected_slot(self) -> None:
        """Accepting a request without selected slot raises domain error."""
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.PENDING,
            slot=None,
        )

        with self.assertRaises(MissingSelectedSlotError):
            respond_to_mentorship_request(
                mentorship_request=request_obj,
                action="accept",
            )

    def test_ensure_match_requires_accepted_request(self) -> None:
        """Service rejects match/session materialization for non-accepted requests."""
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.PENDING,
        )

        with self.assertRaises(ValueError):
            ensure_match_and_initial_session(mentorship_request=request_obj)

    def test_book_match_session_actor_without_profile_still_books_slot(self) -> None:
        """Booking succeeds even if actor has no profile; no session is materialized."""
        actor_without_profile = User.objects.create_user(
            email="unprofiled-actor@example.com",
            password="SecurePass123",
        )
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=timezone.now() + timedelta(days=6),
            end_at=timezone.now() + timedelta(days=6, hours=1),
        )

        booked_slot = book_match_session(
            mentor_profile=self.mentor_profile,
            slot_id=slot.id,
            actor=actor_without_profile,
        )

        booked_slot.refresh_from_db(from_queryset=None)
        self.assertTrue(booked_slot.is_booked)
        self.assertEqual(booked_slot.booked_by, actor_without_profile)
        self.assertFalse(MeetingSession.objects.filter(source_slot=booked_slot).exists())

    def test_mark_latest_session_canceled_noop_without_sessions(self) -> None:
        """Cancel marker is a no-op when a match has no canonical session."""
        request_obj = _create_accepted_request(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=None,
        )
        match = Match.objects.get(request=request_obj)

        # Find the latest session for the match (if any)
        session = (
            MeetingSession.objects.filter(match=match)
            .exclude(status=MeetingSession.Status.CANCELED)
            .order_by("-scheduled_start_at_utc")
            .first()
        )
        if session:
            _mark_meeting_session_canceled(session=session, canceled_by=self.mentor_profile)
        # If no session exists, this is a no-op (test expects no error)

        self.assertEqual(MeetingSession.objects.filter(match=match).count(), 0)

    def test_reschedule_creates_session_when_missing_and_old_slot_none(self) -> None:
        """Reschedule creates canonical session when match has no prior session."""
        request_obj = _create_accepted_request(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=None,
        )
        match = Match.objects.get(request=request_obj)
        new_slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=timezone.now() + timedelta(days=7),
            end_at=timezone.now() + timedelta(days=7, hours=1),
        )

        reschedule_match_session(
            match=match,
            actor=self.mentee_user,
            new_slot=new_slot,
        )

        request_obj.refresh_from_db(from_queryset=None)
        self.assertEqual(request_obj.slot, new_slot)
        session = MeetingSession.objects.get(match=match)
        self.assertEqual(session.status, MeetingSession.Status.RESCHEDULED)
        self.assertEqual(session.source_slot, new_slot)


class MentorshipProfileMissingAPIViewTests(MentorshipRequestAPIBaseTestCase):
    """Coverage tests for authenticated users who do not have a Profile row."""

    def setUp(self) -> None:
        super().setUp()
        self.no_profile_user = User.objects.create_user(
            email="no.profile.api@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
            is_email_verified=True,
        )
        self.no_profile_client = APIClient()
        self.no_profile_client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {_token_for(self.no_profile_user)}"
        )

        request_obj = _create_accepted_request(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=self.mentor_slot,
        )
        self.active_match = Match.objects.get(request=request_obj)
        self.active_session = MeetingSession.objects.get(match=self.active_match)

    def _assert_404(self, response: Any) -> None:
        """Shared assertion for missing-profile request handling."""
        self.assertEqual(response.status_code, 404)

    def _post_as_missing_profile(self, url: str, data: dict[str, Any] | None = None) -> Any:
        """Post through no-profile client with optional request body."""
        payload = data or {}
        return self.no_profile_client.post(url, payload, format="json")

    def test_requests_me_returns_empty_without_profile(self) -> None:
        response: Any = self.no_profile_client.get(self.REQUESTS_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_matches_me_returns_empty_without_profile(self) -> None:
        response: Any = self.no_profile_client.get(self.MATCHES_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_meeting_sessions_returns_empty_without_profile(self) -> None:
        response: Any = self.no_profile_client.get(self.MEETING_SESSIONS_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_create_request_returns_404_without_profile(self) -> None:
        response: Any = self._post_as_missing_profile(
            self.REQUESTS_URL,
            {
                "mentor_username": self.mentor_profile.username,
                "slot_id": str(self.mentor_slot.id),
            },
        )
        self._assert_404(response)

    def test_respond_request_returns_404_without_profile(self) -> None:
        pending_request = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=self.mentor_slot,
        )
        response: Any = self._post_as_missing_profile(
            self._respond_url(pending_request.id),
            {"action": "accept"},
        )
        self._assert_404(response)

    def test_cancel_session_returns_404_without_profile(self) -> None:
        response: Any = self._post_as_missing_profile(
            f"/api/mentorship/sessions/{self.active_session.id}/cancel/"
        )
        self._assert_404(response)

    def test_reschedule_session_returns_404_without_profile(self) -> None:
        response: Any = self._post_as_missing_profile(
            f"/api/mentorship/sessions/{self.active_session.id}/reschedule/",
            {"new_slot_id": str(self.other_mentor_slot.id)},
        )
        self._assert_404(response)

    def test_deactivate_match_returns_404_without_profile(self) -> None:
        response: Any = self._post_as_missing_profile(
            f"/api/mentorship/matches/{self.active_match.id}/deactivate/"
        )
        self._assert_404(response)

    def test_feedback_get_returns_404_without_profile(self) -> None:
        response: Any = self.no_profile_client.get(
            f"/api/mentorship/matches/{self.active_match.id}/feedback/"
        )
        self._assert_404(response)

    def test_feedback_post_returns_404_without_profile(self) -> None:
        response: Any = self._post_as_missing_profile(
            f"/api/mentorship/matches/{self.active_match.id}/feedback/",
            {"rating": 4},
        )
        self._assert_404(response)


class RespondToRequestErrorMappingTests(MentorshipRequestAPIBaseTestCase):
    """Tests for error-path mapping in respond endpoint."""

    def test_accept_without_selected_slot_returns_400(self) -> None:
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=None,
        )

        response = self.mentor_client.post(
            self._respond_url(request_obj.id),
            {"action": "accept"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data,
            {"detail": "Selected slot could not be booked while accepting this request."},
        )

    def test_accept_with_already_booked_slot_returns_400(self) -> None:
        self.mentor_slot.mark_booked(self.other_user)
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=self.mentor_slot,
        )

        response = self.mentor_client.post(
            self._respond_url(request_obj.id),
            {"action": "accept"},
        )

        self.assertEqual(response.status_code, 400)

    @patch(
        "mentorship.views.respond_to_mentorship_request",
        side_effect=OwnSlotBookingError(),
    )
    def test_accept_maps_own_slot_booking_error_to_403(self, _: Any) -> None:
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=self.mentor_slot,
        )

        response = self.mentor_client.post(
            self._respond_url(request_obj.id),
            {"action": "accept"},
        )

        self.assertEqual(response.status_code, 403)

    @patch(
        "mentorship.views.respond_to_mentorship_request",
        side_effect=AvailabilitySlot.DoesNotExist(),
    )
    def test_accept_maps_slot_missing_error_to_404(self, _: Any) -> None:
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=self.mentor_slot,
        )

        response = self.mentor_client.post(
            self._respond_url(request_obj.id),
            {"action": "accept"},
        )

        self.assertEqual(response.status_code, 404)


class MeetingSessionFiltersAPIViewTests(MentorshipRequestAPIBaseTestCase):
    """Tests for role and status filters in canonical session listing endpoint."""

    def _create_session(self, *, status: str, start_offset_days: int, end_offset_days: int) -> None:
        request_obj = _create_accepted_request(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=self.mentor_slot,
        )
        session = MeetingSession.objects.get(match__request=request_obj)
        session.status = status
        session.scheduled_start_at_utc = timezone.now() + timedelta(days=start_offset_days)
        session.scheduled_end_at_utc = timezone.now() + timedelta(days=end_offset_days)
        session.save(
            update_fields=[
                "status",
                "scheduled_start_at_utc",
                "scheduled_end_at_utc",
            ]
        )

    def test_role_filter_mentor(self) -> None:
        self._create_session(
            status=MeetingSession.Status.SCHEDULED,
            start_offset_days=2,
            end_offset_days=2,
        )

        response = self.mentor_client.get(self.MEETING_SESSIONS_ME_URL, {"role": "mentor"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_role_filter_mentee(self) -> None:
        self._create_session(
            status=MeetingSession.Status.SCHEDULED,
            start_offset_days=2,
            end_offset_days=2,
        )

        response = self.mentee_client.get(self.MEETING_SESSIONS_ME_URL, {"role": "mentee"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_invalid_role_filter_returns_400(self) -> None:
        response = self.mentee_client.get(self.MEETING_SESSIONS_ME_URL, {"role": "owner"})
        self.assertEqual(response.status_code, 400)

    def test_status_filter_upcoming(self) -> None:
        self._create_session(
            status=MeetingSession.Status.SCHEDULED,
            start_offset_days=3,
            end_offset_days=3,
        )

        response = self.mentee_client.get(self.MEETING_SESSIONS_ME_URL, {"status": "upcoming"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_status_filter_past(self) -> None:
        self._create_session(
            status=MeetingSession.Status.SCHEDULED,
            start_offset_days=-3,
            end_offset_days=-3,
        )

        response = self.mentee_client.get(self.MEETING_SESSIONS_ME_URL, {"status": "past"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_status_filter_scheduled(self) -> None:
        self._create_session(
            status=MeetingSession.Status.SCHEDULED,
            start_offset_days=4,
            end_offset_days=4,
        )

        response = self.mentee_client.get(self.MEETING_SESSIONS_ME_URL, {"status": "scheduled"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_status_filter_rescheduled(self) -> None:
        self._create_session(
            status=MeetingSession.Status.RESCHEDULED,
            start_offset_days=4,
            end_offset_days=4,
        )

        response = self.mentee_client.get(self.MEETING_SESSIONS_ME_URL, {"status": "rescheduled"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_status_filter_canceled(self) -> None:
        self._create_session(
            status=MeetingSession.Status.CANCELED,
            start_offset_days=1,
            end_offset_days=1,
        )

        response = self.mentee_client.get(self.MEETING_SESSIONS_ME_URL, {"status": "canceled"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_status_filter_completed(self) -> None:
        self._create_session(
            status=MeetingSession.Status.SCHEDULED,
            start_offset_days=-2,
            end_offset_days=-1,
        )

        response = self.mentee_client.get(self.MEETING_SESSIONS_ME_URL, {"status": "completed"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)


class MentorshipSerializerBranchTests(TestCase):
    """Unit tests for mentorship serializer branch coverage and value semantics."""

    def setUp(self) -> None:
        self.factory = APIRequestFactory()
        self.mentor_user = User.objects.create_user(
            email="serializer.mentor@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.mentee_user = User.objects.create_user(
            email="serializer.mentee@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        self.mentor_profile = Profile.objects.create(
            user=self.mentor_user,
            display_name="Serializer Mentor",
        )
        self.mentee_profile = Profile.objects.create(
            user=self.mentee_user,
            display_name="Serializer Mentee",
        )
        start_at = timezone.now() + timedelta(days=3)
        self.future_slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=start_at,
            end_at=start_at + timedelta(hours=1),
        )

    def test_validate_slot_id_rejects_missing_slot(self) -> None:
        serializer = cast(
            MentorshipRequestCreateSerializer,
            MentorshipRequestCreateSerializer(context={"mentee_profile": self.mentee_profile}),
        )

        with self.assertRaisesMessage(Exception, "Selected availability slot was not found"):
            serializer.validate_slot_id(uuid.uuid4())

    def test_validate_rejects_self_request(self) -> None:
        serializer = cast(
            MentorshipRequestCreateSerializer,
            MentorshipRequestCreateSerializer(context={"mentee_profile": self.mentee_profile}),
        )

        with self.assertRaisesMessage(
            Exception,
            "You cannot send a mentorship request to yourself",
        ):
            serializer.validate(
                {
                    "mentor_username": self.mentee_profile,
                    "slot_id": self.future_slot,
                }
            )

    def test_validate_rejects_already_booked_slot(self) -> None:
        self.future_slot.mark_booked(self.mentee_profile.user)
        serializer = cast(
            MentorshipRequestCreateSerializer,
            MentorshipRequestCreateSerializer(context={"mentee_profile": self.mentee_profile}),
        )

        with self.assertRaisesMessage(Exception, "Selected slot is already booked"):
            serializer.validate(
                {
                    "mentor_username": self.mentor_profile,
                    "slot_id": self.future_slot,
                }
            )

    def test_validate_rejects_past_slot(self) -> None:
        past_slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=timezone.now() - timedelta(days=1),
            end_at=timezone.now() - timedelta(days=1, hours=-1),
        )
        serializer = cast(
            MentorshipRequestCreateSerializer,
            MentorshipRequestCreateSerializer(context={"mentee_profile": self.mentee_profile}),
        )

        with self.assertRaisesMessage(Exception, "Selected slot is in the past"):
            serializer.validate(
                {
                    "mentor_username": self.mentor_profile,
                    "slot_id": past_slot,
                }
            )

    def test_create_method_creates_request(self) -> None:
        serializer = cast(
            MentorshipRequestCreateSerializer,
            MentorshipRequestCreateSerializer(context={"mentee_profile": self.mentee_profile}),
        )

        request_obj = cast(
            MentorshipRequest,
            serializer.create(
                {
                    "mentor_username": self.mentor_profile,
                    "slot_id": self.future_slot,
                    "cover_letter": "I want to learn system design.",
                }
            ),
        )

        self.assertEqual(request_obj.mentor, self.mentor_profile)
        self.assertEqual(request_obj.mentee, self.mentee_profile)

    def test_upcoming_mentee_serializer_time_fields(self) -> None:
        serialized = cast(dict[str, Any], UpcomingMenteeSessionSerializer(self.future_slot).data)

        self.assertIn("slot_date", serialized)
        self.assertIn("slot_start_time", serialized)
        self.assertIn("slot_end_time", serialized)

    def test_upcoming_mentor_serializer_mentee_none_when_unbooked(self) -> None:
        serialized = cast(dict[str, Any], UpcomingMentorSessionSerializer(self.future_slot).data)

        self.assertIsNone(serialized["mentee"])

    def test_upcoming_mentor_serializer_mentee_none_when_profile_missing(self) -> None:
        unprofiled_user = User.objects.create_user(
            email="serializer.unprofiled@example.com",
            password="SecurePass123",
        )
        self.future_slot.booked_by = unprofiled_user
        self.future_slot.is_booked = True
        self.future_slot.save(update_fields=["booked_by", "is_booked"])

        serialized = cast(dict[str, Any], UpcomingMentorSessionSerializer(self.future_slot).data)
        self.assertIsNone(serialized["mentee"])

    def test_meeting_session_serializer_role_and_actions_branches(self) -> None:
        request_obj = _create_accepted_request(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=self.future_slot,
        )
        session = MeetingSession.objects.get(match__request=request_obj)

        unknown_serialized = cast(
            dict[str, Any],
            MeetingSessionSerializer(session, context={}).data,
        )
        self.assertEqual(unknown_serialized["my_role"], "UNKNOWN")
        self.assertEqual(unknown_serialized["allowed_actions"], [])

        mentor_request = self.factory.get("/api/mentorship/meeting-sessions/me/")
        mentor_request.user = self.mentor_profile.user
        mentor_serialized = cast(
            dict[str, Any],
            MeetingSessionSerializer(
                session,
                context={"request": mentor_request},
            ).data,
        )
        self.assertEqual(mentor_serialized["my_role"], "MENTOR")
        self.assertEqual(mentor_serialized["allowed_actions"], ["cancel"])

        session.status = MeetingSession.Status.SCHEDULED
        session.scheduled_start_at_utc = timezone.now() - timedelta(hours=2)
        session.scheduled_end_at_utc = timezone.now() - timedelta(hours=1)
        session.save(
            update_fields=[
                "status",
                "scheduled_start_at_utc",
                "scheduled_end_at_utc",
            ]
        )

        mentee_request = self.factory.get("/api/mentorship/meeting-sessions/me/")
        mentee_request.user = self.mentee_profile.user
        completed_serialized = cast(
            dict[str, Any],
            MeetingSessionSerializer(
                session,
                context={"request": mentee_request},
            ).data,
        )
        self.assertEqual(completed_serialized["display_status"], MeetingSession.Status.COMPLETED)
        self.assertEqual(completed_serialized["allowed_actions"], [])

    def test_create_mentorship_request_creates_notification(self) -> None:
        # Service import moved to top level

        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=timezone.now() + timedelta(days=5),
            end_at=timezone.now() + timedelta(days=5, hours=1),
        )

        create_mentorship_request(
            mentee_profile=self.mentee_profile,
            mentor_profile=self.mentor_profile,
            selected_slot=slot,
        )

        notification = Notification.objects.filter(
            user=self.mentor_user, type=NotificationType.NEW_MENTORSHIP_REQUEST
        ).first()
        self.assertIsNotNone(notification)
        assert notification is not None
        self.assertEqual(notification.title, "New Mentorship Request")
        self.assertEqual(notification.actor, self.mentee_profile)
        self.assertEqual(notification.resource_type, "mentorship_request")

    def test_respond_to_mentorship_request_accept_creates_notification(self) -> None:
        # Service import moved to top level

        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=timezone.now() + timedelta(days=5),
            end_at=timezone.now() + timedelta(days=5, hours=1),
        )
        req = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=slot,
        )

        respond_to_mentorship_request(mentorship_request=req, action="accept")

        notification = Notification.objects.filter(
            user=self.mentee_user, type=NotificationType.NEW_MATCH
        ).first()
        self.assertIsNotNone(notification)
        assert notification is not None
        self.assertEqual(notification.title, "Request Accepted")
        self.assertEqual(notification.actor, self.mentor_profile)
        self.assertEqual(notification.resource_type, "match")

    def test_respond_to_mentorship_request_reject_creates_notification(self) -> None:
        # Service import moved to top level

        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=timezone.now() + timedelta(days=5),
            end_at=timezone.now() + timedelta(days=5, hours=1),
        )
        req = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=slot,
        )

        respond_to_mentorship_request(mentorship_request=req, action="reject")

        notification = Notification.objects.filter(
            user=self.mentee_user, type=NotificationType.MENTORSHIP_REQUEST_REJECTED
        ).first()
        self.assertIsNotNone(notification)
        assert notification is not None
        self.assertEqual(notification.title, "Request Rejected")
        self.assertEqual(notification.actor, self.mentor_profile)
        self.assertEqual(notification.resource_type, "mentorship_request")

    def test_cancel_match_session_creates_notification(self) -> None:
        # Service import moved to top level

        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=timezone.now() + timedelta(days=5),
            end_at=timezone.now() + timedelta(days=5, hours=1),
        )
        req = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=slot,
        )
        respond_to_mentorship_request(mentorship_request=req, action="accept")

        match = Match.objects.get(request=req)
        session = MeetingSession.objects.filter(match=match).first()
        assert session is not None

        cancel_match_session(
            session=session,
            actor=self.mentee_user,
            actor_profile=self.mentee_profile,
        )

        notifications = Notification.objects.filter(type=NotificationType.SESSION_CANCELED)
        self.assertEqual(notifications.count(), 2)

        mentor_notification = notifications.filter(user=self.mentor_user).first()
        mentee_notification = notifications.filter(user=self.mentee_user).first()
        self.assertIsNotNone(mentor_notification)
        self.assertIsNotNone(mentee_notification)
        assert mentor_notification is not None
        self.assertEqual(mentor_notification.title, "Session Canceled")
        self.assertEqual(mentor_notification.actor, self.mentee_profile)
        self.assertEqual(mentor_notification.resource_type, "meeting_session")

    def test_reschedule_match_session_creates_notification(self) -> None:
        # Service import moved to top level

        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=timezone.now() + timedelta(days=5),
            end_at=timezone.now() + timedelta(days=5, hours=1),
        )
        req = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=slot,
        )
        respond_to_mentorship_request(mentorship_request=req, action="accept")

        match = Match.objects.get(request=req)
        new_slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=timezone.now() + timedelta(days=6),
            end_at=timezone.now() + timedelta(days=6, hours=1),
        )

        reschedule_match_session(match=match, actor=self.mentee_user, new_slot=new_slot)

        notifications = Notification.objects.filter(type=NotificationType.SESSION_RESCHEDULED)
        self.assertEqual(notifications.count(), 2)

        mentor_notification = notifications.filter(user=self.mentor_user).first()
        mentee_notification = notifications.filter(user=self.mentee_user).first()
        self.assertIsNotNone(mentor_notification)
        self.assertIsNotNone(mentee_notification)
        assert mentor_notification is not None
        self.assertEqual(mentor_notification.title, "Session Rescheduled")
        self.assertEqual(mentor_notification.actor, self.mentee_profile)
        self.assertEqual(mentor_notification.resource_type, "meeting_session")

    def test_deactivate_match_creates_notification(self) -> None:
        # Service import moved to top level

        req = _create_accepted_request(mentor=self.mentor_profile, mentee=self.mentee_profile)
        match = Match.objects.get(request=req)

        deactivate_match(match=match, actor_profile=self.mentee_profile)

        notifications = Notification.objects.filter(type=NotificationType.MATCH_DEACTIVATED)
        self.assertEqual(notifications.count(), 2)

        mentor_notification = notifications.filter(user=self.mentor_user).first()
        mentee_notification = notifications.filter(user=self.mentee_user).first()
        self.assertIsNotNone(mentor_notification)
        self.assertIsNotNone(mentee_notification)
        assert mentor_notification is not None
        self.assertEqual(mentor_notification.title, "Match Deactivated")
        self.assertEqual(mentor_notification.actor, self.mentee_profile)
        self.assertEqual(mentor_notification.resource_type, "match")

    def test_feedback_creation_creates_notification(self) -> None:
        # Service import moved to top level

        req = _create_accepted_request(mentor=self.mentor_profile, mentee=self.mentee_profile)
        match = Match.objects.get(request=req)

        create_match_feedback(
            match=match,
            submitted_by=self.mentee_profile,
            rating=5,
            text="Great!",
        )

        notification = Notification.objects.filter(
            user=self.mentor_user, type=NotificationType.NEW_FEEDBACK_AVAILABLE
        ).first()
        self.assertIsNotNone(notification)
        assert notification is not None
        self.assertEqual(notification.title, "New Feedback Available")
        self.assertEqual(notification.actor, self.mentee_profile)
        self.assertEqual(notification.resource_type, "profile")


class MCTEAPITests(FeedbackAPIBaseTestCase):
    """Tests for MCTE CRUD endpoints under /api/mentorship/matches/<match_id>/journey/events/."""

    def setUp(self) -> None:
        super().setUp()
        self.list_url = f"/api/mentorship/matches/{self.match.id}/journey/events/"

    def _event_url(self, event_id) -> str:
        return f"/api/mentorship/matches/{self.match.id}/journey/events/{event_id}/"

    def _make_event(self, client=None, **overrides) -> Any:
        """Helper: POST a valid MCTE and return the response."""
        if client is None:
            client = self.mentor_client
        payload = {
            "event_type": "achievement",
            "content": "Finished React Basics",
            "timestamp": (timezone.now() - timedelta(hours=1)).isoformat(),
            **overrides,
        }
        return client.post(self.list_url, payload, format="json")

    # --- create ---

    def test_create_mcte_by_mentor_returns_201(self) -> None:
        response = self._make_event(self.mentor_client)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["event_type"], "achievement")
        self.assertEqual(response.data["content"], "Finished React Basics")
        self.assertIsNone(response.data["media_url"])
        self.assertEqual(response.data["actor_role"], "mentor")
        self.assertIsNotNone(response.data["author"])

    def test_create_mcte_with_media_url_returns_201(self) -> None:
        response = self._make_event(
            self.mentor_client,
            media_url="https://cdn.example.com/media/progress-1.png",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["media_url"], "https://cdn.example.com/media/progress-1.png")

    def test_create_mcte_by_mentee_returns_201(self) -> None:
        response = self._make_event(self.mentee_client, event_type="social", content="First coffee")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["event_type"], "social")
        self.assertEqual(response.data["actor_role"], "mentee")

    def test_create_mcte_unauthenticated_returns_401(self) -> None:
        response = self._make_event(self.anon_client)
        self.assertEqual(response.status_code, 401)

    def test_create_mcte_outsider_returns_403(self) -> None:
        response = self._make_event(self.other_client)
        self.assertEqual(response.status_code, 403)

    def test_create_mcte_invalid_event_type_returns_400(self) -> None:
        response = self._make_event(event_type="invalid_type")
        self.assertEqual(response.status_code, 400)

    def test_create_mcte_missing_timestamp_returns_201(self) -> None:
        response = self.mentor_client.post(
            self.list_url,
            {"event_type": "achievement", "content": "done"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertIsNotNone(response.data["timestamp"])

    def test_create_mcte_null_timestamp_returns_201(self) -> None:
        response = self._make_event(timestamp=None)
        self.assertEqual(response.status_code, 201)
        self.assertIsNotNone(response.data["timestamp"])

    def test_create_mcte_empty_timestamp_returns_201(self) -> None:
        response = self._make_event(timestamp="")
        self.assertEqual(response.status_code, 201)
        self.assertIsNotNone(response.data["timestamp"])

    def test_create_mcte_far_future_timestamp_returns_400(self) -> None:
        future_ts = (timezone.now() + timedelta(days=5)).isoformat()
        response = self._make_event(timestamp=future_ts)
        self.assertEqual(response.status_code, 400)

    def test_create_mcte_oversize_content_returns_400(self) -> None:
        response = self._make_event(content="x" * 2001)
        self.assertEqual(response.status_code, 400)

    def test_create_mcte_missing_content_returns_400(self) -> None:
        response = self.mentor_client.post(
            self.list_url,
            {
                "event_type": "achievement",
                "timestamp": (timezone.now() - timedelta(hours=1)).isoformat(),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_create_mcte_author_cannot_be_spoofed(self) -> None:
        """author field in request body is ignored; server always derives it."""
        response = self.mentor_client.post(
            self.list_url,
            {
                "event_type": "progress",
                "content": "Ongoing",
                "timestamp": (timezone.now() - timedelta(hours=1)).isoformat(),
                "author": str(self.mentee_profile.id),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        # Author should be mentor, not the spoofed mentee id
        self.assertEqual(response.data["author"]["id"], str(self.mentor_profile.id))

    def test_create_mcte_nonexistent_match_returns_404(self) -> None:
        url = f"/api/mentorship/matches/{uuid.uuid4()}/journey/events/"
        # Use the bad url directly
        response2 = self.mentor_client.post(
            url,
            {"event_type": "achievement", "content": "x", "timestamp": timezone.now().isoformat()},
            format="json",
        )
        self.assertEqual(response2.status_code, 404)

    # --- list ---

    def test_list_mcte_returns_200_for_mentor(self) -> None:
        self._make_event(self.mentor_client)
        response = self.mentor_client.get(self.list_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(len(response.data["results"]), 1)

    def test_list_mcte_returns_200_for_mentee(self) -> None:
        self._make_event(self.mentee_client, event_type="social", content="coffee")
        response = self.mentee_client.get(self.list_url)
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data["count"], 1)

    def test_list_mcte_outsider_returns_403(self) -> None:
        response = self.other_client.get(self.list_url)
        self.assertEqual(response.status_code, 403)

    def test_list_mcte_unauthenticated_returns_401(self) -> None:
        response = self.anon_client.get(self.list_url)
        self.assertEqual(response.status_code, 401)

    def test_list_mcte_filtered_by_event_type(self) -> None:
        self._make_event(self.mentor_client, event_type="achievement")
        self._make_event(self.mentee_client, event_type="social", content="coffee")

        response = self.mentor_client.get(self.list_url, {"event_type": "achievement"})
        self.assertEqual(response.status_code, 200)
        for item in response.data["results"]:
            self.assertEqual(item["event_type"], "achievement")

    def test_list_mcte_excludes_soft_deleted(self) -> None:
        create_resp = self._make_event(self.mentor_client)
        event_id = create_resp.data["id"]
        self.mentor_client.delete(self._event_url(event_id))

        response = self.mentor_client.get(self.list_url)
        self.assertEqual(response.status_code, 200)
        ids = [item["id"] for item in response.data["results"]]
        self.assertNotIn(str(event_id), [str(i) for i in ids])

    # --- edit ---

    def test_edit_mcte_by_author_returns_200(self) -> None:
        create_resp = self._make_event(self.mentor_client)
        event_id = create_resp.data["id"]

        response = self.mentor_client.patch(
            self._event_url(event_id), {"content": "Updated content"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["content"], "Updated content")
        self.assertIsNotNone(response.data["last_edited"])

    def test_edit_mcte_media_url_by_author_returns_200(self) -> None:
        create_resp = self._make_event(self.mentor_client)
        event_id = create_resp.data["id"]

        response = self.mentor_client.patch(
            self._event_url(event_id),
            {"media_url": "https://cdn.example.com/media/progress-2.png"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["media_url"], "https://cdn.example.com/media/progress-2.png")

    def test_edit_mcte_media_url_can_be_cleared(self) -> None:
        create_resp = self._make_event(
            self.mentor_client,
            media_url="https://cdn.example.com/media/progress-3.png",
        )
        event_id = create_resp.data["id"]

        response = self.mentor_client.patch(
            self._event_url(event_id),
            {"media_url": None},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["media_url"])

    def test_edit_mcte_by_non_author_returns_403(self) -> None:
        create_resp = self._make_event(self.mentor_client)
        event_id = create_resp.data["id"]

        response = self.mentee_client.patch(
            self._event_url(event_id), {"content": "Hijacked"}, format="json"
        )
        self.assertEqual(response.status_code, 403)

    def test_edit_mcte_empty_body_returns_400(self) -> None:
        create_resp = self._make_event(self.mentor_client)
        event_id = create_resp.data["id"]

        response = self.mentor_client.patch(self._event_url(event_id), {}, format="json")
        self.assertEqual(response.status_code, 400)

    # --- delete ---

    def test_delete_mcte_by_author_returns_204(self) -> None:
        create_resp = self._make_event(self.mentor_client)
        event_id = create_resp.data["id"]

        response = self.mentor_client.delete(self._event_url(event_id))
        self.assertEqual(response.status_code, 204)

        from timeline.models import TimelineEvent

        event = TimelineEvent.objects.get(id=event_id)
        self.assertTrue(event.is_deleted)

    def test_delete_mcte_by_non_author_returns_403(self) -> None:
        create_resp = self._make_event(self.mentor_client)
        event_id = create_resp.data["id"]

        response = self.mentee_client.delete(self._event_url(event_id))
        self.assertEqual(response.status_code, 403)

    def test_delete_mcte_makes_event_unavailable(self) -> None:
        create_resp = self._make_event(self.mentor_client)
        event_id = create_resp.data["id"]
        self.mentor_client.delete(self._event_url(event_id))

        # Subsequent PATCH on deleted event returns 404
        response = self.mentor_client.patch(
            self._event_url(event_id), {"content": "ghost"}, format="json"
        )
        self.assertEqual(response.status_code, 404)

    # --- journey feed integration ---

    def test_journey_feed_includes_mcte_events(self) -> None:
        self._make_event(self.mentor_client)
        journey_url = f"/api/mentorship/matches/{self.match.id}/journey/"
        response = self.mentor_client.get(journey_url)
        self.assertEqual(response.status_code, 200)
        categories = [e.get("category") for e in response.data["results"]]
        self.assertIn("MCTE", categories)

    def test_soft_deleted_mcte_excluded_from_journey_feed(self) -> None:
        create_resp = self._make_event(self.mentor_client)
        event_id = create_resp.data["id"]
        self.mentor_client.delete(self._event_url(event_id))

        journey_url = f"/api/mentorship/matches/{self.match.id}/journey/"
        response = self.mentor_client.get(journey_url)
        self.assertEqual(response.status_code, 200)
        ids = [e.get("id") for e in response.data["results"]]
        # source_id starts with "mcte:" prefix
        mcte_ids = [i for i in ids if str(i).startswith("mcte:")]
        self.assertEqual(len(mcte_ids), 0)
