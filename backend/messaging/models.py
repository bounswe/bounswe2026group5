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
