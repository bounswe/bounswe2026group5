import re

from django.db import migrations, models


def _build_unique_username(profile_model, profile_id, source_value):
    sanitized_base = re.sub(r"[^a-z0-9_]+", "_", source_value.lower()).strip("_")
    base_username = (sanitized_base or "user")[:50]
    candidate = base_username
    suffix = 1

    while profile_model.objects.filter(username=candidate).exclude(pk=profile_id).exists():
        numeric_suffix = f"_{suffix}"
        candidate = f"{base_username[: 50 - len(numeric_suffix)]}{numeric_suffix}"
        suffix += 1

    return candidate


def populate_profile_usernames(apps, schema_editor):
    profile_model = apps.get_model("profiles", "Profile")

    for profile in profile_model.objects.select_related("user").all():
        if profile.username:
            continue
        email_prefix = (profile.user.email or "").split("@", 1)[0]
        profile.username = _build_unique_username(profile_model, profile.pk, email_prefix)
        profile.save(update_fields=["username"])


class Migration(migrations.Migration):

    dependencies = [
        ("profiles", "0001_state_transfer"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="username",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
        migrations.RunPython(populate_profile_usernames, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="profile",
            name="username",
            field=models.CharField(max_length=50, unique=True),
        ),
    ]
