"""Workshop-domain models."""

import uuid

from django.db import models
from django.db.models import F, Q

from profiles.models import Profile


class Workshop(models.Model):
    """Group mentorship session created by a mentor."""

    class Status(models.TextChoices):
        """Lifecycle statuses for a workshop."""

        SCHEDULED = "SCHEDULED", "Scheduled"
        CANCELED = "CANCELED", "Canceled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mentor = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="hosted_workshops",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    scheduled_start_at_utc = models.DateTimeField()
    scheduled_end_at_utc = models.DateTimeField()
    min_participants = models.PositiveSmallIntegerField(default=1)
    max_participants = models.PositiveSmallIntegerField()
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.SCHEDULED,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "workshops"
        ordering = ["-scheduled_start_at_utc", "-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(scheduled_end_at_utc__gt=F("scheduled_start_at_utc")),
                name="workshop_end_after_start",
            ),
            models.CheckConstraint(
                condition=Q(min_participants__gte=1),
                name="workshop_min_participants_gte_1",
            ),
            models.CheckConstraint(
                condition=Q(max_participants__gte=F("min_participants")),
                name="workshop_max_participants_gte_min",
            ),
        ]
        indexes = [
            models.Index(fields=["mentor", "scheduled_start_at_utc"]),
            models.Index(fields=["status", "scheduled_start_at_utc"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.mentor.display_name})"


class WorkshopParticipation(models.Model):
    """A mentee's participation entry on a workshop, possibly representing a group."""

    class Status(models.TextChoices):
        """Lifecycle statuses for a workshop participation."""

        CONFIRMED = "CONFIRMED", "Confirmed"
        PENDING_APPROVAL = "PENDING_APPROVAL", "Pending Approval"
        REJECTED = "REJECTED", "Rejected"
        CANCELED = "CANCELED", "Canceled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workshop = models.ForeignKey(
        Workshop,
        on_delete=models.CASCADE,
        related_name="participations",
    )
    mentee = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="workshop_participations",
    )
    group_size = models.PositiveSmallIntegerField(default=1)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CONFIRMED,
    )
    requested_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "workshop_participations"
        ordering = ["-requested_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["workshop", "mentee"],
                name="uniq_participation_per_workshop_mentee",
            ),
            models.CheckConstraint(
                condition=Q(group_size__gte=1),
                name="workshop_participation_group_size_gte_1",
            ),
        ]
        indexes = [
            models.Index(fields=["workshop", "status"]),
            models.Index(fields=["mentee", "status"]),
        ]

    def __str__(self) -> str:
        return (
            f"{self.mentee.display_name} on {self.workshop.title} "
            f"(x{self.group_size}, {self.status})"
        )
