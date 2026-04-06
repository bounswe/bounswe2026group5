import django.contrib.postgres.constraints
import django.db.models.deletion
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("accounts", "0005_mentorshiprequest_match_and_more"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.CreateModel(
                    name="ExpertiseField",
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
                        ("name", models.CharField(max_length=80, unique=True)),
                        ("description", models.TextField(blank=True, default="")),
                        ("created_at", models.DateTimeField(auto_now_add=True)),
                    ],
                    options={
                        "db_table": "expertise_fields",
                        "ordering": ["name"],
                    },
                ),
                migrations.CreateModel(
                    name="Profile",
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
                        ("display_name", models.CharField(max_length=120)),
                        ("bio", models.TextField(blank=True, default="")),
                        ("picture_url", models.URLField(blank=True, default="")),
                        ("title", models.CharField(blank=True, default="", max_length=120)),
                        (
                            "location_text",
                            models.CharField(blank=True, default="", max_length=255),
                        ),
                        ("is_visible", models.BooleanField(default=True)),
                        ("show_initials_only", models.BooleanField(default=False)),
                        (
                            "mentorship_mode",
                            models.CharField(
                                choices=[
                                    ("MENTOR", "Mentor"),
                                    ("MENTEE", "Mentee"),
                                    ("BOTH", "Both"),
                                ],
                                default="BOTH",
                                max_length=16,
                            ),
                        ),
                        ("created_at", models.DateTimeField(auto_now_add=True)),
                        ("updated_at", models.DateTimeField(auto_now=True)),
                        (
                            "user",
                            models.OneToOneField(
                                on_delete=django.db.models.deletion.CASCADE,
                                related_name="profile",
                                to=settings.AUTH_USER_MODEL,
                            ),
                        ),
                    ],
                    options={
                        "db_table": "profiles",
                        "ordering": ["display_name", "-created_at"],
                        "indexes": [
                            models.Index(
                                fields=["mentorship_mode"],
                                name="profiles_mentors_c5f0f6_idx",
                            ),
                            models.Index(
                                fields=["is_visible", "show_initials_only"],
                                name="profiles_is_visi_66d764_idx",
                            ),
                        ],
                    },
                ),
                migrations.CreateModel(
                    name="ProfileExpertise",
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
                        ("proficiency_level", models.PositiveSmallIntegerField(default=1)),
                        (
                            "average_rating",
                            models.DecimalField(
                                decimal_places=2,
                                default=Decimal("0.00"),
                                max_digits=3,
                            ),
                        ),
                        ("rating_count", models.PositiveIntegerField(default=0)),
                        ("created_at", models.DateTimeField(auto_now_add=True)),
                        ("updated_at", models.DateTimeField(auto_now=True)),
                        (
                            "expertise_field",
                            models.ForeignKey(
                                on_delete=django.db.models.deletion.CASCADE,
                                related_name="profile_expertise",
                                to="profiles.expertisefield",
                            ),
                        ),
                        (
                            "profile",
                            models.ForeignKey(
                                on_delete=django.db.models.deletion.CASCADE,
                                related_name="profile_expertise",
                                to="profiles.profile",
                            ),
                        ),
                    ],
                    options={
                        "db_table": "profile_expertise",
                        "ordering": ["-created_at"],
                        "constraints": [
                            models.UniqueConstraint(
                                fields=("profile", "expertise_field"),
                                name="uniq_profile_expertise",
                            ),
                            models.CheckConstraint(
                                condition=models.Q(
                                    ("proficiency_level__gte", 1),
                                    ("proficiency_level__lte", 5),
                                ),
                                name="profile_expertise_proficiency_level_between_1_5",
                            ),
                            models.CheckConstraint(
                                condition=models.Q(
                                    ("average_rating__gte", 0),
                                    ("average_rating__lte", 5),
                                ),
                                name="profile_expertise_average_rating_between_0_5",
                            ),
                        ],
                        "indexes": [
                            models.Index(
                                fields=["profile", "expertise_field"],
                                name="profile_exp_profile_1924ae_idx",
                            ),
                        ],
                    },
                ),
                migrations.AddField(
                    model_name="profile",
                    name="expertise_fields",
                    field=models.ManyToManyField(
                        blank=True,
                        related_name="profiles",
                        through="profiles.ProfileExpertise",
                        to="profiles.expertisefield",
                    ),
                ),
                migrations.CreateModel(
                    name="AvailabilitySlot",
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
                        ("start_at", models.DateTimeField()),
                        ("end_at", models.DateTimeField()),
                        ("is_booked", models.BooleanField(default=False)),
                        ("created_at", models.DateTimeField(auto_now_add=True)),
                        ("updated_at", models.DateTimeField(auto_now=True)),
                        (
                            "profile",
                            models.ForeignKey(
                                on_delete=django.db.models.deletion.CASCADE,
                                related_name="availability_slots",
                                to="profiles.profile",
                            ),
                        ),
                    ],
                    options={
                        "db_table": "availability_slots",
                        "ordering": ["start_at"],
                        "indexes": [
                            models.Index(
                                fields=["profile", "start_at"],
                                name="availabilit_profile_06c146_idx",
                            ),
                            models.Index(
                                fields=["is_booked", "start_at"],
                                name="availabilit_is_book_7387a7_idx",
                            ),
                        ],
                        "constraints": [
                            models.CheckConstraint(
                                condition=models.Q(("end_at__gt", models.F("start_at"))),
                                name="availability_slot_end_after_start",
                            ),
                            django.contrib.postgres.constraints.ExclusionConstraint(
                                expressions=[
                                    ("profile", "="),
                                    (
                                        models.Func(
                                            models.F("start_at"),
                                            models.F("end_at"),
                                            models.Value("[)"),
                                            function="tstzrange",
                                        ),
                                        "&&",
                                    ),
                                ],
                                name="availability_slot_no_overlap_per_profile",
                            ),
                        ],
                    },
                ),
            ],
        ),
    ]
