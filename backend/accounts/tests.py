from datetime import timedelta
from typing import Any

from django.contrib.auth.models import Group
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    AuthProvider,
    AvailabilitySlot,
    ExpertiseField,
    Match,
    MentorshipMode,
    MentorshipRequest,
    Profile,
    ProfileExpertise,
    User,
    UserRole,
)


class UserModelTests(TestCase):
    """Unit tests for User model and UserManager."""

    def test_create_user(self) -> None:
        """Test creating a regular user."""
        user = User.objects.create_user(
            email="test@example.com",
            password="SecurePass123",
        )

        self.assertEqual(user.email, "test@example.com")
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.check_password("SecurePass123"))

    def test_create_user_email_normalized(self) -> None:
        """Test that email is normalized (lowercase)."""
        user = User.objects.create_user(
            email="Test@EXAMPLE.COM",
            password="SecurePass123",
        )

        self.assertEqual(user.email, "test@example.com")

    def test_create_user_without_email_raises_error(self) -> None:
        """Test that creating user without email raises ValueError."""
        with self.assertRaises(ValueError):
            User.objects.create_user(email="", password="SecurePass123")

    def test_create_superuser(self) -> None:
        """Test creating a superuser."""
        admin = User.objects.create_superuser(
            email="admin@example.com",
            password="AdminPass123",
        )

        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.is_active)
        self.assertEqual(admin.role, UserRole.ADMIN)
        self.assertEqual(admin.auth_provider, AuthProvider.LOCAL)

    def test_user_password_hashing(self) -> None:
        """Test that passwords are hashed, not stored plainly."""
        user = User.objects.create_user(
            email="test@example.com",
            password="PlainPassword123",
        )

        self.assertNotEqual(user.password, "PlainPassword123")
        self.assertTrue(user.check_password("PlainPassword123"))


class RegisterAPIViewTests(TestCase):
    """Integration tests for user registration endpoint."""

    def setUp(self) -> None:
        """Set up test client and seed default groups."""
        self.api_client: Any = APIClient()
        self.register_url = "/api/auth/register/"

        # Ensure USER group exists (mimics migration)
        Group.objects.get_or_create(name=UserRole.USER)

    def test_register_success(self) -> None:
        """Test successful user registration."""
        payload = {
            "email": "newuser@example.com",
            "password": "SecurePass123",
            "confirm_password": "SecurePass123",
        }

        response = self.api_client.post(self.register_url, payload)

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertIn("refresh_token", data)
        self.assertEqual(data["user"]["email"], "newuser@example.com")
        self.assertEqual(data["user"]["role"], UserRole.USER)
        self.assertTrue(data["user"]["is_active"])

        # Verify user was created in DB
        user = User.objects.get(email="newuser@example.com")
        self.assertTrue(user.check_password("SecurePass123"))

    def test_register_email_normalization(self) -> None:
        """Test that email is normalized on registration."""
        payload = {
            "email": "NewUser@EXAMPLE.COM",
            "password": "SecurePass123",
            "confirm_password": "SecurePass123",
        }

        response = self.api_client.post(self.register_url, payload)

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["user"]["email"], "newuser@example.com")

    def test_register_duplicate_email(self) -> None:
        """Test that duplicate email registration fails."""
        User.objects.create_user(
            email="existing@example.com",
            password="Pass123",
        )

        payload = {
            "email": "existing@example.com",
            "password": "SecurePass123",
            "confirm_password": "SecurePass123",
        }

        response = self.api_client.post(self.register_url, payload)

        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("email", data)

    def test_register_password_mismatch(self) -> None:
        """Test that mismatched passwords fail validation."""
        payload = {
            "email": "test@example.com",
            "password": "SecurePass123",
            "confirm_password": "DifferentPass456",
        }

        response = self.api_client.post(self.register_url, payload)

        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("confirm_password", data)

    def test_register_weak_password(self) -> None:
        """Test that weak passwords fail Django validation."""
        payload = {
            "email": "test@example.com",
            "password": "123",  # Too short
            "confirm_password": "123",
        }

        response = self.api_client.post(self.register_url, payload)

        self.assertEqual(response.status_code, 400)

    def test_register_common_password(self) -> None:
        """Test that common passwords fail validation."""
        payload = {
            "email": "test@example.com",
            "password": "password123",  # Common password
            "confirm_password": "password123",
        }

        response = self.api_client.post(self.register_url, payload)

        self.assertEqual(response.status_code, 400)

    def test_register_invalid_email(self) -> None:
        """Test that invalid email format is rejected."""
        payload = {
            "email": "not-an-email",
            "password": "SecurePass123",
            "confirm_password": "SecurePass123",
        }

        response = self.api_client.post(self.register_url, payload)

        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("email", data)

    def test_register_user_assigned_to_group(self) -> None:
        """Test that newly registered user is assigned to USER group."""
        payload = {
            "email": "test@example.com",
            "password": "SecurePass123",
            "confirm_password": "SecurePass123",
        }

        response = self.api_client.post(self.register_url, payload)

        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email="test@example.com")
        self.assertTrue(user.groups.filter(name=UserRole.USER).exists())

    def test_register_response_does_not_include_password(self) -> None:
        """Test that response doesn't expose password."""
        payload = {
            "email": "test@example.com",
            "password": "SecurePass123",
            "confirm_password": "SecurePass123",
        }

        response = self.api_client.post(self.register_url, payload)

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertNotIn("password", data)
        self.assertNotIn("password", data["user"])


class LoginAPIViewTests(TestCase):
    """Integration tests for user login endpoint."""

    def setUp(self) -> None:
        """Set up test client and create a test user."""
        self.api_client: Any = APIClient()
        self.login_url = "/api/auth/login/"

        self.user = User.objects.create_user(
            email="testuser@example.com",
            password="SecurePass123",
            is_active=True,
        )

    def test_login_success(self) -> None:
        """Test successful login."""
        payload = {
            "email": "testuser@example.com",
            "password": "SecurePass123",
        }

        response = self.api_client.post(self.login_url, payload)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertIn("refresh_token", data)
        self.assertEqual(data["user"]["email"], "testuser@example.com")
        self.assertEqual(data["user"]["role"], UserRole.USER)

    def test_login_email_case_insensitive(self) -> None:
        """Test that login email is case-insensitive."""
        payload = {
            "email": "TESTUSER@EXAMPLE.COM",
            "password": "SecurePass123",
        }

        response = self.api_client.post(self.login_url, payload)

        self.assertEqual(response.status_code, 200)

    def test_login_invalid_email(self) -> None:
        """Test login with non-existent email."""
        payload = {
            "email": "nonexistent@example.com",
            "password": "SecurePass123",
        }

        response = self.api_client.post(self.login_url, payload)

        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("Invalid email or password", str(data))

    def test_login_invalid_password(self) -> None:
        """Test login with wrong password."""
        payload = {
            "email": "testuser@example.com",
            "password": "WrongPassword123",
        }

        response = self.api_client.post(self.login_url, payload)

        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("Invalid email or password", str(data))

    def test_login_inactive_user(self) -> None:
        """Test that inactive users cannot login."""
        User.objects.create_user(
            email="inactive@example.com",
            password="SecurePass123",
            is_active=False,
        )

        payload = {
            "email": "inactive@example.com",
            "password": "SecurePass123",
        }

        response = self.api_client.post(self.login_url, payload)

        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("inactive", str(data).lower())

    def test_login_banned_user(self) -> None:
        """Test that banned users cannot login."""
        User.objects.create_user(
            email="banned@example.com",
            password="SecurePass123",
            is_active=True,
            is_banned=True,
        )

        payload = {
            "email": "banned@example.com",
            "password": "SecurePass123",
        }

        response = self.api_client.post(self.login_url, payload)

        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("banned", str(data).lower())

    def test_login_invalid_email_format(self) -> None:
        """Test login with invalid email format."""
        payload = {
            "email": "not-an-email",
            "password": "SecurePass123",
        }

        response = self.api_client.post(self.login_url, payload)

        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("email", data)

    def test_login_response_does_not_include_password(self) -> None:
        """Test that response doesn't expose password."""
        payload = {
            "email": "testuser@example.com",
            "password": "SecurePass123",
        }

        response = self.api_client.post(self.login_url, payload)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertNotIn("password", data)
        self.assertNotIn("password", data["user"])

    def test_login_missing_email(self) -> None:
        """Test login without email."""
        payload = {
            "password": "SecurePass123",
        }

        response = self.api_client.post(self.login_url, payload)

        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("email", data)

    def test_login_missing_password(self) -> None:
        """Test login without password."""
        payload = {
            "email": "testuser@example.com",
        }

        response = self.api_client.post(self.login_url, payload)

        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("password", data)


class LogoutAPIViewTests(TestCase):
    """Integration tests for user logout endpoint."""

    def setUp(self) -> None:
        """Set up authenticated client and JWT tokens."""
        self.api_client: Any = APIClient()
        self.logout_url = "/api/auth/logout/"

        self.user = User.objects.create_user(
            email="logoutuser@example.com",
            password="SecurePass123",
            is_active=True,
        )
        refresh = RefreshToken.for_user(self.user)
        self.access_token = str(refresh.access_token)
        self.refresh_token = str(refresh)

    def test_logout_success_blacklists_refresh_token(self) -> None:
        """Test authenticated logout blacklists refresh token."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        payload = {"refresh_token": self.refresh_token}

        response = self.api_client.post(self.logout_url, payload)

        self.assertEqual(response.status_code, 205)
        self.assertTrue(BlacklistedToken.objects.filter(token__token=self.refresh_token).exists())

    def test_logout_requires_authentication(self) -> None:
        """Test logout endpoint rejects unauthenticated requests."""
        payload = {"refresh_token": self.refresh_token}

        response = self.api_client.post(self.logout_url, payload)

        self.assertEqual(response.status_code, 401)

    def test_logout_with_invalid_refresh_token(self) -> None:
        """Test logout rejects malformed refresh token."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        payload = {"refresh_token": "invalid-token"}

        response = self.api_client.post(self.logout_url, payload)

        self.assertEqual(response.status_code, 400)


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


class MentorshipRequestModelTests(TestCase):
    """Unit tests for MentorshipRequest and Match domain logic."""

    def setUp(self) -> None:
        """Prepare mentor and mentee profiles for request/match tests."""
        mentor_user = User.objects.create_user(
            email="mentor.request@example.com",
            password="SecurePass123",
        )
        mentee_user = User.objects.create_user(
            email="mentee.request@example.com",
            password="SecurePass123",
        )

        self.mentor_profile = Profile.objects.create(
            user=mentor_user,
            display_name="Mentor Request",
            mentorship_mode=MentorshipMode.MENTOR,
        )
        self.mentee_profile = Profile.objects.create(
            user=mentee_user,
            display_name="Mentee Request",
            mentorship_mode=MentorshipMode.MENTEE,
        )

    def test_default_status_is_pending(self) -> None:
        """New mentorship requests default to PENDING."""
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            cover_letter="Can we discuss backend architecture?",
        )

        self.assertEqual(request_obj.status, MentorshipRequest.Status.PENDING)

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
        request_obj.refresh_from_db()

        self.assertIsNotNone(request_obj.responded_at)

    def test_responded_at_set_when_request_rejected(self) -> None:
        """responded_at is auto-populated when request becomes REJECTED."""
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
        )

        request_obj.status = MentorshipRequest.Status.REJECTED
        request_obj.save()
        request_obj.refresh_from_db()

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
        request_obj.refresh_from_db()

        self.assertIsNone(request_obj.responded_at)
