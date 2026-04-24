"""Seed a handful of starter community tags so discover is not empty."""

import uuid
from django.db import migrations
from django.utils.text import slugify


STARTER_TAGS = [
    ("Boğaziçi CS '26", "Computer Science community for the Boğaziçi University class of 2026."),
    ("Frontend Istanbul", "Meetups and discussions for front-end developers in Istanbul."),
    ("Data Science Beginners", "A friendly group for anyone getting started with data science."),
    ("Mobile Dev", "iOS, Android, and cross-platform mobile development enthusiasts."),
    ("AI & ML Enthusiasts", "Artificial Intelligence and Machine Learning discussions and projects."),
]


def seed_tags(apps, schema_editor):
    CommunityTag = apps.get_model("profiles", "CommunityTag")
    for name, description in STARTER_TAGS:
        CommunityTag.objects.get_or_create(
            name=name,
            defaults={
                "id": uuid.uuid4(),
                "slug": slugify(name),
                "description": description,
                "member_count": 0,
            },
        )


def remove_tags(apps, schema_editor):
    CommunityTag = apps.get_model("profiles", "CommunityTag")
    names = [name for name, _ in STARTER_TAGS]
    CommunityTag.objects.filter(name__in=names).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("profiles", "0013_communitytag_and_membership"),
    ]

    operations = [
        migrations.RunPython(seed_tags, remove_tags),
    ]
