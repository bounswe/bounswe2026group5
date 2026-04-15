"""Tests for messaging domain models and API endpoints."""

from datetime import timedelta
from typing import Any

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.base import ContentFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import AppUsageMode, UserRole
from mentorship.models import Match, MentorshipRequest
from profiles.models import AvailabilitySlot, Profile

from .models import Conversation, Message, MessageReport

User: Any = get_user_model()


def _token_for(user: Any) -> str:
    """Return a JWT access token string for the given user."""
    return str(RefreshToken.for_user(user).access_token)


class MessagingAPIBaseTestCase(TestCase):
    """Shared fixtures for messaging API tests with an active match."""

    CONVERSATIONS_URL = "/api/messages/conversations/"

    def setUp(self) -> None:
        """Create mentor and mentee users with an active match and conversation."""
        Group.objects.get_or_create(name=UserRole.USER)
        Group.objects.get_or_create(name=UserRole.ADMIN)

        self.mentor_user = User.objects.create_user(
            email="mentor.msg@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.mentee_user = User.objects.create_user(
            email="mentee.msg@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        self.other_user = User.objects.create_user(
            email="other.msg@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        self.admin_user = User.objects.create_user(
            email="admin.msg@example.com",
            password="SecurePass123",
            role=UserRole.ADMIN,
        )

        self.mentor_profile = Profile.objects.create(
            user=self.mentor_user,
            display_name="Msg Mentor",
        )
        self.mentee_profile = Profile.objects.create(
            user=self.mentee_user,
            display_name="Msg Mentee",
        )
        self.other_profile = Profile.objects.create(
            user=self.other_user,
            display_name="Msg Other",
        )
        self.admin_profile = Profile.objects.create(
            user=self.admin_user,
            display_name="Msg Admin",
        )

        # Create a match
        start_at = timezone.now() + timedelta(days=2)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=start_at,
            end_at=start_at + timedelta(hours=1),
        )
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=slot,
            status=MentorshipRequest.Status.ACCEPTED,
        )
        self.match = Match.objects.get(request=request_obj)
        self.conversation = Conversation.objects.create(match=self.match)

        # Create another match for other user
        other_slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=start_at + timedelta(days=1),
            end_at=start_at + timedelta(days=1, hours=1),
        )
        other_request = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.other_profile,
            slot=other_slot,
            status=MentorshipRequest.Status.ACCEPTED,
        )
        self.other_match = Match.objects.get(request=other_request)
        self.other_conversation = Conversation.objects.create(match=self.other_match)

        self.mentor_client: Any = APIClient()
        self.mentee_client: Any = APIClient()
        self.other_client: Any = APIClient()
        self.admin_client: Any = APIClient()
        self.anon_client: Any = APIClient()

        self.mentor_client.credentials(HTTP_AUTHORIZATION=f"Bearer {_token_for(self.mentor_user)}")
        self.mentee_client.credentials(HTTP_AUTHORIZATION=f"Bearer {_token_for(self.mentee_user)}")
        self.other_client.credentials(HTTP_AUTHORIZATION=f"Bearer {_token_for(self.other_user)}")
        self.admin_client.credentials(HTTP_AUTHORIZATION=f"Bearer {_token_for(self.admin_user)}")

    def _conversation_detail_url(self, conversation_id: str) -> str:
        return f"/api/messages/conversations/{conversation_id}/"

    def _message_report_url(self, message_id: str) -> str:
        return f"/api/messages/{message_id}/report/"


class ConversationListAPIViewTests(MessagingAPIBaseTestCase):
    """Tests for GET /api/messages/conversations/."""

    def test_unauthenticated_returns_401(self) -> None:
        response = self.anon_client.get(self.CONVERSATIONS_URL)
        self.assertEqual(response.status_code, 401)

    def test_returns_conversations_for_participant(self) -> None:
        response = self.mentee_client.get(self.CONVERSATIONS_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(str(response.data[0]["id"]), str(self.conversation.id))

    def test_excludes_conversations_where_not_participant(self) -> None:
        response = self.other_client.get(self.CONVERSATIONS_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)  # Only their own conversation
        self.assertEqual(str(response.data[0]["id"]), str(self.other_conversation.id))

    def test_admin_cannot_access_conversations(self) -> None:
        response = self.admin_client.get(self.CONVERSATIONS_URL)
        self.assertEqual(response.status_code, 403)  # IsRegularUser blocks admins


class ConversationDetailAPIViewTests(MessagingAPIBaseTestCase):
    """Tests for GET /api/messages/conversations/{id}/."""

    def test_unauthenticated_returns_401(self) -> None:
        url = self._conversation_detail_url(self.conversation.id)
        response = self.anon_client.get(url)
        self.assertEqual(response.status_code, 401)

    def test_non_participant_returns_403(self) -> None:
        url = self._conversation_detail_url(self.conversation.id)
        response = self.other_client.get(url)
        self.assertEqual(response.status_code, 403)

    def test_participant_can_list_messages(self) -> None:
        # Create some messages
        Message.objects.create(
            conversation=self.conversation,
            sender=self.mentor_profile,
            body="Hello from mentor",
        )
        Message.objects.create(
            conversation=self.conversation,
            sender=self.mentee_profile,
            body="Hello from mentee",
        )

        url = self._conversation_detail_url(self.conversation.id)
        response = self.mentee_client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

    def test_pagination_works(self) -> None:
        # Create multiple messages
        for i in range(5):
            Message.objects.create(
                conversation=self.conversation,
                sender=self.mentor_profile,
                body=f"Message {i}",
            )

        url = self._conversation_detail_url(self.conversation.id)
        response = self.mentee_client.get(url, {"page": 1, "pageSize": 2})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

        response = self.mentee_client.get(url, {"page": 2, "pageSize": 2})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

    def test_admin_cannot_access_messages(self) -> None:
        url = self._conversation_detail_url(self.conversation.id)
        response = self.admin_client.get(url)
        self.assertEqual(response.status_code, 403)

    def test_messages_ordered_most_recent_last(self) -> None:
        # Create messages with different timestamps
        old_message = Message.objects.create(
            conversation=self.conversation,
            sender=self.mentor_profile,
            body="Old message",
            created_at=timezone.now() - timedelta(hours=2),
        )
        new_message = Message.objects.create(
            conversation=self.conversation,
            sender=self.mentee_profile,
            body="New message",
            created_at=timezone.now() - timedelta(hours=1),
        )

        url = self._conversation_detail_url(self.conversation.id)
        response = self.mentee_client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        # Should be ordered by created_at ascending (oldest first)
        self.assertEqual(response.data[0]["id"], str(old_message.id))
        self.assertEqual(response.data[1]["id"], str(new_message.id))


class MessageCreateAPIViewTests(MessagingAPIBaseTestCase):
    """Tests for POST /api/messages/conversations/{id}/."""

    def test_unauthenticated_returns_401(self) -> None:
        url = self._conversation_detail_url(self.conversation.id)
        response = self.anon_client.post(url, {"body": "Test"})
        self.assertEqual(response.status_code, 401)

    def test_non_participant_returns_403(self) -> None:
        url = self._conversation_detail_url(self.conversation.id)
        response = self.other_client.post(url, {"body": "Test"})
        self.assertEqual(response.status_code, 403)

    def test_participant_can_send_message_with_body(self) -> None:
        url = self._conversation_detail_url(self.conversation.id)
        response = self.mentee_client.post(url, {"body": "Test message"})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["body"], "Test message")
        self.assertEqual(response.data["sender"]["id"], str(self.mentee_profile.id))

    def test_message_supports_markdown(self) -> None:
        url = self._conversation_detail_url(self.conversation.id)
        markdown_body = "# Heading\n\n**Bold text**"
        response = self.mentee_client.post(url, {"body": markdown_body})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["body"], markdown_body)

    def test_attachment_upload_works(self) -> None:
        # Create a fake PDF file
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n"
        file = ContentFile(pdf_content, name="test.pdf")

        url = self._conversation_detail_url(self.conversation.id)
        response = self.mentee_client.post(url, {"attachment": file}, format="multipart")
        self.assertEqual(response.status_code, 201)
        self.assertIn("attachment_url", response.data)
        self.assertIsNotNone(response.data["attachment_url"])

    def test_invalid_attachment_type_rejected(self) -> None:
        # Create a fake executable file
        exe_content = b"MZ\x90\x00\x03\x00\x00\x00"
        file = ContentFile(exe_content, name="test.exe")

        url = self._conversation_detail_url(self.conversation.id)
        response = self.mentee_client.post(url, {"attachment": file}, format="multipart")
        self.assertEqual(response.status_code, 400)

    def test_oversized_attachment_rejected(self) -> None:
        # Create a file larger than 20 MB
        large_content = b"A" * (21 * 1024 * 1024)  # 21 MB
        file = ContentFile(large_content, name="large.pdf")

        url = self._conversation_detail_url(self.conversation.id)
        response = self.mentee_client.post(url, {"attachment": file}, format="multipart")
        self.assertEqual(response.status_code, 400)

    def test_message_requires_body_or_attachment(self) -> None:
        url = self._conversation_detail_url(self.conversation.id)
        response = self.mentee_client.post(url, {})
        self.assertEqual(response.status_code, 400)

    def test_admin_cannot_send_messages(self) -> None:
        url = self._conversation_detail_url(self.conversation.id)
        response = self.admin_client.post(url, {"body": "Test"})
        self.assertEqual(response.status_code, 403)

    def test_sending_to_deactivated_match_rejected(self) -> None:
        # Deactivate the match
        self.match.is_active = False
        self.match.save()

        url = self._conversation_detail_url(self.conversation.id)
        response = self.mentee_client.post(url, {"body": "Test"})
        self.assertEqual(response.status_code, 403)


class MessageReportAPIViewTests(MessagingAPIBaseTestCase):
    """Tests for POST /api/messages/{id}/report/."""

    def setUp(self) -> None:
        super().setUp()
        self.message = Message.objects.create(
            conversation=self.conversation,
            sender=self.mentor_profile,
            body="Test message",
        )

    def test_unauthenticated_returns_401(self) -> None:
        url = self._message_report_url(self.message.id)
        response = self.anon_client.post(url, {"reason": "Spam"})
        self.assertEqual(response.status_code, 401)

    def test_non_participant_returns_403(self) -> None:
        url = self._message_report_url(self.message.id)
        response = self.other_client.post(url, {"reason": "Spam"})
        self.assertEqual(response.status_code, 403)

    def test_participant_can_report_message(self) -> None:
        url = self._message_report_url(self.message.id)
        response = self.mentee_client.post(url, {"reason": "Inappropriate content"})
        self.assertEqual(response.status_code, 201)

        # Check report was created
        self.assertTrue(
            MessageReport.objects.filter(
                message=self.message, reported_by=self.mentee_profile
            ).exists()
        )

    def test_admin_can_report_message(self) -> None:
        # Even though admin can't read messages normally, they can report if they somehow access the message
        # But in practice, admins shouldn't access message IDs without proper channels
        url = self._message_report_url(self.message.id)
        response = self.admin_client.post(url, {"reason": "Admin review"})
        self.assertEqual(response.status_code, 201)

    def test_regular_user_cannot_report_without_participation(self) -> None:
        # Regular user who is not a participant should be blocked
        url = self._message_report_url(self.message.id)
        response = self.other_client.post(url, {"reason": "Spam"})
        self.assertEqual(response.status_code, 403)


class MessagingModelTests(TestCase):
    """Unit tests for messaging models."""

    def setUp(self) -> None:
        """Prepare test data."""
        self.mentor_user = User.objects.create_user(
            email="mentor.model@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.mentee_user = User.objects.create_user(
            email="mentee.model@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        self.mentor_profile = Profile.objects.create(
            user=self.mentor_user,
            display_name="Model Mentor",
        )
        self.mentee_profile = Profile.objects.create(
            user=self.mentee_user,
            display_name="Model Mentee",
        )

        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=timezone.now() + timedelta(days=1),
            end_at=timezone.now() + timedelta(days=1, hours=1),
        )
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=slot,
            status=MentorshipRequest.Status.ACCEPTED,
        )
        self.match = Match.objects.get(request=request_obj)

    def test_conversation_created_from_match(self) -> None:
        conversation = Conversation.objects.create(match=self.match)
        self.assertEqual(conversation.match, self.match)

    def test_message_creation(self) -> None:
        conversation = Conversation.objects.create(match=self.match)
        message = Message.objects.create(
            conversation=conversation,
            sender=self.mentor_profile,
            body="Test message",
        )
        self.assertEqual(message.conversation, conversation)
        self.assertEqual(message.sender, self.mentor_profile)
        self.assertEqual(message.body, "Test message")

    def test_message_report_creation(self) -> None:
        conversation = Conversation.objects.create(match=self.match)
        message = Message.objects.create(
            conversation=conversation,
            sender=self.mentor_profile,
            body="Test message",
        )
        report = MessageReport.objects.create(
            message=message,
            reported_by=self.mentee_profile,
            reason="Inappropriate",
        )
        self.assertEqual(report.message, message)
        self.assertEqual(report.reported_by, self.mentee_profile)
        self.assertEqual(report.reason, "Inappropriate")

    def test_unique_message_report_per_reporter(self) -> None:
        conversation = Conversation.objects.create(match=self.match)
        message = Message.objects.create(
            conversation=conversation,
            sender=self.mentor_profile,
            body="Test message",
        )
        MessageReport.objects.create(
            message=message,
            reported_by=self.mentee_profile,
            reason="First report",
        )
        # Second report from same user should fail
        with self.assertRaises(Exception):  # IntegrityError
            MessageReport.objects.create(
                message=message,
                reported_by=self.mentee_profile,
                reason="Second report",
            )
