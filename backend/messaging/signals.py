"""Signals for messaging domain side effects."""

from typing import Any

from django.db.models.signals import post_save
from django.dispatch import receiver

from mentorship.models import Match

from .models import Conversation


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
