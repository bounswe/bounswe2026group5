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
docker cp backend/scripts_seed_demo.py mentorship_backend:/tmp/scripts_seed_demo.py
docker exec mentorship_backend python manage.py shell -c "exec(open('/tmp/scripts_seed_demo.py').read())"
```

This seeds realistic demo personas and data:
- Mert Yilmaz (mentor+mentee profile mode)
- Emma Wilson, Azra Demir, Jack Turner
- Expertise fields and profile expertise entries
- Availability slots for Mert
- 3 mentorship requests sent to Mert with realistic English/Turkish messages

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
