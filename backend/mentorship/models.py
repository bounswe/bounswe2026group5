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

    def _resolve_session_window(self) -> tuple[Any, Any]:
        """Return session window from current slot or historical snapshot."""
        if self.slot is not None:
            return self.slot.start_at, self.slot.end_at
        return self.initial_session_start_at, self.initial_session_end_at

    def _create_match_and_initial_session(self, previous_status: str | None) -> None:
        """Create a match and first canonical MeetingSession on accept transition."""
        if self.status != self.Status.ACCEPTED or previous_status == self.Status.ACCEPTED:
            return

        match, _ = Match.objects.get_or_create(
            request=self,
            defaults={
                "mentor": self.mentor,
                "mentee": self.mentee,
                "is_active": True,
            },
        )

        if MeetingSession.objects.filter(match=match).exists():
            return

        session_start_at, session_end_at = self._resolve_session_window()
        if session_start_at is None or session_end_at is None:
            return

        session_status = (
            MeetingSession.Status.COMPLETED
            if session_end_at <= timezone.now()
            else MeetingSession.Status.SCHEDULED
        )
        MeetingSession.objects.create(
            match=match,
            mentor=self.mentor,
            mentee=self.mentee,
            source_slot=self.slot,
            scheduled_start_at_utc=session_start_at,
            scheduled_end_at_utc=session_end_at,
            status=session_status,
        )

    def save(self, *args: Any, **kwargs: Any) -> None:
        """Persist request and create a match when request becomes accepted."""
        previous_status = self._get_previous_status()
        self._sync_responded_at(previous_status)
        self._sync_initial_session_snapshot()

        super().save(*args, **kwargs)
        self._create_match_and_initial_session(previous_status)


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
