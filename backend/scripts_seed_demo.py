"""Seed deterministic demo data for two-phone mentorship flow verification."""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, time, timedelta

TEST_SECRET_SUFFIX = "-2026!"

CORE_SKILLS = [
    "Django",
    "Docker",
    "GraphQL",
    "JavaScript",
    "Machine Learning",
    "PostgreSQL",
    "React Native",
    "SQL",
    "System Design",
    "TypeScript",
    "German Conversation",
    "Public Speaking",
    "Interview Practice",
]


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
    rating: int = 0
    total_mentee_count: int = 0


def make_login_secret(username: str) -> str:
    """Build a deterministic login secret for a demo user."""

    return f"{username}{TEST_SECRET_SUFFIX}"


MENTORS: list[SeedUser] = [
    SeedUser(
        email="lena.schmidt@example.com",
        username="lena-schmidt",
        login_secret=make_login_secret("lena-schmidt"),
        display_name="Lena Schmidt",
        title="Language Mentor",
        bio="Supports students with speaking confidence and structured language plans.",
        skills=["German Conversation", "Public Speaking", "Interview Practice"],
        mode="MENTOR",
        rating=5,
        total_mentee_count=18,
    ),
    SeedUser(
        email="can.ozkan@example.com",
        username="can-ozkan",
        login_secret=make_login_secret("can-ozkan"),
        display_name="Can Ozkan",
        title="Engineering Mentor",
        bio="Helps students with software architecture, testing strategy, and delivery plans.",
        skills=["Docker", "GraphQL", "System Design", "JavaScript"],
        mode="MENTOR",
        rating=5,
        total_mentee_count=22,
    ),
    SeedUser(
        email="elif.kaya@example.com",
        username="elif-kaya",
        login_secret=make_login_secret("elif-kaya"),
        display_name="Elif Kaya",
        title="Backend Mentor",
        bio="Focuses on APIs, database modeling, and practical backend debugging.",
        skills=["Django", "PostgreSQL", "SQL"],
        mode="MENTOR",
        show_initials_only=True,
        rating=4,
        total_mentee_count=15,
    ),
    SeedUser(
        email="metin.yildiz@example.com",
        username="metin-yildiz",
        login_secret=make_login_secret("metin-yildiz"),
        display_name="Metin Yildiz",
        title="Mobile Mentor",
        bio="Guides teams from quick prototypes to maintainable React Native products.",
        skills=["React Native", "TypeScript", "System Design"],
        mode="MENTOR",
        rating=5,
        total_mentee_count=21,
    ),
]

PRIMARY_MENTEE = SeedUser(
    email="mert.aydin@example.com",
    username="mert-aydin",
    login_secret=make_login_secret("mert-aydin"),
    display_name="Mert Aydin",
    title="Computer Science Student",
    bio="Looking for mentorship on communication and software project growth.",
    skills=["React Native", "TypeScript", "German Conversation"],
    mode="MENTEE",
)

SECONDARY_MENTEE = SeedUser(
    email="ayse.demir@example.com",
    username="ayse-demir",
    login_secret=make_login_secret("ayse-demir"),
    display_name="Ayse Demir",
    title="Junior Developer",
    bio="Improving test quality and backend confidence.",
    skills=["Django", "System Design"],
    mode="MENTEE",
)


def upsert_user(email: str, username: str, password: str, mode: str | None = None):
    """Create or update a user for demo flow."""

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
    """Create or update a profile for demo flow."""

    from profiles.models import Profile

    profile, _ = Profile.objects.get_or_create(user=user)
    profile.username = seed.username
    profile.display_name = seed.display_name
    profile.bio = seed.bio
    profile.title = seed.title
    profile.picture_url = ""
    profile.show_initials_only = seed.show_initials_only
    profile.skills = seed.skills
    profile.rating = seed.rating
    profile.total_mentee_count = seed.total_mentee_count
    profile.save()
    return profile


def seed_skill_catalog() -> None:
    """Ensure skill catalog includes values used in the scenario."""

    from profiles.models import Skill

    values = set(CORE_SKILLS)
    values.update(skill for mentor in MENTORS for skill in mentor.skills)
    values.update(skill for skill in PRIMARY_MENTEE.skills)
    values.update(skill for skill in SECONDARY_MENTEE.skills)

    for name in sorted(values):
        Skill.objects.get_or_create(name=name)


def reset_profile_slots(profile) -> None:
    """Delete all requests attached to profile slots, then replace slots deterministically."""

    from mentorship.models import MentorshipRequest
    from profiles.models import AvailabilitySlot

    MentorshipRequest.objects.filter(slot__profile=profile).delete()
    AvailabilitySlot.objects.filter(profile=profile).delete()


def seed_availability(profile, offset_days: int) -> None:
    """Create deterministic future availability slots for one mentor profile."""

    from django.utils import timezone

    from profiles.models import AvailabilitySlot

    reset_profile_slots(profile)

    base_date = timezone.localdate() + timedelta(days=offset_days)
    tz = timezone.get_current_timezone()
    slot_ranges = [
        (9, 0, 10, 0),
        (11, 30, 12, 30),
        (14, 0, 15, 0),
        (18, 30, 19, 30),
    ]

    for start_hour, start_minute, end_hour, end_minute in slot_ranges:
        start_at = timezone.make_aware(
            datetime.combine(base_date, time(hour=start_hour, minute=start_minute)),
            tz,
        )
        end_at = timezone.make_aware(
            datetime.combine(base_date, time(hour=end_hour, minute=end_minute)),
            tz,
        )
        AvailabilitySlot.objects.create(
            profile=profile,
            start_at=start_at,
            end_at=end_at,
            is_booked=False,
        )


def seed_requests_and_matches(profile_map: dict[str, object], user_map: dict[str, object]) -> None:
    """Seed pending/accepted/rejected requests and one existing session relation."""

    from django.db.models import Q
    from django.utils import timezone

    from mentorship.models import MentorshipRequest
    from mentorship.services import ensure_match_and_initial_session
    from profiles.models import AvailabilitySlot

    demo_usernames = {
        *[seed.username for seed in MENTORS],
        PRIMARY_MENTEE.username,
        SECONDARY_MENTEE.username,
    }

    MentorshipRequest.objects.filter(
        Q(mentor__username__in=demo_usernames) | Q(mentee__username__in=demo_usernames)
    ).delete()

    lena = profile_map["lena-schmidt"]
    can_profile = profile_map["can-ozkan"]
    elif_profile = profile_map["elif-kaya"]
    metin = profile_map["metin-yildiz"]

    mert = profile_map["mert-aydin"]
    ayse = profile_map["ayse-demir"]

    lena_slots = list(AvailabilitySlot.objects.filter(profile=lena).order_by("start_at"))
    can_slots = list(AvailabilitySlot.objects.filter(profile=can_profile).order_by("start_at"))
    elif_slots = list(AvailabilitySlot.objects.filter(profile=elif_profile).order_by("start_at"))
    metin_slots = list(AvailabilitySlot.objects.filter(profile=metin).order_by("start_at"))

    MentorshipRequest.objects.create(
        mentor=lena,
        mentee=mert,
        slot=lena_slots[0],
        status=MentorshipRequest.Status.PENDING,
        cover_letter="Hi Lena, I would like weekly speaking practice and feedback.",
    )

    MentorshipRequest.objects.create(
        mentor=can_profile,
        mentee=ayse,
        slot=can_slots[0],
        status=MentorshipRequest.Status.PENDING,
        cover_letter="Could we review my architecture and testing plan this week?",
    )

    accepted = MentorshipRequest.objects.create(
        mentor=metin,
        mentee=mert,
        slot=metin_slots[1],
        status=MentorshipRequest.Status.ACCEPTED,
        cover_letter="Can we do a focused mobile architecture review session?",
    )
    ensure_match_and_initial_session(mentorship_request=accepted)
    accepted.slot.mark_booked(user=user_map["mert-aydin"])

    MentorshipRequest.objects.create(
        mentor=elif_profile,
        mentee=mert,
        slot=elif_slots[2],
        status=MentorshipRequest.Status.REJECTED,
        cover_letter="I wanted to discuss migration rollback safety and release process.",
    )

    historical_start = timezone.now() - timedelta(days=7)
    historical_accepted = MentorshipRequest.objects.create(
        mentor=metin,
        mentee=ayse,
        slot=None,
        initial_session_start_at=historical_start,
        initial_session_end_at=historical_start + timedelta(hours=1),
        status=MentorshipRequest.Status.ACCEPTED,
        cover_letter="Thanks for the previous debugging session; it was very helpful.",
    )
    ensure_match_and_initial_session(mentorship_request=historical_accepted)


def seed_demo_data() -> None:
    """Seed full two-phone scenario dataset."""

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
    import django

    django.setup()

    seed_skill_catalog()

    profile_map: dict[str, object] = {}
    user_map: dict[str, object] = {}

    for index, seed in enumerate(MENTORS, start=1):
        user = upsert_user(seed.email, seed.username, seed.login_secret, mode=seed.mode)
        profile = upsert_profile(user, seed)
        seed_availability(profile, offset_days=index)
        profile_map[seed.username] = profile
        user_map[seed.username] = user

    for seed in [PRIMARY_MENTEE, SECONDARY_MENTEE]:
        user = upsert_user(seed.email, seed.username, seed.login_secret, mode=seed.mode)
        profile = upsert_profile(user, seed)
        profile_map[seed.username] = profile
        user_map[seed.username] = user

    seed_requests_and_matches(profile_map=profile_map, user_map=user_map)

    print("\n--- Demo Seed Complete (Two-Phone Scenario) ---")
    print("phone1_mentee_email=mert.aydin@example.com")
    print("phone1_mentee_password=mert-aydin-2026!")
    print("phone2_mentor_email=can.ozkan@example.com")
    print("phone2_mentor_password=can-ozkan-2026!")
    print("backup_mentor_email=lena.schmidt@example.com")
    print("backup_mentor_password=lena-schmidt-2026!")
    print("seeded_mentor_usernames=lena-schmidt,can-ozkan,elif-kaya,metin-yildiz")


if __name__ == "__main__":
    seed_demo_data()
