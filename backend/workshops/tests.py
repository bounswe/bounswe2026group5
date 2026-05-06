"""Tests for workshop domain models and API endpoints."""

from datetime import timedelta
from typing import Any

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import AppUsageMode
from profiles.models import AvailabilitySlot, Profile

from .models import Workshop, WorkshopParticipation

User: Any = get_user_model()


def _token_for(user: Any) -> str:
    return str(RefreshToken.for_user(user).access_token)


def _future(hours: int) -> timezone.datetime:
    return timezone.now() + timedelta(hours=hours)


class WorkshopModelTests(TestCase):
    """Constraint-level coverage for Workshop and WorkshopParticipation."""

    def setUp(self) -> None:
        mentor_user = User.objects.create_user(
            email="mentor.model@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
            is_email_verified=True,
        )
        self.mentor = Profile.objects.create(user=mentor_user, display_name="Mentor M")
        mentee_user = User.objects.create_user(
            email="mentee.model@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
            is_email_verified=True,
        )
        self.mentee = Profile.objects.create(user=mentee_user, display_name="Mentee M")

    def test_end_must_be_after_start(self) -> None:
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Workshop.objects.create(
                    mentor=self.mentor,
                    title="Bad",
                    scheduled_start_at_utc=_future(2),
                    scheduled_end_at_utc=_future(1),
                    min_participants=1,
                    max_participants=5,
                )

    def test_max_must_be_gte_min(self) -> None:
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Workshop.objects.create(
                    mentor=self.mentor,
                    title="Bad",
                    scheduled_start_at_utc=_future(1),
                    scheduled_end_at_utc=_future(2),
                    min_participants=5,
                    max_participants=2,
                )

    def test_min_must_be_at_least_one(self) -> None:
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Workshop.objects.create(
                    mentor=self.mentor,
                    title="Bad",
                    scheduled_start_at_utc=_future(1),
                    scheduled_end_at_utc=_future(2),
                    min_participants=0,
                    max_participants=5,
                )

    def test_unique_participation_per_mentee_workshop(self) -> None:
        workshop = Workshop.objects.create(
            mentor=self.mentor,
            title="W",
            scheduled_start_at_utc=_future(1),
            scheduled_end_at_utc=_future(2),
            min_participants=1,
            max_participants=10,
        )
        WorkshopParticipation.objects.create(workshop=workshop, mentee=self.mentee)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                WorkshopParticipation.objects.create(workshop=workshop, mentee=self.mentee)


class WorkshopAPIBaseTestCase(TestCase):
    """Shared fixtures for the /api/workshops/ endpoints."""

    LIST_URL = "/api/workshops/"

    def setUp(self) -> None:
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
            display_name="Mentor API",
        )
        self.mentee_profile = Profile.objects.create(
            user=self.mentee_user,
            display_name="Mentee API",
        )
        self.other_profile = Profile.objects.create(
            user=self.other_user,
            display_name="Other API",
        )

        self.mentor_client = APIClient()
        self.mentee_client = APIClient()
        self.other_client = APIClient()
        self.anon_client = APIClient()
        self.mentor_client.credentials(HTTP_AUTHORIZATION=f"Bearer {_token_for(self.mentor_user)}")
        self.mentee_client.credentials(HTTP_AUTHORIZATION=f"Bearer {_token_for(self.mentee_user)}")
        self.other_client.credentials(HTTP_AUTHORIZATION=f"Bearer {_token_for(self.other_user)}")

    def _create_workshop(self, **overrides) -> Workshop:
        defaults = dict(
            mentor=self.mentor_profile,
            title="Intro to Backend",
            description="",
            scheduled_start_at_utc=_future(24),
            scheduled_end_at_utc=_future(25),
            min_participants=1,
            max_participants=5,
        )
        defaults.update(overrides)
        return Workshop.objects.create(**defaults)


class WorkshopCreateAPITests(WorkshopAPIBaseTestCase):
    """POST /api/workshops/."""

    def _payload(self, **overrides) -> dict:
        body = {
            "title": "Payments 101",
            "description": "Learn payments.",
            "scheduled_start_at_utc": _future(48).isoformat(),
            "scheduled_end_at_utc": _future(49).isoformat(),
            "min_participants": 2,
            "max_participants": 8,
        }
        body.update(overrides)
        return body

    def test_anonymous_cannot_create(self) -> None:
        response = self.anon_client.post(self.LIST_URL, self._payload(), format="json")
        self.assertEqual(response.status_code, 401)

    def test_non_mentor_cannot_create(self) -> None:
        response = self.mentee_client.post(self.LIST_URL, self._payload(), format="json")
        self.assertEqual(response.status_code, 403)

    def test_mentor_can_create(self) -> None:
        response = self.mentor_client.post(self.LIST_URL, self._payload(), format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Workshop.objects.count(), 1)
        workshop = Workshop.objects.first()
        self.assertEqual(workshop.mentor_id, self.mentor_profile.id)

    def test_past_schedule_rejected(self) -> None:
        payload = self._payload(
            scheduled_start_at_utc=(timezone.now() - timedelta(hours=1)).isoformat(),
            scheduled_end_at_utc=(timezone.now() + timedelta(hours=1)).isoformat(),
        )
        response = self.mentor_client.post(self.LIST_URL, payload, format="json")
        self.assertEqual(response.status_code, 400)

    def test_end_before_start_rejected(self) -> None:
        payload = self._payload(
            scheduled_start_at_utc=_future(50).isoformat(),
            scheduled_end_at_utc=_future(49).isoformat(),
        )
        response = self.mentor_client.post(self.LIST_URL, payload, format="json")
        self.assertEqual(response.status_code, 400)

    def test_max_below_min_rejected(self) -> None:
        payload = self._payload(min_participants=5, max_participants=2)
        response = self.mentor_client.post(self.LIST_URL, payload, format="json")
        self.assertEqual(response.status_code, 400)

    def test_overlap_with_availability_slot_conflicts(self) -> None:
        AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=_future(48),
            end_at=_future(50),
        )
        response = self.mentor_client.post(self.LIST_URL, self._payload(), format="json")
        self.assertEqual(response.status_code, 409)

    def test_overlap_with_existing_workshop_conflicts(self) -> None:
        self._create_workshop(
            scheduled_start_at_utc=_future(48),
            scheduled_end_at_utc=_future(50),
        )
        response = self.mentor_client.post(self.LIST_URL, self._payload(), format="json")
        self.assertEqual(response.status_code, 409)


class WorkshopReadAPITests(WorkshopAPIBaseTestCase):
    """GET /api/workshops/ and /api/workshops/{id}/ are public."""

    def test_anonymous_can_list(self) -> None:
        self._create_workshop()
        response = self.anon_client.get(self.LIST_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_anonymous_can_view_detail(self) -> None:
        workshop = self._create_workshop()
        response = self.anon_client.get(f"{self.LIST_URL}{workshop.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["title"], workshop.title)

    def test_unknown_id_returns_404(self) -> None:
        response = self.anon_client.get(
            "/api/workshops/00000000-0000-0000-0000-000000000000/"
        )
        self.assertEqual(response.status_code, 404)

    def test_status_filter(self) -> None:
        self._create_workshop()
        self._create_workshop(
            scheduled_start_at_utc=_future(72),
            scheduled_end_at_utc=_future(73),
            status=Workshop.Status.CANCELED,
        )
        response = self.anon_client.get(f"{self.LIST_URL}?status=SCHEDULED")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)


class WorkshopUpdateAPITests(WorkshopAPIBaseTestCase):
    """PATCH /api/workshops/{id}/."""

    def test_owner_can_update(self) -> None:
        workshop = self._create_workshop()
        response = self.mentor_client.patch(
            f"{self.LIST_URL}{workshop.id}/",
            {"title": "Renamed"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        workshop.refresh_from_db()
        self.assertEqual(workshop.title, "Renamed")

    def test_non_owner_cannot_update(self) -> None:
        workshop = self._create_workshop()
        response = self.mentee_client.patch(
            f"{self.LIST_URL}{workshop.id}/",
            {"title": "Hax"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_anonymous_cannot_update(self) -> None:
        workshop = self._create_workshop()
        response = self.anon_client.patch(
            f"{self.LIST_URL}{workshop.id}/",
            {"title": "Hax"},
            format="json",
        )
        self.assertEqual(response.status_code, 401)


class WorkshopJoinAPITests(WorkshopAPIBaseTestCase):
    """POST /api/workshops/{id}/join/."""

    def _join_url(self, workshop_id) -> str:
        return f"{self.LIST_URL}{workshop_id}/join/"

    def test_mentee_can_join(self) -> None:
        workshop = self._create_workshop(max_participants=2)
        response = self.mentee_client.post(self._join_url(workshop.id))
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], WorkshopParticipation.Status.CONFIRMED)

    def test_double_join_rejected(self) -> None:
        workshop = self._create_workshop()
        self.mentee_client.post(self._join_url(workshop.id))
        response = self.mentee_client.post(self._join_url(workshop.id))
        self.assertEqual(response.status_code, 409)

    def test_full_workshop_rejected(self) -> None:
        workshop = self._create_workshop(max_participants=1)
        WorkshopParticipation.objects.create(
            workshop=workshop,
            mentee=self.other_profile,
            group_size=1,
            status=WorkshopParticipation.Status.CONFIRMED,
        )
        response = self.mentee_client.post(self._join_url(workshop.id))
        self.assertEqual(response.status_code, 400)

    def test_mentor_cannot_join_own_workshop(self) -> None:
        workshop = self._create_workshop()
        response = self.mentor_client.post(self._join_url(workshop.id))
        self.assertEqual(response.status_code, 403)


class WorkshopGroupJoinAPITests(WorkshopAPIBaseTestCase):
    """POST /api/workshops/{id}/join-group/."""

    def _group_url(self, workshop_id) -> str:
        return f"{self.LIST_URL}{workshop_id}/join-group/"

    def test_group_request_creates_pending(self) -> None:
        workshop = self._create_workshop(max_participants=10)
        response = self.mentee_client.post(
            self._group_url(workshop.id),
            {"group_size": 3},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            response.data["status"],
            WorkshopParticipation.Status.PENDING_APPROVAL,
        )
        self.assertEqual(response.data["group_size"], 3)

    def test_group_size_must_be_at_least_two(self) -> None:
        workshop = self._create_workshop()
        response = self.mentee_client.post(
            self._group_url(workshop.id),
            {"group_size": 1},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_group_size_above_max_rejected(self) -> None:
        workshop = self._create_workshop(max_participants=3)
        response = self.mentee_client.post(
            self._group_url(workshop.id),
            {"group_size": 5},
            format="json",
        )
        self.assertEqual(response.status_code, 400)


class WorkshopRespondAPITests(WorkshopAPIBaseTestCase):
    """POST /api/workshops/{id}/participations/{participation_id}/respond/."""

    def _respond_url(self, workshop_id, participation_id) -> str:
        return f"{self.LIST_URL}{workshop_id}/participations/{participation_id}/respond/"

    def _create_pending(self, workshop, mentee, group_size=3) -> WorkshopParticipation:
        return WorkshopParticipation.objects.create(
            workshop=workshop,
            mentee=mentee,
            group_size=group_size,
            status=WorkshopParticipation.Status.PENDING_APPROVAL,
        )

    def test_owner_can_accept(self) -> None:
        workshop = self._create_workshop(max_participants=10)
        pending = self._create_pending(workshop, self.mentee_profile)
        response = self.mentor_client.post(
            self._respond_url(workshop.id, pending.id),
            {"accept": True},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        pending.refresh_from_db()
        self.assertEqual(pending.status, WorkshopParticipation.Status.CONFIRMED)
        self.assertIsNotNone(pending.decided_at)

    def test_owner_can_reject(self) -> None:
        workshop = self._create_workshop()
        pending = self._create_pending(workshop, self.mentee_profile)
        response = self.mentor_client.post(
            self._respond_url(workshop.id, pending.id),
            {"accept": False},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        pending.refresh_from_db()
        self.assertEqual(pending.status, WorkshopParticipation.Status.REJECTED)

    def test_non_owner_cannot_respond(self) -> None:
        workshop = self._create_workshop()
        pending = self._create_pending(workshop, self.mentee_profile)
        response = self.mentee_client.post(
            self._respond_url(workshop.id, pending.id),
            {"accept": True},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_already_decided_cannot_be_responded(self) -> None:
        workshop = self._create_workshop()
        pending = self._create_pending(workshop, self.mentee_profile)
        pending.status = WorkshopParticipation.Status.CONFIRMED
        pending.save()
        response = self.mentor_client.post(
            self._respond_url(workshop.id, pending.id),
            {"accept": True},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_accept_exceeding_capacity_rejected(self) -> None:
        workshop = self._create_workshop(max_participants=4)
        WorkshopParticipation.objects.create(
            workshop=workshop,
            mentee=self.other_profile,
            group_size=3,
            status=WorkshopParticipation.Status.CONFIRMED,
        )
        pending = self._create_pending(workshop, self.mentee_profile, group_size=3)
        response = self.mentor_client.post(
            self._respond_url(workshop.id, pending.id),
            {"accept": True},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        pending.refresh_from_db()
        self.assertEqual(pending.status, WorkshopParticipation.Status.PENDING_APPROVAL)
