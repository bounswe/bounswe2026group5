from datetime import datetime, time, timedelta

from accounts.models import User, UserRole
from mentorship.models import Match
from django.utils import timezone
from mentorship.models import MentorshipRequest
from profiles.models import AvailabilitySlot, ExpertiseField, Profile, ProfileExpertise


def upsert_user(email: str, username: str, password: str) -> User:
    user, _ = User.objects.get_or_create(
        email=email,
        defaults={"username": username, "role": UserRole.USER, "is_active": True},
    )
    user.username = username
    user.role = UserRole.USER
    user.is_active = True
    user.set_password(password)
    user.save()
    return user


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
    (
        p_mert,
        p_emma,
        "PENDING",
        "Hi Mert, can we review DRF serializers and validation strategy for my project?",
    ),
    (
        p_mert,
        p_azra,
        "ACCEPTED",
        "Merhaba Mert, system design interview prep konusunda mentorluğa ihtiyacım var.",
    ),
    (
        p_mert,
        p_jack,
        "REJECTED",
        "Could we have a session on API error handling and auth best practices?",
    ),
    (
        p_emma,
        p_mert,
        "PENDING",
        "Hi Emma, I would like a reverse-mentoring chat about mobile accessibility patterns.",
    ),
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

print("seed complete")
print("login: mert.yilmaz@example.com / MertPass123!")
print("requests_for_mert=", MentorshipRequest.objects.filter(mentor=p_mert).count())
print("incoming_for_mert=", MentorshipRequest.objects.filter(mentor=p_mert).count())
print("outgoing_for_mert=", MentorshipRequest.objects.filter(mentee=p_mert).count())
print(
    "accepted_for_mert=",
    MentorshipRequest.objects.filter(mentor=p_mert, status=MentorshipRequest.Status.ACCEPTED).count(),
)
print(
    "rejected_for_mert=",
    MentorshipRequest.objects.filter(mentor=p_mert, status=MentorshipRequest.Status.REJECTED).count(),
)
print(
    "matches_for_mert=",
    Match.objects.filter(mentor=p_mert).count(),
)
print(
    "availability_for_mert=",
    AvailabilitySlot.objects.filter(profile=p_mert, is_booked=False).count(),
)
