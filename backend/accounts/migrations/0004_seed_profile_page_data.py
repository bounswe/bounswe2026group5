from datetime import timedelta

from django.contrib.auth.hashers import make_password
from django.db import migrations
from django.utils import timezone


SEED_USER_EMAILS = [
    "mentor.demo@mentorship.local",
    "mentee.demo@mentorship.local",
    "both.demo@mentorship.local",
]


EXPERTISE_SEED = [
    {
        "name": "Python/Django",
        "description": "Backend API development, data modeling, and service design.",
    },
    {
        "name": "System Design",
        "description": "Designing scalable and maintainable software architectures.",
    },
    {
        "name": "React",
        "description": "Frontend development with modern React and TypeScript.",
    },
    {
        "name": "Interview Preparation",
        "description": "Technical interview practice, feedback, and preparation plans.",
    },
]


PROFILE_SEED = [
    {
        "email": "mentor.demo@mentorship.local",
        "display_name": "Mentor Demo",
        "title": "Senior Software Engineer",
        "bio": "Happy to mentor on backend architecture and Python best practices.",
        "location_text": "North Campus",
        "mentorship_mode": "MENTOR",
        "expertise": ["Python/Django", "System Design"],
        "availability_offsets": [(1, 10, 11), (2, 14, 15)],
    },
    {
        "email": "mentee.demo@mentorship.local",
        "display_name": "Mentee Demo",
        "title": "Computer Engineering Junior",
        "bio": "Looking for guidance in software engineering fundamentals.",
        "location_text": "South Campus",
        "mentorship_mode": "MENTEE",
        "expertise": ["React"],
        "availability_offsets": [],
    },
    {
        "email": "both.demo@mentorship.local",
        "display_name": "Both Demo",
        "title": "Graduate Student",
        "bio": "Can mentor in web development and seeks guidance in distributed systems.",
        "location_text": "Main Campus",
        "mentorship_mode": "BOTH",
        "expertise": ["React", "Interview Preparation"],
        "availability_offsets": [(1, 16, 17)],
    },
]


def _build_datetime(base_time, days_offset, start_hour, end_hour):
    start = (base_time + timedelta(days=days_offset)).replace(
        hour=start_hour,
        minute=0,
        second=0,
        microsecond=0,
    )
    end = (base_time + timedelta(days=days_offset)).replace(
        hour=end_hour,
        minute=0,
        second=0,
        microsecond=0,
    )
    return start, end


def seed_profile_page_data(apps, schema_editor):
    user_model = apps.get_model("accounts", "User")
    profile_model = apps.get_model("accounts", "Profile")
    expertise_field_model = apps.get_model("accounts", "ExpertiseField")
    profile_expertise_model = apps.get_model("accounts", "ProfileExpertise")
    availability_slot_model = apps.get_model("accounts", "AvailabilitySlot")

    expertise_by_name = {}
    for expertise in EXPERTISE_SEED:
        expertise_obj, _ = expertise_field_model.objects.get_or_create(
            name=expertise["name"],
            defaults={"description": expertise["description"]},
        )
        expertise_by_name[expertise_obj.name] = expertise_obj

    now = timezone.now()

    for profile_seed in PROFILE_SEED:
        user, created = user_model.objects.get_or_create(
            email=profile_seed["email"],
            defaults={
                "role": "USER",
                "auth_provider": "LOCAL",
                "is_active": True,
                "is_staff": False,
                "is_superuser": False,
            },
        )

        if created:
            user.password = make_password("SecurePass123")
            user.save(update_fields=["password"])

        profile, _ = profile_model.objects.get_or_create(
            user_id=user.id,
            defaults={
                "display_name": profile_seed["display_name"],
                "title": profile_seed["title"],
                "bio": profile_seed["bio"],
                "location_text": profile_seed["location_text"],
                "mentorship_mode": profile_seed["mentorship_mode"],
                "is_visible": True,
                "show_initials_only": False,
            },
        )

        for expertise_name in profile_seed["expertise"]:
            expertise_obj = expertise_by_name[expertise_name]
            profile_expertise_model.objects.get_or_create(
                profile_id=profile.id,
                expertise_field_id=expertise_obj.id,
                defaults={
                    "proficiency_level": 3,
                    "average_rating": 0,
                    "rating_count": 0,
                },
            )

        for day_offset, start_hour, end_hour in profile_seed["availability_offsets"]:
            start_at, end_at = _build_datetime(now, day_offset, start_hour, end_hour)
            availability_slot_model.objects.get_or_create(
                profile_id=profile.id,
                start_at=start_at,
                end_at=end_at,
                defaults={"is_booked": False},
            )


def unseed_profile_page_data(apps, schema_editor):
    user_model = apps.get_model("accounts", "User")

    user_model.objects.filter(email__in=SEED_USER_EMAILS).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_expertisefield_profile_profileexpertise_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_profile_page_data, unseed_profile_page_data),
    ]
