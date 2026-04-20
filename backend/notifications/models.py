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


class Notification(models.Model):
    """Notification for user events."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=50, choices=NotificationType.choices)
    message = models.TextField()
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
