from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .fcm import send_push_notification
from .models import Notification


@receiver(post_save, sender=Notification)
def trigger_push_notification(sender, instance, created, **kwargs):
    """Trigger a push notification when a new notification is created."""
    if created:
        # Prepare data for the push notification
        data = {
            "type": instance.type,
            "resource_type": instance.resource_type or "",
            "resource_id": str(instance.resource_id) if instance.resource_id else "",
            "notification_id": str(instance.id),
            "actor_username": instance.actor.user.username if instance.actor and instance.actor.user else "",
        }
        
        # Add action_url if present
        if instance.action_url:
            data["action_url"] = instance.action_url

        # Send the notification after the transaction is committed
        transaction.on_commit(
            lambda: send_push_notification(
                user_id=instance.user.id,
                title=instance.title or "New Notification",
                body=instance.message,
                data=data,
            )
        )
