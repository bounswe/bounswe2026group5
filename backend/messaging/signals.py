"""Signals for messaging domain side effects."""

from typing import Any

from django.db.models.signals import post_save
from django.dispatch import receiver

from mentorship.models import Match

from .firebase import sync_message_to_firestore, update_message_read_status_in_firestore
from .models import Conversation, Message, ReadReceipt


@receiver(
    post_save,
    sender=Match,
    dispatch_uid="messaging.create_conversation_for_new_match",
)
def create_conversation_for_new_match(
    sender: type[Match],
    instance: Match,
    created: bool,
    **kwargs: Any,
) -> None:
    """Create the initial conversation whenever a new match is created."""
    if not created or kwargs.get("raw", False):
        return

    Conversation.objects.get_or_create(match=instance)


@receiver(
    post_save,
    sender=Message,
    dispatch_uid="messaging.update_conversation_timestamp",
)
def update_conversation_timestamp(
    sender: type[Message],
    instance: Message,
    created: bool,
    **kwargs: Any,
) -> None:
    """Update the conversation's updated_at timestamp when a new message is sent."""
    if not created or kwargs.get("raw", False):
        return

    # Using save() ensures that auto_now=True fields (updated_at) are refreshed.
    # We specify update_fields for efficiency.
    instance.conversation.save(update_fields=["updated_at"])


@receiver(
    post_save,
    sender=Message,
    dispatch_uid="messaging.sync_message_to_firestore",
)
def sync_message_to_firestore_signal(
    sender: type[Message],
    instance: Message,
    created: bool,
    **kwargs: Any,
) -> None:
    """Sync a message to Firestore for real-time delivery when a new message is created."""
    if not created or kwargs.get("raw", False):
        return

    # Sync to Firestore (graceful fallback if Firebase not available)
    sync_message_to_firestore(instance)

    # Create read receipts for all participants in the conversation
    # For sender: 'sent', for receiver: 'delivered'
    conversation = instance.conversation
    mentor = conversation.match.mentor
    mentee = conversation.match.mentee

    message_sender = instance.sender
    recipient = mentor if message_sender.id == mentee.id else mentee

    # Create or update read receipt for sender
    ReadReceipt.objects.get_or_create(
        message=instance,
        user=message_sender,
        defaults={"status": "sent"},
    )

    # Create or update read receipt for recipient (delivered)
    ReadReceipt.objects.get_or_create(
        message=instance,
        user=recipient,
        defaults={"status": "delivered"},
    )


@receiver(
    post_save,
    sender=ReadReceipt,
    dispatch_uid="messaging.sync_read_receipt_to_firestore",
)
def sync_read_receipt_to_firestore_signal(
    sender: type[ReadReceipt],
    instance: ReadReceipt,
    **kwargs: Any,
) -> None:
    """Sync read receipt status to Firestore when updated."""
    # Update Firestore with the new read status
    update_message_read_status_in_firestore(
        message_id=instance.message_id,
        conversation_id=instance.message.conversation_id,
        user_id=instance.user_id,
        status=instance.status,
    )
