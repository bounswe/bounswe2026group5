from typing import TYPE_CHECKING, Any, cast

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

if TYPE_CHECKING:
    from rest_framework.response import Response

from accounts.models import User
from profiles.models import Profile

from .models import Notification


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
        from rest_framework.test import APIClient

        cast(APIClient, self.client).force_authenticate(user=self.user)

    def test_list_unread_notifications(self) -> None:
        """Test listing unread notifications."""
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
        response = cast("Response", self.client.get(url))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = cast(list[Any], response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["message"], "Unread message")

    def test_list_notifications_requires_auth(self) -> None:
        """Test unauthenticated access is rejected for notification list."""
        from rest_framework.test import APIClient

        cast(APIClient, self.client).force_authenticate(user=None)

        url = reverse("notification-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_unread_notifications_empty(self) -> None:
        """Test unread list returns empty array when user has no unread notifications."""
        url = reverse("notification-list")
        response = cast("Response", self.client.get(url))

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
        response = cast("Response", self.client.get(url))

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
        response = cast("Response", self.client.get(url))

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
        from rest_framework.test import APIClient

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
        """Unread notification list includes actor/resource metadata for client routing."""
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
        response = cast("Response", self.client.get(url))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = cast(list[Any], response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["type"], "new_message")
        self.assertEqual(data[0]["title"], "New Message")
        self.assertEqual(data[0]["actor"], self.actor_profile.id)
        self.assertEqual(data[0]["resource_type"], "conversation")
        self.assertEqual(
            data[0]["resource_id"],
            "a25888e7-31e4-4c88-ab7d-f8a0dd3537da",
        )
        self.assertEqual(
            data[0]["extra_metadata"],
            {"conversation_preview": "Hey there"},
        )
