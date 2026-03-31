import re

from django.db import migrations, models


def _build_unique_username(user_model, user_id, source_value):
    sanitized_base = re.sub(r"[^a-z0-9_]+", "_", source_value.lower()).strip("_")
    base_username = (sanitized_base or "user")[:50]
    candidate = base_username
    suffix = 1

    while user_model.objects.filter(username=candidate).exclude(pk=user_id).exists():
        numeric_suffix = f"_{suffix}"
        candidate = f"{base_username[: 50 - len(numeric_suffix)]}{numeric_suffix}"
        suffix += 1

    return candidate


def populate_usernames(apps, schema_editor):
    user_model = apps.get_model("accounts", "User")
    profile_model = apps.get_model("profiles", "Profile")

    for user in user_model.objects.all():
        if user.username:
            continue

        profile = profile_model.objects.filter(user_id=user.pk).first()
        source_value = ""

        if profile is not None and profile.username:
            source_value = profile.username
        elif user.email:
            source_value = user.email.split("@", 1)[0]

        user.username = _build_unique_username(user_model, user.pk, source_value)
        user.save(update_fields=["username"])


class Migration(migrations.Migration):

    dependencies = [
        ("profiles", "0002_profile_username"),
        ("accounts", "0007_alter_user_role"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="username",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
        migrations.RunPython(populate_usernames, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="user",
            name="username",
            field=models.CharField(max_length=50, unique=True),
        ),
    ]
