"""Populate location coordinates for existing seed profiles."""

from django.contrib.gis.geos import Point
from django.db import migrations

# Bogazici University campus coordinates
LOCATION_MAP = {
    "mentor.demo@mentorship.local": Point(29.0455, 41.0850, srid=4326),  # North Campus
    "mentee.demo@mentorship.local": Point(29.0500, 41.0780, srid=4326),  # South Campus
    "both.demo@mentorship.local": Point(29.0505, 41.0830, srid=4326),  # Main Campus
}


def seed_locations(apps, schema_editor):
    Profile = apps.get_model("profiles", "Profile")
    for email, point in LOCATION_MAP.items():
        Profile.objects.filter(user__email=email).update(location=point)


def unseed_locations(apps, schema_editor):
    Profile = apps.get_model("profiles", "Profile")
    for email in LOCATION_MAP:
        Profile.objects.filter(user__email=email).update(location=None)


class Migration(migrations.Migration):
    dependencies = [
        ("profiles", "0003_convert_location_to_geopoint"),
    ]

    operations = [
        migrations.RunPython(seed_locations, unseed_locations),
    ]
