"""Seed demo data for mentorship discovery and profile flows."""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, time, timedelta

REACT_NATIVE = "React Native"
SYSTEM_DESIGN = "System Design"
TEST_SECRET_SUFFIX = "-2026!"

ALL_SKILLS = [
    "Django",
    "Docker",
    "GraphQL",
    "JavaScript",
    "Machine Learning",
    "PostgreSQL",
    REACT_NATIVE,
    "SQL",
    SYSTEM_DESIGN,
    "TypeScript",
]


def make_login_secret(username: str) -> str:
    """Build a deterministic login secret for a demo user."""
    return f"{username}{TEST_SECRET_SUFFIX}"


@dataclass(frozen=True)
class SeedUser:
    """Container for seeded user credentials and profile data."""
    email: str
    username: str
    login_secret: str
    display_name: str
    title: str
    bio: str
    skills: list[str]
    mode: str
    show_initials_only: bool = False


MENTORS: list[SeedUser] = [
    SeedUser(
        email="mentor1@example.com",
        username="mentor1",
        login_secret=make_login_secret("mentor1"),
        display_name="Metin Yildiz",
        title="Mobile Engineer",
        bio="Helps students build clean React Native apps and practical mentoring flows.",
        skills=[REACT_NATIVE, "TypeScript", SYSTEM_DESIGN],
        mode="MENTOR",
    ),
    SeedUser(
        email="mentor2@example.com",
        username="mentor2",
        login_secret=make_login_secret("mentor2"),
        display_name="Elif Kaya",
        title="Backend Mentor",
        bio="Focuses on Django, APIs, and making backend contracts easy to consume.",
        skills=["Django", "PostgreSQL", "SQL"],
        mode="MENTOR",
        show_initials_only=True,
    ),
    SeedUser(
        email="mentor3@example.com",
        username="mentor3",
        login_secret=make_login_secret("mentor3"),
        display_name="Can Ozkan",
        title="Engineering Mentor",
        bio="Supports code review, testing strategy, and team-ready project planning.",
        skills=["Docker", "GraphQL", SYSTEM_DESIGN],
        mode="MENTOR",
    ),
]

MENTEE = SeedUser(
    email="student@example.com",
    username="student",
    login_secret=make_login_secret("student"),
    display_name="Student User",
    title="CS Student",
    bio="Uses the app to find mentors and manage mentorship requests.",
    skills=[REACT_NATIVE, "Machine Learning"],
    mode="MENTEE",
)


def upsert_user(email: str, username: str, password: str, mode: str = None):
    """Create or update a user for the demo flow."""
    from accounts.models import AuthProvider, User, UserRole

    user, _ = User.objects.get_or_create(
        email=email,
        defaults={"username": username, "role": UserRole.USER, "is_active": True},
    )
    user.username = username
    user.role = UserRole.USER
    user.is_active = True
    
    if mode:
        user.app_usage_mode = mode
        user.auth_provider = AuthProvider.LOCAL
        
    user.set_password(password)
    user.save()
    return user


def upsert_profile(user, seed: SeedUser):
    """Create or update a profile for the demo flow."""
    from profiles.models import Profile

    profile, _ = Profile.objects.get_or_create(user=user)
    profile.username = seed.username
    profile.display_name = seed.display_name
    profile.bio = seed.bio
    profile.title = seed.title
    profile.picture_url = ""
    profile.is_visible = True
    profile.show_initials_only = seed.show_initials_only
    profile.skills = seed.skills
    profile.rating = 5 if seed.mode == "MENTOR" else 0
    profile.total_mentee_count = 12 if seed.mode == "MENTOR" else 0
    profile.save()
    return profile


def seed_skill_catalog() -> None:
    """Ensure discovery skill catalog contains values used by the UI."""
    from profiles.models import Skill

    for name in ALL_SKILLS:
        Skill.objects.get_or_create(name=name)


def seed_availability(profile, offset_days: int) -> None:
    """Replace a mentor's availability with a deterministic set of future slots."""
    from django.utils import timezone
    from profiles.models import AvailabilitySlot

    AvailabilitySlot.objects.filter(profile=profile).delete()

    base_date = timezone.localdate() + timedelta(days=offset_days)
    current_timezone = timezone.get_current_timezone()
    slot_ranges = [
        (9, 0, 10, 0),
        (13, 0, 14, 0),
        (16, 0, 17, 0),
    ]

    for start_hour, start_minute, end_hour, end_minute in slot_ranges:
        start_at = timezone.make_aware(
            datetime.combine(base_date, time(hour=start_hour, minute=start_minute)),
            current_timezone,
        )
        end_at = timezone.make_aware(
            datetime.combine(base_date, time(hour=end_hour, minute=end_minute)),
            current_timezone,
        )

        AvailabilitySlot.objects.create(
            profile=profile,
            start_at=start_at,
            end_at=end_at,
        )


def seed_react_query_data() -> None:
    """Seed explicit data needed for the mobile React Query backend wireup."""
    from django.utils import timezone
    from profiles.models import AvailabilitySlot, ExpertiseField, Profile, ProfileExpertise
    from mentorship.models import Match, MentorshipRequest

    mert = upsert_user("mert.yilmaz@example.com", "mert.yilmaz", "MertPass123!")
    emma = upsert_user("emma.wilson@example.com", "emma.wilson", "EmmaPass123!")
    azra = upsert_user("azra.demir@example.com", "azra.demir", "AzraPass123!")
    jack = upsert_user("jack.turner@example.com", "jack.turner", "JackPass123!")

    p_mert, _ = Profile.objects.get_or_create(
        user=mert,
        defaults={
            "username": "mert.yilmaz",
            "display_name": "Mert Yilmaz",
            "bio": "Senior CS student helping with algorithms, Django, and system design.",
            "mentorship_mode": "BOTH",
        },
    )
    p_mert.username = "mert.yilmaz"
    p_mert.display_name = "Mert Yilmaz"
    p_mert.bio = "Senior CS student helping with algorithms, Django, and system design."
    p_mert.title = "CS Senior | Backend Mentor"
    p_mert.mentorship_mode = "BOTH"
    p_mert.is_visible = True
    p_mert.show_initials_only = False
    p_mert.save()

    p_emma, _ = Profile.objects.get_or_create(
        user=emma,
        defaults={
            "username": "emma.wilson",
            "display_name": "Emma Wilson",
            "bio": "Junior dev improving backend fundamentals and API design.",
            "mentorship_mode": "BOTH",
        },
    )
    p_emma.username = "emma.wilson"
    p_emma.display_name = "Emma Wilson"
    p_emma.bio = "Junior dev improving backend fundamentals and API design."
    p_emma.title = "Junior Developer"
    p_emma.mentorship_mode = "BOTH"
    p_emma.is_visible = True
    p_emma.show_initials_only = False
    p_emma.save()

    p_azra, _ = Profile.objects.get_or_create(
        user=azra,
        defaults={
            "username": "azra.demir",
            "display_name": "Azra Demir",
            "bio": "Interested in data structures, clean architecture, and test automation.",
            "mentorship_mode": "BOTH",
        },
    )
    p_azra.username = "azra.demir"
    p_azra.display_name = "Azra Demir"
    p_azra.bio = "Interested in data structures, clean architecture, and test automation."
    p_azra.title = "Software Engineering Student"
    p_azra.mentorship_mode = "BOTH"
    p_azra.is_visible = True
    p_azra.show_initials_only = False
    p_azra.save()

    p_jack, _ = Profile.objects.get_or_create(
        user=jack,
        defaults={
            "username": "jack.turner",
            "display_name": "Jack Turner",
            "bio": "Focusing on React Native performance and REST API integrations.",
            "mentorship_mode": "BOTH",
        },
    )
    p_jack.username = "jack.turner"
    p_jack.display_name = "Jack Turner"
    p_jack.bio = "Focusing on React Native performance and REST API integrations."
    p_jack.title = "Mobile Developer"
    p_jack.mentorship_mode = "BOTH"
    p_jack.is_visible = True
    p_jack.show_initials_only = False
    p_jack.save()

    for name in ["Django REST", "System Design", "React Native", "Testing", "PostgreSQL"]:
        ExpertiseField.objects.get_or_create(
            name=name,
            defaults={"description": f"{name} knowledge area"},
        )

    expertise_map = {
        p_mert: ["Django REST", "System Design", "PostgreSQL"],
        p_emma: ["React Native", "Testing"],
        p_azra: ["Testing", "System Design"],
        p_jack: ["React Native", "Django REST"],
    }

    for profile, names in expertise_map.items():
        for i, name in enumerate(names, start=3):
            field = ExpertiseField.objects.get(name=name)
            pe, _ = ProfileExpertise.objects.get_or_create(
                profile=profile,
                expertise_field=field,
                defaults={"proficiency_level": min(i, 5)},
            )
            if pe.proficiency_level != min(i, 5):
                pe.proficiency_level = min(i, 5)
                pe.save(update_fields=["proficiency_level", "updated_at"])

    # Reset unbooked demo slots for deterministic UI output.
    AvailabilitySlot.objects.filter(profile=p_mert, is_booked=False).delete()

    slot_template = {
        1: [(9, 30, 10, 30), (14, 0, 15, 0), (19, 0, 20, 0)],
        2: [(11, 0, 12, 0), (16, 30, 17, 30)],
        3: [(10, 0, 11, 0), (13, 30, 14, 30), (18, 0, 19, 0)],
        4: [(9, 0, 10, 0), (15, 0, 16, 0)],
    }

    for day_offset, slots in slot_template.items():
        slot_date = timezone.localdate() + timedelta(days=day_offset)
        for sh, sm, eh, em in slots:
            start_naive = datetime.combine(slot_date, time(hour=sh, minute=sm))
            end_naive = datetime.combine(slot_date, time(hour=eh, minute=em))
            start = timezone.make_aware(start_naive, timezone.get_current_timezone())
            end = timezone.make_aware(end_naive, timezone.get_current_timezone())
            AvailabilitySlot.objects.create(
                profile=p_mert,
                start_at=start,
                end_at=end,
                is_booked=False,
            )

    requests_data = [
        (p_mert, p_emma, "PENDING", "Hi Mert, can we review DRF serializers and validation strategy for my project?"),
        (p_mert, p_azra, "ACCEPTED", "Merhaba Mert, system design interview prep konusunda mentorluğa ihtiyacım var."),
        (p_mert, p_jack, "REJECTED", "Could we have a session on API error handling and auth best practices?"),
        (p_emma, p_mert, "PENDING", "Hi Emma, I would like a reverse-mentoring chat about mobile accessibility patterns."),
    ]

    for mentor, mentee, status, message in requests_data:
        request, _ = MentorshipRequest.objects.get_or_create(
            mentor=mentor,
            mentee=mentee,
            defaults={"status": status, "cover_letter": message},
        )
        if request.status != status or request.cover_letter != message:
            request.status = status
            request.cover_letter = message
            request.save(update_fields=["status", "cover_letter"])

    print("\n--- React Query Wireup Seed Complete ---")
    print("login: mert.yilmaz@example.com / MertPass123!")
    print("requests_for_mert=", MentorshipRequest.objects.filter(mentor=p_mert).count())
    print("matches_for_mert=", Match.objects.filter(mentor=p_mert).count())
    print("availability_for_mert=", AvailabilitySlot.objects.filter(profile=p_mert, is_booked=False).count())


def seed_demo_data() -> None:
    """Seed mentors, mentees, skills, and query wireup data."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
    import django
    django.setup()

    # 1. Seed Discovery Flow Data
    seed_skill_catalog()
    for index, seed in enumerate(MENTORS, start=1):
        user = upsert_user(seed.email, seed.username, seed.login_secret, mode=seed.mode)
        profile = upsert_profile(user, seed)
        seed_availability(profile, offset_days=index)

    mentee_user = upsert_user(MENTEE.email, MENTEE.username, MENTEE.login_secret, mode=MENTEE.mode)
    upsert_profile(mentee_user, MENTEE)

    print("\n--- Discovery Profile Seed Complete ---")
    print(f"demo_login_email={MENTEE.email}")
    print(f"demo_login_password={MENTEE.login_secret}")
    print("seeded_mentors=", ", ".join(seed.display_name for seed in MENTORS))

    # 2. Seed React Query Wireup Data
    seed_react_query_data()


if __name__ == "__main__":
    seed_demo_data()