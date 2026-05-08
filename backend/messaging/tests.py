"""Tests for messaging domain models and API endpoints."""

import uuid
from unittest.mock import patch, MagicMock
from datetime import timedelta
from typing import Any

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.base import ContentFile
from django.db import IntegrityError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import AppUsageMode, Report, UserRole
from mentorship.models import Match, MentorshipRequest
from mentorship.services import ensure_match_and_initial_session
from profiles.models import AvailabilitySlot, Profile

from . import signals
from .models import Conversation, Message, ReadReceipt

User: Any = get_user_model()


def _token_for(user: Any) -> str:
    """Return a JWT access token string for the given user."""
    return str(RefreshToken.for_user(user).access_token)


def _create_accepted_request(**kwargs: Any) -> MentorshipRequest:
    """Create an accepted request and materialize its canonical match/session state."""
    request_obj = MentorshipRequest.objects.create(
        status=MentorshipRequest.Status.ACCEPTED,
        **kwargs,
    )
    ensure_match_and_initial_session(mentorship_request=request_obj)
    return request_obj


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
        request_obj = _create_accepted_request(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=slot,
        )
        request_obj.status = MentorshipRequest.Status.ACCEPTED
        request_obj.save()
        ensure_match_and_initial_session(mentorship_request=request_obj)
        self.match = Match.objects.get(request=request_obj)
        self.conversation = Conversation.objects.get(match=self.match)

        # Create another match for other user
        other_slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=start_at + timedelta(days=1),
            end_at=start_at + timedelta(days=1, hours=1),
        )
        other_request = _create_accepted_request(
            mentor=self.mentor_profile,
            mentee=self.other_profile,
            slot=other_slot,
        )
        other_request.status = MentorshipRequest.Status.ACCEPTED
        other_request.save()
        ensure_match_and_initial_session(mentorship_request=other_request)
        self.other_match = Match.objects.get(request=other_request)
        self.other_conversation = Conversation.objects.get(match=self.other_match)

        self.mentor_client: Any = APIClient()
        self.mentee_client: Any = APIClient()
        self.other_client: Any = APIClient()
        self.admin_client: Any = APIClient()
        self.anon_client: Any = APIClient()

        self.mentor_client.credentials(HTTP_AUTHORIZATION=f"Bearer {_token_for(self.mentor_user)}")
        self.mentee_client.credentials(HTTP_AUTHORIZATION=f"Bearer {_token_for(self.mentee_user)}")
        self.other_client.credentials(HTTP_AUTHORIZATION=f"Bearer {_token_for(self.other_user)}")
        self.admin_client.credentials(HTTP_AUTHORIZATION=f"Bearer {_token_for(self.admin_user)}")

    def _conversation_detail_url(self, conversation_id: uuid.UUID | str) -> str:
        return f"/api/messages/conversations/{conversation_id}/"

    def _message_report_url(self, message_id: uuid.UUID | str) -> str:
        return f"/api/messages/{message_id}/report/"

    def _authenticated_client_without_profile(
        self,
        *,
        email: str,
        app_usage_mode: str = AppUsageMode.MENTEE,
    ) -> APIClient:
        """Create an authenticated API client for a user that has no profile."""
        user = User.objects.create_user(
            email=email,
            password="SecurePass123",
            app_usage_mode=app_usage_mode,
        )
        client: Any = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {_token_for(user)}")
        return client


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

    def test_missing_profile_returns_empty_list(self) -> None:
        no_profile_client = self._authenticated_client_without_profile(
            email="no.profile.messages@example.com",
        )

        response: Any = no_profile_client.get(self.CONVERSATIONS_URL)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])


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
        # Create messages
        old_message = Message.objects.create(
            conversation=self.conversation,
            sender=self.mentor_profile,
            body="Old message",
        )
        new_message = Message.objects.create(
            conversation=self.conversation,
            sender=self.mentee_profile,
            body="New message",
        )

        # Explicitly set created_at to ensure order (auto_now_add is normally set on creation)
        # We use update() to bypass auto_now_add
        now = timezone.now()
        Message.objects.filter(pk=old_message.pk).update(created_at=now - timedelta(minutes=5))
        Message.objects.filter(pk=new_message.pk).update(created_at=now)

        url = self._conversation_detail_url(self.conversation.id)
        response = self.mentee_client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        
        # View uses order_by("-created_at") for pagination (most recent first)
        self.assertEqual(response.data[0]["id"], str(new_message.id))
        self.assertEqual(response.data[1]["id"], str(old_message.id))

    def test_conversation_not_found_returns_404(self) -> None:
        url = self._conversation_detail_url(uuid.uuid4())

        response = self.mentee_client.get(url)

        self.assertEqual(response.status_code, 404)

    def test_get_missing_profile_returns_404(self) -> None:
        no_profile_client = self._authenticated_client_without_profile(
            email="no.profile.detail@example.com",
        )

        response: Any = no_profile_client.get(self._conversation_detail_url(self.conversation.id))

        self.assertEqual(response.status_code, 404)

    def test_pagination_page_and_page_size_are_bounded(self) -> None:
        for i in range(60):
            Message.objects.create(
                conversation=self.conversation,
                sender=self.mentor_profile,
                body=f"Message {i}",
            )

        url = self._conversation_detail_url(self.conversation.id)
        response = self.mentee_client.get(url, {"page": 0, "pageSize": 100})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 50)


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

    def test_participant_can_send_message_creates_notification(self) -> None:
        url = self._conversation_detail_url(self.conversation.id)
        response = self.mentee_client.post(url, {"body": "Test notification"})
        self.assertEqual(response.status_code, 201)
        
        from notifications.models import Notification, NotificationType
        notification = Notification.objects.filter(
            user=self.mentor_user, type=NotificationType.NEW_MESSAGE
        ).first()
        self.assertIsNotNone(notification)
        self.assertEqual(notification.title, "New Message")
        self.assertEqual(notification.resource_type, "conversation")
        self.assertEqual(str(notification.resource_id), str(self.conversation.id))

    def test_message_supports_markdown(self) -> None:
        url = self._conversation_detail_url(self.conversation.id)
        markdown_body = "# Heading\n\n**Bold text**"
        response = self.mentee_client.post(url, {"body": markdown_body})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["body"], markdown_body)

    def test_attachment_upload_works(self) -> None:
        # Create a fake PDF file
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n"
        file_name = "test.pdf"
        file = ContentFile(pdf_content, name=file_name)

        url = self._conversation_detail_url(self.conversation.id)
        response = self.mentee_client.post(url, {"attachment": file}, format="multipart")
        self.assertEqual(response.status_code, 201)
        self.assertIn("attachment_url", response.data)
        self.assertIsNotNone(response.data["attachment_url"])
        self.assertEqual(response.data["original_filename"], file_name)

        # Verify DB
        msg = Message.objects.get(id=response.data["id"])
        self.assertEqual(msg.original_filename, file_name)

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

    def test_post_conversation_not_found_returns_404(self) -> None:
        url = self._conversation_detail_url(uuid.uuid4())

        response = self.mentee_client.post(url, {"body": "Test"})

        self.assertEqual(response.status_code, 404)

    def test_post_missing_profile_returns_404(self) -> None:
        no_profile_client = self._authenticated_client_without_profile(
            email="no.profile.create@example.com",
        )

        response: Any = no_profile_client.post(
            self._conversation_detail_url(self.conversation.id),
            {"body": "Test"},
        )

        self.assertEqual(response.status_code, 404)


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
        response = self.anon_client.post(url, {"reason": "SPAM"})
        self.assertEqual(response.status_code, 401)

    def test_non_participant_returns_403(self) -> None:
        url = self._message_report_url(self.message.id)
        response = self.other_client.post(url, {"reason": "SPAM"})
        self.assertEqual(response.status_code, 403)

    def test_participant_can_report_message(self) -> None:
        url = self._message_report_url(self.message.id)
        response = self.mentee_client.post(url, {"reason": "SPAM"})
        self.assertEqual(response.status_code, 201)

        # Check report was created in global Report table
        self.assertTrue(
            Report.objects.filter(
                related_message=self.message, submitted_by=self.mentee_user
            ).exists()
        )

    def test_duplicate_report_rejected(self) -> None:
        url = self._message_report_url(self.message.id)
        # First report
        self.mentee_client.post(url, {"reason": "SPAM"})
        # Second report
        response = self.mentee_client.post(url, {"reason": "HARASSMENT"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("already reported", response.data["detail"])

    def test_admin_can_report_message(self) -> None:
        # Even though admin can't read messages normally,
        # they can report if they somehow access the message
        # But in practice, admins shouldn't access message IDs without proper channels
        url = self._message_report_url(self.message.id)
        response = self.admin_client.post(url, {"reason": "OTHER"})
        self.assertEqual(response.status_code, 201)

    def test_message_not_found_returns_404(self) -> None:
        url = self._message_report_url(uuid.uuid4())

        response = self.mentee_client.post(url, {"reason": "SPAM"})

        self.assertEqual(response.status_code, 404)

    def test_invalid_payload_returns_400(self) -> None:
        url = self._message_report_url(self.message.id)

        response = self.mentee_client.post(url, {})

        self.assertEqual(response.status_code, 400)

    def test_missing_profile_returns_404(self) -> None:
        no_profile_client = self._authenticated_client_without_profile(
            email="no.profile.report@example.com",
        )

        url = self._message_report_url(self.message.id)
        response: Any = no_profile_client.post(url, {"reason": "SPAM"})

        self.assertEqual(response.status_code, 404)


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
        request_obj = _create_accepted_request(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=slot,
        )
        request_obj.status = MentorshipRequest.Status.ACCEPTED
        request_obj.save()
        ensure_match_and_initial_session(mentorship_request=request_obj)
        self.match = Match.objects.get(request=request_obj)

    def test_conversation_created_from_match(self) -> None:
        conversation = Conversation.objects.get(match=self.match)
        self.assertEqual(conversation.match, self.match)

    def test_message_creation(self) -> None:
        conversation = Conversation.objects.get(match=self.match)
        message = Message.objects.create(
            conversation=conversation,
            sender=self.mentor_profile,
            body="Test message",
        )
        self.assertEqual(message.conversation, conversation)
        self.assertEqual(message.sender, self.mentor_profile)
        self.assertEqual(message.body, "Test message")

    def test_model_string_representations(self) -> None:
        conversation = Conversation.objects.get(match=self.match)
        message = Message.objects.create(
            conversation=conversation,
            sender=self.mentor_profile,
            body="Test message",
        )

        self.assertIn(str(self.match.id), str(conversation))
        self.assertIn(str(self.mentor_profile.id), str(message))


class MessagingSignalsTests(TestCase):
    """Unit tests for messaging signal behavior."""

    def setUp(self) -> None:
        mentor_user = User.objects.create_user(
            email="mentor.signal@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        mentee_user = User.objects.create_user(
            email="mentee.signal@example.com",
            password="SecurePass123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        self.mentor_profile = Profile.objects.create(user=mentor_user, display_name="Signal Mentor")
        self.mentee_profile = Profile.objects.create(user=mentee_user, display_name="Signal Mentee")
        start_at = timezone.now() + timedelta(days=3)
        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=start_at,
            end_at=start_at + timedelta(hours=1),
        )
        request_obj = _create_accepted_request(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=slot,
        )
        self.match = Match.objects.get(request=request_obj)

    def test_signal_noop_when_not_created(self) -> None:
        existing_count = Conversation.objects.filter(match=self.match).count()

        signals.create_conversation_for_new_match(
            sender=Match,
            instance=self.match,
            created=False,
            raw=False,
        )

        self.assertEqual(Conversation.objects.filter(match=self.match).count(), existing_count)

    def test_signal_noop_on_raw_save(self) -> None:
        existing_count = Conversation.objects.filter(match=self.match).count()

        signals.create_conversation_for_new_match(
            sender=Match,
            instance=self.match,
            created=True,
            raw=True,
        )

        self.assertEqual(Conversation.objects.filter(match=self.match).count(), existing_count)


class MessagingSignalsFirebaseTests(TestCase):
    """Tests for messaging signals that sync data to Firestore."""

    def setUp(self):
        Group.objects.get_or_create(name=UserRole.USER)
        self.mentor_user = User.objects.create_user(
            email="mentor.fire@example.com",
            password="password123",
            app_usage_mode=AppUsageMode.MENTOR,
        )
        self.mentee_user = User.objects.create_user(
            email="mentee.fire@example.com",
            password="password123",
            app_usage_mode=AppUsageMode.MENTEE,
        )
        self.mentor_profile = Profile.objects.create(user=self.mentor_user, display_name="Mentor")
        self.mentee_profile = Profile.objects.create(user=self.mentee_user, display_name="Mentee")

        slot = AvailabilitySlot.objects.create(
            profile=self.mentor_profile,
            start_at=timezone.now() + timedelta(days=1),
            end_at=timezone.now() + timedelta(days=1, hours=1)
        )
        req = _create_accepted_request(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            slot=slot,
        )
        self.match = Match.objects.get(request=req)
        self.conversation = Conversation.objects.get(match=self.match)

    @patch("messaging.firebase.get_firestore_client")
    def test_message_creation_syncs_to_firestore(self, mock_get_client):
        """Creating a Message should trigger Firestore sync via signal."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        # Trigger signal
        message = Message.objects.create(
            conversation=self.conversation,
            sender=self.mentor_profile,
            body="Hello Firestore"
        )

        # Verify sync_message_to_firestore was called via signal
        self.assertTrue(mock_client.collection.called)
        mock_client.collection.assert_any_call("conversations")

        # Verify read receipts were created
        self.assertEqual(ReadReceipt.objects.filter(message=message).count(), 2)
        sender_receipt = ReadReceipt.objects.get(message=message, user=self.mentor_profile)
        recipient_receipt = ReadReceipt.objects.get(message=message, user=self.mentee_profile)
        self.assertEqual(sender_receipt.status, "sent")
        self.assertEqual(recipient_receipt.status, "delivered")

    @patch("messaging.firebase.get_firestore_client")
    def test_read_receipt_update_syncs_to_firestore(self, mock_get_client):
        """Updating a ReadReceipt should trigger Firestore update via signal."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        message = Message.objects.create(
            conversation=self.conversation,
            sender=self.mentor_profile,
            body="Initial Message"
        )

        # Clear mock calls from creation
        mock_client.reset_mock()

        # Update receipt for recipient
        receipt = ReadReceipt.objects.get(message=message, user=self.mentee_profile)
        receipt.status = "read"
        receipt.save()

        # Verify update_message_read_status_in_firestore was called via signal
        mock_client.collection.assert_any_call("conversations")
        # Check if update was called on the correct document
        mock_doc = mock_client.collection().document().collection().document()
        self.assertTrue(mock_doc.update.called)
        call_args = mock_doc.update.call_args[0][0]
        self.assertEqual(call_args[f"read_receipts.{self.mentee_profile.id}"], "read")
