# Generated manually to alter app_usage_mode choices
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0015_seed_admin_profile"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="app_usage_mode",
            field=models.CharField(
                blank=True,
                choices=[("MENTEE", "Mentee"), ("MENTOR", "Mentor"), ("ADMIN", "Admin")],
                max_length=16,
                null=True,
            ),
        ),
    ]
