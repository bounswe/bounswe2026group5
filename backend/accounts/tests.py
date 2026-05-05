from datetime import timedelta
from typing import Any, cast
from unittest.mock import Mock, patch

from django.conf import settings
from django.contrib.auth.models import AnonymousUser, Group
from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone
from drf_spectacular.openapi import AutoSchema
from rest_framework import status
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from profiles.models import Profile

from .models import (
    AppUsageMode,
    AuthProvider,
    EmailVerificationToken,
    PasswordResetToken,
    Report,
    ReportReason,
    ReportStatus,
    User,
    UserRole,
)
from .permissions import IsEmailVerified, IsRegularUser
from .schema import CookieOrHeaderJWTAuthenticationScheme
from .views import build_auth_response


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
        self.assertEqual(user.username, "test")

    def test_create_user_generates_unique_username(self) -> None:
        """Test that username generation appends numeric suffix on collision."""
        first_user = User.objects.create_user(
            email="same.user@example.com",
            password="SecurePass123",
        )
        second_user = User.objects.create_user(
            email="same_user@example.com",
            password="SecurePass123",
        )

        self.assertEqual(first_user.username, "same_user")
        self.assertEqual(second_user.username, "same_user_1")

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

    def test_create_user_without_password_sets_unusable_password(self) -> None:
        """Test that creating user without password sets an unusable password."""
        user = User.objects.create_user(email="nopassword@example.com")

        self.assertFalse(user.has_usable_password())

    def test_create_superuser_requires_is_staff_true(self) -> None:
        """Test that superuser creation rejects is_staff=False."""
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email="badstaff@example.com",
                password="AdminPass123",
                is_staff=False,
            )

    def test_create_superuser_requires_is_superuser_true(self) -> None:
        """Test that superuser creation rejects is_superuser=False."""
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email="badsuper@example.com",
                password="AdminPass123",
                is_superuser=False,
            )

    def test_user_str_returns_email(self) -> None:
        """Test string representation returns normalized email."""
        user = User.objects.create_user(
            email="StringUser@Example.com",
            password="SecurePass123",
        )

        self.assertEqual(str(user), "stringuser@example.com")


class RegisterAPIViewTests(TestCase):
    """Integration tests for user registration endpoint."""

    def setUp(self) -> None:
        """Set up test client and seed default groups."""
        self.api_client: Any = APIClient()
        self.register_url = "/api/auth/register/"

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
        self.assertIn(settings.AUTH_ACCESS_COOKIE_NAME, response.cookies)
        self.assertIn(settings.AUTH_REFRESH_COOKIE_NAME, response.cookies)
        self.assertEqual(data["user"]["email"], "newuser@example.com")
        self.assertEqual(data["user"]["username"], "newuser")
        self.assertEqual(data["user"]["role"], UserRole.USER)
        self.assertTrue(data["user"]["is_active"])

        # Verify user was created in DB
        user = User.objects.get(email="newuser@example.com")
        self.assertTrue(user.check_password("SecurePass123"))
        self.assertEqual(user.username, "newuser")
        profile = Profile.objects.get(user=user)
        self.assertEqual(profile.username, "newuser")

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

    def test_register_rejects_invalid_password_values(self) -> None:
        """Test that known invalid password values fail registration validation."""
        invalid_passwords = [
            "123",
            "password123",
        ]

        for idx, invalid_password in enumerate(invalid_passwords):
            with self.subTest(invalid_password=invalid_password):
                payload = {
                    "email": f"test{idx}@example.com",
                    "password": invalid_password,
                    "confirm_password": invalid_password,
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
        self.assertIn(settings.AUTH_ACCESS_COOKIE_NAME, response.cookies)
        self.assertIn(settings.AUTH_REFRESH_COOKIE_NAME, response.cookies)
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

    def test_logout_with_cookie_refresh_token(self) -> None:
        """Test logout accepts refresh token from HttpOnly cookie."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        self.api_client.cookies[settings.AUTH_REFRESH_COOKIE_NAME] = self.refresh_token

        response = self.api_client.post(self.logout_url, {})

        self.assertEqual(response.status_code, 205)
        self.assertTrue(BlacklistedToken.objects.filter(token__token=self.refresh_token).exists())

    def test_logout_requires_refresh_token_in_body_or_cookie(self) -> None:
        """Test logout fails when refresh token is missing from both body and cookie."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

        response = self.api_client.post(self.logout_url, {})

        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("refresh_token", data)

    def test_logout_success_clears_auth_cookies(self) -> None:
        """Test successful logout clears both access and refresh cookies."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

        response = self.api_client.post(self.logout_url, {"refresh_token": self.refresh_token})

        self.assertEqual(response.status_code, 205)
        self.assertIn(settings.AUTH_ACCESS_COOKIE_NAME, response.cookies)
        self.assertIn(settings.AUTH_REFRESH_COOKIE_NAME, response.cookies)
        self.assertEqual(str(response.cookies[settings.AUTH_ACCESS_COOKIE_NAME]["max-age"]), "0")
        self.assertEqual(str(response.cookies[settings.AUTH_REFRESH_COOKIE_NAME]["max-age"]), "0")


class TokenRefreshAPIViewTests(TestCase):
    """Tests for token refresh endpoint."""

    def setUp(self) -> None:
        self.api_client: Any = APIClient()
        self.user = User.objects.create_user(
            email="refreshme@example.com",
            password="SecurePass123",
            is_active=True,
        )
        self.profile = Profile.objects.create(
            user=self.user,
            username="refreshme",
            display_name="Refresh Me",
        )
        refresh = RefreshToken.for_user(self.user)
        self.access_token = str(refresh.access_token)
        self.refresh_token = str(refresh)

    def test_refresh_from_cookie_rotates_tokens(self) -> None:
        """Test token refresh succeeds when refresh token is supplied via cookie."""
        self.api_client.cookies[settings.AUTH_REFRESH_COOKIE_NAME] = self.refresh_token

        response = self.api_client.post("/api/auth/token/refresh/", {})

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("access", data)
        self.assertIn(settings.AUTH_ACCESS_COOKIE_NAME, response.cookies)
        self.assertIn(settings.AUTH_REFRESH_COOKIE_NAME, response.cookies)

    def test_refresh_from_request_body_without_cookie(self) -> None:
        """Test token refresh accepts a refresh token from request body."""
        response = self.api_client.post(
            "/api/auth/token/refresh/",
            {"refresh": self.refresh_token},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("access", data)

    def test_refresh_without_body_or_cookie_fails(self) -> None:
        """Test token refresh fails when no refresh token is provided."""
        response = self.api_client.post("/api/auth/token/refresh/", {})

        self.assertEqual(response.status_code, 400)

    @patch("accounts.views.TokenRefreshAPIView.get_serializer")
    def test_refresh_sets_access_cookie_only_when_serializer_returns_access_only(
        self,
        mocked_get_serializer: Mock,
    ) -> None:
        """Test refresh response sets only access cookie without a refresh token."""
        mocked_serializer = Mock()
        mocked_serializer.is_valid.return_value = True
        mocked_serializer.validated_data = {"access": self.access_token}
        mocked_get_serializer.return_value = mocked_serializer

        response = self.api_client.post("/api/auth/token/refresh/", {})

        self.assertEqual(response.status_code, 200)
        self.assertIn(settings.AUTH_ACCESS_COOKIE_NAME, response.cookies)
        self.assertNotIn(settings.AUTH_REFRESH_COOKIE_NAME, response.cookies)

    def test_auth_me_endpoint_with_bearer_token(self) -> None:
        """Canonical self endpoint returns authenticated user metadata."""
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

        response = self.api_client.get("/api/auth/me/")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["email"], self.user.email)
        self.assertEqual(data["username"], self.profile.username)

    def test_auth_me_endpoint_with_cookie_token(self) -> None:
        """Canonical self endpoint accepts cookie-based JWT authentication."""
        self.api_client.cookies[settings.AUTH_ACCESS_COOKIE_NAME] = self.access_token

        response = self.api_client.get("/api/auth/me/")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["email"], self.user.email)

    def test_auth_me_invalid_header_falls_back_to_cookie(self) -> None:
        """Invalid Authorization header should fall back to cookie authentication."""
        self.api_client.credentials(HTTP_AUTHORIZATION="Token not-a-bearer-token")
        self.api_client.cookies[settings.AUTH_ACCESS_COOKIE_NAME] = self.access_token

        response = self.api_client.get("/api/auth/me/")

        self.assertEqual(response.status_code, 200)

    def test_auth_me_requires_authentication(self) -> None:
        """Canonical self endpoint returns 401 when no auth is provided."""
        response = self.api_client.get("/api/auth/me/")

        self.assertEqual(response.status_code, 401)

    def test_auth_me_banned_user_forbidden(self) -> None:
        """Canonical self endpoint blocks banned users with valid tokens."""
        banned_user = User.objects.create_user(
            email="authmebanned@example.com",
            password="SecurePass123",
            is_active=True,
            is_banned=True,
        )
        banned_access_token = str(RefreshToken.for_user(banned_user).access_token)
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {banned_access_token}")

        response = self.api_client.get("/api/auth/me/")

        self.assertEqual(response.status_code, 403)


class UserAppUsageModeMeAPIViewTests(TestCase):
    """Tests for PATCH /api/auth/me/role/."""

    def setUp(self) -> None:
        self.api_client: Any = APIClient()
        self.user = User.objects.create_user(
            email="modeuser@example.com",
            password="SecurePass123",
            is_active=True,
        )
        refresh = RefreshToken.for_user(self.user)
        self.access_token = str(refresh.access_token)
        self.url = "/api/auth/me/role/"

        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

    def test_can_set_mode_when_unset(self) -> None:
        """Users can assign their mode when it is not set yet."""
        response = self.api_client.patch(
            self.url,
            {"app_usage_mode": AppUsageMode.MENTEE},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db(from_queryset=None)
        self.assertEqual(self.user.app_usage_mode, AppUsageMode.MENTEE)

    def test_cannot_switch_mode_after_assignment(self) -> None:
        """Users cannot change role once a mode is already assigned."""
        self.user.app_usage_mode = AppUsageMode.MENTEE
        self.user.save(update_fields=["app_usage_mode"])

        response = self.api_client.patch(
            self.url,
            {"app_usage_mode": AppUsageMode.MENTOR},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("immutable", str(response.json()).lower())

        self.user.refresh_from_db(from_queryset=None)
        self.assertEqual(self.user.app_usage_mode, AppUsageMode.MENTEE)

    def test_same_mode_update_is_allowed(self) -> None:
        """Re-submitting the same assigned mode remains a no-op success."""
        self.user.app_usage_mode = AppUsageMode.MENTOR
        self.user.save(update_fields=["app_usage_mode"])

        response = self.api_client.patch(
            self.url,
            {"app_usage_mode": AppUsageMode.MENTOR},
            format="json",
        )

        self.assertEqual(response.status_code, 200)

    def test_mode_update_requires_authentication(self) -> None:
        """Unauthenticated users cannot update app usage mode."""
        self.api_client.credentials()

        response = self.api_client.patch(
            self.url,
            {"app_usage_mode": AppUsageMode.MENTEE},
            format="json",
        )

        self.assertEqual(response.status_code, 401)

    def test_blank_mode_is_rejected(self) -> None:
        """Blank app usage mode values fail validation."""
        response = self.api_client.patch(
            self.url,
            {"app_usage_mode": ""},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("app_usage_mode", response.json())


class AccountsHelpersAndPermissionsTests(TestCase):
    """Unit tests for accounts helpers, permissions, and schema extension."""

    def setUp(self) -> None:
        self.factory = APIRequestFactory()
        self.regular_user = User.objects.create_user(
            email="perm_user@example.com",
            password="SecurePass123",
            role=UserRole.USER,
            is_banned=False,
        )
        self.admin_user = User.objects.create_superuser(
            email="perm_admin@example.com",
            password="SecurePass123",
        )
        self.banned_user = User.objects.create_user(
            email="perm_banned@example.com",
            password="SecurePass123",
            role=UserRole.USER,
            is_banned=True,
        )

    def test_build_auth_response_generates_tokens_when_refresh_not_provided(self) -> None:
        """Helper generates refresh/access tokens when no refresh is passed in."""
        response_payload = build_auth_response(self.regular_user)
        user_payload = cast(dict[str, Any], response_payload["user"])

        self.assertIn("access_token", response_payload)
        self.assertIn("refresh_token", response_payload)
        self.assertEqual(user_payload["email"], self.regular_user.email)

    def test_is_regular_user_permission_matrix(self) -> None:
        """Permission allows only authenticated, non-banned regular users."""
        permission = IsRegularUser()
        cases = [
            (AnonymousUser(), False),
            (self.regular_user, True),
            (self.admin_user, False),
            (self.banned_user, False),
        ]

        for user, expected in cases:
            with self.subTest(user=type(user).__name__, expected=expected):
                request = self.factory.get("/api/messages/")
                request.user = user
                self.assertEqual(permission.has_permission(request, None), expected)

    def test_authentication_schema_extension_definition(self) -> None:
        """OpenAPI extension returns expected bearer security definition."""
        auto_schema = cast(AutoSchema, object())
        schema_extension = CookieOrHeaderJWTAuthenticationScheme(object())
        security_definition = schema_extension.get_security_definition(auto_schema)

        self.assertEqual(
            security_definition,
            {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
            },
        )


class RBACPermissionTests(TestCase):
    """Tests for role-based access control behavior on protected views."""

    def setUp(self) -> None:
        self.api_client: Any = APIClient()
        self.admin = User.objects.create_superuser(
            email="rbac_admin@test.com",
            password="Admin123!",
        )
        self.banned_admin = User.objects.create_superuser(
            email="rbac_banned_admin@test.com",
            password="BannedAdmin123!",
            is_banned=True,
        )
        self.user = User.objects.create_user(
            email="rbac_user@test.com",
            password="User123!",
        )
        self.banned = User.objects.create_user(
            email="rbac_banned@test.com",
            password="Banned123!",
            is_banned=True,
        )

    def _get_token(self, user: User) -> str:
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    def _get_refresh_token(self, user: User) -> str:
        return str(RefreshToken.for_user(user))

    def test_admin_only_endpoint_access_control(self) -> None:
        url = "/api/auth/admin/users/"

        # guest -> 401 unauthorized
        response = self.api_client.get(url)
        self.assertEqual(response.status_code, 401)

        # regular user -> 403 forbidden
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self._get_token(self.user)}")
        response = self.api_client.get(url)
        self.assertEqual(response.status_code, 403)

        # admin -> 200 ok
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self._get_token(self.admin)}")
        response = self.api_client.get(url)
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("count", payload)
        self.assertIn("results", payload)
        self.assertIsInstance(payload["results"], list)
        self.assertEqual(payload["count"], len(payload["results"]))

        if payload["results"]:
            first_user = payload["results"][0]
            self.assertIn("id", first_user)
            self.assertIn("email", first_user)
            self.assertIn("username", first_user)
            self.assertIn("role", first_user)
            self.assertIn("is_banned", first_user)
            self.assertIn("is_active", first_user)
            self.assertIn("created_at", first_user)
            self.assertIn("updated_at", first_user)

    def test_admin_only_endpoint_banned_admin_forbidden(self) -> None:
        url = "/api/auth/admin/users/"

        banned_admin_token = self._get_token(self.banned_admin)
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {banned_admin_token}")
        response = self.api_client.get(url)

        self.assertEqual(response.status_code, 403)

    def test_banned_user_cannot_refresh_token(self) -> None:
        refresh_url = "/api/auth/token/refresh/"
        payload = {"refresh": self._get_refresh_token(self.banned)}

        response = self.api_client.post(refresh_url, payload)

        self.assertEqual(response.status_code, 403)

    def test_profile_edit_requires_user_and_not_banned(self) -> None:
        # create profile for user
        Profile.objects.create(
            user=self.user,
            username="rbac_user",
            display_name="RBAC User",
        )
        Profile.objects.create(
            user=self.banned,
            username="rbac_banned",
            display_name="RBAC Banned",
        )

        url = "/api/profiles/me/"
        payload = {"title": "Updated Title"}

        # guest should be 401
        response = self.api_client.patch(url, payload)
        self.assertEqual(response.status_code, 401)

        # banned user should be 403
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self._get_token(self.banned)}")
        response = self.api_client.patch(url, payload)
        self.assertEqual(response.status_code, 403)

        # authenticated non-banned user should update own profile
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self._get_token(self.user)}")
        response = self.api_client.patch(url, payload)
        self.assertEqual(response.status_code, 200)


class PasswordResetTokenModelTests(TestCase):
    """Unit tests for the PasswordResetToken model helpers."""

    def setUp(self) -> None:
        self.user = User.objects.create_user(
            email="reset_model@example.com",
            password="OldPass123!",
        )

    def test_hash_token_is_deterministic_and_hex(self) -> None:
        h1 = PasswordResetToken.hash_token("abc")
        h2 = PasswordResetToken.hash_token("abc")
        self.assertEqual(h1, h2)
        self.assertEqual(len(h1), 64)
        self.assertNotEqual(h1, PasswordResetToken.hash_token("abcd"))

    def test_issue_for_user_stores_hash_not_raw_token(self) -> None:
        raw_token, instance = PasswordResetToken.issue_for_user(self.user)

        self.assertNotEqual(raw_token, instance.token_hash)
        self.assertEqual(instance.token_hash, PasswordResetToken.hash_token(raw_token))
        self.assertEqual(instance.user, self.user)
        self.assertIsNone(instance.used_at)
        self.assertGreater(instance.expires_at, timezone.now())

    def test_issue_for_user_invalidates_previous_active_tokens(self) -> None:
        _, first = PasswordResetToken.issue_for_user(self.user)
        self.assertIsNone(first.used_at)

        _, second = PasswordResetToken.issue_for_user(self.user)

        first.refresh_from_db()
        self.assertIsNotNone(first.used_at)
        self.assertIsNone(second.used_at)

    def test_is_valid_false_when_expired(self) -> None:
        _, instance = PasswordResetToken.issue_for_user(self.user)
        instance.expires_at = timezone.now() - timedelta(seconds=1)
        instance.save(update_fields=["expires_at"])

        self.assertFalse(instance.is_valid())

    def test_is_valid_false_when_used(self) -> None:
        _, instance = PasswordResetToken.issue_for_user(self.user)
        instance.mark_used()

        self.assertFalse(instance.is_valid())
        self.assertIsNotNone(instance.used_at)

    def test_token_uses_configured_lifetime(self) -> None:
        with override_settings(PASSWORD_RESET_TOKEN_LIFETIME_MINUTES=5):
            before = timezone.now()
            _, instance = PasswordResetToken.issue_for_user(self.user)
            delta = instance.expires_at - before
            # Allow small drift; the lifetime should be ~5 minutes.
            self.assertGreaterEqual(delta, timedelta(minutes=4, seconds=59))
            self.assertLessEqual(delta, timedelta(minutes=5, seconds=5))


class ForgotPasswordAPIViewTests(TestCase):
    """API tests for POST /api/auth/forgot-password/."""

    URL = "/api/auth/forgot-password/"

    def setUp(self) -> None:
        self.api_client = APIClient()
        self.user = User.objects.create_user(
            email="forgot@example.com",
            password="OldPass123!",
        )
        mail.outbox = []

    def test_forgot_password_sends_email_for_existing_user(self) -> None:
        response = self.api_client.post(self.URL, {"email": "forgot@example.com"})

        self.assertEqual(response.status_code, 200)
        self.assertIn("detail", response.data)

        self.assertEqual(len(mail.outbox), 1)
        sent = mail.outbox[0]
        self.assertIn(self.user.email, sent.to)
        self.assertIn("reset-password?token=", sent.body)

        # Token stored as hash only, exactly one active token.
        tokens = PasswordResetToken.objects.filter(user=self.user, used_at__isnull=True)
        self.assertEqual(tokens.count(), 1)
        stored = tokens.first()
        assert stored is not None
        self.assertNotIn(stored.token_hash, sent.body)

    def test_forgot_password_normalizes_email_case(self) -> None:
        response = self.api_client.post(self.URL, {"email": "Forgot@Example.COM"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(
            PasswordResetToken.objects.filter(user=self.user).count(),
            1,
        )

    def test_forgot_password_returns_generic_response_for_unknown_email(self) -> None:
        response = self.api_client.post(self.URL, {"email": "ghost@example.com"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(PasswordResetToken.objects.count(), 0)

    def test_forgot_password_skips_banned_users(self) -> None:
        self.user.is_banned = True
        self.user.save(update_fields=["is_banned"])

        response = self.api_client.post(self.URL, {"email": self.user.email})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(PasswordResetToken.objects.count(), 0)

    def test_forgot_password_skips_inactive_users(self) -> None:
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        response = self.api_client.post(self.URL, {"email": self.user.email})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)

    def test_forgot_password_requires_valid_email_format(self) -> None:
        response = self.api_client.post(self.URL, {"email": "not-an-email"})

        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    def test_forgot_password_invalidates_previous_token_when_reissued(self) -> None:
        self.api_client.post(self.URL, {"email": self.user.email})
        first_token = PasswordResetToken.objects.get(user=self.user, used_at__isnull=True)

        self.api_client.post(self.URL, {"email": self.user.email})

        first_token.refresh_from_db()
        self.assertIsNotNone(first_token.used_at)
        self.assertEqual(
            PasswordResetToken.objects.filter(user=self.user, used_at__isnull=True).count(),
            1,
        )


class ResetPasswordAPIViewTests(TestCase):
    """API tests for POST /api/auth/reset-password/."""

    URL = "/api/auth/reset-password/"
    NEW_PASSWORD = "BrandNewPass!234"

    def setUp(self) -> None:
        self.api_client = APIClient()
        self.user = User.objects.create_user(
            email="resetter@example.com",
            password="OldPass123!",
        )
        self.raw_token, self.reset_token = PasswordResetToken.issue_for_user(self.user)

    def _payload(self, **overrides: Any) -> dict[str, Any]:
        payload = {
            "token": self.raw_token,
            "new_password": self.NEW_PASSWORD,
            "confirm_password": self.NEW_PASSWORD,
        }
        payload.update(overrides)
        return payload

    def test_reset_password_succeeds_with_valid_token(self) -> None:
        response = self.api_client.post(self.URL, self._payload())

        self.assertEqual(response.status_code, 200)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.NEW_PASSWORD))
        self.assertFalse(self.user.check_password("OldPass123!"))

        self.reset_token.refresh_from_db()
        self.assertIsNotNone(self.reset_token.used_at)

    def test_reset_password_token_cannot_be_reused(self) -> None:
        first = self.api_client.post(self.URL, self._payload())
        self.assertEqual(first.status_code, 200)

        second = self.api_client.post(
            self.URL,
            self._payload(new_password="YetAnother!234", confirm_password="YetAnother!234"),
        )

        self.assertEqual(second.status_code, 400)
        self.assertIn("token", second.data)

    def test_reset_password_rejects_expired_token(self) -> None:
        self.reset_token.expires_at = timezone.now() - timedelta(minutes=1)
        self.reset_token.save(update_fields=["expires_at"])

        response = self.api_client.post(self.URL, self._payload())

        self.assertEqual(response.status_code, 400)
        self.assertIn("token", response.data)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OldPass123!"))

    def test_reset_password_rejects_invalid_token(self) -> None:
        response = self.api_client.post(self.URL, self._payload(token="does-not-exist"))

        self.assertEqual(response.status_code, 400)
        self.assertIn("token", response.data)

    def test_reset_password_rejects_mismatched_confirmation(self) -> None:
        response = self.api_client.post(
            self.URL,
            self._payload(confirm_password="DoesNotMatch!234"),
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("confirm_password", response.data)

    def test_reset_password_enforces_password_validation(self) -> None:
        response = self.api_client.post(
            self.URL,
            self._payload(new_password="short", confirm_password="short"),
        )

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OldPass123!"))

    def test_reset_password_rejects_token_for_banned_user(self) -> None:
        self.user.is_banned = True
        self.user.save(update_fields=["is_banned"])

        response = self.api_client.post(self.URL, self._payload())

        self.assertEqual(response.status_code, 400)
        self.assertIn("token", response.data)

    def test_reset_password_blacklists_existing_refresh_tokens(self) -> None:
        refresh = RefreshToken.for_user(self.user)
        self.assertTrue(OutstandingToken.objects.filter(user=self.user).exists())
        self.assertFalse(BlacklistedToken.objects.filter(token__jti=refresh["jti"]).exists())

        response = self.api_client.post(self.URL, self._payload())

        self.assertEqual(response.status_code, 200)
        self.assertTrue(BlacklistedToken.objects.filter(token__jti=refresh["jti"]).exists())


class EmailVerificationTokenModelTests(TestCase):
    """Unit tests for the EmailVerificationToken model helpers."""

    def setUp(self) -> None:
        self.user = User.objects.create_user(
            email="verify_model@example.com",
            password="SomePass123!",
        )

    def test_hash_token_is_deterministic_and_hex(self) -> None:
        h1 = EmailVerificationToken.hash_token("abc")
        h2 = EmailVerificationToken.hash_token("abc")
        self.assertEqual(h1, h2)
        self.assertEqual(len(h1), 64)
        self.assertNotEqual(h1, EmailVerificationToken.hash_token("abcd"))

    def test_issue_for_user_stores_hash_not_raw_token(self) -> None:
        raw_token, instance = EmailVerificationToken.issue_for_user(self.user)

        self.assertNotEqual(raw_token, instance.token_hash)
        self.assertEqual(instance.token_hash, EmailVerificationToken.hash_token(raw_token))
        self.assertEqual(instance.user, self.user)
        self.assertIsNone(instance.used_at)
        self.assertGreater(instance.expires_at, timezone.now())

    def test_issue_for_user_invalidates_previous_active_tokens(self) -> None:
        _, first = EmailVerificationToken.issue_for_user(self.user)
        self.assertIsNone(first.used_at)

        _, second = EmailVerificationToken.issue_for_user(self.user)

        first.refresh_from_db()
        self.assertIsNotNone(first.used_at)
        self.assertIsNone(second.used_at)

    def test_is_valid_false_when_expired(self) -> None:
        _, instance = EmailVerificationToken.issue_for_user(self.user)
        instance.expires_at = timezone.now() - timedelta(seconds=1)
        instance.save(update_fields=["expires_at"])

        self.assertFalse(instance.is_valid())

    def test_is_valid_false_when_used(self) -> None:
        _, instance = EmailVerificationToken.issue_for_user(self.user)
        instance.mark_used()

        self.assertFalse(instance.is_valid())

    def test_token_uses_configured_lifetime(self) -> None:
        with override_settings(EMAIL_VERIFICATION_TOKEN_LIFETIME_HOURS=2):
            before = timezone.now()
            _, instance = EmailVerificationToken.issue_for_user(self.user)
            delta = instance.expires_at - before
            self.assertGreaterEqual(delta, timedelta(hours=1, minutes=59))
            self.assertLessEqual(delta, timedelta(hours=2, minutes=1))


@override_settings(REQUIRE_EMAIL_VERIFICATION=True)
class RegistrationIssuesVerificationTokenTests(TestCase):
    """Ensures registration auto-issues an email verification token + sends email."""

    def setUp(self) -> None:
        self.api_client = APIClient()
        Group.objects.get_or_create(name=UserRole.USER)
        mail.outbox = []

    def test_new_user_starts_unverified(self) -> None:
        response = self.api_client.post(
            "/api/auth/register/",
            {
                "email": "fresh@example.com",
                "password": "SecurePass123",
                "confirm_password": "SecurePass123",
            },
        )
        self.assertEqual(response.status_code, 201)
        self.assertFalse(response.data["user"]["is_email_verified"])

        user = User.objects.get(email="fresh@example.com")
        self.assertFalse(user.is_email_verified)
        self.assertIsNone(user.email_verified_at)

    def test_registration_issues_verification_token_and_sends_email(self) -> None:
        response = self.api_client.post(
            "/api/auth/register/",
            {
                "email": "welcome@example.com",
                "password": "SecurePass123",
                "confirm_password": "SecurePass123",
            },
        )
        self.assertEqual(response.status_code, 201)

        user = User.objects.get(email="welcome@example.com")
        tokens = EmailVerificationToken.objects.filter(user=user, used_at__isnull=True)
        self.assertEqual(tokens.count(), 1)

        self.assertEqual(len(mail.outbox), 1)
        sent = mail.outbox[0]
        self.assertIn("welcome@example.com", sent.to)
        self.assertIn("verify-email?token=", sent.body)

        stored = tokens.first()
        assert stored is not None
        self.assertNotIn(stored.token_hash, sent.body)


class VerifyEmailAPIViewTests(TestCase):
    """API tests for GET /api/auth/verify-email/."""

    URL = "/api/auth/verify-email/"

    def setUp(self) -> None:
        self.api_client = APIClient()
        self.user = User.objects.create_user(
            email="unverified@example.com",
            password="SomePass123!",
        )
        # Override the grandfathered default (set in create_user only for existing rows at migrate
        # time). New users in tests are created after migration, so they start with the declared
        # field default: False.
        self.user.is_email_verified = False
        self.user.email_verified_at = None
        self.user.save(update_fields=["is_email_verified", "email_verified_at"])
        self.raw_token, self.token_instance = EmailVerificationToken.issue_for_user(self.user)

    def test_verify_with_valid_token_marks_user_verified(self) -> None:
        response = self.api_client.get(self.URL, {"token": self.raw_token})

        self.assertEqual(response.status_code, 200)

        self.user.refresh_from_db()
        self.assertTrue(self.user.is_email_verified)
        self.assertIsNotNone(self.user.email_verified_at)

        self.token_instance.refresh_from_db()
        self.assertIsNotNone(self.token_instance.used_at)

    def test_verify_missing_token_returns_400(self) -> None:
        response = self.api_client.get(self.URL)
        self.assertEqual(response.status_code, 400)
        self.assertIn("token", response.data)

    def test_verify_invalid_token_returns_400(self) -> None:
        response = self.api_client.get(self.URL, {"token": "nope"})
        self.assertEqual(response.status_code, 400)

        self.user.refresh_from_db()
        self.assertFalse(self.user.is_email_verified)

    def test_verify_expired_token_returns_400(self) -> None:
        self.token_instance.expires_at = timezone.now() - timedelta(minutes=1)
        self.token_instance.save(update_fields=["expires_at"])

        response = self.api_client.get(self.URL, {"token": self.raw_token})

        self.assertEqual(response.status_code, 400)

        self.user.refresh_from_db()
        self.assertFalse(self.user.is_email_verified)

    def test_verify_token_cannot_be_reused(self) -> None:
        first = self.api_client.get(self.URL, {"token": self.raw_token})
        self.assertEqual(first.status_code, 200)

        second = self.api_client.get(self.URL, {"token": self.raw_token})
        self.assertEqual(second.status_code, 400)

    def test_verify_rejected_for_banned_user(self) -> None:
        self.user.is_banned = True
        self.user.save(update_fields=["is_banned"])

        response = self.api_client.get(self.URL, {"token": self.raw_token})
        self.assertEqual(response.status_code, 400)

        self.user.refresh_from_db()
        self.assertFalse(self.user.is_email_verified)


class ResendVerificationAPIViewTests(TestCase):
    """API tests for POST /api/auth/resend-verification/."""

    URL = "/api/auth/resend-verification/"

    def setUp(self) -> None:
        self.api_client = APIClient()
        self.user = User.objects.create_user(
            email="resend@example.com",
            password="SomePass123!",
        )
        self.user.is_email_verified = False
        self.user.email_verified_at = None
        self.user.save(update_fields=["is_email_verified", "email_verified_at"])
        self.api_client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.user).access_token}"
        )
        mail.outbox = []

    def test_resend_sends_new_token_email_for_unverified_user(self) -> None:
        response = self.api_client.post(self.URL)
        self.assertEqual(response.status_code, 200)

        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(self.user.email, mail.outbox[0].to)

        self.assertEqual(
            EmailVerificationToken.objects.filter(user=self.user, used_at__isnull=True).count(),
            1,
        )

    def test_resend_invalidates_previous_token(self) -> None:
        _, old = EmailVerificationToken.issue_for_user(self.user)

        self.api_client.post(self.URL)

        old.refresh_from_db()
        self.assertIsNotNone(old.used_at)

    def test_resend_is_noop_when_user_already_verified(self) -> None:
        self.user.is_email_verified = True
        self.user.save(update_fields=["is_email_verified"])

        response = self.api_client.post(self.URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(
            EmailVerificationToken.objects.filter(user=self.user).count(),
            0,
        )

    def test_resend_requires_authentication(self) -> None:
        self.api_client.credentials()
        response = self.api_client.post(self.URL)
        self.assertEqual(response.status_code, 401)

    def test_resend_blocks_banned_user(self) -> None:
        self.user.is_banned = True
        self.user.save(update_fields=["is_banned"])

        response = self.api_client.post(self.URL)
        self.assertEqual(response.status_code, 403)


class IsEmailVerifiedPermissionTests(TestCase):
    """Direct unit tests for the IsEmailVerified permission class."""

    def setUp(self) -> None:
        self.factory = APIRequestFactory()
        self.permission = IsEmailVerified()

    def test_denies_anonymous_user(self) -> None:
        request = self.factory.get("/")
        request.user = AnonymousUser()  # type: ignore[attr-defined]
        self.assertFalse(self.permission.has_permission(request, Mock()))

    def test_denies_unverified_authenticated_user(self) -> None:
        user = User.objects.create_user(email="u@example.com", password="P!aaabbbb")
        user.is_email_verified = False
        user.save(update_fields=["is_email_verified"])
        request = self.factory.get("/")
        request.user = user  # type: ignore[attr-defined]
        self.assertFalse(self.permission.has_permission(request, Mock()))

    def test_allows_verified_authenticated_user(self) -> None:
        user = User.objects.create_user(email="v@example.com", password="P!aaabbbb")
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])
        request = self.factory.get("/")
        request.user = user  # type: ignore[attr-defined]
        self.assertTrue(self.permission.has_permission(request, Mock()))


# ---------------------------------------------------------------------------
# OAuth2 Login Tests
# ---------------------------------------------------------------------------

_GOOGLE_MOCK_PAYLOAD = {
    "email": "oauth.google@example.com",
    "given_name": "John",
    "family_name": "Doe",
    "name": "John Doe",
    "picture": "https://lh3.googleusercontent.com/photo.jpg",
}


class GoogleOAuthLoginTests(TestCase):
    """Integration tests for POST /api/auth/google/."""

    def setUp(self) -> None:
        self.client: Any = APIClient()
        self.url = "/api/auth/google/"

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="test-google-client-id")
    @patch("accounts.views.verify_google_id_token")
    def test_google_login_creates_new_user(self, mock_verify: Mock) -> None:
        """Valid Google token creates a new user with GOOGLE provider."""
        mock_verify.return_value = _GOOGLE_MOCK_PAYLOAD.copy()

        response = self.client.post(self.url, {"id_token": "valid-token"}, format="json")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertIn("refresh_token", data)
        self.assertIn("user", data)
        self.assertEqual(data["user"]["email"], "oauth.google@example.com")
        self.assertTrue(data["user"]["is_email_verified"])
        self.assertEqual(data["user"]["auth_provider"], "GOOGLE")

        # Verify Profile was created with Google-derived display name
        user = User.objects.get(email="oauth.google@example.com")
        self.assertTrue(hasattr(user, "profile"))
        self.assertEqual(user.profile.display_name, "John Doe")
        self.assertEqual(user.profile.picture_url, "https://lh3.googleusercontent.com/photo.jpg")

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="test-google-client-id")
    @patch("accounts.views.verify_google_id_token")
    def test_google_login_existing_local_user_logs_in(self, mock_verify: Mock) -> None:
        """Existing LOCAL user logs in via Google without changing auth_provider."""
        existing_user = User.objects.create_user(
            email="oauth.google@example.com",
            password="SecurePass123",
            auth_provider=AuthProvider.LOCAL,
        )
        Profile.objects.create(
            user=existing_user,
            display_name="Existing User",
        )

        mock_verify.return_value = _GOOGLE_MOCK_PAYLOAD.copy()

        response = self.client.post(self.url, {"id_token": "valid-token"}, format="json")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["user"]["email"], "oauth.google@example.com")
        # auth_provider should NOT change — user keeps LOCAL credentials
        self.assertEqual(data["user"]["auth_provider"], "LOCAL")

        existing_user.refresh_from_db()
        self.assertEqual(existing_user.auth_provider, AuthProvider.LOCAL)

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="test-google-client-id")
    @patch("accounts.views.verify_google_id_token")
    def test_google_login_existing_google_user_returns_tokens(self, mock_verify: Mock) -> None:
        """Existing GOOGLE user returns tokens without creating a duplicate."""
        existing_user = User.objects.create_user(
            email="oauth.google@example.com",
            auth_provider=AuthProvider.GOOGLE,
            is_email_verified=True,
        )
        Profile.objects.create(
            user=existing_user,
            display_name="Google User",
        )

        mock_verify.return_value = _GOOGLE_MOCK_PAYLOAD.copy()

        response = self.client.post(self.url, {"id_token": "valid-token"}, format="json")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["user"]["email"], "oauth.google@example.com")

        # Should not create a second user
        self.assertEqual(User.objects.filter(email="oauth.google@example.com").count(), 1)

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="test-google-client-id")
    @patch("accounts.views.verify_google_id_token")
    def test_google_login_banned_user_rejected(self, mock_verify: Mock) -> None:
        """Banned user is rejected during OAuth login."""
        banned_user = User.objects.create_user(
            email="oauth.google@example.com",
            auth_provider=AuthProvider.GOOGLE,
            is_banned=True,
        )
        Profile.objects.create(user=banned_user, display_name="Banned")

        mock_verify.return_value = _GOOGLE_MOCK_PAYLOAD.copy()

        response = self.client.post(self.url, {"id_token": "valid-token"}, format="json")

        self.assertEqual(response.status_code, 403)
        self.assertIn("banned", response.json()["detail"].lower())

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="test-google-client-id")
    @patch("accounts.views.verify_google_id_token")
    def test_google_login_inactive_user_rejected(self, mock_verify: Mock) -> None:
        """Inactive user is rejected during OAuth login."""
        inactive_user = User.objects.create_user(
            email="oauth.google@example.com",
            auth_provider=AuthProvider.GOOGLE,
            is_active=False,
        )
        Profile.objects.create(user=inactive_user, display_name="Inactive")

        mock_verify.return_value = _GOOGLE_MOCK_PAYLOAD.copy()

        response = self.client.post(self.url, {"id_token": "valid-token"}, format="json")

        self.assertEqual(response.status_code, 403)
        self.assertIn("inactive", response.json()["detail"].lower())

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="test-google-client-id")
    @patch(
        "accounts.views.verify_google_id_token",
        side_effect=__import__(
            "accounts.oauth", fromlist=["OAuthVerificationError"]
        ).OAuthVerificationError("Invalid or expired Google token."),
    )
    def test_google_login_invalid_token_rejected(self, mock_verify: Mock) -> None:
        """Invalid Google token returns 400."""
        response = self.client.post(self.url, {"id_token": "bad-token"}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.json())

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="test-google-client-id")
    @patch("accounts.views.verify_google_id_token")
    def test_google_login_sets_auth_cookies(self, mock_verify: Mock) -> None:
        """Successful Google login sets HttpOnly auth cookies."""
        mock_verify.return_value = _GOOGLE_MOCK_PAYLOAD.copy()

        response = self.client.post(self.url, {"id_token": "valid-token"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertIn(settings.AUTH_ACCESS_COOKIE_NAME, response.cookies)
        self.assertIn(settings.AUTH_REFRESH_COOKIE_NAME, response.cookies)

    def test_google_login_missing_id_token_rejected(self) -> None:
        """Missing id_token field returns 400."""
        response = self.client.post(self.url, {}, format="json")

        self.assertEqual(response.status_code, 400)


class AdminUserUpdateAPIViewTests(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.admin_user = User.objects.create_user(
            email="admin_unique@test.com", password="Pass123!", role=UserRole.ADMIN
        )
        self.target_user = User.objects.create_user(email="target@test.com", password="Pass123!")

    def test_admin_can_ban_user(self):
        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.patch(
            f"/api/auth/admin/users/{self.target_user.id}/",
            {"is_banned": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.target_user.refresh_from_db()
        self.assertTrue(self.target_user.is_banned)

    def test_admin_cannot_ban_self(self):
        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.patch(
            f"/api/auth/admin/users/{self.admin_user.id}/",
            {"is_banned": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_admin_cannot_ban(self):
        self.api_client.force_authenticate(user=self.target_user)
        response = self.api_client.patch(
            f"/api/auth/admin/users/{self.admin_user.id}/",
            {"is_banned": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ReportAPITests(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.admin = User.objects.create_user(
            email="admin2@test.com", password="Pass123!", role=UserRole.ADMIN
        )
        self.reporter = User.objects.create_user(email="reporter@test.com", password="Pass123!")
        self.reported = User.objects.create_user(
            email="reported@test.com", password="Pass123!", username="baduser"
        )
        self.report = Report.objects.create(
            submitted_by=self.reporter,
            reported_user=self.reported,
            reason=ReportReason.SPAM,
            description="Spamming the feed",
            status=ReportStatus.OPEN,
        )

    def test_user_can_submit_report_by_id(self):
        self.api_client.force_authenticate(user=self.reporter)
        response = self.api_client.post(
            "/api/auth/reports/",
            {
                "reported_user_id": str(self.reported.id),
                "reason": "HARASSMENT",
                "description": "Being rude",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Report.objects.count(), 2)

    def test_user_can_submit_report_by_username(self):
        self.api_client.force_authenticate(user=self.reporter)
        response = self.api_client.post(
            "/api/auth/reports/",
            {
                "reported_username": self.reported.username,
                "reason": "SPAM",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_user_cannot_report_self(self):
        self.api_client.force_authenticate(user=self.reporter)
        response = self.api_client.post(
            "/api/auth/reports/",
            {
                "reported_user_id": str(self.reporter.id),
                "reason": "SPAM",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_list_reports(self):
        self.api_client.force_authenticate(user=self.admin)
        response = self.api_client.get("/api/auth/admin/reports/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_non_admin_cannot_list_reports(self):
        self.api_client.force_authenticate(user=self.reporter)
        response = self.api_client.get("/api/auth/admin/reports/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_resolve_report(self):
        self.api_client.force_authenticate(user=self.admin)
        response = self.api_client.patch(
            f"/api/auth/admin/reports/{self.report.id}/",
            {
                "status": "RESOLVED",
                "resolution_note": "Banned user",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.report.refresh_from_db()
        self.assertEqual(self.report.status, ReportStatus.RESOLVED)
        self.assertEqual(self.report.resolved_by, self.admin)
        self.assertEqual(self.report.resolution_note, "Banned user")
