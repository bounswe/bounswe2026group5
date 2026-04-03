"""Seed demo data for mentorship discovery and profile flows."""

from __future__ import annotations

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


def upsert_user(seed: SeedUser):
    """Create or update a user for the demo flow."""

    from accounts.models import AuthProvider, User, UserRole

    user, _ = User.objects.get_or_create(email=seed.email)
    user.username = seed.username
    user.role = UserRole.USER
    user.app_usage_mode = seed.mode
    user.is_banned = False
    user.is_active = True
    user.auth_provider = AuthProvider.LOCAL
    user.set_password(seed.login_secret)
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


def seed_demo_data() -> None:
    """Seed mentors, a mentee, skills, and mentor availability."""

    import os

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

    import django

    django.setup()

    seed_skill_catalog()

    for index, seed in enumerate(MENTORS, start=1):
        user = upsert_user(seed)
        profile = upsert_profile(user, seed)
        seed_availability(profile, offset_days=index)

    mentee_user = upsert_user(MENTEE)
    upsert_profile(mentee_user, MENTEE)

    print("seed complete")
    print(f"demo_login_email={MENTEE.email}")
    print(f"demo_login_password={MENTEE.login_secret}")
    print("seeded_mentors=", ", ".join(seed.display_name for seed in MENTORS))
    print("seeded_skill_count=", len(ALL_SKILLS))


if __name__ == "__main__":
    seed_demo_data()
