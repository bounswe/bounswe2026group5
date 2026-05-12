"""Seed deterministic final milestone demo data for Neighborship."""

from __future__ import annotations

import os
import random
import uuid
from dataclasses import dataclass
from datetime import datetime, time, timedelta
from decimal import Decimal

TEST_SECRET_SUFFIX = "-2026!"
RANDOM_SEED = 20260512

DEMO_EMAIL_DOMAIN = "neighborship.local"
OLD_MOCK_EMAIL_DOMAINS = {
    "final-demo.neighborship.local",
    "mock.mentorship.local",
}
LEGACY_SEED_EMAILS = {
    "mentor.demo@mentorship.local",
    "mentee.demo@mentorship.local",
    "both.demo@mentorship.local",
    "lena.schmidt@example.com",
    "can.ozkan@example.com",
    "elif.kaya@example.com",
    "metin.yildiz@example.com",
    "mert.aydin@example.com",
    "ayse.demir@example.com",
}

SCENARIO_MENTOR_USERNAME = "deniz-arman"
SCENARIO_MENTOR_EMAIL = f"{SCENARIO_MENTOR_USERNAME}@{DEMO_EMAIL_DOMAIN}"
SCENARIO_MENTOR_PASSWORD = f"{SCENARIO_MENTOR_USERNAME}{TEST_SECRET_SUFFIX}"
SCENARIO_MENTOR_DISPLAY_NAME = "Deniz Arman"
SCENARIO_MENTOR_TITLE = "Senior Product Engineer"
SCENARIO_MENTOR_BIO = (
    "I work with student teams on web project structure, page flow, delivery planning, "
    "and practical testing habits. I like turning broad product ideas into a focused "
    "sequence of screens, tasks, and acceptance checks that a team can actually finish "
    "without losing sight of the user experience."
)
SCENARIO_MENTOR_INTERESTS = (
    "Product-led engineering, student project planning, readable technical decisions."
)
SCENARIO_MENTOR_SKILLS = [
    "React",
    "TypeScript",
    "Project Planning",
    "Testing",
    "Product Thinking",
]

BACKUP_MENTOR_USERNAME = "goksel-deniz-celik"
BACKUP_MENTOR_EMAIL = f"{BACKUP_MENTOR_USERNAME}@{DEMO_EMAIL_DOMAIN}"
BACKUP_MENTOR_PASSWORD = f"{BACKUP_MENTOR_USERNAME}{TEST_SECRET_SUFFIX}"
BACKUP_MENTOR_DISPLAY_NAME = "Göksel Deniz Çelik"
BACKUP_MENTOR_TITLE = "Full-Stack Project Mentor"
BACKUP_MENTOR_BIO = (
    "I help student teams connect backend APIs, frontend flows, and realistic weekly "
    "delivery plans. Most of my sessions focus on turning messy web ideas into a smaller "
    "MVP with clear page scope, API contracts, and a demo path the team can explain "
    "confidently."
)
BACKUP_MENTOR_INTERESTS = (
    "Full-stack web projects, MVP planning, API boundaries, workshop facilitation."
)
BACKUP_MENTOR_SKILLS = [
    "Django",
    "React",
    "Project Planning",
    "Testing",
    "Workshop Facilitation",
]

SCENARIO_MENTEE_USERNAME = "mehmet-ali-ozdemir"
SCENARIO_MENTEE_EMAIL = f"{SCENARIO_MENTEE_USERNAME}@{DEMO_EMAIL_DOMAIN}"
SCENARIO_MENTEE_PASSWORD = f"{SCENARIO_MENTEE_USERNAME}{TEST_SECRET_SUFFIX}"
SCENARIO_MENTEE_DISPLAY_NAME = "Mehmet Ali Özdemir"
SCENARIO_MENTEE_TITLE = "Computer Engineering Student"
SCENARIO_MENTEE_BIO = (
    "I am building a student web project and looking for guidance on scope, landing flow, "
    "testing, and weekly planning. I want the project to feel coherent: fewer pages, "
    "clearer user flow, better task ordering, and enough testing notes to explain the "
    "engineering choices."
)
SCENARIO_MENTEE_INTERESTS = (
    "Student web projects, product planning, community learning, React."
)
SCENARIO_MENTEE_SKILLS = [
    "React",
    "JavaScript",
    "Project Planning",
    "UI/UX Design",
]

SCENARIO_COMMUNITY_NAME = "Student Product Builders"
SCENARIO_COMMUNITY_DESCRIPTION = (
    "Sharing project feedback, planning habits, and product development lessons."
)
SCENARIO_NOTIFICATION_TITLE = "New message from Mentor Deniz Arman"
SCENARIO_NOTIFICATION_MESSAGE = "I've sent you the resources..."
SCENARIO_NEW_TIMELINE_EVENT_TEXT = (
    "Reviewed the project structure together and agreed on a clearer page breakdown, "
    "task order, and next-week goals."
)
SCENARIO_NEW_MESSAGE_TEXT = (
    "I uploaded the project planning checklist for tomorrow's session. Please skim the "
    "page structure and testing sections."
)
SCENARIO_WORKSHOP_TITLE = "Web Project Planning Clinic"
SCENARIO_WORKSHOP_DESCRIPTION = (
    "A guided session on structuring student web projects, defining page scope, and "
    "turning large goals into testable weekly plans."
)
SCENARIO_FEEDBACK_COMMENT = "Clear feedback and practical next steps for my project."

SCENARIO_COMMUNITY_POSTS = [
    (
        "We sketched landing, dashboard, profile, and settings pages for our student platform, "
        "but now I am not sure which ones actually belong in the MVP. How do you decide what is essential first?"
    ),
    (
        "Our team keeps jumping into React components before agreeing on the user flow. "
        "Has anyone found a simple way to lock page scope before coding starts?"
    ),
    (
        "I am trying to break our web project into weekly goals, but every feature feels connected to everything else. "
        "How do you split work without losing the product story?"
    ),
    (
        "We can answer technical questions during reviews, but we still struggle when someone asks why a feature belongs in version one. "
        "Any framework for defending MVP decisions during demos?"
    ),
    (
        "A planning board helped us separate must-have pages from later ideas, but our backlog is still too vague. "
        "How detailed should page definitions be before development?"
    ),
    (
        "We realized our API plan changed three times because the frontend scope was never stable. "
        "Do you start from pages, user stories, or data models when student teams are stuck?"
    ),
    (
        "We are preparing for faculty demo day next week. "
        "How polished should the first release be before you switch from building to rehearsal?"
    ),
    (
        "Our retrospective showed that communication was the real bottleneck, not coding speed. "
        "I am curious how other student teams divide frontend, backend, and testing responsibilities."
    ),
]

GOKSEL_COMMUNITY_POSTS = [
    (
        "I keep seeing student web teams over-design version one. If your dashboard needs three explanations, "
        "it probably needs one fewer feature before demo day."
    ),
    (
        "A useful planning exercise: list your MVP pages first, then write the API calls each page truly needs. "
        "That usually reveals which ideas belong later."
    ),
    (
        "When a team says their backend keeps changing, I usually ask whether the page scope was ever stable. "
        "A surprising number of technical problems start as product-boundary problems."
    ),
]

CORE_SKILLS = [
    "Academic Writing",
    "Budgeting",
    "Campus Life",
    "Django",
    "English Conversation",
    "FastAPI",
    "Fitness Planning",
    "German Conversation",
    "GraphQL",
    "JavaScript",
    "Machine Learning",
    "Mental Wellbeing",
    "Personal Finance",
    "Photography",
    "Product Thinking",
    "Project Planning",
    "Public Speaking",
    "React",
    "Study Habits",
    "Sustainable Living",
    "System Design",
    "Testing",
    "Time Management",
    "Turkish Cooking",
    "TypeScript",
    "UI/UX Design",
    "Volunteering",
    "Web Accessibility",
    "Workshop Facilitation",
]

COMMUNITY_DEFINITIONS = [
    (
        SCENARIO_COMMUNITY_NAME,
        SCENARIO_COMMUNITY_DESCRIPTION,
        ["Project Planning", "React", "Product Thinking", "Testing"],
        "Istanbul",
    ),
    ("Backend API Circle", "Django, API design, data modeling, and release practices.", ["Django", "PostgreSQL", "GraphQL"], "Ankara"),
    ("Language Exchange Cafe", "Casual English, German, and Turkish conversation practice for campus life.", ["English Conversation", "German Conversation", "Public Speaking"], "Istanbul"),
    ("Budget Friendly Students", "Meal planning, budgeting, scholarships, and realistic student finance tips.", ["Budgeting", "Personal Finance"], "Ankara"),
    ("Career Interview Practice", "Mock interviews, portfolio reviews, and weekly prep routines.", ["System Design", "Testing"], "Ankara"),
    ("Study Habits Circle", "Pomodoro rooms, exam plans, note-taking routines, and accountability check-ins.", ["Study Habits", "Time Management", "Academic Writing"], "Izmir"),
    ("Campus Cooking Club", "Low-cost recipes, dorm kitchen ideas, and weekly cooking photo threads.", ["Turkish Cooking", "Budgeting"], "Istanbul"),
    ("Photography Walks", "Campus photo walks, composition feedback, and visual storytelling prompts.", ["Photography", "UI/UX Research"], "Eskisehir"),
    ("Wellbeing and Fitness", "Gentle routines for sleep, movement, stress management, and sustainable habits.", ["Mental Wellbeing", "Fitness Planning"], "Istanbul"),
    ("AI Product Lab", "Building useful AI features with evaluation and user-centered scope.", ["Machine Learning", "Product Thinking"], "Ankara"),
    ("Volunteer Project Hub", "Finding local volunteering projects and turning service into shared learning.", ["Volunteering", "Campus Life"], "Bursa"),
    ("Sustainable Campus", "Repair, reuse, transport, and low-waste living ideas for students.", ["Sustainable Living", "Campus Life"], "Istanbul"),
]

TURKISH_LOCATIONS = {
    "Istanbul": (29.030, 41.080),
    "Ankara": (32.860, 39.920),
    "Izmir": (27.140, 38.420),
    "Bursa": (29.060, 40.190),
    "Eskisehir": (30.520, 39.770),
    "Antalya": (30.710, 36.900),
    "Konya": (32.490, 37.870),
    "Trabzon": (39.720, 41.000),
    "Kayseri": (35.480, 38.720),
    "Gaziantep": (37.380, 37.070),
}

POST_IMAGE_URLS = [
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1200&q=80",
]

FIRST_NAMES = [
    "Ada",
    "Ahmet",
    "Alara",
    "Ali",
    "Asli",
    "Aylin",
    "Ayse",
    "Baris",
    "Berk",
    "Bora",
    "Cem",
    "Ceren",
    "Defne",
    "Derya",
    "Deniz",
    "Ece",
    "Ege",
    "Elif",
    "Emir",
    "Emre",
    "Esra",
    "Fatma",
    "Gizem",
    "Hakan",
    "Ilayda",
    "Irem",
    "Kaan",
    "Kerem",
    "Leyla",
    "Lara",
    "Melis",
    "Mehmet",
    "Mert",
    "Mina",
    "Murat",
    "Nehir",
    "Nil",
    "Onur",
    "Ozan",
    "Ozge",
    "Pelin",
    "Sarp",
    "Selim",
    "Selin",
    "Sena",
    "Sinem",
    "Tuna",
    "Toprak",
    "Umut",
    "Yasemin",
    "Yigit",
    "Zeynep",
]
LAST_NAMES = [
    "Acar",
    "Akgun",
    "Aksoy",
    "Altun",
    "Arslan",
    "Aydin",
    "Balci",
    "Basar",
    "Bulut",
    "Cakir",
    "Can",
    "Celik",
    "Coskun",
    "Demir",
    "Dogan",
    "Durmaz",
    "Erdem",
    "Eren",
    "Gok",
    "Gunes",
    "Kaplan",
    "Kara",
    "Kaya",
    "Kilic",
    "Koc",
    "Kurt",
    "Mutlu",
    "Ozer",
    "Ozdemir",
    "Polat",
    "Sahin",
    "Sen",
    "Simsek",
    "Tekin",
    "Turan",
    "Uzun",
    "Yalcin",
    "Yildiz",
]

FEMALE_FIRST_NAMES = {
    "Ada",
    "Alara",
    "Asli",
    "Aylin",
    "Ayse",
    "Ceren",
    "Defne",
    "Derya",
    "Ece",
    "Elif",
    "Esra",
    "Fatma",
    "Gizem",
    "Ilayda",
    "Irem",
    "Lara",
    "Leyla",
    "Melis",
    "Mina",
    "Nehir",
    "Nil",
    "Ozge",
    "Pelin",
    "Selin",
    "Sena",
    "Sinem",
    "Yasemin",
    "Zeynep",
}

MALE_FIRST_NAMES = {
    "Ahmet",
    "Ali",
    "Baris",
    "Berk",
    "Bora",
    "Cem",
    "Ege",
    "Emir",
    "Emre",
    "Hakan",
    "Kaan",
    "Kerem",
    "Mehmet",
    "Mert",
    "Murat",
    "Onur",
    "Ozan",
    "Sarp",
    "Selim",
    "Toprak",
    "Tuna",
    "Umut",
    "Yigit",
}


@dataclass(frozen=True)
class PersonSeed:
    email: str
    username: str
    display_name: str
    mode: str
    title: str
    bio: str
    interests: str
    skills: list[str]
    city: str
    show_initials_only: bool = False
    empty_profile: bool = False


def make_login_secret(username: str) -> str:
    """Build a deterministic login secret for a demo user."""

    return f"{username}{TEST_SECRET_SUFFIX}"


def slugify_name(value: str) -> str:
    """Return a compact ASCII username slug."""

    return (
        value.lower()
        .replace(" ", "-")
        .replace("ı", "i")
        .replace("ğ", "g")
        .replace("ü", "u")
        .replace("ş", "s")
        .replace("ö", "o")
        .replace("ç", "c")
    )


def aware_at(day_offset: int, hour: int, minute: int = 0) -> datetime:
    """Return a timezone-aware demo datetime relative to May 12, 2026."""

    from django.utils import timezone

    base_date = datetime(2026, 5, 12).date() + timedelta(days=day_offset)
    return timezone.make_aware(datetime.combine(base_date, time(hour, minute)))


def infer_portrait_folder(display_name: str, username: str) -> str:
    """Choose randomuser portrait gender from the seeded first name."""

    if username in {SCENARIO_MENTOR_USERNAME, BACKUP_MENTOR_USERNAME, SCENARIO_MENTEE_USERNAME}:
        return "men"

    first_name = display_name.split(" ", 1)[0]
    if first_name in FEMALE_FIRST_NAMES:
        return "women"
    if first_name in MALE_FIRST_NAMES:
        return "men"

    digest = sum((index + 1) * ord(char) for index, char in enumerate(username))
    return "women" if digest % 2 else "men"


def profile_picture(username: str, display_name: str) -> str:
    """Return deterministic but varied portrait URL for a seeded profile."""

    if username in {SCENARIO_MENTOR_USERNAME, BACKUP_MENTOR_USERNAME, SCENARIO_MENTEE_USERNAME}:
        demo_indices = {
            SCENARIO_MENTOR_USERNAME: 24,
            BACKUP_MENTOR_USERNAME: 55,
            SCENARIO_MENTEE_USERNAME: 2,
        }
        return f"https://randomuser.me/api/portraits/men/{demo_indices[username]}.jpg"

    digest = sum((index + 1) * ord(char) for index, char in enumerate(username))
    folder = infer_portrait_folder(display_name, username)
    image_index = digest % 90
    return f"https://randomuser.me/api/portraits/{folder}/{image_index}.jpg"


def jittered_point(city: str, rng: random.Random):
    """Return a deterministic nearby GIS point for a Turkish city."""

    from django.contrib.gis.geos import Point

    lon, lat = TURKISH_LOCATIONS[city]
    return Point(lon + rng.uniform(-0.035, 0.035), lat + rng.uniform(-0.025, 0.025), srid=4326)


def build_people(rng: random.Random) -> list[PersonSeed]:
    """Create exactly 50 mentors and 120 mentees, including the demo pair."""

    mentors = [
        PersonSeed(
            email=SCENARIO_MENTOR_EMAIL,
            username=SCENARIO_MENTOR_USERNAME,
            display_name=SCENARIO_MENTOR_DISPLAY_NAME,
            mode="MENTOR",
            title=SCENARIO_MENTOR_TITLE,
            bio=SCENARIO_MENTOR_BIO,
            interests=SCENARIO_MENTOR_INTERESTS,
            skills=SCENARIO_MENTOR_SKILLS,
            city="Istanbul",
        ),
        PersonSeed(
            email=BACKUP_MENTOR_EMAIL,
            username=BACKUP_MENTOR_USERNAME,
            display_name=BACKUP_MENTOR_DISPLAY_NAME,
            mode="MENTOR",
            title=BACKUP_MENTOR_TITLE,
            bio=BACKUP_MENTOR_BIO,
            interests=BACKUP_MENTOR_INTERESTS,
            skills=BACKUP_MENTOR_SKILLS,
            city="Istanbul",
        )
    ]
    mentees = [
        PersonSeed(
            email=SCENARIO_MENTEE_EMAIL,
            username=SCENARIO_MENTEE_USERNAME,
            display_name=SCENARIO_MENTEE_DISPLAY_NAME,
            mode="MENTEE",
            title=SCENARIO_MENTEE_TITLE,
            bio=SCENARIO_MENTEE_BIO,
            interests=SCENARIO_MENTEE_INTERESTS,
            skills=SCENARIO_MENTEE_SKILLS,
            city="Istanbul",
        )
    ]

    mentor_titles = [
        "Backend Engineering Mentor",
        "Mobile Product Mentor",
        "Data Science Mentor",
        "DevOps Coach",
        "UX Research Mentor",
        "Frontend Architect",
        "Career Interview Mentor",
    ]
    mentee_titles = [
        "Computer Engineering Student",
        "Software Engineering Student",
        "Junior Frontend Developer",
        "Data Science Student",
        "Product Design Student",
        "Bootcamp Graduate",
    ]
    mentor_bios = [
        (
            "Helps students turn fuzzy technical problems into small, testable implementation "
            "plans. Usually starts with the learner's deadline, then works backward into weekly "
            "milestones, lightweight documentation, and one or two habits they can keep after "
            "the mentorship ends."
        ),
        (
            "Enjoys reviewing architecture diagrams, pull requests, and deployment checklists. "
            "Brings a calm, practical style to mentoring and prefers examples from real student "
            "projects over abstract advice."
        ),
        (
            "Focuses on supportive critique, realistic scope, and confidence-building practice. "
            "Often helps mentees prepare for demos, interviews, club presentations, and the "
            "messy middle stage where a project works but is hard to explain."
        ),
        (
            "Works with student builders on portfolio quality, debugging habits, and release "
            "readiness. Likes to combine technical review with daily-life planning, especially "
            "when mentees are balancing coursework, part-time work, and community activities."
        ),
    ]
    mentee_bios = [
        (
            "Looking for steady mentorship while turning coursework into a polished portfolio "
            "project. Prefers mentors who can give direct feedback, suggest a manageable next "
            "step, and explain how to communicate progress clearly."
        ),
        (
            "Wants help breaking large goals into weekly tasks and getting better at technical "
            "communication. Also interested in study routines, budgeting time, and finding "
            "community accountability during busy exam weeks."
        ),
        (
            "Enjoys collaborative learning and is preparing for internships with project-based "
            "practice. Uses communities for feedback on small wins, resources, and realistic "
            "ways to keep momentum outside formal classes."
        ),
        (
            "Trying to improve code quality, documentation, and confidence in demo presentations. "
            "Learns best from concrete examples, annotated checklists, and mentors who connect "
            "technical choices to user needs."
        ),
    ]

    used_usernames = {SCENARIO_MENTOR_USERNAME, BACKUP_MENTOR_USERNAME, SCENARIO_MENTEE_USERNAME}
    cities = list(TURKISH_LOCATIONS)

    while len(mentors) < 50:
        first = rng.choice(FIRST_NAMES)
        last = rng.choice(LAST_NAMES)
        username = slugify_name(f"{first}-{last}-mentor-{len(mentors) + 1:02d}")
        if username in used_usernames:
            continue
        used_usernames.add(username)
        skills = rng.sample(CORE_SKILLS, k=rng.randint(3, 5))
        mentors.append(
            PersonSeed(
                email=f"{username}@{DEMO_EMAIL_DOMAIN}",
                username=username,
                display_name=f"{first} {last}",
                mode="MENTOR",
                title=rng.choice(mentor_titles),
                bio=rng.choice(mentor_bios),
                interests=f"{skills[0]}, {skills[1]}, project critique, weekly accountability.",
                skills=skills,
                city=rng.choice(cities),
                show_initials_only=rng.random() < 0.08,
                empty_profile=len(mentors) in {17, 38},
            )
        )

    while len(mentees) < 120:
        first = rng.choice(FIRST_NAMES)
        last = rng.choice(LAST_NAMES)
        username = slugify_name(f"{first}-{last}-mentee-{len(mentees) + 1:03d}")
        if username in used_usernames:
            continue
        used_usernames.add(username)
        skills = rng.sample(CORE_SKILLS, k=rng.randint(1, 4))
        mentees.append(
            PersonSeed(
                email=f"{username}@{DEMO_EMAIL_DOMAIN}",
                username=username,
                display_name=f"{first} {last}",
                mode="MENTEE",
                title=rng.choice(mentee_titles),
                bio=rng.choice(mentee_bios),
                interests=f"{skills[0]}, peer learning, project demos, practical feedback.",
                skills=skills,
                city=rng.choice(cities),
                show_initials_only=rng.random() < 0.05,
                empty_profile=len(mentees) in {23, 76, 111},
            )
        )

    return mentors + mentees


def upsert_user(seed: PersonSeed):
    """Create or update a verified local account."""

    from accounts.models import AuthProvider, User, UserRole
    from django.utils import timezone

    user, _ = User.objects.get_or_create(
        email=seed.email,
        defaults={
            "username": seed.username,
            "role": UserRole.USER,
            "auth_provider": AuthProvider.LOCAL,
            "app_usage_mode": seed.mode,
            "is_active": True,
        },
    )
    user.username = seed.username
    user.role = UserRole.USER
    user.auth_provider = AuthProvider.LOCAL
    user.app_usage_mode = seed.mode
    user.is_active = True
    user.is_staff = False
    user.is_superuser = False
    user.is_email_verified = True
    user.email_verified_at = timezone.now()
    user.set_password(make_login_secret(seed.username))
    user.save()
    return user


def upsert_profile(seed: PersonSeed, user, rng: random.Random):
    """Create or update profile details."""

    from profiles.models import Profile

    profile, _ = Profile.objects.get_or_create(user=user)
    profile.username = seed.username
    profile.display_name = seed.display_name
    profile.title = "" if seed.empty_profile else seed.title
    profile.bio = "" if seed.empty_profile else seed.bio
    profile.picture_url = (
        "" if seed.show_initials_only else profile_picture(seed.username, seed.display_name)
    )
    profile.show_initials_only = seed.show_initials_only
    profile.share_precise_location = not seed.show_initials_only
    profile.location = jittered_point(seed.city, rng)
    profile.skills = [] if seed.empty_profile else seed.skills
    profile.linkedin_url = (
        "" if seed.empty_profile else f"https://www.linkedin.com/in/{seed.username}"
    )
    profile.save()
    return profile


def seed_skill_catalog() -> None:
    """Ensure the skill catalog covers generated profiles and communities."""

    from profiles.models import Skill

    skill_names = set(CORE_SKILLS)
    for _, _, skills, _ in COMMUNITY_DEFINITIONS:
        skill_names.update(skills)
    for name in sorted(skill_names):
        Skill.objects.get_or_create(name=name)


def clear_old_demo_data() -> None:
    """Remove old and final-demo seeded records in dependency order."""

    from accounts.models import Report, User
    from mentorship.models import Feedback, Match, MeetingSession, MentorshipRequest, Workshop
    from messaging.models import Conversation, Message, ReadReceipt
    from notifications.models import Notification
    from profiles.models import AvailabilitySlot, CommunityTag, CommunityTagMembership, Profile
    from timeline.models import TimelineEvent

    suffixes = {f"@{DEMO_EMAIL_DOMAIN}", *[f"@{domain}" for domain in OLD_MOCK_EMAIL_DOMAINS]}
    user_query = User.objects.filter(email__in=LEGACY_SEED_EMAILS)
    for suffix in suffixes:
        user_query = user_query | User.objects.filter(email__iendswith=suffix)

    users = list(user_query)
    if not users:
        CommunityTag.objects.filter(name__in=[name for name, *_ in COMMUNITY_DEFINITIONS]).delete()
        return

    user_ids = [user.id for user in users]
    profiles = list(Profile.objects.filter(user_id__in=user_ids))
    profile_ids = [profile.id for profile in profiles]

    demo_communities = CommunityTag.objects.filter(
        name__in=[name for name, *_ in COMMUNITY_DEFINITIONS]
    ) | CommunityTag.objects.filter(created_by_id__in=profile_ids)
    demo_community_ids = list(demo_communities.values_list("id", flat=True))

    TimelineEvent.objects.filter(community_id__in=demo_community_ids).delete()
    TimelineEvent.objects.filter(author_id__in=profile_ids).delete()
    TimelineEvent.objects.filter(
        mentorship__mentor_id__in=profile_ids
    ).delete()
    TimelineEvent.objects.filter(
        mentorship__mentee_id__in=profile_ids
    ).delete()

    Report.objects.filter(submitted_by_id__in=user_ids).delete()
    Report.objects.filter(reported_user_id__in=user_ids).delete()
    Notification.objects.filter(user_id__in=user_ids).delete()
    Notification.objects.filter(actor_id__in=profile_ids).delete()

    ReadReceipt.objects.filter(user_id__in=profile_ids).delete()
    Message.objects.filter(sender_id__in=profile_ids).delete()
    Conversation.objects.filter(match__mentor_id__in=profile_ids).delete()
    Conversation.objects.filter(match__mentee_id__in=profile_ids).delete()

    Feedback.objects.filter(submitted_by_id__in=profile_ids).delete()
    Feedback.objects.filter(match__mentor_id__in=profile_ids).delete()
    Feedback.objects.filter(match__mentee_id__in=profile_ids).delete()
    MeetingSession.objects.filter(mentor_id__in=profile_ids).delete()
    MeetingSession.objects.filter(mentee_id__in=profile_ids).delete()
    Match.objects.filter(mentor_id__in=profile_ids).delete()
    Match.objects.filter(mentee_id__in=profile_ids).delete()
    MentorshipRequest.objects.filter(mentor_id__in=profile_ids).delete()
    MentorshipRequest.objects.filter(mentee_id__in=profile_ids).delete()

    Workshop.objects.filter(community_id__in=demo_community_ids).delete()
    Workshop.objects.filter(author_id__in=profile_ids).delete()
    CommunityTagMembership.objects.filter(profile_id__in=profile_ids).delete()
    demo_communities.delete()
    AvailabilitySlot.objects.filter(profile_id__in=profile_ids).delete()
    User.objects.filter(id__in=user_ids).delete()


def create_availability(profiles: list, rng: random.Random) -> dict[str, list]:
    """Create realistic availability, leaving a few mentors without slots."""

    from profiles.models import AvailabilitySlot

    slots_by_username = {}
    no_slot_usernames = {profiles[16].username, profiles[37].username}
    hour_patterns = [(9, 0), (11, 30), (14, 0), (16, 30), (19, 0)]
    for index, profile in enumerate(profiles):
        if profile.username in no_slot_usernames:
            slots_by_username[profile.username] = []
            continue

        slots = []
        if profile.username in {SCENARIO_MENTOR_USERNAME, BACKUP_MENTOR_USERNAME}:
            fixed_windows = [
                (2, 10, 0, 60),
                (3, 18, 30, 60),
                (4, 15, 0, 60),
                (5, 11, 30, 45),
                (7, 19, 0, 90),
                (9, 14, 0, 60),
                (11, 16, 30, 60),
                (14, 10, 0, 60),
                (16, 18, 0, 60),
                (18, 13, 30, 90),
            ]
            if profile.username == BACKUP_MENTOR_USERNAME:
                fixed_windows = [
                    (day + 1, hour, minute, duration)
                    for day, hour, minute, duration in fixed_windows
                ]
            for day_offset, hour, minute, duration in fixed_windows:
                start_at = aware_at(day_offset, hour, minute)
                slots.append(
                    AvailabilitySlot.objects.create(
                        profile=profile,
                        start_at=start_at,
                        end_at=start_at + timedelta(minutes=duration),
                    )
                )
            slots_by_username[profile.username] = sorted(slots, key=lambda slot: slot.start_at)
            continue

        day_offsets = rng.sample(range(2, 22), k=4)
        for day_offset in sorted(day_offsets):
            hour, minute = rng.choice(hour_patterns)
            start_at = aware_at(day_offset, hour, minute)
            end_at = start_at + timedelta(minutes=rng.choice([45, 60, 90]))
            slots.append(
                AvailabilitySlot.objects.create(
                    profile=profile,
                    start_at=start_at,
                    end_at=end_at,
                )
            )
        slots_by_username[profile.username] = sorted(slots, key=lambda slot: slot.start_at)
    return slots_by_username


def create_request(
    mentor,
    mentee,
    *,
    slot=None,
    status,
    cover_letter: str,
    created_at,
    responded_at=None,
    initial_start=None,
    initial_end=None,
):
    """Create a mentorship request and patch deterministic timestamps."""

    from mentorship.models import MentorshipRequest

    request = MentorshipRequest.objects.create(
        mentor=mentor,
        mentee=mentee,
        slot=slot,
        status=status,
        cover_letter=cover_letter,
        initial_session_start_at=initial_start,
        initial_session_end_at=initial_end,
    )
    fields = {"created_at": created_at}
    if responded_at:
        fields["responded_at"] = responded_at
    MentorshipRequest.objects.filter(id=request.id).update(**fields)
    request.refresh_from_db()
    return request


def create_match_for_request(request, *, active: bool = True):
    """Create match and return it without relying on mutable signal timing."""

    from mentorship.models import Match

    match = Match.objects.create(
        mentor=request.mentor,
        mentee=request.mentee,
        request=request,
        is_active=active,
    )
    return match


def create_session(match, start_at, end_at, status, *, slot=None):
    """Create a meeting session with deterministic status."""

    from mentorship.models import MeetingSession

    return MeetingSession.objects.create(
        match=match,
        mentor=match.mentor,
        mentee=match.mentee,
        source_slot=slot,
        scheduled_start_at_utc=start_at,
        scheduled_end_at_utc=end_at,
        status=status,
    )


def create_timeline_event(**kwargs):
    """Create a timeline event with a deterministic source id when omitted."""

    from timeline.models import TimelineEvent

    kwargs.setdefault("source_id", f"seed:{uuid.uuid4()}")
    return TimelineEvent.objects.create(**kwargs)


def seed_primary_story(profile_by_username, slots_by_username):
    """Seed the Deniz/Mehmet Ali linear demo scenario."""

    from django.core.files.base import ContentFile
    from mentorship.models import Feedback, MeetingSession, MentorshipRequest
    from messaging.models import Conversation, Message, ReadReceipt
    from notifications.models import Notification, NotificationType
    from timeline.models import TimelineEvent

    deniz = profile_by_username[SCENARIO_MENTOR_USERNAME]
    mehmet = profile_by_username[SCENARIO_MENTEE_USERNAME]
    slot = slots_by_username[SCENARIO_MENTOR_USERNAME][-1]
    slot.mark_booked(mehmet.user)

    request = create_request(
        deniz,
        mehmet,
        slot=slot,
        status=MentorshipRequest.Status.ACCEPTED,
        cover_letter=(
            "Hi Deniz, I am building a student web project and need help simplifying "
            "the page structure, planning testing, and preparing a clearer demo."
        ),
        created_at=aware_at(-13, 10, 20),
        responded_at=aware_at(-12, 18, 40),
    )
    match = create_match_for_request(request)

    create_session(
        match,
        aware_at(-10, 17, 0),
        aware_at(-10, 18, 0),
        MeetingSession.Status.COMPLETED,
    )
    create_session(
        match,
        aware_at(-4, 18, 30),
        aware_at(-4, 19, 30),
        MeetingSession.Status.COMPLETED,
    )
    create_session(
        match,
        aware_at(4, 15, 0),
        aware_at(4, 16, 0),
        MeetingSession.Status.SCHEDULED,
        slot=slot,
    )

    create_timeline_event(
        source_id=f"seed:journey:{match.id}:kickoff",
        category=TimelineEvent.Category.MCTE,
        event_type=TimelineEvent.MCTEEventType.PROGRESS,
        author=mehmet,
        mentorship=match,
        actor_role="mentee",
        content=(
            "Shared the first project outline and identified the landing page, dashboard, "
            "and profile pages as the main scope."
        ),
        timestamp=aware_at(-10, 18, 10),
        show_on_profile=True,
    )
    create_timeline_event(
        source_id=f"seed:journey:{match.id}:session-2",
        category=TimelineEvent.Category.MCTE,
        event_type=TimelineEvent.MCTEEventType.PROGRESS,
        author=deniz,
        mentorship=match,
        actor_role="mentor",
        content=(
            "Reviewed navigation flow, reduced the first release scope, and moved nice-to-have "
            "analytics widgets into a later milestone."
        ),
        timestamp=aware_at(-4, 19, 40),
        show_on_profile=False,
    )
    create_timeline_event(
        source_id=f"seed:journey:{match.id}:demo-manual-event",
        category=TimelineEvent.Category.MCTE,
        event_type=TimelineEvent.MCTEEventType.PROGRESS,
        author=deniz,
        mentorship=match,
        actor_role="mentor",
        content=SCENARIO_NEW_TIMELINE_EVENT_TEXT,
        timestamp=aware_at(0, 11, 30),
        show_on_profile=True,
    )

    conversation, _ = Conversation.objects.get_or_create(match=match)
    messages = [
        (mehmet, "I reorganized the landing page tasks after our last session.", aware_at(-2, 20, 12)),
        (
            deniz,
            "Great. Next time we can review page flow and deployment priorities.",
            aware_at(-2, 20, 34),
        ),
        (
            deniz,
            "I've sent you the resources we discussed: a page map example, a QA checklist, and a simple release plan.",
            aware_at(-1, 17, 45),
        ),
    ]
    for sender, body, created_at in messages:
        message = Message.objects.create(conversation=conversation, sender=sender, body=body)
        Message.objects.filter(id=message.id).update(created_at=created_at)
        ReadReceipt.objects.update_or_create(
            message=message,
            user=deniz if sender == mehmet else mehmet,
            defaults={"status": ReadReceipt.Status.READ},
        )

    pdf_message = Message.objects.create(
        conversation=conversation,
        sender=mehmet,
        body=SCENARIO_NEW_MESSAGE_TEXT,
        original_filename="Project Planning Checklist.pdf",
    )
    pdf_message.attachment.save(
        "Project Planning Checklist.pdf",
        ContentFile(
            b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
            b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
            b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R>>endobj\n"
            b"4 0 obj<</Length 72>>stream\nBT /F1 12 Tf 24 96 Td "
            b"(Project Planning Checklist - Demo Attachment) Tj ET\nendstream\nendobj\n"
            b"xref\n0 5\n0000000000 65535 f \ntrailer<</Root 1 0 R>>\n%%EOF\n"
        ),
        save=True,
    )
    Message.objects.filter(id=pdf_message.id).update(created_at=aware_at(0, 12, 5))
    ReadReceipt.objects.update_or_create(
        message=pdf_message,
        user=deniz,
        defaults={"status": ReadReceipt.Status.DELIVERED},
    )

    Notification.objects.create(
        user=mehmet.user,
        type=NotificationType.NEW_MESSAGE,
        title=SCENARIO_NOTIFICATION_TITLE,
        message=SCENARIO_NOTIFICATION_MESSAGE,
        actor=deniz,
        resource_type="conversation",
        resource_id=conversation.id,
        is_read=False,
        extra_metadata={"demo_script_show_text": True},
    )
    Notification.objects.create(
        user=deniz.user,
        type=NotificationType.NEW_MESSAGE,
        title="New Message",
        message=f"You have received a new message from {mehmet.display_name}.",
        actor=mehmet,
        resource_type="conversation",
        resource_id=conversation.id,
        is_read=False,
    )

    return match, conversation


def seed_general_mentorship(profiles_by_mode, slots_by_username, rng: random.Random) -> list:
    """Seed requests, matches, sessions, conversations, feedback, and reports."""

    from accounts.models import Report, ReportReason, ReportStatus
    from mentorship.models import Feedback, MeetingSession, MentorshipRequest
    from messaging.models import Conversation, Message, ReadReceipt
    from notifications.models import Notification, NotificationType
    from timeline.models import TimelineEvent

    mentors = [
        profile
        for profile in profiles_by_mode["MENTOR"]
        if profile.username not in {SCENARIO_MENTOR_USERNAME, BACKUP_MENTOR_USERNAME}
    ]
    mentees = [
        profile
        for profile in profiles_by_mode["MENTEE"]
        if profile.username != SCENARIO_MENTEE_USERNAME
    ]
    matches = []

    pairs = []
    for mentee in mentees[:45]:
        mentor = rng.choice(mentors)
        pairs.append((mentor, mentee))

    for idx, (mentor, mentee) in enumerate(pairs):
        status_pick = rng.random()
        mentor_slots = slots_by_username.get(mentor.username, [])
        slot = mentor_slots[idx % len(mentor_slots)] if mentor_slots else None
        if status_pick < 0.68:
            if slot:
                slot.mark_booked(mentee.user)
            created_days_ago = rng.randint(12, 25)
            responded_days_ago = rng.randint(6, created_days_ago - 1)
            request = create_request(
                mentor,
                mentee,
                slot=slot,
                status=MentorshipRequest.Status.ACCEPTED,
                cover_letter=(
                    f"I would like guidance on {rng.choice(mentee.skills or CORE_SKILLS)} "
                    "and a realistic weekly plan for my project."
                ),
                created_at=aware_at(-created_days_ago, rng.choice([10, 14, 19])),
                responded_at=aware_at(-responded_days_ago, rng.choice([11, 16, 20])),
            )
            match = create_match_for_request(request, active=idx % 7 != 0)
            matches.append(match)
            if idx % 3 == 0:
                start = aware_at(-rng.randint(3, 18), rng.choice([15, 18, 20]))
                create_session(match, start, start + timedelta(hours=1), MeetingSession.Status.COMPLETED)
            if match.is_active:
                start = aware_at(rng.randint(2, 14), rng.choice([11, 15, 19]))
                create_session(match, start, start + timedelta(hours=1), MeetingSession.Status.SCHEDULED, slot=slot)
            else:
                start = aware_at(-rng.randint(2, 8), rng.choice([14, 17]))
                create_session(match, start, start + timedelta(hours=1), MeetingSession.Status.COMPLETED)

            create_timeline_event(
                category=TimelineEvent.Category.MCTE,
                event_type=rng.choice(TimelineEvent.MCTEEventType.values),
                author=rng.choice([mentor, mentee]),
                mentorship=match,
                actor_role="mentor" if rng.random() < 0.5 else "mentee",
                content=rng.choice(
                    [
                        "Agreed on a smaller project scope and a clearer success checklist.",
                        "Reviewed the prototype and identified two usability issues to fix first.",
                        "Moved deployment, documentation, and testing into separate weekly tasks.",
                    ]
                ),
                timestamp=aware_at(-rng.randint(1, 12), rng.choice([13, 18, 21])),
                show_on_profile=rng.random() < 0.35,
            )

            if match.is_active:
                conversation, _ = Conversation.objects.get_or_create(match=match)
                for sender, body in [
                    (mentee, "Thanks for the last session. I updated the checklist."),
                    (mentor, "Nice progress. Bring one open question to the next call."),
                ]:
                    message = Message.objects.create(conversation=conversation, sender=sender, body=body)
                    ReadReceipt.objects.update_or_create(
                        message=message,
                        user=mentor if sender == mentee else mentee,
                        defaults={
                            "status": rng.choice(
                                [ReadReceipt.Status.READ, ReadReceipt.Status.DELIVERED]
                            )
                        },
                    )
            if idx % 2 == 0:
                Feedback.objects.create(
                    match=match,
                    submitted_by=mentee,
                    rating=rng.choice([4, 5, 5, 5]),
                    text=rng.choice(
                        [
                            "Practical advice and clear next steps.",
                            "The session helped me focus on the most important task.",
                            "Supportive mentor with helpful project feedback.",
                        ]
                    ),
                )
        elif status_pick < 0.86 and slot:
            slot.mark_pending()
            create_request(
                mentor,
                mentee,
                slot=slot,
                status=MentorshipRequest.Status.PENDING,
                cover_letter="Could we schedule a short review of my current project plan?",
                created_at=aware_at(-rng.randint(1, 5), rng.choice([9, 18, 21])),
            )
            Notification.objects.create(
                user=mentor.user,
                type=NotificationType.NEW_MENTORSHIP_REQUEST,
                title="New Mentorship Request",
                message=f"{mentee.display_name} has sent you a mentorship request.",
                actor=mentee,
                resource_type="mentorship_request",
            )
        else:
            created_days_ago = rng.randint(10, 18)
            responded_days_ago = rng.randint(5, created_days_ago - 1)
            create_request(
                mentor,
                mentee,
                slot=None,
                status=MentorshipRequest.Status.REJECTED,
                cover_letter="I am looking for urgent help this week before a deadline.",
                created_at=aware_at(-created_days_ago, rng.choice([12, 16])),
                responded_at=aware_at(-responded_days_ago, rng.choice([12, 16])),
            )

    for idx, match in enumerate(matches[:6]):
        reporter = match.mentee.user
        reported = match.mentor.user if idx % 2 else rng.choice(mentors).user
        if reporter == reported:
            continue
        Report.objects.get_or_create(
            submitted_by=reporter,
            reported_user=reported,
            defaults={
                "reason": rng.choice([ReportReason.SPAM, ReportReason.OTHER, ReportReason.INAPPROPRIATE_CONTENT]),
                "description": rng.choice(
                    [
                        "The message felt unrelated to the mentorship topic.",
                        "The profile details looked suspicious and should be reviewed.",
                        "I want the moderation team to check this conversation context.",
                    ]
                ),
                "status": rng.choice([ReportStatus.OPEN, ReportStatus.IN_REVIEW, ReportStatus.RESOLVED]),
            },
        )

    return matches


def seed_communities(profile_by_username, profiles_by_mode, rng: random.Random):
    """Seed communities, memberships, posts, workshops, and participants."""

    from mentorship.models import Workshop, WorkshopParticipant
    from profiles.models import CommunityTag, CommunityTagMembership
    from timeline.models import TimelineEvent

    communities = {}
    mentors = profiles_by_mode["MENTOR"]
    mentees = profiles_by_mode["MENTEE"]
    deniz = profile_by_username[SCENARIO_MENTOR_USERNAME]
    goksel = profile_by_username[BACKUP_MENTOR_USERNAME]
    mehmet = profile_by_username[SCENARIO_MENTEE_USERNAME]

    for index, (name, description, skills, city) in enumerate(COMMUNITY_DEFINITIONS):
        creator = goksel if name == SCENARIO_COMMUNITY_NAME else rng.choice(mentors)
        community = CommunityTag.objects.create(
            name=name,
            description=description,
            created_by=creator,
            location=jittered_point(city, rng),
        )
        communities[name] = community
        local_members = [p for p in mentors + mentees if p.location and rng.random() < 0.18]
        if name == SCENARIO_COMMUNITY_NAME:
            local_members.extend([deniz, goksel, mehmet])
            local_members.extend(rng.sample([p for p in mentees if p != mehmet], k=32))
            local_members.extend(rng.sample([p for p in mentors if p not in {deniz, goksel}], k=10))
        elif name == "Backend API Circle":
            local_members.append(goksel)
            local_members.extend(rng.sample(mentees, k=rng.randint(9, 18)))
            local_members.extend(rng.sample(mentors, k=rng.randint(3, 7)))
        else:
            local_members.extend(rng.sample(mentees, k=rng.randint(9, 18)))
            local_members.extend(rng.sample(mentors, k=rng.randint(3, 7)))
        seen = set()
        for member in local_members:
            if member.id in seen:
                continue
            seen.add(member.id)
            CommunityTagMembership.objects.get_or_create(profile=member, tag=community)
        CommunityTag.objects.filter(id=community.id).update(member_count=len(seen))

        post_count = 8 if name == SCENARIO_COMMUNITY_NAME else rng.randint(3, 6)
        members = list(community.members.all())
        scenario_member_pool = [
            member
            for member in members
            if member.id not in {deniz.id, goksel.id, mehmet.id}
        ]
        for post_index in range(post_count):
            if name == SCENARIO_COMMUNITY_NAME:
                scenario_posts = [
                    (mehmet, SCENARIO_COMMUNITY_POSTS[0]),
                    (rng.choice(scenario_member_pool), SCENARIO_COMMUNITY_POSTS[1]),
                    (mehmet, SCENARIO_COMMUNITY_POSTS[2]),
                    (rng.choice(scenario_member_pool), SCENARIO_COMMUNITY_POSTS[5]),
                    (deniz, SCENARIO_COMMUNITY_POSTS[3]),
                    (rng.choice(scenario_member_pool), SCENARIO_COMMUNITY_POSTS[4]),
                    (rng.choice(scenario_member_pool), SCENARIO_COMMUNITY_POSTS[6]),
                    (rng.choice(scenario_member_pool), SCENARIO_COMMUNITY_POSTS[7]),
                ]
                author, content = scenario_posts[post_index % len(scenario_posts)]
            elif name == "Backend API Circle":
                api_circle_posts = [
                    (goksel, GOKSEL_COMMUNITY_POSTS[0]),
                    (rng.choice(members), f"Looking for feedback on a {skills[0]} learning plan this week."),
                    (goksel, GOKSEL_COMMUNITY_POSTS[1]),
                    (rng.choice(members), "We compared two project scopes and picked the one we can test fastest."),
                    (goksel, GOKSEL_COMMUNITY_POSTS[2]),
                ]
                author, content = api_circle_posts[post_index % len(api_circle_posts)]
            else:
                author = rng.choice(members)
                content = rng.choice(
                    [
                        f"Looking for feedback on a {skills[0]} learning plan this week.",
                        "We compared two project scopes and picked the one we can test fastest.",
                        "Sharing notes from a helpful peer review session.",
                    ]
                )
            create_timeline_event(
                category=TimelineEvent.Category.COP,
                event_type=rng.choice(TimelineEvent.MCTEEventType.values),
                author=author,
                community_id=community.id,
                content=content,
                media_url=(
                    POST_IMAGE_URLS[(index + post_index) % len(POST_IMAGE_URLS)]
                    if (name == SCENARIO_COMMUNITY_NAME and post_index in {1, 3, 5})
                    or rng.random() < 0.25
                    else None
                ),
                timestamp=aware_at(-rng.randint(1, 9), rng.choice([10, 15, 20])),
                show_on_profile=rng.random() < 0.45,
                payload={
                    "community_name": community.name,
                    "community_slug": community.slug,
                    "tagged_users": [],
                },
            )

        workshop_specs = [
            (
                f"{skills[0]} Study Clinic",
                f"A practical group session for students working on {skills[0]} projects.",
                aware_at(rng.randint(5, 24), rng.choice([17, 19, 20])),
                rng.choice([10, 12, 16, 20]),
                Workshop.Status.SCHEDULED,
            ),
            (
                f"{skills[-1]} Retrospective",
                f"Members share lessons learned from recent {skills[-1]} practice.",
                aware_at(-rng.randint(2, 12), rng.choice([17, 19])),
                rng.choice([8, 12, 15]),
                Workshop.Status.COMPLETED,
            ),
        ]
        if name == SCENARIO_COMMUNITY_NAME:
            workshop_specs.extend(
                [
                    (
                        "MVP Feedback Hour",
                        "A group discussion on shrinking student product ideas into a believable first release.",
                        aware_at(6, 18, 30),
                        14,
                        Workshop.Status.SCHEDULED,
                    ),
                    (
                        "Demo Flow Retro",
                        "Members share what confused users during recent project demos and what they changed after.",
                        aware_at(-6, 19, 0),
                        10,
                        Workshop.Status.COMPLETED,
                    ),
                ]
            )
        for title, description_text, start_at, capacity, status in workshop_specs:
            mentor_members = [m for m in members if m.user.app_usage_mode == "MENTOR"] or [creator]
            if name == SCENARIO_COMMUNITY_NAME and title in {"MVP Feedback Hour", "Demo Flow Retro"}:
                author = goksel
            else:
                author = rng.choice(mentor_members)
            workshop = Workshop.objects.create(
                community=community,
                author=author,
                title=title,
                description=description_text,
                scheduled_at=start_at,
                end_at=start_at + timedelta(minutes=90),
                max_participants=capacity,
                status=status,
            )
            non_author_members = [member for member in members if member.id != author.id]
            non_actor_mentees = [
                member
                for member in non_author_members
                if member.user.app_usage_mode == "MENTEE"
                and member.id not in {mehmet.id}
            ]
            participants = []
            if name == SCENARIO_COMMUNITY_NAME and title == "MVP Feedback Hour":
                participants.append(mehmet)
                if non_actor_mentees:
                    participants.append(rng.choice(non_actor_mentees))
            elif name == SCENARIO_COMMUNITY_NAME and title == "Demo Flow Retro" and non_actor_mentees:
                participants.append(rng.choice(non_actor_mentees))
            sample_pool = [member for member in non_author_members if member.id not in {p.id for p in participants}]
            participant_target = min(len(sample_pool), rng.randint(4, max(4, capacity - 1)))
            if participant_target > 0:
                participants.extend(rng.sample(sample_pool, k=participant_target))
            for participant in dict.fromkeys(participants):
                WorkshopParticipant.objects.get_or_create(
                    workshop=workshop,
                    participant=participant,
                    defaults={"show_on_profile": rng.random() < 0.3},
                )

    return communities


def seed_demo_profile_reviews(profile_by_username, profiles_by_mode, rng: random.Random) -> None:
    """Seed enough text reviews for demo mentor profiles to pass public batching rules."""

    from mentorship.models import Feedback, MeetingSession, MentorshipRequest
    from messaging.models import Conversation
    from timeline.models import TimelineEvent

    deniz = profile_by_username[SCENARIO_MENTOR_USERNAME]
    goksel = profile_by_username[BACKUP_MENTOR_USERNAME]
    mehmet = profile_by_username[SCENARIO_MENTEE_USERNAME]
    available_mentees = [profile for profile in profiles_by_mode["MENTEE"] if profile != mehmet]

    review_plan = [
        (
            deniz,
            [
                "Deniz helped our team remove two unnecessary pages and explain the project flow much more clearly.",
                "The feedback was specific and practical. I left with a task order that made the week feel manageable.",
            ],
        ),
        (
            goksel,
            [
                "Göksel helped us cut an oversized web project into a believable MVP with a much clearer page plan.",
                "Helpful full-stack perspective. He explained which backend endpoints mattered for the first release and which could wait.",
            ],
        ),
    ]

    cursor = 0
    for mentor, texts in review_plan:
        for index, text in enumerate(texts):
            mentee = available_mentees[cursor % len(available_mentees)]
            cursor += 1
            created_at = aware_at(-(24 - index), 10 + (index % 4), 15)
            responded_at = created_at + timedelta(days=1, hours=2)
            request = create_request(
                mentor,
                mentee,
                slot=None,
                status=MentorshipRequest.Status.ACCEPTED,
                cover_letter=(
                    "I would like a focused review and concrete next steps for a student project."
                ),
                created_at=created_at,
                responded_at=responded_at,
                initial_start=responded_at + timedelta(days=1),
                initial_end=responded_at + timedelta(days=1, hours=1),
            )
            match = create_match_for_request(request, active=False)
            Conversation.objects.filter(match=match).delete()
            create_session(
                match,
                responded_at + timedelta(days=1),
                responded_at + timedelta(days=1, hours=1),
                MeetingSession.Status.COMPLETED,
            )
            feedback = Feedback.objects.create(
                match=match,
                submitted_by=mentee,
                rating=rng.choice([4, 5, 5, 5]),
                text=text,
            )
            Feedback.objects.filter(id=feedback.id).update(
                created_at=aware_at(-(40 - index), 12, 0)
            )


def seed_demo_actor_networks(profile_by_username, profiles_by_mode, slots_by_username, rng: random.Random) -> None:
    """Give the demo actors a fuller but still coherent mentorship graph."""

    from mentorship.models import Feedback, MeetingSession, MentorshipRequest
    from messaging.models import Conversation, Message

    deniz = profile_by_username[SCENARIO_MENTOR_USERNAME]
    goksel = profile_by_username[BACKUP_MENTOR_USERNAME]
    mehmet = profile_by_username[SCENARIO_MENTEE_USERNAME]

    extra_mentees = [profile for profile in profiles_by_mode["MENTEE"] if profile != mehmet]
    extra_mentors = [
        profile
        for profile in profiles_by_mode["MENTOR"]
        if profile.username not in {SCENARIO_MENTOR_USERNAME, BACKUP_MENTOR_USERNAME}
    ]

    actor_match_specs = [
        {
            "mentor": deniz,
            "mentee": extra_mentees[3],
            "created_at": aware_at(-11, 13, 0),
            "responded_at": aware_at(-10, 17, 20),
            "past_session": aware_at(-6, 18, 0),
            "future_session": aware_at(3, 17, 30),
            "cover_letter": "I need help reducing my web project scope before our department demo.",
            "message": "I simplified the page flow after your last suggestion. Could we review the updated board next time?",
            "feedback": "Deniz helped me stop overbuilding and focus on the most important screens first.",
        },
        {
            "mentor": deniz,
            "mentee": extra_mentees[9],
            "created_at": aware_at(-8, 11, 15),
            "responded_at": aware_at(-7, 16, 10),
            "past_session": aware_at(-3, 19, 0),
            "future_session": aware_at(6, 11, 30),
            "cover_letter": "I want a second opinion on weekly planning and testing priorities for my app.",
            "message": "Your testing checklist made the release plan much easier to explain to my teammates.",
            "feedback": "Very clear mentor. I left the session with a practical plan instead of vague advice.",
        },
        {
            "mentor": goksel,
            "mentee": extra_mentees[15],
            "created_at": aware_at(-10, 9, 40),
            "responded_at": aware_at(-9, 18, 0),
            "past_session": aware_at(-5, 18, 30),
            "future_session": aware_at(7, 19, 0),
            "cover_letter": "I need help connecting page scope, API endpoints, and weekly delivery for a student platform.",
            "message": "The way you mapped our pages to endpoints made the whole project feel much less chaotic.",
            "feedback": "Göksel was great at connecting frontend decisions to backend responsibilities.",
        },
        {
            "mentor": goksel,
            "mentee": extra_mentees[21],
            "created_at": aware_at(-7, 14, 10),
            "responded_at": aware_at(-6, 19, 15),
            "past_session": aware_at(-2, 17, 0),
            "future_session": aware_at(8, 10, 0),
            "cover_letter": "I am trying to decide which product ideas belong in version one and which can wait.",
            "message": "Our session helped me turn an oversized feature list into a believable MVP.",
            "feedback": "Excellent for student teams that need both technical structure and product clarity.",
        },
        {
            "mentor": extra_mentors[4],
            "mentee": mehmet,
            "created_at": aware_at(-9, 12, 30),
            "responded_at": aware_at(-8, 17, 45),
            "past_session": aware_at(-4, 16, 0),
            "future_session": aware_at(5, 14, 0),
            "cover_letter": "I want another mentor perspective on presenting the product flow more confidently.",
            "message": "The second mentor perspective really helped me think about how to explain the project, not just build it.",
            "feedback": None,
        },
    ]

    for spec in actor_match_specs:
        request = create_request(
            spec["mentor"],
            spec["mentee"],
            slot=None,
            status=MentorshipRequest.Status.ACCEPTED,
            cover_letter=spec["cover_letter"],
            created_at=spec["created_at"],
            responded_at=spec["responded_at"],
            initial_start=spec["future_session"],
            initial_end=spec["future_session"] + timedelta(hours=1),
        )
        match = create_match_for_request(request, active=True)
        create_session(
            match,
            spec["past_session"],
            spec["past_session"] + timedelta(hours=1),
            MeetingSession.Status.COMPLETED,
        )
        create_session(
            match,
            spec["future_session"],
            spec["future_session"] + timedelta(hours=1),
            MeetingSession.Status.SCHEDULED,
        )
        conversation, _ = Conversation.objects.get_or_create(match=match)
        Message.objects.create(conversation=conversation, sender=spec["mentee"], body=spec["message"])
        Message.objects.create(
            conversation=conversation,
            sender=spec["mentor"],
            body="Looks good. Bring the updated flow and we can turn it into the next action plan together.",
        )
        if spec["feedback"]:
            Feedback.objects.create(
                match=match,
                submitted_by=spec["mentee"],
                rating=5,
                text=spec["feedback"],
            )


def dedupe_mentorship_began_events() -> None:
    """Keep one request_accepted AGTE per seeded match, preserving other AGTE history."""

    from mentorship.models import Match
    from timeline.models import TimelineEvent

    seeded_matches = Match.objects.filter(
        mentor__user__email__iendswith=f"@{DEMO_EMAIL_DOMAIN}"
    ) | Match.objects.filter(mentee__user__email__iendswith=f"@{DEMO_EMAIL_DOMAIN}")

    for match in seeded_matches.distinct():
        events = list(
            TimelineEvent.objects.filter(
                mentorship=match,
                category=TimelineEvent.Category.AGTE,
                event_type="request_accepted",
            ).order_by("timestamp", "created_at", "source_id")
        )
        for duplicate in events[1:]:
            duplicate.delete()


def refresh_profile_metrics() -> None:
    """Refresh denormalized mentor review count, rating, and active mentee count."""

    from django.db.models import Avg, Count
    from mentorship.models import Feedback, Match
    from profiles.models import Profile

    for profile in Profile.objects.filter(user__email__iendswith=f"@{DEMO_EMAIL_DOMAIN}"):
        active_count = (
            Match.objects.filter(mentor=profile, is_active=True).aggregate(count=Count("mentee"))[
                "count"
            ]
            or 0
        )
        feedback_qs = Feedback.objects.filter(match__mentor=profile).exclude(submitted_by=profile)
        review_count = feedback_qs.count()
        avg = feedback_qs.aggregate(avg=Avg("rating"))["avg"]
        profile.total_mentee_count = active_count
        profile.review_count = review_count
        profile.average_rating = Decimal(str(round(avg or 0, 2))).quantize(Decimal("0.00"))
        profile.save(update_fields=["total_mentee_count", "review_count", "average_rating"])


def seed_demo_data() -> None:
    """Seed the complete final milestone dataset."""

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
    import django

    django.setup()

    rng = random.Random(RANDOM_SEED)

    seed_skill_catalog()
    clear_old_demo_data()

    people = build_people(rng)
    profile_by_username = {}
    profiles_by_mode = {"MENTOR": [], "MENTEE": []}

    for seed in people:
        user = upsert_user(seed)
        profile = upsert_profile(seed, user, rng)
        profile_by_username[seed.username] = profile
        profiles_by_mode[seed.mode].append(profile)

    slots_by_username = create_availability(profiles_by_mode["MENTOR"], rng)
    primary_match, primary_conversation = seed_primary_story(profile_by_username, slots_by_username)
    other_matches = seed_general_mentorship(profiles_by_mode, slots_by_username, rng)
    seed_demo_actor_networks(profile_by_username, profiles_by_mode, slots_by_username, rng)
    seed_demo_profile_reviews(profile_by_username, profiles_by_mode, rng)
    communities = seed_communities(profile_by_username, profiles_by_mode, rng)
    dedupe_mentorship_began_events()
    refresh_profile_metrics()

    print("\n--- Final Milestone Demo Seed Complete ---")
    print(f"mentor_email={SCENARIO_MENTOR_EMAIL}")
    print(f"mentor_password={SCENARIO_MENTOR_PASSWORD}")
    print(f"backup_mentor_email={BACKUP_MENTOR_EMAIL}")
    print(f"backup_mentor_password={BACKUP_MENTOR_PASSWORD}")
    print(f"mentee_email={SCENARIO_MENTEE_EMAIL}")
    print(f"mentee_password={SCENARIO_MENTEE_PASSWORD}")
    print(f"mentor_count={len(profiles_by_mode['MENTOR'])}")
    print(f"mentee_count={len(profiles_by_mode['MENTEE'])}")
    print(f"community_count={len(communities)}")
    print(f"primary_match_id={primary_match.id}")
    print(f"primary_conversation_id={primary_conversation.id}")
    print(f"additional_match_count={len(other_matches)}")
    print(f"scenario_community={SCENARIO_COMMUNITY_NAME}")
    print(f"scenario_notification={SCENARIO_NOTIFICATION_TITLE}: {SCENARIO_NOTIFICATION_MESSAGE}")


if __name__ == "__main__":
    seed_demo_data()
