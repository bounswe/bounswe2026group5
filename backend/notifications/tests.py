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


class NotificationAPITest(APITestCase):
    """Test Notification API views."""

    def setUp(self) -> None:
        self.user = User.objects.create_user(email="test@example.com", password="password")
        self.profile = Profile.objects.create(user=self.user, display_name="Test User")
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

    def test_mark_notification_read(self):
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

    def test_mark_notification_read_not_owner(self):
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
