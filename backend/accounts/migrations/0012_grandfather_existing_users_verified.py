from django.db import migrations
from django.utils import timezone


def grandfather_existing_users(apps, schema_editor):
    """Mark all users that existed before email verification as already verified."""
    User = apps.get_model("accounts", "User")
    User.objects.filter(is_email_verified=False).update(
        is_email_verified=True,
        email_verified_at=timezone.now(),
    )


def reverse_grandfather(apps, schema_editor):
    """No-op reverse: we cannot distinguish grandfathered users from later-verified ones."""
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0011_email_verification"),
    ]

    operations = [
        migrations.RunPython(grandfather_existing_users, reverse_grandfather),
    ]
