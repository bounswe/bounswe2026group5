"""Seed final milestone demo data during local Docker migrations."""

from django.db import migrations


def seed_final_milestone_demo_data(apps, schema_editor):
    """Run the deterministic demo seed script after all required tables exist."""

    del apps, schema_editor

    from scripts_seed_demo import seed_demo_data

    seed_demo_data()


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0018_report_unique_report_per_user_pair"),
        ("mentorship", "0010_workshop_workshopparticipant_and_more"),
        ("messaging", "0003_message_original_filename"),
        ("notifications", "0004_fcmtoken"),
        ("profiles", "0020_profile_audio_profile_linkedin_url_profile_video"),
        ("timeline", "0003_alter_timelineevent_media_url"),
    ]

    operations = [
        migrations.RunPython(seed_final_milestone_demo_data, migrations.RunPython.noop),
    ]
