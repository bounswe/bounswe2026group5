"""Tests for profiles domain models."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from profiles.models import (
    AvailabilitySlot,
    ExpertiseField,
    MentorshipMode,
    Profile,
    ProfileExpertise,
)

User = get_user_model()


class ProfileModelsTests(TestCase):
    """Unit tests for profile page models and constraints."""

    def setUp(self) -> None:
        """Create test users, profiles, and a sample expertise record."""
        self.mentor_user = User.objects.create_user(
            email="mentor@example.com",
            password="SecurePass123",
        )
        self.mentee_user = User.objects.create_user(
            email="mentee@example.com",
            password="SecurePass123",
        )

        self.mentor_profile = Profile.objects.create(
            user=self.mentor_user,
            display_name="Mentor User",
            mentorship_mode=MentorshipMode.MENTOR,
        )
        self.mentee_profile = Profile.objects.create(
            user=self.mentee_user,
            display_name="Mentee User",
            mentorship_mode=MentorshipMode.MENTEE,
        )

        self.python_expertise, _ = ExpertiseField.objects.get_or_create(
            name="Python/Django",
            defaults={"description": "Backend development"},
        )

    def test_profile_creation_supports_both_mode(self) -> None:
        """Profile supports users who are both mentors and mentees."""
        both_user = User.objects.create_user(
            email="both@example.com",
            password="SecurePass123",
        )

        both_profile = Profile.objects.create(
            user=both_user,
            display_name="Both User",
            mentorship_mode=MentorshipMode.BOTH,
        )

        self.assertEqual(both_profile.mentorship_mode, MentorshipMode.BOTH)

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