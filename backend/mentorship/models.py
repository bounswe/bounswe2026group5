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
    initial_session_start_at = models.DateTimeField(null=True, blank=True)
    initial_session_end_at = models.DateTimeField(null=True, blank=True)
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

    def _get_previous_status(self) -> str | None:
        """Return persisted status before current in-memory updates."""
        if not self.pk:
            return None

        return MentorshipRequest.objects.filter(pk=self.pk).values_list("status", flat=True).first()

    def _sync_responded_at(self, previous_status: str | None) -> None:
        """Keep responded_at aligned with request status transitions."""
        if self.status in {self.Status.ACCEPTED, self.Status.REJECTED}:
            if previous_status != self.status and self.responded_at is None:
                self.responded_at = timezone.now()
            return

        if self.status == self.Status.PENDING:
            self.responded_at = None

    def _sync_initial_session_snapshot(self) -> None:
        """Persist the first accepted slot window as an immutable snapshot."""
        if self.status != self.Status.ACCEPTED or self.slot is None:
            return

        if self.initial_session_start_at is None:
            self.initial_session_start_at = self.slot.start_at
        if self.initial_session_end_at is None:
            self.initial_session_end_at = self.slot.end_at

    def save(self, *args: Any, **kwargs: Any) -> None:
        """Persist request with request-local status metadata synchronization."""
        previous_status = self._get_previous_status()
        self._sync_responded_at(previous_status)
        self._sync_initial_session_snapshot()

        super().save(*args, **kwargs)


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


class MeetingSession(models.Model):
    """Canonical mentorship session record for scheduling and lifecycle operations."""

    class Status(models.TextChoices):
        """Lifecycle statuses for a mentorship session."""

        SCHEDULED = "SCHEDULED", "Scheduled"
        RESCHEDULED = "RESCHEDULED", "Rescheduled"
        CANCELED = "CANCELED", "Canceled"
        COMPLETED = "COMPLETED", "Completed"

    class CanceledByRole(models.TextChoices):
        """Role of the participant who canceled the session."""

        MENTOR = "MENTOR", "Mentor"
        MENTEE = "MENTEE", "Mentee"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        related_name="meeting_sessions",
    )
    mentor = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="mentor_meeting_sessions",
    )
    mentee = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="mentee_meeting_sessions",
    )
    source_slot = models.ForeignKey(
        AvailabilitySlot,
        on_delete=models.SET_NULL,
        related_name="meeting_sessions",
        null=True,
        blank=True,
    )
    scheduled_start_at_utc = models.DateTimeField()
    scheduled_end_at_utc = models.DateTimeField()
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.SCHEDULED,
    )
    canceled_by_role = models.CharField(
        max_length=16,
        choices=CanceledByRole.choices,
        blank=True,
        default="",
    )
    cancel_reason = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "meeting_sessions"
        ordering = ["-scheduled_start_at_utc", "-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(scheduled_end_at_utc__gt=models.F("scheduled_start_at_utc")),
                name="meeting_session_end_after_start",
            ),
            models.CheckConstraint(
                condition=~Q(mentor=F("mentee")),
                name="meeting_session_mentor_not_mentee",
            ),
        ]
        indexes = [
            models.Index(fields=["mentor", "scheduled_start_at_utc"]),
            models.Index(fields=["mentee", "scheduled_start_at_utc"]),
            models.Index(fields=["status", "scheduled_start_at_utc"]),
        ]

    def __str__(self) -> str:
        return (
            f"{self.mentor.display_name} <> {self.mentee.display_name} "
            f"({self.scheduled_start_at_utc.isoformat()})"
        )


class Feedback(models.Model):
    """Feedback left by a match participant (mentor or mentee) about the interaction."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        related_name="feedbacks",
    )
    submitted_by = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="submitted_feedbacks",
    )
    rating = models.PositiveSmallIntegerField()
    text = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "feedback"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["match", "submitted_by"],
                name="uniq_feedback_per_match_participant",
            ),
            models.CheckConstraint(
                condition=Q(rating__gte=1) & Q(rating__lte=5),
                name="feedback_rating_between_1_and_5",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.submitted_by.display_name} on {self.match} ({self.rating}/5)"


class Workshop(models.Model):
    """Collective learning session hosted within a community."""

    class Status(models.TextChoices):
        """Lifecycle statuses for a workshop."""

        SCHEDULED = "SCHEDULED", "Scheduled"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    community = models.ForeignKey(
        "profiles.CommunityTag",
        on_delete=models.CASCADE,
        related_name="community_workshops",
    )
    author = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="author_workshops",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    scheduled_at = models.DateTimeField()
    end_at = models.DateTimeField()
    max_participants = models.PositiveIntegerField()
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.SCHEDULED,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "workshops"
        ordering = ["-scheduled_at", "-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(end_at__gt=models.F("scheduled_at")),
                name="workshop_end_after_start",
            ),
        ]
        indexes = [
            models.Index(fields=["community", "status"]),
            models.Index(fields=["author", "status"]),
            models.Index(fields=["scheduled_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} @ {self.community.name} ({self.status})"

    def get_participant_count(self) -> int:
        """Return current number of enrolled participants."""
        return self.participants.count()

    def is_full(self) -> bool:
        """Check if workshop has reached max capacity."""
        return self.get_participant_count() >= self.max_participants

    def is_author(self, profile: Profile) -> bool:
        """Check if profile is the workshop author."""
        return self.author == profile

    def is_past_end_time(self) -> bool:
        """Check if current time is past workshop end time."""
        return timezone.now() > self.end_at


class WorkshopParticipant(models.Model):
    """Through-table linking Profile to Workshop participation with metadata."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workshop = models.ForeignKey(
        Workshop,
        on_delete=models.CASCADE,
        related_name="participants",
    )
    participant = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="workshop_participations",
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    show_on_profile = models.BooleanField(default=False)

    class Meta:
        db_table = "workshop_participants"
        ordering = ["joined_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["workshop", "participant"],
                name="uniq_workshop_participant",
            ),
        ]
        indexes = [
            models.Index(fields=["workshop"]),
            models.Index(fields=["participant"]),
        ]

    def __str__(self) -> str:
        return f"{self.participant.display_name} @ {self.workshop.title}"
