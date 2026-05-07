"""Messaging-domain models."""

import uuid

from django.db import models

from mentorship.models import Match
from profiles.models import Profile


class Conversation(models.Model):
    """A private messaging conversation between two matched users."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.OneToOneField(
        Match,
        on_delete=models.CASCADE,
        related_name="conversation",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "message_conversations"

    def __str__(self) -> str:
        return f"Conversation for match {getattr(self, 'match_id')}"


class Message(models.Model):
    """A single message sent inside a private conversation."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="sent_messages",
    )
    body = models.TextField(blank=True, default="")
    attachment = models.FileField(
        upload_to="message_attachments/%Y/%m/%d",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "messages"
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"Message {self.id} from {self.sender_id}"

    def get_read_receipts(self) -> dict[str, str]:
        """Get read receipt statuses for all users in this conversation."""
        receipts = {}
        for receipt in self.read_receipts.all():
            receipts[str(receipt.user_id)] = receipt.status
        return receipts

    def get_status_for_user(self, user_id: str) -> str:
        """Get the status of this message for a specific user."""
        try:
            receipt = self.read_receipts.get(user_id=user_id)
            return receipt.status
        except ReadReceipt.DoesNotExist:
            # If sender, default to 'sent'; if recipient, default to 'delivered'
            if str(self.sender_id) == str(user_id):
                return "sent"
            return "delivered"


class ReadReceipt(models.Model):
    """Tracks message delivery and read status for recipients."""

    STATUS_CHOICES = [
        ("sent", "Sent"),
        ("delivered", "Delivered"),
        ("read", "Read"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name="read_receipts",
    )
    user = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="message_read_receipts",
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="sent",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "message_read_receipts"
        unique_together = ("message", "user")
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"ReadReceipt: {self.message_id} → {self.user_id} ({self.status})"
