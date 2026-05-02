"""Timeline-domain models."""

import uuid

from django.db import models

from mentorship.models import Match
from profiles.models import Profile


class TimelineEvent(models.Model):
    """Unified timeline event/post model across mentorship and profile contexts."""

    class Category(models.TextChoices):
        """Supported timeline event categories."""

        AGTE = "AGTE", "Automatically-Generated Timeline Event"
        MCTE = "MCTE", "Manually-Created Timeline Event"
        PRP = "PrP", "Profile Post"
        COP = "CoP", "Community Post"

    class MCTEEventType(models.TextChoices):
        """Allowed event_type values for manually-created timeline events."""

        ACHIEVEMENT = "achievement", "Achievement"
        SOCIAL = "social", "Social"
        PROGRESS = "progress", "Progress"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_id = models.CharField(max_length=128, unique=True)
    category = models.CharField(max_length=4, choices=Category.choices)
    event_type = models.CharField(max_length=64)
    author = models.ForeignKey(
        Profile,
        on_delete=models.SET_NULL,
        related_name="authored_timeline_events",
        null=True,
        blank=True,
    )
    mentorship = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        related_name="timeline_events",
        null=True,
        blank=True,
    )
    community_id = models.UUIDField(null=True, blank=True)
    show_on_profile = models.BooleanField(default=False)
    content = models.TextField(blank=True, default="")
    media_url = models.URLField(max_length=1000, null=True, blank=True, default=None)
    payload = models.JSONField(null=True, blank=True)
    actor_role = models.CharField(max_length=16, blank=True, default="")
    timestamp = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    last_edited = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    reposted_from = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="reposts",
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "timeline_events"
        ordering = ["-timestamp", "-created_at"]
        indexes = [
            models.Index(fields=["mentorship", "category", "is_deleted", "timestamp"]),
            models.Index(fields=["author", "show_on_profile", "is_deleted", "timestamp"]),
            models.Index(fields=["category", "event_type", "timestamp"]),
        ]

    def __str__(self) -> str:
        return f"{self.category}:{self.event_type} ({self.source_id})"
