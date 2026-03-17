from django.contrib.auth.models import Group
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken

from .models import AuthProvider, User, UserRole


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
        self.client = APIClient()
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

        response = self.client.post(self.register_url, payload)

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

        response = self.client.post(self.register_url, payload)

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

        response = self.client.post(self.register_url, payload)

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

        response = self.client.post(self.register_url, payload)

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

        response = self.client.post(self.register_url, payload)

        self.assertEqual(response.status_code, 400)

    def test_register_common_password(self) -> None:
        """Test that common passwords fail validation."""
        payload = {
            "email": "test@example.com",
            "password": "password123",  # Common password
            "confirm_password": "password123",
        }

        response = self.client.post(self.register_url, payload)

        self.assertEqual(response.status_code, 400)

    def test_register_invalid_email(self) -> None:
        """Test that invalid email format is rejected."""
        payload = {
            "email": "not-an-email",
            "password": "SecurePass123",
            "confirm_password": "SecurePass123",
        }

        response = self.client.post(self.register_url, payload)

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

        response = self.client.post(self.register_url, payload)

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

        response = self.client.post(self.register_url, payload)

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertNotIn("password", data)
        self.assertNotIn("password", data["user"])


class LoginAPIViewTests(TestCase):
    """Integration tests for user login endpoint."""

    def setUp(self) -> None:
        """Set up test client and create a test user."""
        self.client = APIClient()
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

        response = self.client.post(self.login_url, payload)

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

        response = self.client.post(self.login_url, payload)

        self.assertEqual(response.status_code, 200)

    def test_login_invalid_email(self) -> None:
        """Test login with non-existent email."""
        payload = {
            "email": "nonexistent@example.com",
            "password": "SecurePass123",
        }

        response = self.client.post(self.login_url, payload)

        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("Invalid email or password", str(data))

    def test_login_invalid_password(self) -> None:
        """Test login with wrong password."""
        payload = {
            "email": "testuser@example.com",
            "password": "WrongPassword123",
        }

        response = self.client.post(self.login_url, payload)

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

        response = self.client.post(self.login_url, payload)

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

        response = self.client.post(self.login_url, payload)

        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("banned", str(data).lower())

    def test_login_invalid_email_format(self) -> None:
        """Test login with invalid email format."""
        payload = {
            "email": "not-an-email",
            "password": "SecurePass123",
        }

        response = self.client.post(self.login_url, payload)

        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("email", data)

    def test_login_response_does_not_include_password(self) -> None:
        """Test that response doesn't expose password."""
        payload = {
            "email": "testuser@example.com",
            "password": "SecurePass123",
        }

        response = self.client.post(self.login_url, payload)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertNotIn("password", data)
        self.assertNotIn("password", data["user"])

    def test_login_missing_email(self) -> None:
        """Test login without email."""
        payload = {
            "password": "SecurePass123",
        }

        response = self.client.post(self.login_url, payload)

        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("email", data)

    def test_login_missing_password(self) -> None:
        """Test login without password."""
        payload = {
            "email": "testuser@example.com",
        }

        response = self.client.post(self.login_url, payload)

        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("password", data)


class LogoutAPIViewTests(TestCase):
    """Integration tests for user logout endpoint."""

    def setUp(self) -> None:
        """Set up authenticated client and JWT tokens."""
        self.client = APIClient()
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
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        payload = {"refresh_token": self.refresh_token}

        response = self.client.post(self.logout_url, payload)

        self.assertEqual(response.status_code, 205)
        self.assertTrue(BlacklistedToken.objects.filter(token__token=self.refresh_token).exists())

    def test_logout_requires_authentication(self) -> None:
        """Test logout endpoint rejects unauthenticated requests."""
        payload = {"refresh_token": self.refresh_token}

        response = self.client.post(self.logout_url, payload)

        self.assertEqual(response.status_code, 401)

    def test_logout_with_invalid_refresh_token(self) -> None:
        """Test logout rejects malformed refresh token."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        payload = {"refresh_token": "invalid-token"}

        response = self.client.post(self.logout_url, payload)

        self.assertEqual(response.status_code, 400)
