"""Tests for profiles domain models."""

from datetime import datetime, timedelta
from typing import Any

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import AppUsageMode
from mentorship.models import MentorshipRequest
from profiles.models import AvailabilitySlot, ExpertiseField, Profile, ProfileExpertise, Skill

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

        self.python_expertise, _ = ExpertiseField.objects.get_or_create(
            name="Python/Django",
            defaults={"description": "Backend development"},
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

    def test_profile_expertise_unique_per_profile(self) -> None:
        """Same expertise cannot be inserted twice for the same profile."""
        ProfileExpertise.objects.create(
            profile=self.mentor_profile,
            expertise_field=self.python_expertise,
            proficiency_level=4,
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                ProfileExpertise.objects.create(
                    profile=self.mentor_profile,
                    expertise_field=self.python_expertise,
                    proficiency_level=3,
                )

    def test_profile_expertise_proficiency_level_constraint(self) -> None:
        """Proficiency level must be within the configured range."""
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                ProfileExpertise.objects.create(
                    profile=self.mentor_profile,
                    expertise_field=self.python_expertise,
                    proficiency_level=6,
                )

    def test_profile_expertise_update_rating(self) -> None:
        """Rating helper updates average rating and count correctly."""
        profile_expertise = ProfileExpertise.objects.create(
            profile=self.mentor_profile,
            expertise_field=self.python_expertise,
            proficiency_level=5,
        )

        profile_expertise.update_rating(4)
        profile_expertise.refresh_from_db()
        self.assertEqual(profile_expertise.rating_count, 1)
        self.assertEqual(float(profile_expertise.average_rating), 4)

        profile_expertise.update_rating(2)
        profile_expertise.refresh_from_db()
        self.assertEqual(profile_expertise.rating_count, 2)
        self.assertEqual(float(profile_expertise.average_rating), 3)

    def test_profile_expertise_update_rating_rejects_out_of_range(self) -> None:
        """Rating helper rejects ratings outside the 0 to 5 range."""
        profile_expertise = ProfileExpertise.objects.create(
            profile=self.mentor_profile,
            expertise_field=self.python_expertise,
        )

        with self.assertRaises(ValueError):
            profile_expertise.update_rating(5.5)

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

    def test_get_profile_success(self) -> None:
        """Authenticated user can get own profile by username."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.owner_access_token}")

        response = self.api_client.get(self.owner_url)

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        # Mentee profile response shape
        self.assertIn("full_name", payload)
        self.assertEqual(payload["full_name"], "Owner User")
        self.assertIn("eager_to_learn", payload)

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
        self.assertIn("expertises", payload)
        self.assertIn("rating", payload)
        self.assertIn("total_mentee_count", payload)
        self.assertIn("available_slots", payload)

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

    def test_patch_profile_success(self) -> None:
        """Authenticated user can patch own profile by username."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.owner_access_token}")
        payload = {
            "display_name": "Owner Updated",
            "bio": "Updated bio",
        }

        response = self.api_client.patch(self.owner_url, payload)

        self.assertEqual(response.status_code, 200)
        self.owner_profile.refresh_from_db()
        self.assertEqual(self.owner_profile.display_name, "Owner Updated")
        self.assertEqual(self.owner_profile.bio, "Updated bio")

    def test_patch_profile_accepts_blank_location(self) -> None:
        """Blank string location is accepted and normalized to null."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.owner_access_token}")

        response = self.api_client.patch(
            self.owner_url,
            {"location": ""},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.owner_profile.refresh_from_db()
        self.assertIsNone(self.owner_profile.location)

    def test_patch_mentee_profile_skills_with_eager_to_learn(self) -> None:
        """Mentees can patch skills using eager_to_learn alias."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.owner_access_token}")

        response = self.api_client.patch(
            self.owner_url,
            {"eager_to_learn": ["Data Science", "Machine Learning"]},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.owner_profile.refresh_from_db()
        self.assertEqual(self.owner_profile.skills, ["Data Science", "Machine Learning"])

    def test_patch_mentor_profile_skills_with_expertises(self) -> None:
        """Mentors can patch skills using expertises alias."""
        mentor_refresh = RefreshToken.for_user(self.other_user)
        mentor_access_token = str(mentor_refresh.access_token)
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {mentor_access_token}")

        response = self.api_client.patch(
            self.other_url,
            {"expertises": ["System Design", "Python"]},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.other_profile.refresh_from_db()
        self.assertEqual(self.other_profile.skills, ["System Design", "Python"])

    def test_patch_profile_requires_authentication(self) -> None:
        """PATCH endpoint returns 401 when request is unauthenticated."""
        response = self.api_client.patch(
            self.owner_url,
            {"display_name": "No Auth"},
        )

        self.assertEqual(response.status_code, 401)

    def test_patch_profile_returns_404_for_non_owner(self) -> None:
        """Authenticated users cannot patch another user's profile by username."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.owner_access_token}")

        response = self.api_client.patch(
            self.other_url,
            {"display_name": "Should Not Update"},
        )

        self.assertEqual(response.status_code, 404)
        self.other_profile.refresh_from_db()
        self.assertEqual(self.other_profile.display_name, "Other User")

    def test_mentee_profile_hidden_field_reflects_visibility(self) -> None:
        """Mentee profile 'hidden' field is the inverse of is_visible."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.owner_access_token}")

        response = self.api_client.get(self.owner_url)
        payload = response.json()

        self.assertEqual(response.status_code, 200)
        # owner_profile has is_visible=True by default, so hidden should be False
        self.assertFalse(payload["hidden"])

    def test_mentor_profile_includes_skills_as_expertises(self) -> None:
        """Mentor profile returns skills under 'expertises' key."""
        self.other_profile.is_visible = True
        self.other_profile.skills = ["Machine Learning"]
        self.other_profile.save()

        response = self.api_client.get(self.other_url)

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload["expertises"]), 1)
        self.assertEqual(payload["expertises"][0], "Machine Learning")

    def test_mentee_profile_includes_skills_as_eager_to_learn(self) -> None:
        """Mentee profile returns skills under 'eager_to_learn' key."""
        self.owner_profile.skills = ["Data Science"]
        self.owner_profile.save()

        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.owner_access_token}")
        response = self.api_client.get(self.owner_url)

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload["eager_to_learn"]), 1)
        self.assertEqual(payload["eager_to_learn"][0], "Data Science")


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

    def test_create_availability_slot_success(self) -> None:
        """Mentor can create a slot with date/startTime/endTime payload."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")
        payload = {
            "date": (timezone.localdate() + timedelta(days=1)).isoformat(),
            "startTime": "10:00:00",
            "endTime": "11:00:00",
        }

        response = self.api_client.post(self.collection_url, payload)

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

        response = self.api_client.post(self.collection_url, payload)

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

        response = self.api_client.post(self.collection_url, payload)

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

    def test_patch_availability_slot_success(self) -> None:
        """Mentor can update own slot via PATCH."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")
        slot_start = timezone.now() + timedelta(days=3)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
        )
        detail_url = f"/api/profiles/{self.mentor_profile.username}/availability-slots/{slot.id}/"

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
        """Mentor can delete own availability slot."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")
        slot_start = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
        )
        detail_url = f"/api/profiles/{self.mentor_profile.username}/availability-slots/{slot.id}/"

        response = self.api_client.delete(detail_url)

        self.assertEqual(response.status_code, 204)
        self.assertFalse(AvailabilitySlot.objects.filter(id=slot.id).exists())

    def test_delete_slot_after_canceling_accepted_first_session(self) -> None:
        """Mentor can delete first-session slot after booking cancellation."""
        slot_start = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
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

        cancel_url = (
            f"/api/profiles/{self.mentor_profile.username}/availability-slots/{slot.id}/"
            "cancel-booking/"
        )
        detail_url = f"/api/profiles/{self.mentor_profile.username}/availability-slots/{slot.id}/"

        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentee_access_token}")
        cancel_response = self.api_client.post(cancel_url)
        self.assertEqual(cancel_response.status_code, 200)

        request_obj.refresh_from_db()
        self.assertIsNone(request_obj.slot)
        self.assertEqual(request_obj.initial_session_start_at, slot.start_at)
        self.assertEqual(request_obj.initial_session_end_at, slot.end_at)

        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")
        delete_response = self.api_client.delete(detail_url)

        self.assertEqual(delete_response.status_code, 204)
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

        detail_url = f"/api/profiles/{self.mentor_profile.username}/availability-slots/{slot.id}/"
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

        detail_url = f"/api/profiles/{self.mentor_profile.username}/availability-slots/{slot.id}/"
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
        detail_url = (
            f"/api/profiles/{self.other_mentor_profile.username}/availability-slots/{slot.id}/"
        )

        response = self.api_client.delete(detail_url)

        self.assertEqual(response.status_code, 403)
        self.assertTrue(AvailabilitySlot.objects.filter(id=slot.id).exists())

    def test_mentee_cannot_create_or_delete_slots(self) -> None:
        """Mentees cannot manage availability slots."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentee_access_token}")
        payload = {
            "date": (timezone.localdate() + timedelta(days=1)).isoformat(),
            "startTime": "10:00:00",
            "endTime": "11:00:00",
        }

        create_response = self.api_client.post(self.collection_url, payload)
        self.assertEqual(create_response.status_code, 403)

        slot_start = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
        )
        detail_url = f"/api/profiles/{self.mentor_profile.username}/availability-slots/{slot.id}/"
        delete_response = self.api_client.delete(detail_url)

        self.assertEqual(delete_response.status_code, 403)

    def test_other_authenticated_user_can_get_mentor_slots(self) -> None:
        """Other authenticated users can read a mentor's availability slots."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentee_access_token}")
        slot_start = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
        )

        list_response = self.api_client.get(self.collection_url)
        detail_response = self.api_client.get(
            f"/api/profiles/{self.mentor_profile.username}/availability-slots/{slot.id}/"
        )

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(detail_response.status_code, 200)

    def test_non_owner_cannot_create_for_other_mentor_username(self) -> None:
        """Authenticated non-owners cannot create slots for another mentor."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentee_access_token}")

        response = self.api_client.post(
            self.collection_url,
            {
                "date": (timezone.localdate() + timedelta(days=1)).isoformat(),
                "startTime": "10:00:00",
                "endTime": "11:00:00",
            },
        )

        self.assertEqual(response.status_code, 403)

    def test_create_availability_slot_requires_authentication(self) -> None:
        """Unauthenticated requests cannot create availability slots."""
        response = self.api_client.post(
            self.collection_url,
            {
                "date": (timezone.localdate() + timedelta(days=1)).isoformat(),
                "startTime": "10:00:00",
                "endTime": "11:00:00",
            },
        )

        self.assertEqual(response.status_code, 401)


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

    def test_cancel_booking_by_booking_owner_success(self) -> None:
        """Booking owner can cancel their booking."""
        slot_start = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
            is_booked=True,
            booked_by=self.mentee_user,
            booked_at=timezone.now(),
        )
        cancel_url = (
            f"/api/profiles/{self.mentor_profile.username}/availability-slots/{slot.id}/"
            "cancel-booking/"
        )

        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentee_access_token}")
        response = self.api_client.post(cancel_url)

        self.assertEqual(response.status_code, 200)
        slot.refresh_from_db()
        self.assertFalse(slot.is_booked)
        self.assertIsNone(slot.booked_by)
        self.assertIsNone(slot.booked_at)

    def test_cancel_booking_by_mentor_owner_success(self) -> None:
        """Mentor owner can cancel booking on their own slot."""
        slot_start = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
            is_booked=True,
            booked_by=self.mentee_user,
            booked_at=timezone.now(),
        )
        cancel_url = (
            f"/api/profiles/{self.mentor_profile.username}/availability-slots/{slot.id}/"
            "cancel-booking/"
        )

        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")
        response = self.api_client.post(cancel_url)

        self.assertEqual(response.status_code, 200)
        slot.refresh_from_db()
        self.assertFalse(slot.is_booked)

    def test_cancel_booking_rejects_unrelated_user(self) -> None:
        """Unrelated users cannot cancel someone else's booking."""
        slot_start = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
            is_booked=True,
            booked_by=self.mentee_user,
            booked_at=timezone.now(),
        )
        cancel_url = (
            f"/api/profiles/{self.mentor_profile.username}/availability-slots/{slot.id}/"
            "cancel-booking/"
        )

        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.other_access_token}")
        response = self.api_client.post(cancel_url)

        self.assertEqual(response.status_code, 403)

    def test_cancel_booking_rejects_unbooked_slot(self) -> None:
        """Cancellation fails when slot is currently not booked."""
        slot_start = timezone.now() + timedelta(days=1)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=slot_start,
            end_at=slot_start + timedelta(hours=1),
        )
        cancel_url = (
            f"/api/profiles/{self.mentor_profile.username}/availability-slots/{slot.id}/"
            "cancel-booking/"
        )

        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.mentor_access_token}")
        response = self.api_client.post(cancel_url)

        self.assertEqual(response.status_code, 400)


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

        returned_names = {p["full_name"] for p in payload["results"]}
        # Only visible mentors should be included.
        self.assertIn("Alice Mentor", returned_names)
        self.assertIn("JD", returned_names)  # initials due to show_initials_only
        self.assertIn("Bob Zed", returned_names)
        self.assertNotIn("Private Mentor", returned_names)
        # Default discovery is mentors only.
        self.assertNotIn("Mentee Person", returned_names)

    def test_search_by_q_matches_display_name(self) -> None:
        """`q` filters by name/keyword fields."""
        response = self.api_client.get("/api/profiles/", {"q": "Alice"})
        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["full_name"], "Alice Mentor")

    def test_filter_by_skill_term(self) -> None:
        """`skill` query param matches profile skills."""
        response = self.api_client.get("/api/profiles/", {"skill": "React"})
        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["full_name"], "JD")
        self.assertEqual(payload["results"][0]["expertises"], ["React"])

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
