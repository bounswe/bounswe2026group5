from django.db import migrations
from django.db.models import Count


def backfill_total_mentee_count(apps, schema_editor):
    profile_model = apps.get_model("profiles", "Profile")
    match_model = apps.get_model("mentorship", "Match")

    mentor_ids_with_any_match = list(
        match_model.objects.values_list("mentor_id", flat=True).distinct()
    )
    if not mentor_ids_with_any_match:
        return

    active_counts_by_mentor = {
        row["mentor_id"]: row["active_count"]
        for row in match_model.objects.filter(is_active=True)
        .values("mentor_id")
        .annotate(active_count=Count("mentee_id", distinct=True))
    }

    for mentor_id in mentor_ids_with_any_match:
        profile_model.objects.filter(pk=mentor_id).update(
            total_mentee_count=active_counts_by_mentor.get(mentor_id, 0)
        )


def noop_reverse(apps, schema_editor):
    # Forward-only data correction; reverse is intentionally a no-op.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("profiles", "0012_remove_profile_rating"),
        (
            "mentorship",
            "0009_rename_meeting_ses_mentor__73f9cd_idx_meeting_ses_mentor__62e580_idx_and_more",
        ),
    ]

    operations = [
        migrations.RunPython(backfill_total_mentee_count, noop_reverse),
    ]
