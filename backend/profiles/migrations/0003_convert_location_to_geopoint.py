"""Replace location_text (CharField) with location (PointField) on Profile."""

import django.contrib.gis.db.models.fields
from django.contrib.postgres.operations import CreateExtension
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("profiles", "0002_profile_username"),
    ]

    operations = [
        CreateExtension("postgis"),
        migrations.RemoveField(
            model_name="profile",
            name="location_text",
        ),
        migrations.AddField(
            model_name="profile",
            name="location",
            field=django.contrib.gis.db.models.fields.PointField(
                blank=True,
                geography=True,
                null=True,
                srid=4326,
            ),
        ),
    ]
