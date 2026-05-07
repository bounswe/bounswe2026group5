import uuid

from django.db import models

from accounts.models import User


class NotificationType(models.TextChoices):
    """Types of notifications in the system."""

    NEW_MENTORSHIP_REQUEST = "new_mentorship_request", "New Mentorship Request"
    MENTORSHIP_REQUEST_REJECTED = "mentorship_request_rejected", "Mentorship Request Rejected"
    NEW_MATCH = "new_match", "New Match"
    SLOT_BOOKED = "slot_booked", "Slot Booked"
    SESSION_CANCELED = "session_canceled", "Session Canceled"
    SESSION_RESCHEDULED = "session_rescheduled", "Session Rescheduled"
    MATCH_DEACTIVATED = "match_deactivated", "Match Deactivated"
    NEW_MESSAGE = "new_message", "New Message"
    NEW_FEEDBACK_AVAILABLE = "new_feedback_available", "New Feedback Available"
    TAG_NEW_MEMBER = "tag_new_member", "Tag New Member"
    TAG_DESCRIPTION_UPDATED = "tag_description_updated", "Tag Description Updated"
    TAG_DELETED = "tag_deleted", "Tag Deleted"
    TAG_MATCHES_INTEREST = "tag_matches_interest", "Tag Matches Interest"


class Notification(models.Model):
    """Notification for user events."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=50, choices=NotificationType.choices)
    title = models.CharField(max_length=255, default="")
    message = models.TextField()
    actor = models.ForeignKey(
        "profiles.Profile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="actor_notifications",
    )
    resource_type = models.CharField(max_length=50, blank=True)
    resource_id = models.UUIDField(null=True, blank=True)
    action_url = models.URLField(max_length=500, blank=True)
    extra_metadata = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read"]),
        ]

    def __str__(self) -> str:
        return f"{self.user.username}: {self.type} - {self.message[:50]}"


class FCMToken(models.Model):
    """FCM Token for push notifications."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="fcm_tokens")
    token = models.TextField(unique=True)
    device_type = models.CharField(
        max_length=20,
        choices=[("web", "Web"), ("android", "Android"), ("ios", "iOS")],
        default="web",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "fcm_tokens"
        verbose_name = "FCM Token"
        verbose_name_plural = "FCM Tokens"

    def __str__(self) -> str:
        return f"{self.user.username} - {self.device_type}"
