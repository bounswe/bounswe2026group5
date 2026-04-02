# Temporary Mobile Verification Steps (Corrected)

## 1) Environment Setup
Edit `.env.local` in the mobile folder:

```env
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Notes:
- Keep mock fallback disabled for real backend verification.
- Restart Expo after env changes.

## 2) Start Services
From repo root:

```bash
docker compose up -d
```

Check backend process:

```bash
docker logs --tail 40 mentorship_backend
```

Important:
- `curl -i http://127.0.0.1:8000/` returning `404` is OK in this project.
- Root path `/` is not defined; use API routes below to verify health.

## 3) Seed Test Data (Docker-Only, no local Python needed)
Run this from repo root:

```bash
docker exec mentorship_backend python manage.py shell -c "
from datetime import timedelta
from django.utils import timezone
from accounts.models import User, UserRole
from profiles.models import Profile, AvailabilitySlot
from mentorship.models import MentorshipRequest

mentor, _ = User.objects.get_or_create(
        email='mert.yilmaz@example.com',
        defaults={'username': 'mert.yilmaz', 'role': UserRole.USER, 'is_active': True},
)
mentor.role = UserRole.USER
mentor.set_password('MertPass123!')
mentor.save()

mentee, _ = User.objects.get_or_create(
        email='emma.wilson@example.com',
        defaults={'username': 'emma.wilson', 'role': UserRole.USER, 'is_active': True},
)
mentee.role = UserRole.USER
mentee.set_password('EmmaPass123!')
mentee.save()

mentor_profile, _ = Profile.objects.get_or_create(
        user=mentor,
        defaults={
                'username': 'mert.yilmaz',
                'display_name': 'Mert Yilmaz',
                'bio': 'Senior CS student helping with algorithms, Django, and system design.',
                'mentorship_mode': 'BOTH',
        },
)
mentee_profile, _ = Profile.objects.get_or_create(
        user=mentee,
        defaults={
                'username': 'emma.wilson',
                'display_name': 'Emma Wilson',
                'bio': 'Junior dev improving backend fundamentals and API design.',
                'mentorship_mode': 'BOTH',
        },
)

mentor_profile.mentorship_mode = 'BOTH'
mentor_profile.display_name = 'Mert Yilmaz'
mentor_profile.bio = 'Senior CS student helping with algorithms, Django, and system design.'
mentor_profile.save()

mentee_profile.mentorship_mode = 'BOTH'
mentee_profile.display_name = 'Emma Wilson'
mentee_profile.bio = 'Junior dev improving backend fundamentals and API design.'
mentee_profile.save()

now = timezone.now()
for day in (1, 2, 3):
        for hour in (10, 14):
                start = now + timedelta(days=day, hours=hour)
                end = start + timedelta(hours=1)
                AvailabilitySlot.objects.get_or_create(
                        profile=mentor_profile,
                        start_at=start,
                        defaults={'end_at': end, 'is_booked': False},
                )

MentorshipRequest.objects.get_or_create(
        mentor=mentor_profile,
        mentee=mentee_profile,
        status='PENDING',
        defaults={'cover_letter': 'Hi Mert, can we do a session on REST API design and testing strategies this week?'},
)

print('seed ok')
"
```

## 4) Verify Backend Endpoints (Real Check)
1) Login:

```bash
curl -s -X POST http://127.0.0.1:8000/api/auth/login/ \
    -H "Content-Type: application/json" \
        -d '{"email":"mert.yilmaz@example.com","password":"MertPass123!"}'
```

Expected: JSON includes `access_token` and `user.role` should be `USER`.

2) Extract token and call protected endpoints:

```bash
LOGIN_JSON=$(curl -s -X POST http://127.0.0.1:8000/api/auth/login/ \
    -H "Content-Type: application/json" \
        -d '{"email":"mert.yilmaz@example.com","password":"MertPass123!"}')

TOKEN=$(node -e "
const fs = require('fs');
const j = JSON.parse(fs.readFileSync(0, 'utf8'));
process.stdout.write(j.access_token || '');
" <<< "$LOGIN_JSON")

curl -s http://127.0.0.1:8000/api/mentorship/requests/me/ \
    -H "Authorization: Bearer $TOKEN"

curl -s http://127.0.0.1:8000/api/profiles/mert.yilmaz/availability-slots/ \
        -H "Authorization: Bearer $TOKEN"
```

Expected:
- Requests endpoint returns at least one `PENDING` request.
- Availability endpoint returns slot objects.

## 5) Run Mobile and Verify UI

```bash
cd mobile
npm start
```

In simulator:
1. Open app.
2. If already in tabs: Settings -> Log Out.
3. Login with `mert.yilmaz@example.com` / `MertPass123!`.
4. Verify dashboard opens.
5. Verify requests/availability are real backend data.
6. Verify Log Out returns to login.

## 6) Role Semantics (Important)
- `User.role` (accounts table): `USER`/`ADMIN`/`GUEST` controls access level.
- `Profile.mentorship_mode`: `MENTOR`/`MENTEE`/`BOTH` controls mentor/mentee behavior.
- For MVP dual-role behavior, use:
        - `User.role = USER`
        - `Profile.mentorship_mode = BOTH`

## 7) Common Errors and Meaning
- `404` at `/`: normal (root route not defined).
- `Invalid email or password`: user not seeded or password not set.
- `You must be an authenticated user to access this resource.`:
    token missing/invalid OR seeded user role was not `USER`/`ADMIN`.
- `python: command not found` locally: use Docker commands above; no local Python required.
