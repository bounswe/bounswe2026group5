"""Tests for mentorship domain models and API endpoints."""

from datetime import timedelta
from typing import Any

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import AppUsageMode
from mentorship.models import Match, MentorshipRequest
from profiles.models import AvailabilitySlot, Profile

User: Any = get_user_model()


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

    def test_match_auto_created_on_accept(self) -> None:
        """A match is automatically created when request status becomes ACCEPTED."""
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.PENDING,
        )
        self.assertFalse(Match.objects.filter(request=request_obj).exists())

        request_obj.status = MentorshipRequest.Status.ACCEPTED
        request_obj.save()

        self.assertTrue(Match.objects.filter(request=request_obj).exists())
        match = Match.objects.get(request=request_obj)
        self.assertEqual(match.mentor, self.mentor_profile)
        self.assertEqual(match.mentee, self.mentee_profile)
        self.assertTrue(match.is_active)

    def test_match_not_duplicated_on_repeated_accept_saves(self) -> None:
        """Repeated saves in ACCEPTED state do not create duplicate matches."""
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.ACCEPTED,
        )

        request_obj.save()
        request_obj.save()

        self.assertEqual(Match.objects.filter(request=request_obj).count(), 1)

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


def _token_for(user: Any) -> str:
    """Return a JWT access token string for the given user."""
    return str(RefreshToken.for_user(user).access_token)


class MentorshipRequestAPIBaseTestCase(TestCase):
    """Shared fixtures for mentorship API tests."""

    REQUESTS_URL = "/api/mentorship/requests/"
    REQUESTS_ME_URL = "/api/mentorship/requests/me/"
    MATCHES_ME_URL = "/api/mentorship/matches/me/"
    UPCOMING_SESSIONS_ME_URL = "/api/mentorship/sessions/me/upcoming/"

    def setUp(self) -> None:
        """Create mentor and mentee users with matching profiles."""
        from accounts.models import UserRole

        Group.objects.get_or_create(name=UserRole.USER)

        self.mentor_user = User.objects.create_user(
            email="mentor.api@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.mentee_user = User.objects.create_user(
            email="mentee.api@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        self.other_user = User.objects.create_user(
            email="other.api@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
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

    def test_no_requests_returns_empty_list(self) -> None:
        response = self.mentee_client.get(self.REQUESTS_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

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

    def test_user_sees_requests_as_both_parties(self) -> None:
        """BOTH-mode user sees requests where they are mentor or mentee."""
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
        import uuid

        url = self._respond_url(uuid.uuid4())
        response = self.mentor_client.post(url, {"action": "accept"})
        self.assertEqual(response.status_code, 404)


class MyMatchesListAPIViewTests(MentorshipRequestAPIBaseTestCase):
    """Tests for GET /api/mentorship/matches/me/."""

    def test_unauthenticated_returns_401(self) -> None:
        response = self.anon_client.get(self.MATCHES_ME_URL)
        self.assertEqual(response.status_code, 401)

    def test_no_matches_returns_empty_list(self) -> None:
        response = self.mentee_client.get(self.MATCHES_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_accepted_request_appears_in_matches(self) -> None:
        req = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.ACCEPTED,
        )
        response = self.mentee_client.get(self.MATCHES_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(str(response.data[0]["request_id"]), str(req.id))

    def test_mentor_also_sees_match(self) -> None:
        MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.ACCEPTED,
        )
        response = self.mentor_client.get(self.MATCHES_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_inactive_match_excluded(self) -> None:
        req = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.ACCEPTED,
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


class MyUpcomingSessionsListAPIViewTests(MentorshipRequestAPIBaseTestCase):
    """Tests for GET /api/mentorship/sessions/me/upcoming/."""

    def test_unauthenticated_returns_401(self) -> None:
        response = self.anon_client.get(self.UPCOMING_SESSIONS_ME_URL)
        self.assertEqual(response.status_code, 401)

    def test_returns_only_upcoming_sessions_for_current_mentee(self) -> None:
        MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.ACCEPTED,
        )

        self.mentor_slot.mark_booked(self.mentee_user)

        additional_start_at = timezone.now() + timedelta(days=5)
        additional_slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=additional_start_at,
            end_at=additional_start_at + timedelta(hours=1),
        )
        additional_slot.mark_booked(self.mentee_user)

        response = self.mentee_client.get(self.UPCOMING_SESSIONS_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

        returned_slot_ids = {str(item["slot_id"]) for item in response.data}
        self.assertSetEqual(
            returned_slot_ids,
            {str(self.mentor_slot.id), str(additional_slot.id)},
        )
        returned_statuses = {item["status"] for item in response.data}
        self.assertSetEqual(returned_statuses, {MentorshipRequest.Status.ACCEPTED})

    def test_excludes_slots_without_active_match(self) -> None:
        self.other_mentor_slot.mark_booked(self.mentee_user)

        response = self.mentee_client.get(self.UPCOMING_SESSIONS_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_excludes_slots_booked_by_different_user(self) -> None:
        MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.ACCEPTED,
        )
        self.mentor_slot.mark_booked(self.other_user)

        response = self.mentee_client.get(self.UPCOMING_SESSIONS_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_excludes_past_slots(self) -> None:
        MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.ACCEPTED,
        )

        past_start_at = timezone.now() - timedelta(days=2)
        past_slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=past_start_at,
            end_at=past_start_at + timedelta(hours=1),
            is_booked=True,
            booked_by=self.mentee_user,
            booked_at=timezone.now(),
        )

        response = self.mentee_client.get(self.UPCOMING_SESSIONS_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])
        self.assertTrue(AvailabilitySlot.objects.filter(id=past_slot.id).exists())

    def test_excludes_slots_for_inactive_match(self) -> None:
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.ACCEPTED,
        )
        Match.objects.filter(request=request_obj).update(is_active=False)
        self.mentor_slot.mark_booked(self.mentee_user)

        response = self.mentee_client.get(self.UPCOMING_SESSIONS_ME_URL)
        self.assertEqual(response.status_code, 200)


class CancelSessionAPIViewTests(MentorshipRequestAPIBaseTestCase):
    """Tests for POST /api/mentorship/sessions/<match_id>/cancel/"""

    def _setup_active_match_with_booking(self):
        """Create an accepted request with a booked slot and return (match, request_obj)."""
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=self.mentor_slot,
            status=MentorshipRequest.Status.ACCEPTED,
        )
        self.mentor_slot.mark_booked(self.mentee_user)
        match = Match.objects.get(request=request_obj)
        return match, request_obj

    def _cancel_url(self, match_id) -> str:
        return f"/api/mentorship/sessions/{match_id}/cancel/"

    def test_mentee_can_cancel(self) -> None:
        match, _ = self._setup_active_match_with_booking()
        response = self.mentee_client.post(self._cancel_url(match.id))
        self.assertEqual(response.status_code, 200)
        self.mentor_slot.refresh_from_db()
        self.assertFalse(self.mentor_slot.is_booked)

    def test_mentor_can_cancel(self) -> None:
        match, _ = self._setup_active_match_with_booking()
        response = self.mentor_client.post(self._cancel_url(match.id))
        self.assertEqual(response.status_code, 200)
        self.mentor_slot.refresh_from_db()
        self.assertFalse(self.mentor_slot.is_booked)

    def test_slot_reference_cleared_after_cancel(self) -> None:
        match, request_obj = self._setup_active_match_with_booking()
        self.mentee_client.post(self._cancel_url(match.id))
        request_obj.refresh_from_db()
        self.assertIsNone(request_obj.slot)

    def test_unrelated_user_cannot_cancel(self) -> None:
        match, _ = self._setup_active_match_with_booking()
        response = self.other_client.post(self._cancel_url(match.id))
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_returns_401(self) -> None:
        match, _ = self._setup_active_match_with_booking()
        response = self.anon_client.post(self._cancel_url(match.id))
        self.assertEqual(response.status_code, 401)

    def test_cancel_unbooked_slot_returns_400(self) -> None:
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=self.mentor_slot,
            status=MentorshipRequest.Status.ACCEPTED,
        )
        match = Match.objects.get(request=request_obj)
        # Slot is not booked
        response = self.mentee_client.post(self._cancel_url(match.id))
        self.assertEqual(response.status_code, 400)

    def test_nonexistent_match_returns_404(self) -> None:
        import uuid

        response = self.mentee_client.post(self._cancel_url(uuid.uuid4()))
        self.assertEqual(response.status_code, 404)


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
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=self.mentor_slot,
            status=MentorshipRequest.Status.ACCEPTED,
        )
        self.mentor_slot.mark_booked(self.mentee_user)
        match = Match.objects.get(request=request_obj)
        return match, request_obj

    def _reschedule_url(self, match_id) -> str:
        return f"/api/mentorship/sessions/{match_id}/reschedule/"

    def test_mentee_can_reschedule(self) -> None:
        match, _ = self._setup_active_match_with_booking()
        response = self.mentee_client.post(
            self._reschedule_url(match.id),
            {"new_slot_id": str(self.mentor_slot_2.id)},
        )
        self.assertEqual(response.status_code, 200)

    def test_old_slot_freed_after_reschedule(self) -> None:
        match, _ = self._setup_active_match_with_booking()
        self.mentee_client.post(
            self._reschedule_url(match.id),
            {"new_slot_id": str(self.mentor_slot_2.id)},
        )
        self.mentor_slot.refresh_from_db()
        self.assertFalse(self.mentor_slot.is_booked)

    def test_new_slot_booked_after_reschedule(self) -> None:
        match, _ = self._setup_active_match_with_booking()
        self.mentee_client.post(
            self._reschedule_url(match.id),
            {"new_slot_id": str(self.mentor_slot_2.id)},
        )
        self.mentor_slot_2.refresh_from_db()
        self.assertTrue(self.mentor_slot_2.is_booked)

    def test_request_slot_updated_after_reschedule(self) -> None:
        match, request_obj = self._setup_active_match_with_booking()
        self.mentee_client.post(
            self._reschedule_url(match.id),
            {"new_slot_id": str(self.mentor_slot_2.id)},
        )
        request_obj.refresh_from_db()
        self.assertEqual(request_obj.slot, self.mentor_slot_2)

    def test_mentor_cannot_reschedule(self) -> None:
        match, _ = self._setup_active_match_with_booking()
        response = self.mentor_client.post(
            self._reschedule_url(match.id),
            {"new_slot_id": str(self.mentor_slot_2.id)},
        )
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_returns_401(self) -> None:
        match, _ = self._setup_active_match_with_booking()
        response = self.anon_client.post(
            self._reschedule_url(match.id),
            {"new_slot_id": str(self.mentor_slot_2.id)},
        )
        self.assertEqual(response.status_code, 401)

    def test_same_slot_returns_400(self) -> None:
        match, _ = self._setup_active_match_with_booking()
        response = self.mentee_client.post(
            self._reschedule_url(match.id),
            {"new_slot_id": str(self.mentor_slot.id)},
        )
        self.assertEqual(response.status_code, 400)

    def test_slot_belonging_to_different_mentor_returns_404(self) -> None:
        match, _ = self._setup_active_match_with_booking()
        # other_mentor_slot belongs to other_profile, not the match's mentor
        response = self.mentee_client.post(
            self._reschedule_url(match.id),
            {"new_slot_id": str(self.other_mentor_slot.id)},
        )
        self.assertEqual(response.status_code, 404)

    def test_already_booked_slot_returns_400(self) -> None:
        match, _ = self._setup_active_match_with_booking()
        # Book the second slot with someone else
        self.mentor_slot_2.mark_booked(self.other_user)
        response = self.mentee_client.post(
            self._reschedule_url(match.id),
            {"new_slot_id": str(self.mentor_slot_2.id)},
        )
        self.assertEqual(response.status_code, 400)

    def test_failed_reschedule_keeps_existing_booking(self) -> None:
        """Failed reschedule must keep the current slot booking and request slot unchanged."""
        match, request_obj = self._setup_active_match_with_booking()
        self.mentor_slot_2.mark_booked(self.other_user)

        response = self.mentee_client.post(
            self._reschedule_url(match.id),
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
        import uuid

        response = self.mentee_client.post(
            self._reschedule_url(uuid.uuid4()),
            {"new_slot_id": str(self.mentor_slot_2.id)},
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["detail"], "Not found.")
