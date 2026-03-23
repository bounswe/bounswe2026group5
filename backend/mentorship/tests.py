"""Tests for mentorship domain models."""

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from mentorship.models import Match, MentorshipRequest
from profiles.models import MentorshipMode, Profile

User = get_user_model()


class MentorshipRequestModelTests(TestCase):
    """Unit tests for MentorshipRequest and Match domain logic."""

    def setUp(self) -> None:
        """Prepare mentor and mentee profiles for request/match tests."""
        mentor_user = User.objects.create_user(
            email="mentor.request@example.com",
            password="SecurePass123",
        )
        mentee_user = User.objects.create_user(
            email="mentee.request@example.com",
            password="SecurePass123",
        )

        self.mentor_profile = Profile.objects.create(
            user=mentor_user,
            display_name="Mentor Request",
            mentorship_mode=MentorshipMode.MENTOR,
        )
        self.mentee_profile = Profile.objects.create(
            user=mentee_user,
            display_name="Mentee Request",
            mentorship_mode=MentorshipMode.MENTEE,
        )

    def test_default_status_is_pending(self) -> None:
        """New mentorship requests default to PENDING."""
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            cover_letter="Can we discuss backend architecture?",
        )

        self.assertEqual(request_obj.status, MentorshipRequest.Status.PENDING)

    def test_self_request_violates_constraint(self) -> None:
        """A mentor cannot send a mentorship request to themselves."""
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                MentorshipRequest.objects.create(
                    mentor=self.mentor_profile,
                    mentee=self.mentor_profile,
                )

    def test_unique_pending_request_constraint(self) -> None:
        """A mentee cannot create duplicate pending requests for the same mentor."""
        MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.PENDING,
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                MentorshipRequest.objects.create(
                    mentor=self.mentor_profile,
                    mentee=self.mentee_profile,
                    status=MentorshipRequest.Status.PENDING,
                )

    def test_non_pending_request_does_not_trigger_pending_constraint(self) -> None:
        """Rejected requests can coexist because uniqueness applies only to PENDING."""
        MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.REJECTED,
        )

        second_request = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.REJECTED,
        )

        self.assertEqual(second_request.status, MentorshipRequest.Status.REJECTED)

    def test_match_auto_created_on_accept(self) -> None:
        """A match is automatically created when request status becomes ACCEPTED."""
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.PENDING,
        )
        self.assertFalse(Match.objects.filter(request=request_obj).exists())

        request_obj.status = MentorshipRequest.Status.ACCEPTED
        request_obj.save()

        self.assertTrue(Match.objects.filter(request=request_obj).exists())
        match = Match.objects.get(request=request_obj)
        self.assertEqual(match.mentor, self.mentor_profile)
        self.assertEqual(match.mentee, self.mentee_profile)
        self.assertTrue(match.is_active)

    def test_match_not_duplicated_on_repeated_accept_saves(self) -> None:
        """Repeated saves in ACCEPTED state do not create duplicate matches."""
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.ACCEPTED,
        )

        request_obj.save()
        request_obj.save()

        self.assertEqual(Match.objects.filter(request=request_obj).count(), 1)

    def test_responded_at_set_when_request_accepted(self) -> None:
        """responded_at is auto-populated when request becomes ACCEPTED."""
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
        )

        self.assertIsNone(request_obj.responded_at)

        request_obj.status = MentorshipRequest.Status.ACCEPTED
        request_obj.save()
        request_obj.refresh_from_db()

        self.assertIsNotNone(request_obj.responded_at)

    def test_responded_at_set_when_request_rejected(self) -> None:
        """responded_at is auto-populated when request becomes REJECTED."""
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
        )

        request_obj.status = MentorshipRequest.Status.REJECTED
        request_obj.save()
        request_obj.refresh_from_db()

        self.assertIsNotNone(request_obj.responded_at)

    def test_responded_at_cleared_when_status_back_to_pending(self) -> None:
        """responded_at is cleared if a request is moved back to PENDING."""
        request_obj = MentorshipRequest.objects.create(
            mentor=self.mentor_profile,
            mentee=self.mentee_profile,
            status=MentorshipRequest.Status.ACCEPTED,
        )
        self.assertIsNotNone(request_obj.responded_at)

        request_obj.status = MentorshipRequest.Status.PENDING
        request_obj.save()
        request_obj.refresh_from_db()

<<<<<<< HEAD
        self.assertIsNone(request_obj.responded_at)
=======
        self.assertIsNone(request_obj.responded_at)
>>>>>>> acaff5e065aade818d52fd7a2d47b52955c2afce
