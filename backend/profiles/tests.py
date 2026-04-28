"""Tests for profiles domain models."""

import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, cast
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import serializers
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import AppUsageMode
from mentorship.models import Feedback, Match, MentorshipRequest
from profiles.models import AvailabilitySlot, Profile, Skill
from profiles.serializers import AvailabilitySlotSerializer, LocationField
from profiles.services import (
    BookingCancelNotAllowedError,
    OwnSlotBookingError,
    SlotAlreadyBookedError,
    SlotInPastError,
    SlotNotBookedError,
    book_availability_slot,
    cancel_availability_booking,
)
from profiles.views import PublicMentorProfilesSearchListAPIView

User: Any = get_user_model()


class ProfileModelsTests(TestCase):
    """Unit tests for profile page models and constraints."""

    def setUp(self) -> None:
        """Create test users, profiles, and a sample expertise record."""
        self.mentor_user = User.objects.create_user(
            email="mentor@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.mentee_user = User.objects.create_user(
            email="mentee@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )

        self.mentor_profile = Profile.objects.create(
            user=self.mentor_user,
            display_name="Mentor User",
        )
        self.mentee_profile = Profile.objects.create(
            user=self.mentee_user,
            display_name="Mentee User",
        )

    def test_profile_skills_array(self) -> None:
        """Profile can store skills as a list of strings."""
        self.mentor_profile.skills = ["JavaScript", "React"]
        self.mentor_profile.save()
        self.mentor_profile.refresh_from_db()

        self.assertEqual(len(self.mentor_profile.skills), 2)
        self.assertIn("JavaScript", self.mentor_profile.skills)

    def test_profile_username_is_unique_for_same_email_prefix(self) -> None:
        """Profiles with same email local-part receive unique usernames."""
        first_user = User.objects.create_user(
            email="sam@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        second_user = User.objects.create_user(
            email="sam@anotherdomain.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )

        first_profile = Profile.objects.create(
            user=first_user,
            display_name="Sam One",
        )
        second_profile = Profile.objects.create(
            user=second_user,
            display_name="Sam Two",
        )

        self.assertEqual(first_profile.username, "sam")
        self.assertEqual(second_profile.username, "sam_1")

    def test_availability_slot_end_after_start_constraint(self) -> None:
        """Availability slot end time must be after start time."""
        start_at = timezone.now()
        end_at = start_at - timedelta(hours=1)

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                AvailabilitySlot.objects.create(
                    profile=self.mentor_profile,
                    start_at=start_at,
                    end_at=end_at,
                )

    def test_availability_slot_mark_booked_and_available(self) -> None:
        """Availability helper methods toggle booking status."""
        start_at = timezone.now() + timedelta(days=1)
        end_at = start_at + timedelta(hours=1)

        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=start_at,
            end_at=end_at,
        )

        slot.mark_booked()
        slot.refresh_from_db()
        self.assertTrue(slot.is_booked)

        slot.mark_available()
        slot.refresh_from_db()
        self.assertFalse(slot.is_booked)

    def test_availability_slot_overlapping_range_rejected(self) -> None:
        """Overlapping availability slots are rejected for same profile."""
        first_start = timezone.now() + timedelta(days=2)
        first_end = first_start + timedelta(hours=2)
        AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=first_start,
            end_at=first_end,
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                AvailabilitySlot.objects.create(
                    profile=self.mentor_profile,
                    start_at=first_start + timedelta(hours=1),
                    end_at=first_end + timedelta(hours=1),
                )

    def test_availability_slot_adjacent_range_allowed(self) -> None:
        """Adjacent slots are allowed when one ends exactly when next starts."""
        first_start = timezone.now() + timedelta(days=3)
        first_end = first_start + timedelta(hours=1)
        AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=first_start,
            end_at=first_end,
        )

        adjacent_slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=first_end,
            end_at=first_end + timedelta(hours=1),
        )

        self.assertIsNotNone(adjacent_slot.id)

    def test_skill_string_representation(self) -> None:
        """Skill string representation returns the skill name."""
        skill = Skill.objects.create(name="TypeScript")

        self.assertEqual(str(skill), "TypeScript")

    def test_profile_string_representation(self) -> None:
        """Profile string representation includes display name and user email."""
        self.assertEqual(
            str(self.mentor_profile),
            f"{self.mentor_profile.display_name} ({self.mentor_user.email})",
        )

    def test_availability_slot_string_representation(self) -> None:
        """Availability slot string representation includes owner display name and timestamp."""
        start_at = timezone.now() + timedelta(days=2)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=start_at,
            end_at=start_at + timedelta(hours=1),
        )

        text = str(slot)
        self.assertIn(self.mentor_profile.display_name, text)
        self.assertIn(slot.start_at.isoformat(), text)


class ProfileByUsernameAPIViewTests(TestCase):
    """Integration tests for username-scoped profile self-service endpoint."""

    def setUp(self) -> None:
        """Create users, profiles, and authenticated API clients."""
        self.api_client: Any = APIClient()

        self.owner_user = User.objects.create_user(
            email="owner@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        self.owner_profile = Profile.objects.create(
            user=self.owner_user,
            username="owner_user",
            display_name="Owner User",
        )

        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.other_profile = Profile.objects.create(
            user=self.other_user,
            username="other_user",
            display_name="Other User",
            is_visible=False,
        )

        self.public_user = User.objects.create_user(
            email="public@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        self.public_profile = Profile.objects.create(
            user=self.public_user,
            username="public_user",
            display_name="Public User",
            is_visible=True,
        )

        owner_refresh = RefreshToken.for_user(self.owner_user)
        self.owner_access_token = str(owner_refresh.access_token)

        self.owner_url = f"/api/profiles/{self.owner_profile.username}/"
        self.other_url = f"/api/profiles/{self.other_profile.username}/"
        self.public_url = f"/api/profiles/{self.public_profile.username}/"
        self.me_url = "/api/profiles/me/"

    def test_get_profile_success(self) -> None:
        """Authenticated user can get own profile by username."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.owner_access_token}")

        response = self.api_client.get(self.owner_url)

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        # Mentee profile response shape
        self.assertIn("full_name", payload)
        self.assertEqual(payload["full_name"], "Owner User")
        self.assertIn("skills", payload)

    def test_get_profile_success_via_me_endpoint(self) -> None:
        """Authenticated user can get own profile by canonical me route."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.owner_access_token}")

        response = self.api_client.get(self.me_url)

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("full_name", payload)
        self.assertEqual(payload["full_name"], "Owner User")

    def test_get_profile_fallback_shape_when_mode_is_blank(self) -> None:
        """Blank app usage mode falls back to generic profile response serializer."""
        self.owner_user.app_usage_mode = ""
        self.owner_user.save(update_fields=["app_usage_mode"])
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.owner_access_token}")

        response = self.api_client.get(self.owner_url)

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("username", payload)
        self.assertNotIn("full_name", payload)
        self.assertEqual(payload["app_usage_mode"], "")

    def test_get_mentor_profile_returns_mentor_shape(self) -> None:
        """Mentor profile returns mentor-specific fields."""
        self.other_profile.is_visible = True
        self.other_profile.title = "Senior Backend Mentor"
        self.other_profile.save()

        response = self.api_client.get(self.other_url)

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("full_name", payload)
        self.assertIn("title", payload)
        self.assertEqual(payload["title"], "Senior Backend Mentor")
        self.assertIn("skills", payload)
        self.assertIn("average_rating", payload)
        self.assertIn("total_mentee_count", payload)

    def test_get_profile_public_access_without_authentication(self) -> None:
        """Public profile is accessible without authentication."""
        response = self.api_client.get(self.public_url)

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        # Mentee profile shape
        self.assertIn("full_name", payload)

    def test_get_profile_private_returns_404_without_authentication(self) -> None:
        """Private profile remains hidden for unauthenticated requests."""
        response = self.api_client.get(self.other_url)

        self.assertEqual(response.status_code, 404)

    def test_get_profile_returns_404_for_non_owner(self) -> None:
        """Authenticated users cannot fetch another private profile by username."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.owner_access_token}")

        response = self.api_client.get(self.other_url)

        self.assertEqual(response.status_code, 404)

    def test_get_profile_returns_200_for_other_public_profile(self) -> None:
        """Authenticated users can fetch another user's public profile."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.owner_access_token}")

        response = self.api_client.get(self.public_url)

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("full_name", payload)

    def test_get_profile_returns_404_for_missing_profile(self) -> None:
        """Endpoint returns 404 when username does not map to owned profile."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.owner_access_token}")

        response = self.api_client.get("/api/profiles/missing-user/")

        self.assertEqual(response.status_code, 404)

    def test_patch_profile_success_via_me_endpoint(self) -> None:
        """Authenticated user can patch own profile by canonical me route."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.owner_access_token}")

        response = self.api_client.patch(
            self.me_url,
            {"display_name": "Owner Via Me", "bio": "Updated via me route"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.owner_profile.refresh_from_db()
        self.assertEqual(self.owner_profile.display_name, "Owner Via Me")
        self.assertEqual(self.owner_profile.bio, "Updated via me route")

    def test_patch_profile_accepts_blank_location(self) -> None:
        """Blank string location is accepted and normalized to null."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.owner_access_token}")

        response = self.api_client.patch(
            self.me_url,
            {"location": ""},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.owner_profile.refresh_from_db()
        self.assertIsNone(self.owner_profile.location)

    def test_patch_mentee_profile_skills_with_eager_to_learn(self) -> None:
        """Mentees can patch skills using canonical skills field."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.owner_access_token}")

        response = self.api_client.patch(
            self.me_url,
            {"skills": ["Data Science", "Machine Learning"]},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.owner_profile.refresh_from_db()
        self.assertEqual(self.owner_profile.skills, ["Data Science", "Machine Learning"])

    def test_patch_mentor_profile_skills_with_expertises(self) -> None:
        """Mentors can patch skills using canonical skills field."""
        mentor_refresh = RefreshToken.for_user(self.other_user)
        mentor_access_token = str(mentor_refresh.access_token)
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {mentor_access_token}")

        response = self.api_client.patch(
            "/api/profiles/me/",
            {"skills": ["System Design", "Python"]},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.other_profile.refresh_from_db()
        self.assertEqual(self.other_profile.skills, ["System Design", "Python"])

    def test_patch_profile_requires_authentication(self) -> None:
        """PATCH endpoint returns 401 when request is unauthenticated."""
        response = self.api_client.patch(
            self.me_url,
            {"display_name": "No Auth"},
        )

        self.assertEqual(response.status_code, 401)

    def test_get_me_profile_returns_404_when_profile_missing(self) -> None:
        """Canonical me GET returns 404 for authenticated users without profile."""
        no_profile_user = User.objects.create_user(
            email="no-profile-me-get@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        access_token = str(RefreshToken.for_user(no_profile_user).access_token)
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        response = self.api_client.get(self.me_url)

        self.assertEqual(response.status_code, 404)

    def test_patch_me_profile_returns_404_when_profile_missing(self) -> None:
        """Canonical me PATCH returns 404 for authenticated users without profile."""
        no_profile_user = User.objects.create_user(
            email="no-profile-me-patch@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        access_token = str(RefreshToken.for_user(no_profile_user).access_token)
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        response = self.api_client.patch(
            self.me_url,
            {"display_name": "Should Not Persist"},
            format="json",
        )

        self.assertEqual(response.status_code, 404)


class ProfileUsernameUpdateTests(TestCase):
    """Integration tests for username update endpoints."""

    def setUp(self) -> None:
        """Create test user, profile, and authenticated client."""
        self.api_client: Any = APIClient()
        self.user = User.objects.create_user(
            email="username-update@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        # Profile is created by RegisterSerializer logic if called via view,
        # but here we ensure it exists for the model tests.
        self.profile = Profile.objects.create(
            user=self.user,
            display_name="Username Update User",
        )

        self.access_token = str(RefreshToken.for_user(self.user).access_token)
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

        self.me_url = "/api/profiles/me/"
        self.username_url = "/api/profiles/me/username/"

    def test_patch_username_via_me_endpoint_success(self) -> None:
        """User can change username via the general profile me endpoint."""
        new_username = "new_cool_username"
        response = self.api_client.patch(
            self.me_url,
            {"username": new_username},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.profile.refresh_from_db()

        self.assertEqual(self.user.username, new_username)
        self.assertEqual(self.profile.username, new_username)

    def test_patch_username_via_dedicated_endpoint_success(self) -> None:
        """User can change username via the dedicated me/username endpoint."""
        new_username = "dedicated_username"
        response = self.api_client.patch(
            self.username_url,
            {"username": new_username},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.profile.refresh_from_db()

        self.assertEqual(self.user.username, new_username)
        self.assertEqual(self.profile.username, new_username)

    def test_patch_username_validation_error_taken(self) -> None:
        """User cannot change username to one that is already taken."""
        User.objects.create_user(
            email="other@example.com",
            password="SecurePass123",
            username="taken_username",
        )

        response = self.api_client.patch(
            self.username_url,
            {"username": "taken_username"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("username", response.json())

    def test_patch_username_validation_error_invalid_chars(self) -> None:
        """User cannot change username to one with invalid characters."""
        response = self.api_client.patch(
            self.username_url,
            {"username": "invalid username!"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("username", response.json())


class SkillListAPIViewTests(TestCase):
    """Tests for GET /api/profiles/skills/ endpoint."""

    def setUp(self) -> None:
        self.api_client: Any = APIClient()
        self.url = "/api/profiles/skills/"

        Skill.objects.create(name="Python")
        Skill.objects.create(name="JavaScript")
        Skill.objects.create(name="Django")

    def test_list_skills_success(self) -> None:
        """Anyone can fetch the list of skills."""
        response = self.api_client.get(self.url)

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 3)

        # Should be ordered by name
        self.assertEqual(payload[0]["name"], "Django")
        self.assertEqual(payload[1]["name"], "JavaScript")
        self.assertEqual(payload[2]["name"], "Python")

        self.assertIn("id", payload[0])


class AvailabilitySlotAPIViewTests(TestCase):
    """Integration tests for mentor availability slot CRUD endpoints."""

    def setUp(self) -> None:
        """Create mentor/mentee users and authenticate API clients."""
        self.api_client: Any = APIClient()

        self.mentor_user = User.objects.create_user(
            email="mentor-slots@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.mentor_profile = Profile.objects.create(
            user=self.mentor_user,
            display_name="Mentor Slots",
        )

        self.other_mentor_user = User.objects.create_user(
            email="other-mentor@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.other_mentor_profile = Profile.objects.create(
            user=self.other_mentor_user,
            display_name="Other Mentor",
        )

        self.mentee_user = User.objects.create_user(
            email="mentee-slots@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        self.mentee_profile = Profile.objects.create(
            user=self.mentee_user,
            display_name="Mentee Slots",
        )

        mentor_refresh = RefreshToken.for_user(self.mentor_user)
        self.mentor_access_token = str(mentor_refresh.access_token)

        other_mentor_refresh = RefreshToken.for_user(self.other_mentor_user)
        self.other_mentor_access_token = str(other_mentor_refresh.access_token)

        mentee_refresh = RefreshToken.for_user(self.mentee_user)
        self.mentee_access_token = str(mentee_refresh.access_token)

        self.collection_url = f"/api/profiles/{self.mentor_profile.username}/availability-slots/"
        self.other_collection_url = (
            f"/api/profiles/{self.other_mentor_profile.username}/availability-slots/"
        )
        self.me_collection_url = "/api/profiles/me/availability-slots/"

    def test_create_availability_slot_success(self) -> None:
        """Mentor can create a slot with date/startTime/endTime payload."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")
        payload = {
            "date": (timezone.localdate() + timedelta(days=1)).isoformat(),
            "startTime": "10:00:00",
            "endTime": "11:00:00",
        }

        response = self.api_client.post(self.me_collection_url, payload)

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["date"], payload["date"])
        self.assertEqual(body["startTime"], payload["startTime"])
        self.assertEqual(body["endTime"], payload["endTime"])
        self.assertIsNone(body["bookedBy"])
        self.assertIsNone(body["bookedAt"])
        self.assertTrue(
            AvailabilitySlot.objects.filter(id=body["id"], profile=self.mentor_profile).exists()
        )

    def test_create_availability_slot_rejects_past_date(self) -> None:
        """Serializer rejects past dates for slot creation."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")
        payload = {
            "date": (timezone.localdate() - timedelta(days=1)).isoformat(),
            "startTime": "10:00:00",
            "endTime": "11:00:00",
        }

        response = self.api_client.post(self.me_collection_url, payload)

        self.assertEqual(response.status_code, 400)
        self.assertIn("date", response.json())

    def test_create_availability_slot_rejects_end_before_start(self) -> None:
        """Serializer rejects invalid time ranges where endTime <= startTime."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")
        payload = {
            "date": (timezone.localdate() + timedelta(days=1)).isoformat(),
            "startTime": "14:00:00",
            "endTime": "13:59:59",
        }

        response = self.api_client.post(self.me_collection_url, payload)

        self.assertEqual(response.status_code, 400)
        self.assertIn("endTime", response.json())

    def test_list_upcoming_slots_returns_only_future_slots(self) -> None:
        """GET endpoint returns only slots whose start_at is in the future."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")
        tz = timezone.get_current_timezone()

        past_start = timezone.now() - timedelta(days=1)
        past_end = past_start + timedelta(hours=1)
        AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=past_start,
            end_at=past_end,
        )

        future_date = timezone.localdate() + timedelta(days=2)
        future_start = timezone.make_aware(datetime.combine(future_date, datetime.min.time()), tz)
        future_start = future_start.replace(hour=9)
        future_end = future_start + timedelta(hours=1)
        future_slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=future_start,
            end_at=future_end,
        )

        response = self.api_client.get(self.collection_url)

        self.assertEqual(response.status_code, 200)

        payload = response.json()
        returned_ids = {slot["id"] for slot in payload}
        self.assertIn(str(future_slot.id), returned_ids)
        self.assertEqual(len(payload), 1)

    def test_list_username_slots_returns_404_for_non_mentor_profile(self) -> None:
        """Username-scoped listing returns 404 when target profile is not a mentor."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")

        response = self.api_client.get(
            f"/api/profiles/{self.mentee_profile.username}/availability-slots/"
        )

        self.assertEqual(response.status_code, 404)

    def test_create_my_slot_returns_404_when_profile_missing(self) -> None:
        """Create endpoint returns 404 for authenticated users without profile."""
        no_profile_user = User.objects.create_user(
            email="no-profile-create-slot@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        access_token = str(RefreshToken.for_user(no_profile_user).access_token)
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        response = self.api_client.post(
            self.me_collection_url,
            {
                "date": (timezone.localdate() + timedelta(days=1)).isoformat(),
                "startTime": "10:00:00",
                "endTime": "11:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 404)

    def test_create_my_slot_overlap_returns_400(self) -> None:
        """Create endpoint maps overlap database errors to 400 response."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")
        start_at = timezone.now() + timedelta(days=5)
        start_at = start_at.replace(hour=10, minute=0, second=0, microsecond=0)
        AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=start_at,
            end_at=start_at + timedelta(hours=1),
        )

        response = self.api_client.post(
            self.me_collection_url,
            {
                "date": timezone.localtime(start_at).date().isoformat(),
                "startTime": timezone.localtime(start_at).time().replace(microsecond=0).isoformat(),
                "endTime": (
                    timezone.localtime(start_at + timedelta(hours=1))
                    .time()
                    .replace(microsecond=0)
                    .isoformat()
                ),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("overlaps", response.json()["detail"])

    def test_list_my_slots_success_for_mentor(self) -> None:
        """Canonical me listing returns only authenticated mentor's future slots."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")
        past_start = timezone.now() - timedelta(days=1)
        AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=past_start,
            end_at=past_start + timedelta(hours=1),
        )
        future_start = timezone.now() + timedelta(days=2)
        future_slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=future_start,
            end_at=future_start + timedelta(hours=1),
        )

        response = self.api_client.get(self.me_collection_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["id"], str(future_slot.id))

    def test_list_my_slots_returns_404_when_profile_missing(self) -> None:
        """Canonical me listing returns 404 for authenticated users without profile."""
        no_profile_user = User.objects.create_user(
            email="no-profile-list-slot@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        access_token = str(RefreshToken.for_user(no_profile_user).access_token)
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        response = self.api_client.get(self.me_collection_url)

        self.assertEqual(response.status_code, 404)

    def test_list_my_slots_returns_403_for_mentee(self) -> None:
        """Canonical me listing returns 403 for non-mentor profiles."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentee_access_token}")

        response = self.api_client.get(self.me_collection_url)

        self.assertEqual(response.status_code, 403)

    def test_patch_availability_slot_success(self) -> None:
        """Mentor can update own slot via canonical me PATCH."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")
        slot_start = timezone.now() + timedelta(days=3)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
        )
        detail_url = f"/api/profiles/me/availability-slots/{slot.id}/"

        response = self.api_client.patch(
            detail_url,
            {
                "date": (timezone.localdate() + timedelta(days=4)).isoformat(),
                "startTime": "15:00:00",
                "endTime": "16:00:00",
            },
        )

        self.assertEqual(response.status_code, 200)
        slot.refresh_from_db()
        self.assertEqual(timezone.localtime(slot.start_at).hour, 15)
        self.assertEqual(timezone.localtime(slot.end_at).hour, 16)

    def test_delete_availability_slot_success(self) -> None:
        """Mentor can delete own availability slot via canonical me route."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")
        slot_start = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
        )
        detail_url = f"/api/profiles/me/availability-slots/{slot.id}/"

        response = self.api_client.delete(detail_url)

        self.assertEqual(response.status_code, 204)
        self.assertFalse(AvailabilitySlot.objects.filter(id=slot.id).exists())

    def test_delete_slot_unlinks_accepted_request_without_cancel_step(self) -> None:
        """Delete can unlink stale accepted references when slot is not booked."""
        slot_start = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
            is_booked=False,
        )
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=slot,
            status=MentorshipRequest.Status.ACCEPTED,
        )

        detail_url = f"/api/profiles/me/availability-slots/{slot.id}/"
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")
        delete_response = self.api_client.delete(detail_url)

        self.assertEqual(delete_response.status_code, 204)
        request_obj.refresh_from_db()
        self.assertIsNone(request_obj.slot)
        self.assertEqual(request_obj.initial_session_start_at, slot.start_at)
        self.assertEqual(request_obj.initial_session_end_at, slot.end_at)
        self.assertFalse(AvailabilitySlot.objects.filter(id=slot.id).exists())

    def test_delete_slot_with_pending_request_returns_400(self) -> None:
        """Delete is blocked when slot is still referenced by pending requests."""
        slot_start = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
        )
        MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=slot,
            status=MentorshipRequest.Status.PENDING,
        )

        detail_url = f"/api/profiles/me/availability-slots/{slot.id}/"
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")
        delete_response = self.api_client.delete(detail_url)

        self.assertEqual(delete_response.status_code, 400)
        self.assertIn("pending mentorship requests", delete_response.json()["detail"])
        self.assertTrue(AvailabilitySlot.objects.filter(id=slot.id).exists())

    def test_delete_other_mentor_slot_returns_404(self) -> None:
        """Mentors cannot delete slots that belong to another mentor."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")
        slot_start = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.other_mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
        )
        detail_url = f"/api/profiles/me/availability-slots/{slot.id}/"

        response = self.api_client.delete(detail_url)

        self.assertEqual(response.status_code, 404)
        self.assertTrue(AvailabilitySlot.objects.filter(id=slot.id).exists())

    def test_mentee_cannot_create_or_delete_slots(self) -> None:
        """Mentees cannot manage availability slots."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentee_access_token}")
        payload = {
            "date": (timezone.localdate() + timedelta(days=1)).isoformat(),
            "startTime": "10:00:00",
            "endTime": "11:00:00",
        }

        create_response = self.api_client.post(self.me_collection_url, payload)
        self.assertEqual(create_response.status_code, 403)

        slot_start = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
        )
        detail_url = f"/api/profiles/me/availability-slots/{slot.id}/"
        delete_response = self.api_client.delete(detail_url)

        self.assertEqual(delete_response.status_code, 403)

    def test_other_authenticated_user_can_get_mentor_slots(self) -> None:
        """Other authenticated users can read a mentor's availability slot list."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentee_access_token}")
        slot_start = timezone.now() + timedelta(days=1)
        AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
        )

        list_response = self.api_client.get(self.collection_url)

        self.assertEqual(list_response.status_code, 200)

    def test_get_my_slot_returns_404_when_user_profile_missing(self) -> None:
        """Canonical me slot detail returns 404 when authenticated user has no profile."""
        no_profile_user = User.objects.create_user(
            email="no-profile-slots@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        token = str(RefreshToken.for_user(no_profile_user).access_token)
        slot_start = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
        )

        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.api_client.get(f"/api/profiles/me/availability-slots/{slot.id}/")

        self.assertEqual(response.status_code, 404)

    def test_get_my_slot_returns_403_for_mentee(self) -> None:
        """Canonical me slot detail denies non-mentor users."""
        slot_start = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
        )

        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentee_access_token}")
        response = self.api_client.get(f"/api/profiles/me/availability-slots/{slot.id}/")

        self.assertEqual(response.status_code, 403)

    def test_get_my_slot_success_for_mentor(self) -> None:
        """Canonical me slot detail returns owned slot for authenticated mentor."""
        slot_start = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
        )
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")

        response = self.api_client.get(f"/api/profiles/me/availability-slots/{slot.id}/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["id"], str(slot.id))

    def test_get_my_slot_returns_404_for_missing_slot(self) -> None:
        """Canonical me slot detail returns 404 for non-existing slot ID."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")

        response = self.api_client.get(f"/api/profiles/me/availability-slots/{uuid.uuid4()}/")

        self.assertEqual(response.status_code, 404)

    def test_patch_my_slot_returns_404_when_profile_missing(self) -> None:
        """PATCH returns 404 for authenticated users without profile."""
        no_profile_user = User.objects.create_user(
            email="no-profile-patch-slot@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        access_token = str(RefreshToken.for_user(no_profile_user).access_token)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=timezone.now() + timedelta(days=3),
            end_at=timezone.now() + timedelta(days=3, hours=1),
        )
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        response = self.api_client.patch(
            f"/api/profiles/me/availability-slots/{slot.id}/",
            {"startTime": "15:00:00"},
            format="json",
        )

        self.assertEqual(response.status_code, 404)

    def test_patch_my_slot_returns_403_for_mentee(self) -> None:
        """PATCH returns 403 when authenticated profile is not a mentor."""
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=timezone.now() + timedelta(days=3),
            end_at=timezone.now() + timedelta(days=3, hours=1),
        )
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentee_access_token}")

        response = self.api_client.patch(
            f"/api/profiles/me/availability-slots/{slot.id}/",
            {"startTime": "15:00:00"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_patch_my_slot_returns_404_for_missing_slot(self) -> None:
        """PATCH returns 404 when slot does not exist for authenticated mentor."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")

        response = self.api_client.patch(
            f"/api/profiles/me/availability-slots/{uuid.uuid4()}/",
            {"startTime": "15:00:00"},
            format="json",
        )

        self.assertEqual(response.status_code, 404)

    def test_patch_availability_slot_overlapping_range_returns_400(self) -> None:
        """PATCH returns overlap error when updated range conflicts with another slot."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")
        start_1 = timezone.now() + timedelta(days=5)
        start_1 = start_1.replace(hour=10, minute=0, second=0, microsecond=0)
        slot_1 = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=start_1,
            end_at=start_1 + timedelta(hours=1),
        )
        start_2 = start_1 + timedelta(hours=2)
        slot_2 = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=start_2,
            end_at=start_2 + timedelta(hours=1),
        )
        slot_2_start_local = timezone.localtime(slot_2.start_at)
        overlap_start = slot_2_start_local + timedelta(minutes=15)
        overlap_end = overlap_start + timedelta(minutes=30)

        response = self.api_client.patch(
            f"/api/profiles/me/availability-slots/{slot_1.id}/",
            {
                "date": overlap_start.date().isoformat(),
                "startTime": overlap_start.time().replace(microsecond=0).isoformat(),
                "endTime": overlap_end.time().replace(microsecond=0).isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("overlaps", response.json()["detail"])

    def test_put_availability_slot_overlapping_range_returns_400(self) -> None:
        """PUT returns overlap error when replacement range conflicts with another slot."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")
        start_1 = timezone.now() + timedelta(days=6)
        start_1 = start_1.replace(hour=10, minute=0, second=0, microsecond=0)
        slot_1 = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=start_1,
            end_at=start_1 + timedelta(hours=1),
        )
        start_2 = start_1 + timedelta(hours=2)
        slot_2 = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=start_2,
            end_at=start_2 + timedelta(hours=1),
        )
        slot_2_start_local = timezone.localtime(slot_2.start_at)
        overlap_start = slot_2_start_local + timedelta(minutes=5)
        overlap_end = overlap_start + timedelta(minutes=40)

        response = self.api_client.put(
            f"/api/profiles/me/availability-slots/{slot_1.id}/",
            {
                "date": overlap_start.date().isoformat(),
                "startTime": overlap_start.time().replace(microsecond=0).isoformat(),
                "endTime": overlap_end.time().replace(microsecond=0).isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("overlaps", response.json()["detail"])

    def test_put_availability_slot_success(self) -> None:
        """PUT fully updates an owned slot when payload is valid."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")
        slot_start = timezone.now() + timedelta(days=4)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
        )

        response = self.api_client.put(
            f"/api/profiles/me/availability-slots/{slot.id}/",
            {
                "date": (timezone.localdate() + timedelta(days=5)).isoformat(),
                "startTime": "18:00:00",
                "endTime": "19:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

    def test_put_my_slot_returns_404_when_profile_missing(self) -> None:
        """PUT returns 404 for authenticated users without profile."""
        no_profile_user = User.objects.create_user(
            email="no-profile-put-slot@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        access_token = str(RefreshToken.for_user(no_profile_user).access_token)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=timezone.now() + timedelta(days=3),
            end_at=timezone.now() + timedelta(days=3, hours=1),
        )
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        response = self.api_client.put(
            f"/api/profiles/me/availability-slots/{slot.id}/",
            {
                "date": (timezone.localdate() + timedelta(days=5)).isoformat(),
                "startTime": "14:00:00",
                "endTime": "15:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 404)

    def test_put_my_slot_returns_403_for_mentee(self) -> None:
        """PUT returns 403 when authenticated profile is not a mentor."""
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=timezone.now() + timedelta(days=3),
            end_at=timezone.now() + timedelta(days=3, hours=1),
        )
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentee_access_token}")

        response = self.api_client.put(
            f"/api/profiles/me/availability-slots/{slot.id}/",
            {
                "date": (timezone.localdate() + timedelta(days=5)).isoformat(),
                "startTime": "14:00:00",
                "endTime": "15:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_put_my_slot_returns_404_for_missing_slot(self) -> None:
        """PUT returns 404 when slot does not exist for authenticated mentor."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")

        response = self.api_client.put(
            f"/api/profiles/me/availability-slots/{uuid.uuid4()}/",
            {
                "date": (timezone.localdate() + timedelta(days=5)).isoformat(),
                "startTime": "14:00:00",
                "endTime": "15:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 404)

    def test_delete_booked_slot_returns_400(self) -> None:
        """Delete blocks booked slots until booking is canceled."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")
        slot_start = timezone.now() + timedelta(days=2)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
            is_booked=True,
            booked_by=self.mentee_user,
            booked_at=timezone.now(),
        )

        response = self.api_client.delete(f"/api/profiles/me/availability-slots/{slot.id}/")

        self.assertEqual(response.status_code, 400)
        self.assertIn("Cannot delete a booked slot", response.json()["detail"])

    def test_delete_my_slot_returns_404_when_profile_missing(self) -> None:
        """DELETE returns 404 for authenticated users without profile."""
        no_profile_user = User.objects.create_user(
            email="no-profile-delete-slot@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        access_token = str(RefreshToken.for_user(no_profile_user).access_token)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=timezone.now() + timedelta(days=2),
            end_at=timezone.now() + timedelta(days=2, hours=1),
        )
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        response = self.api_client.delete(f"/api/profiles/me/availability-slots/{slot.id}/")

        self.assertEqual(response.status_code, 404)

    def test_delete_slot_sets_initial_session_fields_for_rejected_requests(self) -> None:
        """Delete backfills snapshot timestamps when non-pending request keeps slot reference."""
        slot_start = timezone.now() + timedelta(days=2)
        slot_end = slot_start + timedelta(hours=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_end,
            is_booked=False,
        )
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=slot,
            status=MentorshipRequest.Status.REJECTED,
        )
        self.assertIsNone(request_obj.initial_session_start_at)
        self.assertIsNone(request_obj.initial_session_end_at)

        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")
        response = self.api_client.delete(f"/api/profiles/me/availability-slots/{slot.id}/")

        self.assertEqual(response.status_code, 204)
        request_obj.refresh_from_db()
        self.assertEqual(request_obj.initial_session_start_at, slot_start)
        self.assertEqual(request_obj.initial_session_end_at, slot_end)

    def test_delete_slot_maps_protected_error_to_400(self) -> None:
        """Delete returns 400 when model delete raises ProtectedError."""
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=timezone.now() + timedelta(days=2),
            end_at=timezone.now() + timedelta(days=2, hours=1),
        )
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")

        with patch(
            "profiles.views.AvailabilitySlot.delete",
            side_effect=ProtectedError("blocked", {slot}),
        ):
            response = self.api_client.delete(f"/api/profiles/me/availability-slots/{slot.id}/")

        self.assertEqual(response.status_code, 400)
        self.assertIn("still referenced", response.json()["detail"])


class AvailabilitySlotBookingAPIViewTests(TestCase):
    """Integration tests for availability slot booking lifecycle endpoints."""

    def setUp(self) -> None:
        """Create users/profiles and auth tokens for booking tests."""
        self.api_client: Any = APIClient()

        self.mentor_user = User.objects.create_user(
            email="mentor-booking@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.mentor_profile = Profile.objects.create(
            user=self.mentor_user,
            display_name="Mentor Booking",
        )

        self.mentee_user = User.objects.create_user(
            email="mentee-booking@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        self.mentee_profile = Profile.objects.create(
            user=self.mentee_user,
            display_name="Mentee Booking",
        )

        self.other_user = User.objects.create_user(
            email="other-booking@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        self.other_profile = Profile.objects.create(
            user=self.other_user,
            display_name="Other User",
        )

        mentor_refresh = RefreshToken.for_user(self.mentor_user)
        self.mentor_access_token = str(mentor_refresh.access_token)

        mentee_refresh = RefreshToken.for_user(self.mentee_user)
        self.mentee_access_token = str(mentee_refresh.access_token)

        other_refresh = RefreshToken.for_user(self.other_user)
        self.other_access_token = str(other_refresh.access_token)

    def test_book_slot_success(self) -> None:
        """Authenticated user can book an available future slot."""
        slot_start = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
        )
        book_url = (
            f"/api/profiles/{self.mentor_profile.username}/availability-slots/{slot.id}/book/"
        )

        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentee_access_token}")
        response = self.api_client.post(book_url)

        self.assertEqual(response.status_code, 200)
        slot.refresh_from_db()
        self.assertTrue(slot.is_booked)
        self.assertEqual(slot.booked_by, self.mentee_user)
        self.assertIsNotNone(slot.booked_at)
        self.assertEqual(response.json()["bookedBy"], self.mentee_profile.username)

    def test_book_slot_rejects_already_booked(self) -> None:
        """Booking fails when slot is already booked."""
        slot_start = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
            is_booked=True,
            booked_by=self.other_user,
            booked_at=timezone.now(),
        )
        book_url = (
            f"/api/profiles/{self.mentor_profile.username}/availability-slots/{slot.id}/book/"
        )

        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentee_access_token}")
        response = self.api_client.post(book_url)

        self.assertEqual(response.status_code, 400)

    def test_book_slot_rejects_past_slot(self) -> None:
        """Booking fails when slot starts in the past."""
        slot_start = timezone.now() - timedelta(hours=2)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
        )
        book_url = (
            f"/api/profiles/{self.mentor_profile.username}/availability-slots/{slot.id}/book/"
        )

        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentee_access_token}")
        response = self.api_client.post(book_url)

        self.assertEqual(response.status_code, 400)

    def test_mentor_cannot_book_own_slot(self) -> None:
        """Mentor owner cannot book their own availability slot."""
        slot_start = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
        )
        book_url = (
            f"/api/profiles/{self.mentor_profile.username}/availability-slots/{slot.id}/book/"
        )

        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")
        response = self.api_client.post(book_url)

        self.assertEqual(response.status_code, 403)

    def test_book_slot_returns_404_for_non_mentor_username(self) -> None:
        """Booking endpoint returns 404 when target username is not a mentor."""
        slot_start = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
        )
        book_url = (
            f"/api/profiles/{self.mentee_profile.username}/" f"availability-slots/{slot.id}/book/"
        )

        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.other_access_token}")
        response = self.api_client.post(book_url)

        self.assertEqual(response.status_code, 404)

    def test_book_slot_returns_404_when_slot_missing(self) -> None:
        """Booking endpoint maps missing availability slot to 404."""
        book_url = (
            f"/api/profiles/{self.mentor_profile.username}/availability-slots/{uuid.uuid4()}/book/"
        )

        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentee_access_token}")
        response = self.api_client.post(book_url)

        self.assertEqual(response.status_code, 404)


class PublicMentorProfilesSearchListAPIViewTests(TestCase):
    """Tests for public mentor discovery endpoint GET /api/profiles/."""

    def setUp(self) -> None:
        self.api_client: Any = APIClient()

        self.mentor1_user = User.objects.create_user(
            email="mentor1@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.mentor1_profile = Profile.objects.create(
            user=self.mentor1_user,
            display_name="Alice Mentor",
            is_visible=True,
            show_initials_only=False,
            skills=["Python", "Django"],
            title="Backend Mentor",
            bio="Mentors backend folks.",
        )

        self.mentor2_user = User.objects.create_user(
            email="mentor2@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.mentor2_profile = Profile.objects.create(
            user=self.mentor2_user,
            display_name="John Doe",
            is_visible=True,
            show_initials_only=True,
            skills=["React"],
            title="Frontend Mentor",
            bio="Mentors frontend devs.",
        )

        self.mentor3_user = User.objects.create_user(
            email="mentor3@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.mentor3_profile = Profile.objects.create(
            user=self.mentor3_user,
            display_name="Bob Zed",
            is_visible=True,
            show_initials_only=False,
            skills=["Go"],
            title="Go Mentor",
            bio="Mentors Go services.",
        )

        self.private_mentor_user = User.objects.create_user(
            email="private-mentor@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.private_mentor_profile = Profile.objects.create(
            user=self.private_mentor_user,
            display_name="Private Mentor",
            is_visible=False,
            show_initials_only=False,
            skills=["Python"],
            title="Hidden",
        )

        self.mentee_user = User.objects.create_user(
            email="mentee@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        self.mentee_profile = Profile.objects.create(
            user=self.mentee_user,
            display_name="Mentee Person",
            is_visible=True,
            show_initials_only=False,
            skills=["Python"],
            title="Mentee",
        )

    def test_guest_can_access_endpoint(self) -> None:
        """Unauthenticated requests can list public mentors."""
        response = self.api_client.get("/api/profiles/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("results", payload)
        self.assertTrue(all("username" in profile for profile in payload["results"]))

        returned_names = {p["full_name"] for p in payload["results"]}
        returned_usernames = {p["username"] for p in payload["results"]}
        # Only visible mentors should be included.
        self.assertIn("Alice Mentor", returned_names)
        self.assertIn("JD", returned_names)  # initials due to show_initials_only
        self.assertIn("Bob Zed", returned_names)
        self.assertNotIn("Private Mentor", returned_names)
        self.assertIn(self.mentor1_profile.username, returned_usernames)
        self.assertIn(self.mentor2_profile.username, returned_usernames)
        self.assertIn(self.mentor3_profile.username, returned_usernames)
        self.assertNotIn(self.private_mentor_profile.username, returned_usernames)
        # Default discovery is mentors only.
        self.assertNotIn("Mentee Person", returned_names)

    def test_mode_filter_can_target_mentee_profiles(self) -> None:
        """`mentorshipMode=MENTEE` returns visible mentee profiles."""
        response = self.api_client.get("/api/profiles/", {"mentorshipMode": "MENTEE"})
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        returned_names = {p["full_name"] for p in payload["results"]}

        self.assertIn("Mentee Person", returned_names)
        self.assertNotIn("Alice Mentor", returned_names)

    def test_mode_filter_mentor_returns_mentor_profiles(self) -> None:
        """Explicit `mentorshipMode=MENTOR` keeps mentor-only discovery behavior."""
        response = self.api_client.get("/api/profiles/", {"mentorshipMode": "MENTOR"})
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        returned_names = {p["full_name"] for p in payload["results"]}
        self.assertIn("Alice Mentor", returned_names)
        self.assertNotIn("Mentee Person", returned_names)

    def test_mode_filter_rejects_legacy_both_value(self) -> None:
        """`mentorshipMode=BOTH` is rejected by strict role filtering."""
        response = self.api_client.get("/api/profiles/", {"mentorshipMode": "BOTH"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("MENTOR or MENTEE", response.json()["detail"])

    def test_search_by_q_matches_display_name(self) -> None:
        """`q` filters by name/keyword fields."""
        response = self.api_client.get("/api/profiles/", {"q": "Alice"})
        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["full_name"], "Alice Mentor")
        self.assertEqual(payload["results"][0]["username"], self.mentor1_profile.username)

    def test_filter_by_skill_term(self) -> None:
        """`skill` query param matches profile skills."""
        response = self.api_client.get("/api/profiles/", {"skill": "React"})
        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["full_name"], "JD")
        self.assertEqual(payload["results"][0]["skills"], ["React"])

    def test_filter_by_skill_term_is_case_insensitive(self) -> None:
        """Skill filter uses case-insensitive match on profile skills."""
        response = self.api_client.get("/api/profiles/", {"skill": "react"})
        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["full_name"], "JD")

    def test_q_search_matches_profile_skills_without_duplicates(self) -> None:
        """`q` should match skill strings while returning each profile only once."""
        dup_user = User.objects.create_user(
            email="dup-expertise@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        Profile.objects.create(
            user=dup_user,
            display_name="Unique Dup Expertise Holder",
            is_visible=True,
            show_initials_only=False,
            skills=["Python Basics", "Python Advanced"],
            title="Mentor",
            bio="No Python in bio text.",
        )

        response = self.api_client.get("/api/profiles/", {"q": "Python"})
        self.assertEqual(response.status_code, 200)
        payload = response.json()

        result_ids = [p["id"] for p in payload["results"]]
        self.assertEqual(len(result_ids), len(set(result_ids)), "duplicate profile rows in results")

        dup_rows = [
            p for p in payload["results"] if p["full_name"] == "Unique Dup Expertise Holder"
        ]
        self.assertEqual(len(dup_rows), 1)

    def test_show_initials_only_is_respected(self) -> None:
        """When show_initials_only is set, full_name becomes initials."""
        response = self.api_client.get("/api/profiles/", {"q": "John"})
        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["full_name"], "JD")

    def test_pagination_page_and_pageSize(self) -> None:
        """Pagination slices results deterministically."""
        # Profiles are ordered by display_name asc.
        response = self.api_client.get(
            "/api/profiles/",
            {"page": 1, "pageSize": 1},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 3)  # visible mentors only
        self.assertEqual(payload["page"], 1)
        self.assertEqual(payload["pageSize"], 1)
        self.assertEqual(len(payload["results"]), 1)
        first_name = payload["results"][0]["full_name"]

        response2 = self.api_client.get(
            "/api/profiles/",
            {"page": 2, "pageSize": 1},
        )
        payload2 = response2.json()
        second_name = payload2["results"][0]["full_name"]

        self.assertNotEqual(first_name, second_name)

    def test_rejects_non_integer_page_or_page_size(self) -> None:
        """Invalid pagination values return 400."""
        response = self.api_client.get("/api/profiles/", {"page": "one", "pageSize": "two"})

        self.assertEqual(response.status_code, 400)
        self.assertIn("must be integers", response.json()["detail"])

    def test_pagination_bounds_page_min_and_page_size_max(self) -> None:
        """Pagination clamps page to minimum 1 and pageSize to maximum 50."""
        for i in range(60):
            u = User.objects.create_user(
                email=f"mentor-bounds-{i}@example.com",
                password="SecurePass123",
                app_usage_mode=AppUsageMode.MENTOR,
            )
            Profile.objects.create(
                user=u,
                display_name=f"Bounds Mentor {i}",
                is_visible=True,
                show_initials_only=False,
            )

        response = self.api_client.get("/api/profiles/", {"page": 0, "pageSize": 500})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["page"], 1)
        self.assertEqual(payload["pageSize"], 50)
        self.assertLessEqual(len(payload["results"]), 50)

    def test_coordinates_require_both_lat_and_lng(self) -> None:
        """Providing only one coordinate returns 400."""
        response = self.api_client.get("/api/profiles/", {"lat": "39.93"})

        self.assertEqual(response.status_code, 400)
        self.assertIn("Both `lat`/`latitude` and `lng`/`longitude`", response.json()["detail"])

    def test_coordinates_reject_invalid_numbers(self) -> None:
        """Invalid coordinate number format returns 400."""
        response = self.api_client.get(
            "/api/profiles/",
            {"lat": "north", "lng": "east"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("must be valid numbers", response.json()["detail"])

    def test_coordinates_reject_out_of_range_values(self) -> None:
        """Out-of-range latitude/longitude returns 400."""
        response = self.api_client.get(
            "/api/profiles/",
            {"lat": "100", "lng": "200"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("between -90 and 90", response.json()["detail"])

    def test_distance_filter_rejects_non_numeric_input(self) -> None:
        """Invalid distance filter value returns 400."""
        response = self.api_client.get(
            "/api/profiles/",
            {"distanceKm": "far"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("must be a valid number", response.json()["detail"])

    def test_distance_filter_limits_results_when_coordinates_are_provided(self) -> None:
        """Distance filter narrows results to mentors within the requested radius."""
        self.mentor1_profile.location = Point(32.8597, 39.9334, srid=4326)  # Ankara center
        self.mentor1_profile.save(update_fields=["location"])

        self.mentor3_profile.location = Point(-0.1276, 51.5072, srid=4326)  # London
        self.mentor3_profile.save(update_fields=["location"])

        response = self.api_client.get(
            "/api/profiles/",
            {"lat": "39.9334", "lng": "32.8597", "distanceKm": "20"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        result_ids = {row["id"] for row in payload["results"]}
        self.assertIn(str(self.mentor1_profile.id), result_ids)
        self.assertNotIn(str(self.mentor3_profile.id), result_ids)

    def test_skill_terms_parsing_handles_duplicates_and_empty_parts(self) -> None:
        """Search parser deduplicates repeated terms and ignores empty comma-separated values."""
        response = self.api_client.get(
            "/api/profiles/?skill=Python,,python,React&skills=react",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        names = {p["full_name"] for p in payload["results"]}
        self.assertEqual(payload["count"], 2)
        self.assertIn("Alice Mentor", names)
        self.assertIn("JD", names)

    def test_public_search_helper_branch_edges(self) -> None:
        """Direct helper checks cover empty query/term branches in search utilities."""
        view = PublicMentorProfilesSearchListAPIView()

        self.assertFalse(view._skills_match_query(["Python"], "   "))
        self.assertFalse(view._has_any_skill(["Python"], []))
        self.assertFalse(view._has_any_skill(["Python"], ["  ", ""]))


def _token_for_profile_tests(user: Any) -> str:
    """Return a JWT access token for the given user."""
    from rest_framework_simplejwt.tokens import RefreshToken

    return str(RefreshToken.for_user(user).access_token)


class MentorPublicAverageRatingAPITests(TestCase):
    """Tests for GET /api/profiles/{username}/rating/."""

    def setUp(self) -> None:
        from django.contrib.auth.models import Group

        from accounts.models import UserRole

        Group.objects.get_or_create(name=UserRole.USER)

        self.mentor_user = User.objects.create_user(
            email="mentor.rating@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.mentor_profile = Profile.objects.create(
            user=self.mentor_user,
            display_name="Rating Mentor",
            is_visible=True,
        )
        self.api_client: Any = APIClient()

    def _url(self, username: str) -> str:
        return f"/api/profiles/{username}/rating/"

    def test_returns_200_for_visible_profile(self) -> None:
        response = self.api_client.get(self._url(self.mentor_profile.username))
        self.assertEqual(response.status_code, 200)

    def test_returns_username_average_rating_and_review_count(self) -> None:
        response = self.api_client.get(self._url(self.mentor_profile.username))
        data = response.json()
        self.assertIn("username", data)
        self.assertIn("average_rating", data)
        self.assertIn("review_count", data)

    def test_initial_average_rating_is_zero(self) -> None:
        response = self.api_client.get(self._url(self.mentor_profile.username))
        self.assertEqual(response.json()["average_rating"], "0.00")
        self.assertEqual(response.json()["review_count"], 0)

    def test_nonexistent_profile_returns_404(self) -> None:
        response = self.api_client.get(self._url("does_not_exist"))
        self.assertEqual(response.status_code, 404)

    def test_invisible_profile_returns_404(self) -> None:
        self.mentor_profile.is_visible = False
        self.mentor_profile.save()
        response = self.api_client.get(self._url(self.mentor_profile.username))
        self.assertEqual(response.status_code, 404)

    def test_accessible_without_authentication(self) -> None:
        response = self.api_client.get(self._url(self.mentor_profile.username))
        self.assertEqual(response.status_code, 200)

    def test_average_rating_reflects_threshold_update(self) -> None:
        """After manual threshold updates, endpoint returns current public average rating values."""
        self.mentor_profile.review_count = 5
        self.mentor_profile.average_rating = Decimal("4.20")
        self.mentor_profile.save()

        response = self.api_client.get(self._url(self.mentor_profile.username))
        self.assertEqual(response.json()["average_rating"], "4.20")
        self.assertEqual(response.json()["review_count"], 5)


@override_settings(RATING_UPDATE_THRESHOLD=2)
class ProfilePublicReviewsAPITests(TestCase):
    """Tests for GET /api/profiles/{username}/reviews/."""

    def setUp(self) -> None:
        self.api_client: Any = APIClient()

        self.mentor_user = User.objects.create_user(
            email="mentor.reviews@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.mentor_profile = Profile.objects.create(
            user=self.mentor_user,
            display_name="Reviews Mentor",
            is_visible=True,
        )
        self.url = f"/api/profiles/{self.mentor_profile.username}/reviews/"

    def _create_mentee_feedback(self, idx: int, *, rating: int, text: str) -> Feedback:
        mentee_user = User.objects.create_user(
            email=f"mentee.review.{idx}@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        mentee_profile = Profile.objects.create(
            user=mentee_user,
            display_name=f"Mentee {idx}",
        )
        mentorship_request = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=mentee_profile,
            status=MentorshipRequest.Status.ACCEPTED,
        )
        match = Match.objects.create(
            mentor=self.mentor_profile,
            mentee=mentee_profile,
            request=mentorship_request,
        )
        return Feedback.objects.create(
            match=match,
            submitted_by=mentee_profile,
            rating=rating,
            text=text,
        )

    def _create_mentee_client_and_feedback_url(self, idx: int) -> tuple[APIClient, str]:
        mentee_user = User.objects.create_user(
            email=f"mentee.reviews.api.{idx}@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        mentee_profile = Profile.objects.create(
            user=mentee_user,
            display_name=f"API Mentee {idx}",
        )
        mentorship_request = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=mentee_profile,
            status=MentorshipRequest.Status.ACCEPTED,
        )
        match = Match.objects.create(
            mentor=self.mentor_profile,
            mentee=mentee_profile,
            request=mentorship_request,
        )
        api_client = APIClient()
        token = str(RefreshToken.for_user(mentee_user).access_token)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return api_client, f"/api/mentorship/matches/{match.id}/feedback/"

    def test_returns_404_for_missing_profile(self) -> None:
        response = self.api_client.get("/api/profiles/missing-user/reviews/")
        self.assertEqual(response.status_code, 404)

    def test_returns_404_for_invisible_profile(self) -> None:
        self.mentor_profile.is_visible = False
        self.mentor_profile.save(update_fields=["is_visible"])

        response = self.api_client.get(self.url)
        self.assertEqual(response.status_code, 404)

    def test_returns_only_public_text_review_fields(self) -> None:
        self._create_mentee_feedback(1, rating=5, text="Excellent guidance")
        self._create_mentee_feedback(2, rating=4, text="Clear explanations")
        self.mentor_profile.review_count = 2
        self.mentor_profile.save(update_fields=["review_count"])

        response = self.api_client.get(self.url)
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 2)
        self.assertEqual(len(payload["results"]), 2)
        first_review = payload["results"][0]
        self.assertEqual(set(first_review.keys()), {"rating", "text", "created_at"})
        self.assertNotIn("submitted_by", first_review)
        self.assertNotIn("match", first_review)

    def test_empty_text_reviews_are_excluded(self) -> None:
        self._create_mentee_feedback(1, rating=5, text="")
        self._create_mentee_feedback(2, rating=4, text="Visible text")
        self.mentor_profile.review_count = 2
        self.mentor_profile.save(update_fields=["review_count"])

        response = self.api_client.get(self.url)
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual([item["text"] for item in payload["results"]], ["Visible text"])

    def test_threshold_gating_hides_incomplete_batch(self) -> None:
        self._create_mentee_feedback(1, rating=5, text="Only one review")
        self.mentor_profile.review_count = 1
        self.mentor_profile.save(update_fields=["review_count"])

        response = self.api_client.get(self.url)
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 0)
        self.assertEqual(payload["results"], [])

    def test_pagination_slices_results(self) -> None:
        texts = ["Review A", "Review B", "Review C", "Review D"]
        for idx, text in enumerate(texts, start=1):
            self._create_mentee_feedback(idx, rating=5, text=text)
        self.mentor_profile.review_count = 4
        self.mentor_profile.save(update_fields=["review_count"])

        response_page_1 = self.api_client.get(self.url, {"page": 1, "pageSize": 2})
        response_page_2 = self.api_client.get(self.url, {"page": 2, "pageSize": 2})

        self.assertEqual(response_page_1.status_code, 200)
        self.assertEqual(response_page_2.status_code, 200)
        payload_1 = response_page_1.json()
        payload_2 = response_page_2.json()

        self.assertEqual(payload_1["count"], 4)
        self.assertEqual(payload_1["page"], 1)
        self.assertEqual(payload_1["pageSize"], 2)
        self.assertEqual(len(payload_1["results"]), 2)
        self.assertEqual(payload_2["page"], 2)
        self.assertEqual(len(payload_2["results"]), 2)

        page_1_texts = {item["text"] for item in payload_1["results"]}
        page_2_texts = {item["text"] for item in payload_2["results"]}
        self.assertTrue(page_1_texts.isdisjoint(page_2_texts))

    def test_invalid_pagination_params_return_400(self) -> None:
        response = self.api_client.get(self.url, {"page": "abc", "pageSize": "x"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("must be integers", response.json()["detail"])

    def test_visible_feedback_deletion_keeps_public_reviews_visible(self) -> None:
        first_client, first_feedback_url = self._create_mentee_client_and_feedback_url(1)
        second_client, second_feedback_url = self._create_mentee_client_and_feedback_url(2)

        create_first = first_client.post(
            first_feedback_url,
            {"rating": 5, "text": "First visible"},
            format="json",
        )
        create_second = second_client.post(
            second_feedback_url,
            {"rating": 4, "text": "Second visible"},
            format="json",
        )
        self.assertEqual(create_first.status_code, 201)
        self.assertEqual(create_second.status_code, 201)

        before_delete = self.api_client.get(self.url)
        self.assertEqual(before_delete.status_code, 200)
        self.assertEqual(before_delete.json()["count"], 2)

        delete_first = first_client.delete(first_feedback_url)
        self.assertEqual(delete_first.status_code, 204)

        after_delete = self.api_client.get(self.url)
        self.assertEqual(after_delete.status_code, 200)
        self.assertEqual(after_delete.json()["count"], 1)
        self.assertEqual(after_delete.json()["results"][0]["text"], "Second visible")

    def test_hidden_feedback_deletion_does_not_make_batch_visible(self) -> None:
        first_client, first_feedback_url = self._create_mentee_client_and_feedback_url(3)
        create_first = first_client.post(
            first_feedback_url,
            {"rating": 5, "text": "Hidden candidate"},
            format="json",
        )
        self.assertEqual(create_first.status_code, 201)

        before_delete = self.api_client.get(self.url)
        self.assertEqual(before_delete.status_code, 200)
        self.assertEqual(before_delete.json()["count"], 0)

        delete_first = first_client.delete(first_feedback_url)
        self.assertEqual(delete_first.status_code, 204)

        after_delete = self.api_client.get(self.url)
        self.assertEqual(after_delete.status_code, 200)
        self.assertEqual(after_delete.json()["count"], 0)
        self.assertEqual(after_delete.json()["results"], [])


class RecentlyAddedMentorsAPITests(TestCase):
    """Tests for GET /api/profiles/recently-added/"""

    def setUp(self) -> None:
        self.client = APIClient()

        self.mentor1_user = User.objects.create_user(
            email="recent1@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.mentor1_profile = Profile.objects.create(
            user=self.mentor1_user,
            display_name="First Mentor",
            is_visible=True,
            average_rating=Decimal("3.00"),
        )

        self.mentor2_user = User.objects.create_user(
            email="recent2@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.mentor2_profile = Profile.objects.create(
            user=self.mentor2_user,
            display_name="Second Mentor",
            is_visible=True,
            average_rating=Decimal("5.00"),
        )

        self.hidden_mentor_user = User.objects.create_user(
            email="hidden@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.hidden_mentor_profile = Profile.objects.create(
            user=self.hidden_mentor_user,
            display_name="Hidden Mentor",
            is_visible=False,
        )

        self.mentee_user = User.objects.create_user(
            email="mentee_recent@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        self.mentee_profile = Profile.objects.create(
            user=self.mentee_user,
            display_name="Mentee Person",
            is_visible=True,
        )

    def test_returns_200(self) -> None:
        response = self.client.get("/api/profiles/recently-added/")
        self.assertEqual(response.status_code, 200)

    def test_response_has_results_key(self) -> None:
        response = self.client.get("/api/profiles/recently-added/")
        self.assertIn("results", response.json())

    def test_only_visible_mentors_returned(self) -> None:
        response = self.client.get("/api/profiles/recently-added/")
        names = [p["full_name"] for p in response.json()["results"]]
        self.assertNotIn("Hidden Mentor", names)
        self.assertNotIn("Mentee Person", names)

    def test_sorted_by_created_at_descending(self) -> None:
        # mentor2 was created after mentor1 so should appear first
        response = self.client.get("/api/profiles/recently-added/")
        results = response.json()["results"]
        self.assertGreaterEqual(len(results), 2)
        ids = [r["id"] for r in results]
        self.assertLess(
            ids.index(str(self.mentor2_profile.id)), ids.index(str(self.mentor1_profile.id))
        )

    def test_default_limit_is_ten(self) -> None:
        # Create 12 visible mentors in total (2 already exist)
        for i in range(10):
            u = User.objects.create_user(
                email=f"extra{i}@example.com",
                password="SecurePass123",
                app_usage_mode=AppUsageMode.MENTOR,
            )
            Profile.objects.create(user=u, display_name=f"Extra {i}", is_visible=True)

        response = self.client.get("/api/profiles/recently-added/")
        self.assertEqual(len(response.json()["results"]), 10)

    def test_custom_limit(self) -> None:
        response = self.client.get("/api/profiles/recently-added/", {"limit": 1})
        self.assertEqual(len(response.json()["results"]), 1)

    def test_limit_capped_at_50(self) -> None:
        for i in range(60):
            u = User.objects.create_user(
                email=f"cap{i}@example.com",
                password="SecurePass123",
                app_usage_mode=AppUsageMode.MENTOR,
            )
            Profile.objects.create(user=u, display_name=f"Cap {i}", is_visible=True)

        response = self.client.get("/api/profiles/recently-added/", {"limit": 100})
        self.assertLessEqual(len(response.json()["results"]), 50)

    def test_invalid_limit_returns_400(self) -> None:
        response = self.client.get("/api/profiles/recently-added/", {"limit": "abc"})
        self.assertEqual(response.status_code, 400)

    def test_accessible_without_authentication(self) -> None:
        response = self.client.get("/api/profiles/recently-added/")
        self.assertEqual(response.status_code, 200)


class PopularMentorsAPITests(TestCase):
    """Tests for GET /api/profiles/popular/"""

    def setUp(self) -> None:
        self.client = APIClient()

        self.low_rated_user = User.objects.create_user(
            email="low@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.low_rated_profile = Profile.objects.create(
            user=self.low_rated_user,
            display_name="Low Rated",
            is_visible=True,
            average_rating=Decimal("1.00"),
            total_mentee_count=5,
        )

        self.high_rated_user = User.objects.create_user(
            email="high@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.high_rated_profile = Profile.objects.create(
            user=self.high_rated_user,
            display_name="High Rated",
            is_visible=True,
            average_rating=Decimal("5.00"),
            total_mentee_count=10,
        )

        self.hidden_user = User.objects.create_user(
            email="hiddenpop@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.hidden_profile = Profile.objects.create(
            user=self.hidden_user,
            display_name="Hidden Popular",
            is_visible=False,
            average_rating=Decimal("5.00"),
        )

        self.mentee_user = User.objects.create_user(
            email="menteepop@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        self.mentee_profile = Profile.objects.create(
            user=self.mentee_user,
            display_name="Mentee Pop",
            is_visible=True,
            average_rating=Decimal("5.00"),
        )

    def test_returns_200(self) -> None:
        response = self.client.get("/api/profiles/popular/")
        self.assertEqual(response.status_code, 200)

    def test_response_has_results_key(self) -> None:
        response = self.client.get("/api/profiles/popular/")
        self.assertIn("results", response.json())

    def test_only_visible_mentors_returned(self) -> None:
        response = self.client.get("/api/profiles/popular/")
        names = [p["full_name"] for p in response.json()["results"]]
        self.assertNotIn("Hidden Popular", names)
        self.assertNotIn("Mentee Pop", names)

    def test_sorted_by_average_rating_descending(self) -> None:
        response = self.client.get("/api/profiles/popular/")
        results = response.json()["results"]
        self.assertGreaterEqual(len(results), 2)
        ids = [r["id"] for r in results]
        self.assertLess(
            ids.index(str(self.high_rated_profile.id)),
            ids.index(str(self.low_rated_profile.id)),
        )

    def test_tiebreaker_is_total_mentee_count(self) -> None:
        # Two mentors with the same rating; the one with more mentees comes first
        tied_low_user = User.objects.create_user(
            email="tied_low@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        tied_low = Profile.objects.create(
            user=tied_low_user,
            display_name="Tied Low Mentees",
            is_visible=True,
            average_rating=Decimal("3.00"),
            total_mentee_count=2,
        )
        tied_high_user = User.objects.create_user(
            email="tied_high@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        tied_high = Profile.objects.create(
            user=tied_high_user,
            display_name="Tied High Mentees",
            is_visible=True,
            average_rating=Decimal("3.00"),
            total_mentee_count=20,
        )

        response = self.client.get("/api/profiles/popular/")
        ids = [r["id"] for r in response.json()["results"]]
        self.assertLess(ids.index(str(tied_high.id)), ids.index(str(tied_low.id)))

    def test_custom_limit(self) -> None:
        response = self.client.get("/api/profiles/popular/", {"limit": 1})
        self.assertEqual(len(response.json()["results"]), 1)

    def test_invalid_limit_returns_400(self) -> None:
        response = self.client.get("/api/profiles/popular/", {"limit": "xyz"})
        self.assertEqual(response.status_code, 400)

    def test_accessible_without_authentication(self) -> None:
        response = self.client.get("/api/profiles/popular/")
        self.assertEqual(response.status_code, 200)


class ProfileSerializersUnitTests(TestCase):
    """Unit tests for profiles serializer helper branches."""

    def setUp(self) -> None:
        self.user_with_profile = User.objects.create_user(
            email="serializer-owner@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.profile = Profile.objects.create(
            user=self.user_with_profile,
            display_name="Serializer Mentor",
        )

    def test_location_field_representation_and_none_paths(self) -> None:
        """Location field serializes both None and valid points."""
        field = LocationField()
        self.assertIsNone(field.to_representation(None))

        point = Point(32.8597, 39.9334, srid=4326)
        data = cast(dict[str, Any], field.to_representation(point))

        self.assertEqual(data["latitude"], 39.9334)
        self.assertEqual(data["longitude"], 32.8597)

    def test_location_field_internal_value_validation_branches(self) -> None:
        """Location field validates shape, number format, and coordinate ranges."""
        field = LocationField()

        self.assertIsNone(field.to_internal_value(None))
        self.assertIsNone(field.to_internal_value("   "))

        with self.assertRaises(serializers.ValidationError):
            field.to_internal_value({"lat": 39.0})

        with self.assertRaises(serializers.ValidationError):
            field.to_internal_value({"latitude": "north", "longitude": "east"})

        with self.assertRaises(serializers.ValidationError):
            field.to_internal_value({"latitude": 200, "longitude": 300})

        point = cast(Point, field.to_internal_value({"latitude": 39.9334, "longitude": 32.8597}))
        self.assertAlmostEqual(point.y, 39.9334)
        self.assertAlmostEqual(point.x, 32.8597)

    def test_availability_slot_serializer_handles_missing_booked_profile(self) -> None:
        """bookedBy/sessionId are null when no booking profile/session is available."""
        user_without_profile = User.objects.create_user(
            email="booker-no-profile@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        start_at = timezone.now() + timedelta(days=2)
        slot = AvailabilitySlot.objects.create(
            profile=self.profile,
            start_at=start_at,
            end_at=start_at + timedelta(hours=1),
            is_booked=True,
            booked_by=user_without_profile,
            booked_at=timezone.now(),
        )

        data = cast(dict[str, Any], AvailabilitySlotSerializer(slot).data)

        self.assertIsNone(data["bookedBy"])
        self.assertIsNone(data["sessionId"])


class AvailabilityBookingServicesTests(TestCase):
    """Unit tests for slot booking and cancellation domain services."""

    def setUp(self) -> None:
        self.mentor_user = User.objects.create_user(
            email="service-mentor@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.mentor_profile = Profile.objects.create(
            user=self.mentor_user,
            display_name="Service Mentor",
        )

        self.mentee_user = User.objects.create_user(
            email="service-mentee@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        self.mentee_profile = Profile.objects.create(
            user=self.mentee_user,
            display_name="Service Mentee",
        )

        self.other_user = User.objects.create_user(
            email="service-other@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        self.other_profile = Profile.objects.create(
            user=self.other_user,
            display_name="Service Other",
        )

    def test_book_availability_slot_success(self) -> None:
        """Service marks slot booked for valid future booking request."""
        start_at = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=start_at,
            end_at=start_at + timedelta(hours=1),
        )

        booked_slot = book_availability_slot(
            profile=self.mentor_profile,
            slot_id=slot.id,
            actor=self.mentee_user,
        )

        self.assertTrue(booked_slot.is_booked)
        self.assertEqual(booked_slot.booked_by, self.mentee_user)
        self.assertIsNotNone(booked_slot.booked_at)

    def test_book_availability_slot_rejects_past_slot(self) -> None:
        """Service rejects booking for slots that already started."""
        start_at = timezone.now() - timedelta(hours=2)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=start_at,
            end_at=start_at + timedelta(hours=1),
        )

        with self.assertRaises(SlotInPastError):
            book_availability_slot(
                profile=self.mentor_profile,
                slot_id=slot.id,
                actor=self.mentee_user,
            )

    def test_book_availability_slot_rejects_already_booked(self) -> None:
        """Service rejects booking requests for already booked slots."""
        start_at = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=start_at,
            end_at=start_at + timedelta(hours=1),
            is_booked=True,
            booked_by=self.other_user,
            booked_at=timezone.now(),
        )

        with self.assertRaises(SlotAlreadyBookedError):
            book_availability_slot(
                profile=self.mentor_profile,
                slot_id=slot.id,
                actor=self.mentee_user,
            )

    def test_book_availability_slot_rejects_mentor_booking_own_slot(self) -> None:
        """Service rejects when mentor tries to book their own slot."""
        start_at = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=start_at,
            end_at=start_at + timedelta(hours=1),
        )

        with self.assertRaises(OwnSlotBookingError):
            book_availability_slot(
                profile=self.mentor_profile,
                slot_id=slot.id,
                actor=self.mentor_user,
            )

    def test_cancel_availability_booking_rejects_unbooked_slot(self) -> None:
        """Service rejects cancellation for slots not currently booked."""
        start_at = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=start_at,
            end_at=start_at + timedelta(hours=1),
        )

        with self.assertRaises(SlotNotBookedError):
            cancel_availability_booking(
                profile=self.mentor_profile,
                slot_id=slot.id,
                actor=self.mentor_user,
            )

    def test_cancel_availability_booking_rejects_non_owner_non_mentor(self) -> None:
        """Service allows only booking owner or mentor to cancel."""
        start_at = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=start_at,
            end_at=start_at + timedelta(hours=1),
            is_booked=True,
            booked_by=self.mentee_user,
            booked_at=timezone.now(),
        )

        with self.assertRaises(BookingCancelNotAllowedError):
            cancel_availability_booking(
                profile=self.mentor_profile,
                slot_id=slot.id,
                actor=self.other_user,
            )

    def test_cancel_availability_booking_succeeds_for_mentor(self) -> None:
        """Mentor can cancel bookings on their own slot."""
        start_at = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=start_at,
            end_at=start_at + timedelta(hours=1),
            is_booked=True,
            booked_by=self.mentee_user,
            booked_at=timezone.now(),
        )

        canceled_slot = cancel_availability_booking(
            profile=self.mentor_profile,
            slot_id=slot.id,
            actor=self.mentor_user,
        )

        self.assertFalse(canceled_slot.is_booked)
        self.assertIsNone(canceled_slot.booked_by)
        self.assertIsNone(canceled_slot.booked_at)

    def test_cancel_availability_booking_succeeds_for_booking_owner(self) -> None:
        """Booking owner can cancel their own booking."""
        start_at = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=start_at,
            end_at=start_at + timedelta(hours=1),
            is_booked=True,
            booked_by=self.mentee_user,
            booked_at=timezone.now(),
        )

        canceled_slot = cancel_availability_booking(
            profile=self.mentor_profile,
            slot_id=slot.id,
            actor=self.mentee_user,
        )

        self.assertFalse(canceled_slot.is_booked)
        self.assertIsNone(canceled_slot.booked_by)

    def test_cancel_availability_booking_unlinks_accepted_requests(self) -> None:
        """Canceling booking detaches accepted requests while preserving initial session times."""
        start_at = timezone.now() + timedelta(days=2)
        end_at = start_at + timedelta(hours=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=start_at,
            end_at=end_at,
            is_booked=True,
            booked_by=self.mentee_user,
            booked_at=timezone.now(),
        )
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=slot,
            status=MentorshipRequest.Status.ACCEPTED,
        )

        cancel_availability_booking(
            profile=self.mentor_profile,
            slot_id=slot.id,
            actor=self.mentor_user,
        )

        request_obj.refresh_from_db()
        slot.refresh_from_db()

        self.assertIsNone(request_obj.slot)
        self.assertEqual(request_obj.initial_session_start_at, start_at)
        self.assertEqual(request_obj.initial_session_end_at, end_at)
        self.assertFalse(slot.is_booked)


class CommunityTagsAPITests(TestCase):
    """Integration tests for Community Tags (Public Groups) API."""

    def setUp(self) -> None:
        """Create test users, profiles, and authenticated API clients."""
        from accounts.models import UserRole

        self.client: Any = APIClient()

        # Regular authenticated user
        self.user = User.objects.create_user(
            email="tag-user@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.profile = Profile.objects.create(
            user=self.user,
            display_name="Tag User",
            is_visible=True,
        )
        self.access_token = str(RefreshToken.for_user(self.user).access_token)

        # Second user
        self.user2 = User.objects.create_user(
            email="tag-user2@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.profile2 = Profile.objects.create(
            user=self.user2,
            display_name="Tag User 2",
            is_visible=True,
        )
        self.access_token2 = str(RefreshToken.for_user(self.user2).access_token)

        # Admin user
        self.admin_user = User.objects.create_user(
            email="tag-admin@example.com",
            password="SecurePass123",
            role=UserRole.ADMIN,
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.admin_profile = Profile.objects.create(
            user=self.admin_user,
            display_name="Admin User",
        )
        self.admin_access_token = str(RefreshToken.for_user(self.admin_user).access_token)

        # URLs
        self.list_url = "/api/profiles/tags/"
        self.my_tags_url = "/api/profiles/me/tags/"

        # Clean seeded tags for deterministic tests
        from profiles.models import CommunityTag
        CommunityTag.objects.all().delete()

    def _auth(self, token=None):
        """Set authorization header."""
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token or self.access_token}"
        )

    def _create_tag(self, name="Test Tag", description="A test tag", token=None):
        """Helper to create a tag via API."""
        self._auth(token)
        return self.client.post(
            self.list_url,
            {"name": name, "description": description},
            format="json",
        )

    # ---- CRUD Tests ----

    def test_create_tag_success(self) -> None:
        """Authenticated user can create a community tag."""
        response = self._create_tag("Python Devs", "Python developers group")

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["name"], "Python Devs")
        self.assertEqual(data["slug"], "python-devs")
        self.assertEqual(data["member_count"], 0)
        self.assertEqual(data["created_by_username"], self.profile.username)

    def test_create_tag_unauthenticated_returns_401(self) -> None:
        """Unauthenticated users cannot create tags."""
        response = self.client.post(
            self.list_url,
            {"name": "Unauthorized Tag"},
            format="json",
        )

        self.assertEqual(response.status_code, 401)

    def test_create_tag_duplicate_name_case_insensitive(self) -> None:
        """Duplicate tag names are rejected case-insensitively."""
        self._create_tag("Frontend Club")

        response = self._create_tag("FRONTEND CLUB")

        self.assertEqual(response.status_code, 400)
        self.assertIn("name", response.json())

    def test_list_tags_public(self) -> None:
        """Anyone can list tags without authentication."""
        self._create_tag("Tag A")
        self._create_tag("Tag B")

        self.client.credentials()  # clear auth
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["count"], 2)
        self.assertEqual(len(data["results"]), 2)

    def test_list_tags_search(self) -> None:
        """Search filters tags by name or description."""
        self._create_tag("React Devs", "React developers")
        self._create_tag("Vue Fans", "Vue.js lovers")

        self.client.credentials()
        response = self.client.get(self.list_url, {"q": "react"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 1)
        self.assertEqual(response.json()["results"][0]["name"], "React Devs")

    def test_list_tags_pagination(self) -> None:
        """Pagination returns correct page size and count."""
        for i in range(5):
            self._create_tag(f"Tag {i:02d}")

        self.client.credentials()
        response = self.client.get(self.list_url, {"page": 1, "pageSize": 2})

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["count"], 5)
        self.assertEqual(len(data["results"]), 2)
        self.assertEqual(data["page"], 1)
        self.assertEqual(data["pageSize"], 2)

    def test_detail_tag_success(self) -> None:
        """Anyone can view tag details."""
        create_resp = self._create_tag("Detail Tag")
        tag_id = create_resp.json()["id"]

        self.client.credentials()
        response = self.client.get(f"/api/profiles/tags/{tag_id}/")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["name"], "Detail Tag")
        self.assertIn("is_member", data)
        self.assertFalse(data["is_member"])

    def test_detail_tag_not_found(self) -> None:
        """Non-existent tag returns 404."""
        fake_id = uuid.uuid4()
        response = self.client.get(f"/api/profiles/tags/{fake_id}/")

        self.assertEqual(response.status_code, 404)

    def test_delete_tag_by_creator_when_empty(self) -> None:
        """Creator can delete their own tag when no members."""
        create_resp = self._create_tag("Deletable Tag")
        tag_id = create_resp.json()["id"]

        self._auth()
        response = self.client.delete(f"/api/profiles/tags/{tag_id}/")

        self.assertEqual(response.status_code, 204)

    def test_delete_tag_by_creator_with_members_fails(self) -> None:
        """Creator cannot delete a tag that has members."""
        create_resp = self._create_tag("Popular Tag")
        tag_id = create_resp.json()["id"]

        # Join with user2
        self._auth(self.access_token2)
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")

        # Try delete as creator
        self._auth()
        response = self.client.delete(f"/api/profiles/tags/{tag_id}/")

        self.assertEqual(response.status_code, 400)
        self.assertIn("members", response.json()["detail"])

    def test_delete_tag_by_non_creator_fails(self) -> None:
        """Non-creator non-admin cannot delete a tag."""
        create_resp = self._create_tag("Protected Tag")
        tag_id = create_resp.json()["id"]

        self._auth(self.access_token2)
        response = self.client.delete(f"/api/profiles/tags/{tag_id}/")

        self.assertEqual(response.status_code, 403)

    def test_delete_tag_by_admin_succeeds(self) -> None:
        """Admin can delete any tag regardless of members."""
        create_resp = self._create_tag("Admin Deletable")
        tag_id = create_resp.json()["id"]

        # Add a member
        self._auth(self.access_token2)
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")

        # Admin deletes
        self._auth(self.admin_access_token)
        response = self.client.delete(f"/api/profiles/tags/{tag_id}/")

        self.assertEqual(response.status_code, 204)

    # ---- Join / Leave Tests ----

    def test_join_tag_success(self) -> None:
        """Authenticated user can join a tag."""
        create_resp = self._create_tag("Joinable Tag")
        tag_id = create_resp.json()["id"]

        self._auth()
        response = self.client.post(f"/api/profiles/tags/{tag_id}/join/")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["joined"])
        self.assertEqual(data["tag_name"], "Joinable Tag")

    def test_join_tag_updates_member_count(self) -> None:
        """Joining increments the denormalized member_count."""
        from profiles.models import CommunityTag

        create_resp = self._create_tag("Count Tag")
        tag_id = create_resp.json()["id"]

        self._auth()
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")

        self._auth(self.access_token2)
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")

        tag = CommunityTag.objects.get(id=tag_id)
        self.assertEqual(tag.member_count, 2)

    def test_join_tag_duplicate_returns_400(self) -> None:
        """Joining a tag twice returns 400."""
        create_resp = self._create_tag("Dup Join Tag")
        tag_id = create_resp.json()["id"]

        self._auth()
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")
        response = self.client.post(f"/api/profiles/tags/{tag_id}/join/")

        self.assertEqual(response.status_code, 400)
        self.assertIn("already a member", response.json()["detail"])

    def test_join_tag_unauthenticated_returns_401(self) -> None:
        """Unauthenticated user cannot join a tag."""
        create_resp = self._create_tag("Auth Join Tag")
        tag_id = create_resp.json()["id"]

        self.client.credentials()
        response = self.client.post(f"/api/profiles/tags/{tag_id}/join/")

        self.assertEqual(response.status_code, 401)

    def test_leave_tag_success(self) -> None:
        """Authenticated user can leave a tag."""
        create_resp = self._create_tag("Leavable Tag")
        tag_id = create_resp.json()["id"]

        self._auth()
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")
        response = self.client.delete(f"/api/profiles/tags/{tag_id}/leave/")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["joined"])

    def test_leave_tag_decrements_member_count(self) -> None:
        """Leaving decrements the denormalized member_count."""
        from profiles.models import CommunityTag

        create_resp = self._create_tag("Decrement Tag")
        tag_id = create_resp.json()["id"]

        self._auth()
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")

        self._auth(self.access_token2)
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")

        # user2 leaves
        self.client.delete(f"/api/profiles/tags/{tag_id}/leave/")

        tag = CommunityTag.objects.get(id=tag_id)
        self.assertEqual(tag.member_count, 1)

    def test_leave_tag_without_membership_returns_400(self) -> None:
        """Leaving a tag without membership returns 400."""
        create_resp = self._create_tag("No Membership Tag")
        tag_id = create_resp.json()["id"]

        self._auth()
        response = self.client.delete(f"/api/profiles/tags/{tag_id}/leave/")

        self.assertEqual(response.status_code, 400)
        self.assertIn("not a member", response.json()["detail"])

    # ---- My Tags Tests ----

    def test_my_tags_returns_joined_tags_only(self) -> None:
        """My tags endpoint returns only tags the user has joined."""
        resp1 = self._create_tag("My Tag 1")
        resp2 = self._create_tag("My Tag 2")
        self._create_tag("Not Joined Tag")

        self._auth()
        self.client.post(f"/api/profiles/tags/{resp1.json()['id']}/join/")
        self.client.post(f"/api/profiles/tags/{resp2.json()['id']}/join/")

        response = self.client.get(self.my_tags_url)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 2)
        names = {t["name"] for t in data}
        self.assertIn("My Tag 1", names)
        self.assertIn("My Tag 2", names)

    def test_my_tags_unauthenticated_returns_401(self) -> None:
        """My tags endpoint requires authentication."""
        response = self.client.get(self.my_tags_url)

        self.assertEqual(response.status_code, 401)

    # ---- Discover Integration Tests ----

    def test_discover_filter_by_tag_slug(self) -> None:
        """Mentor search filters by community tag slug."""
        create_resp = self._create_tag("Discover Tag")
        tag_id = create_resp.json()["id"]
        tag_slug = create_resp.json()["slug"]

        # user joins tag
        self._auth()
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")

        # user2 does NOT join
        self.client.credentials()
        response = self.client.get(f"/api/profiles/?tags={tag_slug}")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        profile_ids = [r["id"] for r in data["results"]]
        self.assertIn(str(self.profile.id), profile_ids)
        self.assertNotIn(str(self.profile2.id), profile_ids)

    def test_discover_filter_by_tag_name(self) -> None:
        """Mentor search filters by community tag name."""
        create_resp = self._create_tag("Name Filter Tag")
        tag_id = create_resp.json()["id"]

        self._auth()
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")

        self.client.credentials()
        response = self.client.get("/api/profiles/", {"tags": "Name Filter Tag"})

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(data["count"], 1)

    def test_discover_without_tag_filter_returns_all(self) -> None:
        """Without tag filter, discover returns all visible mentors."""
        self.client.credentials()
        response = self.client.get("/api/profiles/")

        self.assertEqual(response.status_code, 200)

    # ---- Detail is_member field Tests ----

    def test_detail_is_member_true_for_joined_user(self) -> None:
        """Tag detail shows is_member=true for a joined user."""
        create_resp = self._create_tag("Member Check Tag")
        tag_id = create_resp.json()["id"]

        self._auth()
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")

        response = self.client.get(f"/api/profiles/tags/{tag_id}/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["is_member"])

    def test_detail_is_member_false_for_non_member(self) -> None:
        """Tag detail shows is_member=false for a non-member."""
        create_resp = self._create_tag("Non Member Check")
        tag_id = create_resp.json()["id"]

        self._auth(self.access_token2)
        response = self.client.get(f"/api/profiles/tags/{tag_id}/")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["is_member"])

    # ---- Tag Update (PATCH) Tests (#434) ----

    def test_update_tag_creator_can_edit_description(self) -> None:
        """The tag creator can update their own tag's description."""
        create_resp = self._create_tag("Editable Tag", "old description")
        tag_id = create_resp.json()["id"]

        self._auth()
        response = self.client.patch(
            f"/api/profiles/tags/{tag_id}/",
            {"description": "new description"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["description"], "new description")

    def test_update_tag_admin_can_edit_any_tag(self) -> None:
        """An admin can edit a tag they did not create."""
        create_resp = self._create_tag("Admin Editable", "before")
        tag_id = create_resp.json()["id"]

        self._auth(self.admin_access_token)
        response = self.client.patch(
            f"/api/profiles/tags/{tag_id}/",
            {"description": "after"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["description"], "after")

    def test_update_tag_other_user_returns_403(self) -> None:
        """A non-creator non-admin user gets 403."""
        create_resp = self._create_tag("Forbidden Edit", "x")
        tag_id = create_resp.json()["id"]

        self._auth(self.access_token2)
        response = self.client.patch(
            f"/api/profiles/tags/{tag_id}/",
            {"description": "hacked"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_update_tag_unauthenticated_returns_401(self) -> None:
        """Anonymous PATCH is rejected."""
        create_resp = self._create_tag("Anon Edit", "x")
        tag_id = create_resp.json()["id"]

        self.client.credentials()
        response = self.client.patch(
            f"/api/profiles/tags/{tag_id}/",
            {"description": "no auth"},
            format="json",
        )

        self.assertEqual(response.status_code, 401)

    def test_update_tag_nonexistent_returns_404(self) -> None:
        """PATCH on a missing tag returns 404."""
        fake_id = uuid.uuid4()
        self._auth()
        response = self.client.patch(
            f"/api/profiles/tags/{fake_id}/",
            {"description": "ghost"},
            format="json",
        )

        self.assertEqual(response.status_code, 404)

    def test_update_tag_name_and_slug_are_immutable(self) -> None:
        """Attempts to change name or slug are silently ignored."""
        from profiles.models import CommunityTag

        create_resp = self._create_tag("Original Name", "desc")
        tag_id = create_resp.json()["id"]
        original_slug = create_resp.json()["slug"]

        self._auth()
        response = self.client.patch(
            f"/api/profiles/tags/{tag_id}/",
            {
                "name": "Hijacked Name",
                "slug": "hijacked-slug",
                "description": "still updates",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["name"], "Original Name")
        self.assertEqual(body["slug"], original_slug)
        self.assertEqual(body["description"], "still updates")

        tag = CommunityTag.objects.get(id=tag_id)
        self.assertEqual(tag.name, "Original Name")
        self.assertEqual(tag.slug, original_slug)

    def test_update_tag_empty_payload_is_noop(self) -> None:
        """An empty PATCH does not raise and leaves the tag unchanged."""
        create_resp = self._create_tag("Stable Tag", "stays")
        tag_id = create_resp.json()["id"]

        self._auth()
        response = self.client.patch(
            f"/api/profiles/tags/{tag_id}/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["description"], "stays")
    # ---- Popular Tags Tests (#433) ----

    def _seed_tag_with_members(
        self,
        name: str,
        member_count: int,
        joined_at=None,
    ) -> "CommunityTag":  # type: ignore[name-defined]
        """Create a tag and synthesize its memberships, optionally setting joined_at."""
        from accounts.models import AppUsageMode
        from profiles.models import CommunityTag, CommunityTagMembership
        from django.utils.text import slugify

        tag = CommunityTag.objects.create(name=name, slug=slugify(name))
        for i in range(member_count):
            user = User.objects.create_user(
                email=f"popular-{slugify(name)}-{i}@example.com",
                password="SecurePass123",
                app_usage_mode=AppUsageMode.MENTOR,
            )
            profile = Profile.objects.create(
                user=user, display_name=f"PM {name} {i}", is_visible=True
            )
            membership = CommunityTagMembership.objects.create(profile=profile, tag=tag)
            if joined_at is not None:
                CommunityTagMembership.objects.filter(id=membership.id).update(
                    joined_at=joined_at
                )
        CommunityTag.objects.filter(id=tag.id).update(member_count=member_count)
        tag.refresh_from_db()
        return tag

    def test_popular_all_time_orders_by_member_count(self) -> None:
        """All-time popular returns tags ordered by member_count desc."""
        self._seed_tag_with_members("Big", 5)
        self._seed_tag_with_members("Medium", 3)
        self._seed_tag_with_members("Small", 1)

        self.client.credentials()
        response = self.client.get("/api/profiles/tags/popular/")

        self.assertEqual(response.status_code, 200)
        names = [t["name"] for t in response.json()]
        self.assertEqual(names, ["Big", "Medium", "Small"])

    def test_popular_excludes_zero_member_tags(self) -> None:
        """Tags with no members are not included in the popular list."""
        self._seed_tag_with_members("Has Members", 2)
        self._create_tag("Empty Tag")  # zero members

        self.client.credentials()
        response = self.client.get("/api/profiles/tags/popular/")

        self.assertEqual(response.status_code, 200)
        names = [t["name"] for t in response.json()]
        self.assertIn("Has Members", names)
        self.assertNotIn("Empty Tag", names)

    def test_popular_tie_breaker_on_creation(self) -> None:
        """When member counts tie, more recently created tag wins."""
        from profiles.models import CommunityTag

        old_tag = self._seed_tag_with_members("Older", 2)
        # force older creation timestamp
        CommunityTag.objects.filter(id=old_tag.id).update(
            created_at=timezone.now() - timedelta(days=10)
        )
        self._seed_tag_with_members("Newer", 2)

        self.client.credentials()
        response = self.client.get("/api/profiles/tags/popular/")

        self.assertEqual(response.status_code, 200)
        names = [t["name"] for t in response.json()]
        self.assertEqual(names.index("Newer"), 0)
        self.assertEqual(names.index("Older"), 1)

    def test_popular_limit_respected(self) -> None:
        """The `limit` query param caps the number of returned tags."""
        for i in range(5):
            self._seed_tag_with_members(f"PT {i}", i + 1)

        self.client.credentials()
        response = self.client.get("/api/profiles/tags/popular/", {"limit": 3})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 3)

    def test_popular_limit_capped_at_max(self) -> None:
        """`limit` values above the cap are clamped to the maximum."""
        # cap is 50; passing 9999 should still return at most 50.
        for i in range(3):
            self._seed_tag_with_members(f"Cap {i}", 1)

        self.client.credentials()
        response = self.client.get("/api/profiles/tags/popular/", {"limit": 9999})

        self.assertEqual(response.status_code, 200)
        # only 3 tags exist, so we get 3 — the test ensures no error from huge limit
        self.assertLessEqual(len(response.json()), 50)

    def test_popular_invalid_limit_returns_400(self) -> None:
        """Non-integer limit returns 400."""
        response = self.client.get("/api/profiles/tags/popular/", {"limit": "abc"})
        self.assertEqual(response.status_code, 400)

    def test_popular_invalid_window_returns_400(self) -> None:
        """Unknown window value returns 400."""
        response = self.client.get("/api/profiles/tags/popular/", {"window": "1y"})
        self.assertEqual(response.status_code, 400)

    def test_popular_window_filters_by_join_time(self) -> None:
        """7d window only counts memberships joined in the last 7 days."""
        old_cutoff = timezone.now() - timedelta(days=30)
        # this tag's members all joined long ago — should be excluded from 7d
        self._seed_tag_with_members("Old Joins", 5, joined_at=old_cutoff)
        # this tag's members joined recently
        self._seed_tag_with_members("Fresh Joins", 2)

        self.client.credentials()
        response = self.client.get("/api/profiles/tags/popular/", {"window": "7d"})

        self.assertEqual(response.status_code, 200)
        names = [t["name"] for t in response.json()]
        self.assertIn("Fresh Joins", names)
        self.assertNotIn("Old Joins", names)

    def test_popular_empty_when_no_tags(self) -> None:
        """Empty result when no tags have members."""
        from profiles.models import CommunityTag
        CommunityTag.objects.all().delete()

        self.client.credentials()
        response = self.client.get("/api/profiles/tags/popular/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])
    # ---- Members List Tests (#432) ----

    def test_members_list_public_access(self) -> None:
        """Anyone can list a tag's members without authentication."""
        create_resp = self._create_tag("Members Public")
        tag_id = create_resp.json()["id"]

        # creator joins
        self._auth()
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")
        # another user joins
        self._auth(self.access_token2)
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")

        self.client.credentials()
        response = self.client.get(f"/api/profiles/tags/{tag_id}/members/")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["count"], 2)
        self.assertEqual(len(data["results"]), 2)

    def test_members_list_orders_by_recent_join(self) -> None:
        """Members are listed with most recently joined first."""
        create_resp = self._create_tag("Order Tag")
        tag_id = create_resp.json()["id"]

        self._auth()
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")
        self._auth(self.access_token2)
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")

        self.client.credentials()
        response = self.client.get(f"/api/profiles/tags/{tag_id}/members/")

        self.assertEqual(response.status_code, 200)
        ids = [r["id"] for r in response.json()["results"]]
        self.assertEqual(ids[0], str(self.profile2.id))
        self.assertEqual(ids[1], str(self.profile.id))

    def test_members_list_pagination(self) -> None:
        """Pagination respects pageSize and reports total count."""
        from accounts.models import AppUsageMode

        create_resp = self._create_tag("Pagination Tag")
        tag_id = create_resp.json()["id"]

        # add three members
        self._auth()
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")
        self._auth(self.access_token2)
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")

        user3 = User.objects.create_user(
            email="tag-user3@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        Profile.objects.create(user=user3, display_name="Tag User 3", is_visible=True)
        token3 = str(RefreshToken.for_user(user3).access_token)
        self._auth(token3)
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")

        self.client.credentials()
        response = self.client.get(
            f"/api/profiles/tags/{tag_id}/members/",
            {"page": 1, "pageSize": 2},
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["count"], 3)
        self.assertEqual(len(data["results"]), 2)
        self.assertEqual(data["page"], 1)
        self.assertEqual(data["pageSize"], 2)

    def test_members_list_excludes_hidden_profiles(self) -> None:
        """Profiles with is_visible=False are not included in the response."""
        create_resp = self._create_tag("Hidden Tag")
        tag_id = create_resp.json()["id"]

        self._auth()
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")
        self._auth(self.access_token2)
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")

        # hide profile2
        self.profile2.is_visible = False
        self.profile2.save(update_fields=["is_visible"])

        self.client.credentials()
        response = self.client.get(f"/api/profiles/tags/{tag_id}/members/")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["count"], 1)
        ids = [r["id"] for r in data["results"]]
        self.assertIn(str(self.profile.id), ids)
        self.assertNotIn(str(self.profile2.id), ids)

    def test_members_list_honors_show_initials_only(self) -> None:
        """When a member has show_initials_only, the response shows initials."""
        create_resp = self._create_tag("Initials Tag")
        tag_id = create_resp.json()["id"]

        self.profile.show_initials_only = True
        self.profile.save(update_fields=["show_initials_only"])

        self._auth()
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")

        self.client.credentials()
        response = self.client.get(f"/api/profiles/tags/{tag_id}/members/")

        self.assertEqual(response.status_code, 200)
        result = next(r for r in response.json()["results"] if r["id"] == str(self.profile.id))
        # display_name "Tag User" → initials "TU"
        self.assertNotEqual(result["full_name"], "Tag User")

    def test_members_list_empty_tag(self) -> None:
        """An empty tag returns an empty results array with count zero."""
        create_resp = self._create_tag("Empty Tag")
        tag_id = create_resp.json()["id"]

        self.client.credentials()
        response = self.client.get(f"/api/profiles/tags/{tag_id}/members/")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["count"], 0)
        self.assertEqual(data["results"], [])

    def test_members_list_nonexistent_tag_returns_404(self) -> None:
        """Requesting members of a nonexistent tag returns 404."""
        fake_id = uuid.uuid4()
        response = self.client.get(f"/api/profiles/tags/{fake_id}/members/")

        self.assertEqual(response.status_code, 404)

    def test_members_list_invalid_pagination_returns_400(self) -> None:
        """Non-integer page/pageSize returns 400."""
        create_resp = self._create_tag("Bad Pagination")
        tag_id = create_resp.json()["id"]

        response = self.client.get(
            f"/api/profiles/tags/{tag_id}/members/",
            {"page": "abc"},
        )

        self.assertEqual(response.status_code, 400)


class CommunityTagNotificationTests(TestCase):
    """Tests for notification side effects of community tag events (#435)."""

    def setUp(self) -> None:
        from accounts.models import UserRole

        self.client: Any = APIClient()

        self.creator_user = User.objects.create_user(
            email="creator@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.creator_profile = Profile.objects.create(
            user=self.creator_user, display_name="Creator", is_visible=True
        )
        self.creator_token = str(RefreshToken.for_user(self.creator_user).access_token)

        self.member_user = User.objects.create_user(
            email="member@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.member_profile = Profile.objects.create(
            user=self.member_user, display_name="Member", is_visible=True
        )
        self.member_token = str(RefreshToken.for_user(self.member_user).access_token)

        self.admin_user = User.objects.create_user(
            email="notif-admin@example.com",
            password="SecurePass123",
            role=UserRole.ADMIN,
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.admin_profile = Profile.objects.create(
            user=self.admin_user, display_name="Admin", is_visible=True
        )
        self.admin_token = str(RefreshToken.for_user(self.admin_user).access_token)

        from profiles.models import CommunityTag
        CommunityTag.objects.all().delete()
        from notifications.models import Notification
        Notification.objects.all().delete()

    def _auth(self, token: str) -> None:
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def _create_tag_via_api(self, name: str, description: str = "") -> str:
        self._auth(self.creator_token)
        resp = self.client.post(
            "/api/profiles/tags/",
            {"name": name, "description": description},
            format="json",
        )
        return resp.json()["id"]

    # ---- TAG_NEW_MEMBER ----

    def test_new_member_notifies_tag_creator(self) -> None:
        from notifications.models import Notification, NotificationType

        tag_id = self._create_tag_via_api("Notif Tag")
        Notification.objects.all().delete()  # clear interest-match noise

        self._auth(self.member_token)
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")

        notifs = Notification.objects.filter(
            user=self.creator_user, type=NotificationType.TAG_NEW_MEMBER
        )
        self.assertEqual(notifs.count(), 1)
        self.assertEqual(notifs.first().actor_id, self.member_profile.id)

    def test_creator_self_join_does_not_notify(self) -> None:
        from notifications.models import Notification, NotificationType

        tag_id = self._create_tag_via_api("Self Join")
        Notification.objects.all().delete()

        self._auth(self.creator_token)
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")

        self.assertEqual(
            Notification.objects.filter(
                user=self.creator_user, type=NotificationType.TAG_NEW_MEMBER
            ).count(),
            0,
        )

    # ---- TAG_DESCRIPTION_UPDATED ----

    def test_description_update_notifies_members_excluding_actor(self) -> None:
        from notifications.models import Notification, NotificationType

        tag_id = self._create_tag_via_api("Desc Tag", "old")
        # member joins
        self._auth(self.member_token)
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")
        Notification.objects.all().delete()

        # creator edits the description (creator is the actor)
        self._auth(self.creator_token)
        resp = self.client.patch(
            f"/api/profiles/tags/{tag_id}/",
            {"description": "new"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)

        member_notifs = Notification.objects.filter(
            user=self.member_user, type=NotificationType.TAG_DESCRIPTION_UPDATED
        )
        creator_notifs = Notification.objects.filter(
            user=self.creator_user, type=NotificationType.TAG_DESCRIPTION_UPDATED
        )
        self.assertEqual(member_notifs.count(), 1)
        self.assertEqual(creator_notifs.count(), 0)

    def test_unchanged_description_patch_does_not_notify(self) -> None:
        from notifications.models import Notification, NotificationType

        tag_id = self._create_tag_via_api("Same Desc", "stays")
        self._auth(self.member_token)
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")
        Notification.objects.all().delete()

        self._auth(self.creator_token)
        self.client.patch(
            f"/api/profiles/tags/{tag_id}/",
            {"description": "stays"},
            format="json",
        )

        self.assertEqual(
            Notification.objects.filter(type=NotificationType.TAG_DESCRIPTION_UPDATED).count(),
            0,
        )

    # ---- TAG_DELETED ----

    def test_tag_deletion_notifies_members_excluding_actor(self) -> None:
        from profiles.models import CommunityTag, CommunityTagMembership
        from notifications.models import Notification, NotificationType

        # admin route lets us delete a tag that has members
        tag_id = self._create_tag_via_api("Doomed Tag")
        self._auth(self.member_token)
        self.client.post(f"/api/profiles/tags/{tag_id}/join/")
        Notification.objects.all().delete()

        # admin deletes — admin is actor
        self._auth(self.admin_token)
        resp = self.client.delete(f"/api/profiles/tags/{tag_id}/")
        self.assertEqual(resp.status_code, 204)

        member_notifs = Notification.objects.filter(
            user=self.member_user, type=NotificationType.TAG_DELETED
        )
        admin_notifs = Notification.objects.filter(
            user=self.admin_user, type=NotificationType.TAG_DELETED
        )
        self.assertEqual(member_notifs.count(), 1)
        self.assertEqual(admin_notifs.count(), 0)

    # ---- TAG_MATCHES_INTEREST ----

    def test_tag_creation_notifies_users_with_matching_skills(self) -> None:
        from notifications.models import Notification, NotificationType

        # member has the matching skill, creator does not
        self.member_profile.skills = ["Python", "Django"]
        self.member_profile.save(update_fields=["skills"])

        self._create_tag_via_api("Python Devs")

        notifs = Notification.objects.filter(
            user=self.member_user, type=NotificationType.TAG_MATCHES_INTEREST
        )
        self.assertEqual(notifs.count(), 1)

    def test_tag_creation_skips_creator_for_interest_match(self) -> None:
        from notifications.models import Notification, NotificationType

        self.creator_profile.skills = ["Python"]
        self.creator_profile.save(update_fields=["skills"])

        self._create_tag_via_api("Python Devs")

        self.assertEqual(
            Notification.objects.filter(
                user=self.creator_user, type=NotificationType.TAG_MATCHES_INTEREST
            ).count(),
            0,
        )

    def test_tag_creation_does_not_notify_when_no_skills_match(self) -> None:
        from notifications.models import Notification, NotificationType

        self.member_profile.skills = ["Carpentry"]
        self.member_profile.save(update_fields=["skills"])

        self._create_tag_via_api("Astrophysics")

        self.assertEqual(
            Notification.objects.filter(type=NotificationType.TAG_MATCHES_INTEREST).count(),
            0,
        )

