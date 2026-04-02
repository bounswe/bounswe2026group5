from datetime import timedelta

from accounts.models import User, UserRole
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
p_mert.mentorship_mode = "BOTH"
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
p_emma.mentorship_mode = "BOTH"
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
p_azra.mentorship_mode = "BOTH"
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
p_jack.mentorship_mode = "BOTH"
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

now = timezone.now().replace(minute=0, second=0, microsecond=0)
for day in (1, 2, 3, 4):
    for hour in (10, 14, 17):
        start = now + timedelta(days=day, hours=(hour - now.hour))
        end = start + timedelta(hours=1)
        AvailabilitySlot.objects.get_or_create(
            profile=p_mert,
            start_at=start,
            defaults={"end_at": end, "is_booked": False},
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
        "PENDING",
        "Merhaba Mert, system design interview prep konusunda mentorluğa ihtiyacım var.",
    ),
    (
        p_mert,
        p_jack,
        "PENDING",
        "Could we have a session on API error handling and auth best practices?",
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
print(
    "availability_for_mert=",
    AvailabilitySlot.objects.filter(profile=p_mert, is_booked=False).count(),
)
