from typing import Any, cast
from unittest.mock import MagicMock, patch

import firebase_admin
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

import notifications.fcm
from accounts.models import User
from profiles.models import Profile

from .fcm import get_firebase_app, send_push_notification
from .models import FCMToken, Notification


class NotificationModelTest(TestCase):
    """Test Notification model."""

    def setUp(self):
        self.user = User.objects.create_user(email="test@example.com", password="password")

    def test_notification_creation(self):
        """Test creating a notification."""
        notification = Notification.objects.create(
            user=self.user,
            type="test",
            message="Test message",
        )
        self.assertEqual(notification.user, self.user)
        self.assertEqual(notification.type, "test")
        self.assertEqual(notification.message, "Test message")
        self.assertFalse(notification.is_read)
        self.assertIsNotNone(notification.created_at)

    def test_notification_string_representation_uses_type_and_message_prefix(self) -> None:
        """Test __str__ contains type and truncated message prefix."""
        long_message = "A" * 60
        notification = Notification.objects.create(
            user=self.user,
            type="reminder",
            message=long_message,
        )

        text = str(notification)
        self.assertIsInstance(text, str)
        self.assertIn("reminder", text)
        self.assertIn(long_message[:50], text)


class NotificationAPITest(APITestCase):
    """Test Notification API views."""

    def setUp(self) -> None:
        self.user = User.objects.create_user(email="test@example.com", password="password")
        self.profile = Profile.objects.create(user=self.user, display_name="Test User")
        self.actor_user = User.objects.create_user(email="actor@example.com", password="password")
        self.actor_profile = Profile.objects.create(user=self.actor_user, display_name="Actor User")

        cast(APIClient, self.client).force_authenticate(user=self.user)

    def test_list_notifications_includes_read_history(self) -> None:
        """Recent notification list includes unread and read history."""
        Notification.objects.create(
            user=self.user,
            type="test",
            message="Unread message",
            is_read=False,
        )
        Notification.objects.create(
            user=self.user,
            type="test",
            message="Read message",
            is_read=True,
        )

        url = reverse("notification-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = cast(list[Any], response.data)
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["message"], "Unread message")
        self.assertEqual(data[0]["is_read"], False)
        self.assertEqual(data[1]["message"], "Read message")
        self.assertEqual(data[1]["is_read"], True)

    def test_list_notifications_requires_auth(self) -> None:
        """Test unauthenticated access is rejected for notification list."""

        cast(APIClient, self.client).force_authenticate(user=None)

        url = reverse("notification-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_unread_notifications_empty(self) -> None:
        """Test unread list returns empty array when user has no unread notifications."""
        url = reverse("notification-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = cast(list[Any], response.data)
        self.assertEqual(data, [])

    def test_list_unread_notifications_excludes_other_users(self) -> None:
        """Test unread list includes only notifications owned by authenticated user."""
        other_user = User.objects.create_user(email="other-list@example.com", password="password")
        Notification.objects.create(
            user=other_user,
            type="test",
            message="Other user unread",
            is_read=False,
        )
        Notification.objects.create(
            user=self.user,
            type="test",
            message="My unread",
            is_read=False,
        )

        url = reverse("notification-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = cast(list[Any], response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["message"], "My unread")

    def test_list_unread_notifications_ordered_most_recent_first(self) -> None:
        """Test unread notifications are ordered by created_at descending."""
        older = Notification.objects.create(
            user=self.user,
            type="test",
            message="Older unread",
            is_read=False,
        )
        newer = Notification.objects.create(
            user=self.user,
            type="test",
            message="Newer unread",
            is_read=False,
        )

        url = reverse("notification-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = cast(list[Any], response.data)
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["id"], str(newer.id))
        self.assertEqual(data[1]["id"], str(older.id))

    def test_mark_notification_read(self) -> None:
        """Test marking a notification as read."""
        notification = Notification.objects.create(
            user=self.user,
            type="test",
            message="Test message",
            is_read=False,
        )

        url = reverse("notification-mark-read", kwargs={"notification_id": notification.id})
        response = self.client.put(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        notification.refresh_from_db()
        self.assertTrue(notification.is_read)

    def test_mark_notification_read_not_owner(self) -> None:
        """Test marking a notification as read by non-owner."""
        other_user = User.objects.create_user(email="other@example.com", password="password")
        notification = Notification.objects.create(
            user=other_user,
            type="test",
            message="Test message",
            is_read=False,
        )

        url = reverse("notification-mark-read", kwargs={"notification_id": notification.id})
        response = self.client.put(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_mark_notification_read_is_idempotent_for_already_read(self) -> None:
        """Test marking an already-read notification still succeeds."""
        notification = Notification.objects.create(
            user=self.user,
            type="test",
            message="Already read",
            is_read=True,
        )

        url = reverse("notification-mark-read", kwargs={"notification_id": notification.id})
        response = self.client.put(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        notification.refresh_from_db()
        self.assertTrue(notification.is_read)

    def test_mark_notification_read_requires_auth(self) -> None:
        """Test unauthenticated access is rejected for mark-as-read endpoint."""

        cast(APIClient, self.client).force_authenticate(user=None)
        notification = Notification.objects.create(
            user=self.user,
            type="test",
            message="Needs auth",
            is_read=False,
        )

        url = reverse("notification-mark-read", kwargs={"notification_id": notification.id})
        response = self.client.put(url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_unread_notifications_includes_structured_fields(self) -> None:
        """Notification list includes actor/resource metadata for client routing."""
        Notification.objects.create(
            user=self.user,
            type="new_message",
            title="New Message",
            message="You have a new message.",
            actor=self.actor_profile,
            resource_type="conversation",
            resource_id="a25888e7-31e4-4c88-ab7d-f8a0dd3537da",
            extra_metadata={"conversation_preview": "Hey there"},
            is_read=False,
        )

        url = reverse("notification-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = cast(list[Any], response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["type"], "new_message")
        self.assertEqual(data[0]["title"], "New Message")
        self.assertEqual(data[0]["actor"]["id"], str(self.actor_profile.id))
        self.assertEqual(data[0]["actor"]["display_name"], "Actor User")
        self.assertEqual(data[0]["resource_type"], "conversation")
        self.assertEqual(
            data[0]["resource_id"],
            "a25888e7-31e4-4c88-ab7d-f8a0dd3537da",
        )
        self.assertEqual(
            data[0]["extra_metadata"],
            {"conversation_preview": "Hey there"},
        )

    @override_settings(NOTIFICATIONS_HISTORY_LIMIT=2)
    def test_list_notifications_respects_history_limit(self) -> None:
        """Notification list is capped to the configured history size."""
        Notification.objects.create(
            user=self.user,
            type="test",
            message="Oldest unread",
            is_read=False,
        )
        Notification.objects.create(
            user=self.user,
            type="test",
            message="Newest unread",
            is_read=False,
        )
        Notification.objects.create(
            user=self.user,
            type="test",
            message="Newest read",
            is_read=True,
        )

        url = reverse("notification-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = cast(list[Any], response.data)
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["message"], "Newest unread")
        self.assertEqual(data[1]["message"], "Oldest unread")


class FCMUnitTests(TestCase):
    """Direct unit tests for notifications.fcm."""

    def setUp(self):
        self.user = User.objects.create_user(email="fcm@example.com", password="password123")
        # Ensure the singleton is reset
        notifications.fcm._firebase_app = None

    def tearDown(self):
        notifications.fcm._firebase_app = None

    @patch("notifications.fcm.credentials.Certificate")
    @patch("notifications.fcm.firebase_admin.initialize_app")
    @patch("notifications.fcm.firebase_admin.get_app")
    @patch("notifications.fcm.settings")
    def test_get_firebase_app_initializes_new(
        self, mock_settings, mock_get_app, mock_init, mock_cert
    ):
        # Setup mocks
        mock_settings.BASE_DIR = MagicMock()
        mock_settings.FIREBASE_SERVICE_ACCOUNT_PATH = "secret.json"

        # Simulate path.exists() returning True
        mock_path = MagicMock()
        mock_path.exists.return_value = True
        mock_settings.BASE_DIR.__truediv__.return_value = mock_path

        mock_get_app.side_effect = ValueError("App not found")
        mock_init.return_value = MagicMock(name="new-app")

        # Mock firebase_admin._apps
        with patch.object(firebase_admin, "_apps", {}):
            app = get_firebase_app()
            self.assertIsNotNone(app)
            mock_init.assert_called_once()

    @patch("notifications.fcm.settings")
    def test_get_firebase_app_fails_if_file_missing(self, mock_settings):
        mock_path = MagicMock()
        mock_path.exists.return_value = False
        mock_settings.BASE_DIR.__truediv__.return_value = mock_path

        app = get_firebase_app()
        self.assertIsNone(app)

    @patch("notifications.fcm.get_firebase_app")
    @patch("notifications.fcm.messaging.send_each")
    def test_send_push_notification_success(self, mock_send, mock_get_app):
        mock_app = MagicMock()
        mock_get_app.return_value = mock_app
        FCMToken.objects.create(user=self.user, token="token-1")

        # Mock response
        mock_response = MagicMock()
        mock_response.success_count = 1
        mock_response.failure_count = 0
        mock_response.responses = [MagicMock(success=True)]
        mock_send.return_value = mock_response

        send_push_notification(self.user.id, "Hello", "World")

        mock_send.assert_called_once()
        self.assertEqual(FCMToken.objects.count(), 1)

    @patch("notifications.fcm.get_firebase_app")
    @patch("notifications.fcm.messaging.send_each")
    def test_send_push_notification_cleanup_invalid_tokens(self, mock_send, mock_get_app):
        mock_app = MagicMock()
        mock_get_app.return_value = mock_app
        FCMToken.objects.create(user=self.user, token="valid-token")
        FCMToken.objects.create(user=self.user, token="invalid-token")

        # Mock response with one failure
        mock_resp_valid = MagicMock(success=True)

        mock_resp_invalid = MagicMock(success=False)
        mock_resp_invalid.exception = MagicMock()
        mock_resp_invalid.exception.code = "registration-token-not-registered"

        mock_response = MagicMock()
        mock_response.success_count = 1
        mock_response.failure_count = 1
        mock_response.responses = [mock_resp_valid, mock_resp_invalid]
        mock_send.return_value = mock_response

        send_push_notification(self.user.id, "Hello", "World")

        # The invalid token should be deleted
        self.assertEqual(FCMToken.objects.count(), 1)
        self.assertTrue(FCMToken.objects.filter(token="valid-token").exists())
        self.assertFalse(FCMToken.objects.filter(token="invalid-token").exists())

    @patch("notifications.fcm.get_firebase_app")
    def test_send_push_notification_no_app(self, mock_get_app):
        mock_get_app.return_value = None
        send_push_notification(self.user.id, "Hello", "World")
        # Should return silently

    @patch("notifications.fcm.get_firebase_app")
    @patch("notifications.fcm.messaging.send_each")
    def test_send_push_notification_exception_handling(self, mock_send, mock_get_app):
        mock_get_app.return_value = MagicMock()
        FCMToken.objects.create(user=self.user, token="token-1")
        mock_send.side_effect = Exception("FCM Down")

        # Should not raise exception
        send_push_notification(self.user.id, "Hello", "World")
