from django.db import migrations


def seed_default_groups(apps, schema_editor):
    group_model = apps.get_model("auth", "Group")

    for group_name in ("USER", "ADMIN"):
        group_model.objects.get_or_create(name=group_name)


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.RunPython(seed_default_groups, migrations.RunPython.noop),
    ]
