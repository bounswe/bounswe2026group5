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

from django.test import override_settings

from accounts.models import AppUsageMode
from mentorship.models import Feedback, Match, MentorshipRequest
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
    PAST_SESSIONS_ME_URL = "/api/mentorship/sessions/me/past/"

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
        self.assertEqual(response.data, [])


class MyPastSessionsListAPIViewTests(MentorshipRequestAPIBaseTestCase):
    """Tests for GET /api/mentorship/sessions/me/past/."""

    def _create_past_slot(
        self,
        profile: Any,
        booked_by: Any = None,
        days_ago: int = 2,
    ) -> AvailabilitySlot:
        """Create a slot in the past, optionally marked as booked."""
        past_start = timezone.now() - timedelta(days=days_ago)
        kwargs: dict[str, Any] = {
            "profile": profile,
            "start_at": past_start,
            "end_at": past_start + timedelta(hours=1),
        }
        if booked_by is not None:
            kwargs["is_booked"] = True
            kwargs["booked_by"] = booked_by
            kwargs["booked_at"] = timezone.now() - timedelta(days=days_ago + 1)
        return AvailabilitySlot.objects.create(**kwargs)

    def test_unauthenticated_returns_401(self) -> None:
        response = self.anon_client.get(self.PAST_SESSIONS_ME_URL)
        self.assertEqual(response.status_code, 401)

    def test_no_past_sessions_returns_empty_list(self) -> None:
        response = self.mentee_client.get(self.PAST_SESSIONS_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_returns_past_booked_sessions_for_mentee(self) -> None:
        MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.ACCEPTED,
        )
        past_slot = self._create_past_slot(self.mentor_profile, booked_by=self.mentee_user)

        response = self.mentee_client.get(self.PAST_SESSIONS_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(str(response.data[0]["slot_id"]), str(past_slot.id))

    def test_excludes_upcoming_slots(self) -> None:
        MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.ACCEPTED,
        )
        self.mentor_slot.mark_booked(self.mentee_user)

        response = self.mentee_client.get(self.PAST_SESSIONS_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_includes_sessions_from_inactive_match(self) -> None:
        """Past sessions from ended mentorships should still appear."""
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.ACCEPTED,
        )
        Match.objects.filter(request=request_obj).update(is_active=False)
        past_slot = self._create_past_slot(self.mentor_profile, booked_by=self.mentee_user)

        response = self.mentee_client.get(self.PAST_SESSIONS_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(str(response.data[0]["slot_id"]), str(past_slot.id))

    def test_excludes_sessions_without_any_match(self) -> None:
        """Past booked slots from mentors with no match with the caller are excluded."""
        self._create_past_slot(self.mentor_profile, booked_by=self.mentee_user)

        response = self.mentee_client.get(self.PAST_SESSIONS_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_excludes_sessions_booked_by_different_user(self) -> None:
        MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.ACCEPTED,
        )
        self._create_past_slot(self.mentor_profile, booked_by=self.other_user)

        response = self.mentee_client.get(self.PAST_SESSIONS_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_results_ordered_most_recent_first(self) -> None:
        MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.ACCEPTED,
        )
        older_slot = self._create_past_slot(
            self.mentor_profile, booked_by=self.mentee_user, days_ago=5
        )
        recent_slot = self._create_past_slot(
            self.mentor_profile, booked_by=self.mentee_user, days_ago=1
        )

        response = self.mentee_client.get(self.PAST_SESSIONS_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(str(response.data[0]["slot_id"]), str(recent_slot.id))
        self.assertEqual(str(response.data[1]["slot_id"]), str(older_slot.id))


class FeedbackAPIBaseTestCase(MentorshipRequestAPIBaseTestCase):
    """Shared fixtures for feedback API tests: an active match between mentor and mentee."""

    def setUp(self) -> None:
        super().setUp()
        # Create an accepted mentorship request → triggers Match creation.
        self.mentorship_request = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.ACCEPTED,
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
        import uuid
        url = f"/api/mentorship/matches/{uuid.uuid4()}/deactivate/"
        response = self.mentor_client.post(url)
        self.assertEqual(response.status_code, 404)

    def test_deactivated_match_excluded_from_active_list(self) -> None:
        self.mentor_client.post(self.deactivate_url)
        response = self.mentor_client.get(self.MATCHES_ME_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_response_contains_match_data(self) -> None:
        response = self.mentor_client.post(self.deactivate_url)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["is_active"])
        self.assertEqual(str(response.data["id"]), str(self.match.id))


@override_settings(RATING_UPDATE_THRESHOLD=5)
class FeedbackSubmitAndListAPITests(FeedbackAPIBaseTestCase):
    """Tests for POST and GET /api/mentorship/matches/{match_id}/feedback/."""

    def test_unauthenticated_post_returns_401(self) -> None:
        response = self.anon_client.post(self.feedback_url, {"rating": 4}, format="json")
        self.assertEqual(response.status_code, 401)

    def test_unauthenticated_get_returns_401(self) -> None:
        response = self.anon_client.get(self.feedback_url)
        self.assertEqual(response.status_code, 401)

    def test_nonexistent_match_post_returns_404(self) -> None:
        import uuid
        url = f"/api/mentorship/matches/{uuid.uuid4()}/feedback/"
        response = self.mentee_client.post(url, {"rating": 4}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_nonexistent_match_get_returns_404(self) -> None:
        import uuid
        url = f"/api/mentorship/matches/{uuid.uuid4()}/feedback/"
        response = self.mentee_client.get(url)
        self.assertEqual(response.status_code, 404)

    def test_unrelated_user_cannot_submit_feedback(self) -> None:
        response = self.other_client.post(self.feedback_url, {"rating": 3}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_unrelated_user_cannot_view_feedback(self) -> None:
        response = self.other_client.get(self.feedback_url)
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
        from decimal import Decimal

        # Use two different mentees to avoid duplicate feedback constraint.
        second_mentee_user = User.objects.create_user(
            email="mentee2.feedback@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        second_mentee_profile = Profile.objects.create(
            user=second_mentee_user, display_name="Second Mentee"
        )
        second_request = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=second_mentee_profile,
            status=MentorshipRequest.Status.ACCEPTED,
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


class MentorUpcomingSessionsListAPIViewTests(MentorshipRequestAPIBaseTestCase):
    """Tests for GET /api/mentorship/sessions/mentor/upcoming/."""

    MENTOR_UPCOMING_SESSIONS_URL = "/api/mentorship/sessions/mentor/upcoming/"

    def test_unauthenticated_returns_401(self) -> None:
        response = self.anon_client.get(self.MENTOR_UPCOMING_SESSIONS_URL)
        self.assertEqual(response.status_code, 401)

    def test_mentee_only_user_returns_403(self) -> None:
        response = self.mentee_client.get(self.MENTOR_UPCOMING_SESSIONS_URL)
        self.assertEqual(response.status_code, 403)

    def test_no_booked_slots_returns_empty_list(self) -> None:
        response = self.mentor_client.get(self.MENTOR_UPCOMING_SESSIONS_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_returns_upcoming_booked_slots_for_mentor(self) -> None:
        self.mentor_slot.mark_booked(self.mentee_user)

        response = self.mentor_client.get(self.MENTOR_UPCOMING_SESSIONS_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(str(response.data[0]["slot_id"]), str(self.mentor_slot.id))

    def test_response_includes_mentee_info(self) -> None:
        self.mentor_slot.mark_booked(self.mentee_user)

        response = self.mentor_client.get(self.MENTOR_UPCOMING_SESSIONS_URL)
        self.assertEqual(response.status_code, 200)
        mentee_data = response.data[0]["mentee"]
        self.assertEqual(mentee_data["username"], self.mentee_profile.username)
        self.assertEqual(mentee_data["display_name"], self.mentee_profile.display_name)

    def test_excludes_unbooked_slots(self) -> None:
        # mentor_slot is unbooked by default
        response = self.mentor_client.get(self.MENTOR_UPCOMING_SESSIONS_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_excludes_past_booked_slots(self) -> None:
        past_start = timezone.now() - timedelta(days=2)
        AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=past_start,
            end_at=past_start + timedelta(hours=1),
            is_booked=True,
            booked_by=self.mentee_user,
            booked_at=timezone.now() - timedelta(days=3),
        )

        response = self.mentor_client.get(self.MENTOR_UPCOMING_SESSIONS_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_excludes_slots_owned_by_other_mentor(self) -> None:
        self.other_mentor_slot.mark_booked(self.mentee_user)

        response = self.mentor_client.get(self.MENTOR_UPCOMING_SESSIONS_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_results_ordered_by_start_time_ascending(self) -> None:
        self.mentor_slot.mark_booked(self.mentee_user)

        later_start = timezone.now() + timedelta(days=10)
        later_slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=later_start,
            end_at=later_start + timedelta(hours=1),
        )
        later_slot.mark_booked(self.mentee_user)

        response = self.mentor_client.get(self.MENTOR_UPCOMING_SESSIONS_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(str(response.data[0]["slot_id"]), str(self.mentor_slot.id))
        self.assertEqual(str(response.data[1]["slot_id"]), str(later_slot.id))

    def test_response_contains_expected_fields(self) -> None:
        self.mentor_slot.mark_booked(self.mentee_user)

        response = self.mentor_client.get(self.MENTOR_UPCOMING_SESSIONS_URL)
        self.assertEqual(response.status_code, 200)
        item = response.data[0]
        for field in ("slot_id", "mentee", "slot_date", "slot_start_time", "slot_end_time", "booked_at"):
            self.assertIn(field, item)


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
