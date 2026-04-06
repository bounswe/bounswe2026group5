"""Merge parallel profiles migration branches.

This migration resolves the conflict created by two independent 0003 migrations:
- 0003_availabilityslot_booked_at_and_more
- 0003_convert_location_to_geopoint -> 0004_seed_location_coordinates
"""

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("profiles", "0003_availabilityslot_booked_at_and_more"),
        ("profiles", "0004_seed_location_coordinates"),
    ]

    operations = []
