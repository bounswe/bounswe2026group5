"""Mentorship-domain models."""

import uuid
from typing import Any

from django.db import models
from django.db.models import F, Q
from django.utils import timezone

from profiles.models import AvailabilitySlot, Profile


class MentorshipRequest(models.Model):
    """Request from a mentee profile to a mentor profile."""

    class Status(models.TextChoices):
        """Allowed statuses for a mentorship request."""

        PENDING = "PENDING", "Pending"
        ACCEPTED = "ACCEPTED", "Accepted"
        REJECTED = "REJECTED", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mentor = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="received_requests",
    )
    mentee = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="sent_requests",
    )
    slot = models.ForeignKey(
        AvailabilitySlot,
        on_delete=models.PROTECT,
        related_name="mentorship_requests",
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
    )
    cover_letter = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "mentorship_requests"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=~Q(mentor=F("mentee")),
                name="mentorship_request_mentor_not_mentee",
            ),
            models.UniqueConstraint(
                fields=["mentor", "mentee"],
                condition=Q(status="PENDING"),
                name="uniq_pending_request_per_mentor_mentee",
            ),
        ]
        indexes = [
            models.Index(fields=["mentor", "status"]),
            models.Index(fields=["mentee", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.mentee.display_name} -> {self.mentor.display_name} ({self.status})"

    def save(self, *args: Any, **kwargs: Any) -> None:
        """Persist request and create a match when request becomes accepted."""

        previous_status = None
        if self.pk:
            previous_status = (
                MentorshipRequest.objects.filter(pk=self.pk)
                .values_list("status", flat=True)
                .first()
            )

        if self.status in {self.Status.ACCEPTED, self.Status.REJECTED}:
            if previous_status != self.status and self.responded_at is None:
                self.responded_at = timezone.now()
        elif self.status == self.Status.PENDING:
            self.responded_at = None

        super().save(*args, **kwargs)

        if self.status == self.Status.ACCEPTED and previous_status != self.Status.ACCEPTED:
            Match.objects.get_or_create(
                request=self,
                defaults={
                    "mentor": self.mentor,
                    "mentee": self.mentee,
                    "is_active": True,
                },
            )


class Match(models.Model):
    """Represents an accepted mentorship relationship between mentor and mentee."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mentor = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="mentor_matches",
    )
    mentee = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="mentee_matches",
    )
    request = models.OneToOneField(
        MentorshipRequest,
        on_delete=models.CASCADE,
        related_name="match",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "matches"
        ordering = ["-request__created_at"]
        indexes = [
            models.Index(fields=["mentor", "is_active"]),
            models.Index(fields=["mentee", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.mentor.display_name} <> {self.mentee.display_name}"
