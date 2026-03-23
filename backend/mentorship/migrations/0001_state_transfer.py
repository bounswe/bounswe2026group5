import django.db.models.deletion
import uuid

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("accounts", "0005_mentorshiprequest_match_and_more"),
        ("profiles", "0001_state_transfer"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.CreateModel(
                    name="MentorshipRequest",
                    fields=[
                        (
                            "id",
                            models.UUIDField(
                                default=uuid.uuid4,
                                editable=False,
                                primary_key=True,
                                serialize=False,
                            ),
                        ),
                        (
                            "status",
                            models.CharField(
                                choices=[
                                    ("PENDING", "Pending"),
                                    ("ACCEPTED", "Accepted"),
                                    ("REJECTED", "Rejected"),
                                ],
                                default="PENDING",
                                max_length=16,
                            ),
                        ),
                        ("cover_letter", models.TextField(blank=True, default="")),
                        ("created_at", models.DateTimeField(auto_now_add=True)),
                        ("responded_at", models.DateTimeField(blank=True, null=True)),
                        (
                            "mentee",
                            models.ForeignKey(
                                on_delete=django.db.models.deletion.CASCADE,
                                related_name="sent_requests",
                                to="profiles.profile",
                            ),
                        ),
                        (
                            "mentor",
                            models.ForeignKey(
                                on_delete=django.db.models.deletion.CASCADE,
                                related_name="received_requests",
                                to="profiles.profile",
                            ),
                        ),
                    ],
                    options={
                        "db_table": "mentorship_requests",
                        "ordering": ["-created_at"],
                        "indexes": [
                            models.Index(
                                fields=["mentor", "status"],
                                name="mentorship__mentor__e850bc_idx",
                            ),
                            models.Index(
                                fields=["mentee", "status"],
                                name="mentorship__mentee__2dd85d_idx",
                            ),
                        ],
                        "constraints": [
                            models.UniqueConstraint(
                                condition=models.Q(("status", "PENDING")),
                                fields=("mentor", "mentee"),
                                name="uniq_pending_request_per_mentor_mentee",
                            ),
                        ],
                    },
                ),
                migrations.CreateModel(
                    name="Match",
                    fields=[
                        (
                            "id",
                            models.UUIDField(
                                default=uuid.uuid4,
                                editable=False,
                                primary_key=True,
                                serialize=False,
                            ),
                        ),
                        ("is_active", models.BooleanField(default=True)),
                        (
                            "mentee",
                            models.ForeignKey(
                                on_delete=django.db.models.deletion.CASCADE,
                                related_name="mentee_matches",
                                to="profiles.profile",
                            ),
                        ),
                        (
                            "mentor",
                            models.ForeignKey(
                                on_delete=django.db.models.deletion.CASCADE,
                                related_name="mentor_matches",
                                to="profiles.profile",
                            ),
                        ),
                        (
                            "request",
                            models.OneToOneField(
                                on_delete=django.db.models.deletion.CASCADE,
                                related_name="match",
                                to="mentorship.mentorshiprequest",
                            ),
                        ),
                    ],
                    options={
                        "db_table": "matches",
                        "ordering": ["-request__created_at"],
                        "indexes": [
                            models.Index(
                                fields=["mentor", "is_active"],
                                name="matches_mentor__f1729a_idx",
                            ),
                            models.Index(
                                fields=["mentee", "is_active"],
                                name="matches_mentee__dea405_idx",
                            ),
                        ],
                    },
                ),
            ],
        ),
    ]
