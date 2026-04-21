"""Signals for messaging domain side effects."""

from typing import Any

from django.db.models.signals import post_save
from django.dispatch import receiver

from mentorship.models import Match

from .models import Conversation, Message


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
