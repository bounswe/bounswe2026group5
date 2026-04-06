"""Replace small demo seeds with a larger realistic mock dataset."""

from datetime import timedelta
import random

from django.contrib.auth.hashers import make_password
from django.contrib.gis.geos import Point
from django.db import migrations
from django.utils import timezone


LEGACY_SEED_EMAILS = [
    "mentor.demo@mentorship.local",
    "mentee.demo@mentorship.local",
    "both.demo@mentorship.local",
]

MOCK_EMAIL_DOMAIN = "mock.mentorship.local"

SKILL_CATALOG = [
    "Python/Django",
    "React",
    "System Design",
    "Data Structures",
    "Machine Learning",
    "Data Engineering",
    "Mobile Development",
    "DevOps",
    "Database Design",
    "Testing",
    "Interview Preparation",
    "Product Thinking",
]

FIRST_NAMES = [
    "Aylin",
    "Bora",
    "Can",
    "Deniz",
    "Ece",
    "Furkan",
    "Gizem",
    "Hakan",
    "Irem",
    "Kaan",
    "Lara",
    "Mert",
    "Naz",
    "Ozan",
    "Pelin",
    "Rana",
    "Sarp",
    "Tuna",
    "Umut",
    "Yagmur",
]

LAST_NAMES = [
    "Acar",
    "Bulut",
    "Celik",
    "Demir",
    "Erdem",
    "Gunes",
    "Kaya",
    "Koc",
    "Oz",
    "Sahin",
    "Tekin",
    "Yildiz",
]

BIO_TEMPLATES = [
    "Enjoys project-based mentoring and practical learning paths.",
    "Focuses on clear communication and achievable weekly goals.",
    "Interested in collaborative coding sessions and architecture reviews.",
    "Guides students through portfolio building and interview preparation.",
]


def _slug(value):
    return value.lower().replace(" ", "_")


def _build_mock_password(username):
    """Create a deterministic but unique hash input per mock user."""
    return make_password(f"seed-{username}-bounswe2026")


def _clear_existing_seed_data(user_model):
    user_model.objects.filter(email__in=LEGACY_SEED_EMAILS).delete()
    user_model.objects.filter(email__iendswith=f"@{MOCK_EMAIL_DOMAIN}").delete()


def _is_test_database(schema_editor):
    db_name = str(schema_editor.connection.settings_dict.get("NAME") or "")
    return db_name.startswith("test_")


def _build_people_dataset(rng):
    people = []
    cohorts = [
        ("mentor", 36),
        ("mentee", 72),
        ("hybrid", 12),
    ]

    index = 1
    for cohort, count in cohorts:
        for _ in range(count):
            first_name = rng.choice(FIRST_NAMES)
            last_name = rng.choice(LAST_NAMES)
            display_name = f"{first_name} {last_name}"
            local_part = f"{cohort}{index:03d}_{_slug(first_name)}_{_slug(last_name)}"
            username = local_part[:50]

            people.append(
                {
                    "cohort": cohort,
                    "index": index,
                    "email": f"{local_part}@{MOCK_EMAIL_DOMAIN}",
                    "username": username,
                    "display_name": display_name,
                }
            )
            index += 1

    return people


def _create_users_and_profiles(
    user_model,
    profile_model,
    skill_names,
    people,
    rng,
):
    mentors = []
    mentees = []
    hybrids = []
    profile_by_email = {}

    for person in people:
        app_usage_mode = "MENTEE" if person["cohort"] == "mentee" else "MENTOR"
        user = user_model.objects.create(
            email=person["email"],
            username=person["username"],
            role="USER",
            auth_provider="LOCAL",
            app_usage_mode=app_usage_mode,
            is_active=True,
            is_staff=False,
            is_superuser=False,
            password=_build_mock_password(person["username"]),
        )

        lon = 29.02 + rng.random() * 0.05
        lat = 41.05 + rng.random() * 0.05

        title_prefix = {
            "mentor": "Senior",
            "mentee": "Student",
            "hybrid": "Research Assistant",
        }[person["cohort"]]

        role_title = rng.choice(["Software Engineer", "Data Analyst", "Product Designer"])

        profile = profile_model.objects.create(
            user_id=user.id,
            username=person["username"],
            display_name=person["display_name"],
            title=f"{title_prefix} {role_title}",
            bio=rng.choice(BIO_TEMPLATES),
            location=Point(lon, lat, srid=4326),
            is_visible=True,
            show_initials_only=False,
            skills=[],
            rating=0,
            total_mentee_count=0,
        )

        sampled_skills = rng.sample(skill_names, k=rng.randint(2, 4))
        profile.skills = sampled_skills
        profile.save(update_fields=["skills"])

        profile_by_email[person["email"]] = profile

        if person["cohort"] == "mentor":
            mentors.append(profile)
        elif person["cohort"] == "mentee":
            mentees.append(profile)
        else:
            hybrids.append(profile)

    return mentors, mentees, hybrids, profile_by_email


def _create_availability_slots(availability_slot_model, mentor_like_profiles):
    now = timezone.now()
    base_day = (now + timedelta(days=2)).replace(hour=9, minute=0, second=0, microsecond=0)
    slots_by_mentor = {}

    for mentor_profile in mentor_like_profiles:
        created_slots = []
        for day_offset in range(0, 14, 2):
            for start_hour in (10, 13, 16):
                start_at = (base_day + timedelta(days=day_offset)).replace(hour=start_hour)
                end_at = start_at + timedelta(hours=1)
                slot = availability_slot_model.objects.create(
                    profile_id=mentor_profile.id,
                    start_at=start_at,
                    end_at=end_at,
                    is_booked=False,
                )
                created_slots.append(slot)
        slots_by_mentor[mentor_profile.id] = created_slots

    return slots_by_mentor


def _create_requests_and_matches(
    mentorship_request_model,
    match_model,
    mentors,
    mentees,
    hybrids,
    slots_by_mentor,
    rng,
):
    mentor_like_profiles = mentors + hybrids
    potential_mentees = mentees + hybrids
    booked_counts = {profile.id: 0 for profile in mentor_like_profiles}

    for mentee_profile in potential_mentees:
        target_mentors = rng.sample(mentor_like_profiles, k=3)
        _create_requests_for_mentee(
            mentorship_request_model,
            match_model,
            mentee_profile,
            target_mentors,
            slots_by_mentor,
            booked_counts,
        )

    return booked_counts


def _determine_initial_status(position):
    if position == 0:
        return "ACCEPTED"
    if position == 1:
        return "PENDING"
    return "REJECTED"


def _reserve_slot_if_possible(mentee_profile, mentor_profile, slots_by_mentor, booked_counts):
    mentor_slots = slots_by_mentor.get(mentor_profile.id, [])
    available_slot = next((item for item in mentor_slots if not item.is_booked), None)
    if available_slot is None:
        return None

    available_slot.is_booked = True
    available_slot.booked_by_id = mentee_profile.user_id
    available_slot.booked_at = timezone.now()
    available_slot.save(update_fields=["is_booked", "booked_by_id", "booked_at"])
    booked_counts[mentor_profile.id] += 1
    return available_slot


def _create_requests_for_mentee(
    mentorship_request_model,
    match_model,
    mentee_profile,
    target_mentors,
    slots_by_mentor,
    booked_counts,
):
    for index, mentor_profile in enumerate(target_mentors):
        if mentor_profile.id == mentee_profile.id:
            continue

        status = _determine_initial_status(index)
        slot = None
        initial_start = None
        initial_end = None

        if status == "ACCEPTED":
            slot = _reserve_slot_if_possible(
                mentee_profile,
                mentor_profile,
                slots_by_mentor,
                booked_counts,
            )
            if slot is None:
                status = "PENDING"
            else:
                initial_start = slot.start_at
                initial_end = slot.end_at

        request = mentorship_request_model.objects.create(
            mentor_id=mentor_profile.id,
            mentee_id=mentee_profile.id,
            slot_id=slot.id if slot else None,
            initial_session_start_at=initial_start,
            initial_session_end_at=initial_end,
            status=status,
            cover_letter=(
                "[MOCK] I would like to improve my project architecture and receive "
                "feedback on implementation quality."
            ),
            responded_at=timezone.now() if status in {"ACCEPTED", "REJECTED"} else None,
        )

        if status == "ACCEPTED":
            match_model.objects.create(
                mentor_id=mentor_profile.id,
                mentee_id=mentee_profile.id,
                request_id=request.id,
                is_active=True,
            )


def _update_mentor_aggregates(profile_model, mentor_like_profiles, booked_counts):
    for mentor_profile in mentor_like_profiles:
        mentee_count = booked_counts.get(mentor_profile.id, 0)
        rating = 0 if mentee_count == 0 else min(5, 3 + (mentee_count % 3))

        profile_model.objects.filter(id=mentor_profile.id).update(
            total_mentee_count=mentee_count,
            rating=rating,
        )


def seed_realistic_mock_data(apps, schema_editor):
    if _is_test_database(schema_editor):
        return

    user_model = apps.get_model("accounts", "User")
    profile_model = apps.get_model("profiles", "Profile")
    skill_model = apps.get_model("profiles", "Skill")
    availability_slot_model = apps.get_model("profiles", "AvailabilitySlot")
    mentorship_request_model = apps.get_model("mentorship", "MentorshipRequest")
    match_model = apps.get_model("mentorship", "Match")

    _clear_existing_seed_data(user_model)

    rng = random.Random(20260406)

    for skill_name in SKILL_CATALOG:
        skill_model.objects.get_or_create(name=skill_name)

    people = _build_people_dataset(rng)
    skill_names = list(SKILL_CATALOG)
    mentors, mentees, hybrids, _ = _create_users_and_profiles(
        user_model,
        profile_model,
        skill_names,
        people,
        rng,
    )

    mentor_like_profiles = mentors + hybrids
    slots_by_mentor = _create_availability_slots(availability_slot_model, mentor_like_profiles)
    booked_counts = _create_requests_and_matches(
        mentorship_request_model,
        match_model,
        mentors,
        mentees,
        hybrids,
        slots_by_mentor,
        rng,
    )
    _update_mentor_aggregates(profile_model, mentor_like_profiles, booked_counts)


def unseed_realistic_mock_data(apps, schema_editor):
    if _is_test_database(schema_editor):
        return

    user_model = apps.get_model("accounts", "User")
    _clear_existing_seed_data(user_model)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0009_user_app_usage_mode"),
        ("profiles", "0008_skill"),
        ("mentorship", "0004_mentorshiprequest_initial_session_snapshot"),
    ]

    operations = [
        migrations.RunPython(seed_realistic_mock_data, unseed_realistic_mock_data),
    ]
