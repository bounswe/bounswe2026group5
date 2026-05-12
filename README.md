# Campus Neighborhood Mentorship Network

![Status](https://img.shields.io/badge/status-active-success.svg)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![TanStack Router](https://img.shields.io/badge/TanStack_Router-FF4154?style=flat)
![Django](https://img.shields.io/badge/Django-092E20?style=flat&logo=django&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=flat&logo=docker&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-000020?style=flat&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=flat&logo=react&logoColor=61DAFB)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat&logo=vitest&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-C21325?style=flat&logo=jest&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat&logo=githubactions&logoColor=white)

## About

Campus Neighborhood Mentorship Network connects students for academic and professional mentorship. This repository contains:

- Web client (React + TypeScript)
- Backend API (Django + DRF)
- Mobile app (Expo + React Native)
- PostgreSQL database

This README is intentionally production-focused. Detailed contributor workflows are maintained in the project wiki.

**Live**: [neighborship.app](https://neighborship.app)

## Deployment Prerequisites

- Docker Desktop and Docker Compose
- Node.js 18+ (required for mobile app)

## Environment Configuration

Create all three environment files from the provided examples:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp mobile/.env.example mobile/.env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item backend\.env.example backend\.env
Copy-Item mobile\.env.example mobile\.env
```

The default values in the example files work out of the box for local development. You do **not** need to set any third-party credentials (Firebase, Google OAuth, SMTP) — see [Third-Party Services & Fallback Behaviors](#third-party-services--fallback-behaviors).

For production, update the following before deploying:

- `SECRET_KEY` — replace with a long random string
- `POSTGRES_PASSWORD` — set a strong database password
- `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` — set to your domain / or localhost
- `DEBUG=False`
- `AUTH_COOKIE_SECURE=True`

## Quick Start (First Run Order)

Follow this order on a fresh machine:

1. Copy all environment files (see [Environment Configuration](#environment-configuration) above).

2. Start containers:

```bash
docker compose up --build -d
```

3. (Optional) Run backend migrations (creates database tables and seeds the admin account): (This is the optional)

```bash
docker compose exec backend python manage.py migrate
```

4. Seed demo data — populates 50 mentors, 120 mentees, communities, sessions, and posts: (This is handled automatically by migrations)

```bash
docker compose exec backend python scripts_seed_demo.py
```

5. Verify services:

- Frontend: `http://localhost:3000`
- API: `http://localhost:8000`

6. Log in with the default admin account: `admin@test.com` / `AdminPass123!`

7. (Optional) Start mobile app using the steps in "Run Mobile App Separately".

## Default Credentials

The following accounts are ready to use after running the setup steps above.

### Admin Account (created by `migrate`)

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@test.com` | `AdminPass123!` |

Access the web UI at `http://localhost:3000` or the Django admin panel at `http://localhost:8000/admin/`.

### Demo Accounts (created by `scripts_seed_demo.py`)

| Role | Email | Password |
| :--- | :--- | :--- |
| **Mentor** | `deniz-arman@neighborship.local` | `deniz-arman-2026!` |
| **Mentee** | `mehmet-ali-ozdemir@neighborship.local` | `mehmet-ali-ozdemir-2026!` |
| **Mentor (backup)** | `goksel-deniz-celik@neighborship.local` | `goksel-deniz-celik-2026!` |

> Email verification is disabled by default (`REQUIRE_EMAIL_VERIFICATION=False`). All accounts are immediately active.

## Run with Docker Compose (Web + API + DB)

From repository root:

```bash
docker compose up --build -d
```

| Services | URL                   |
| -------- | --------------------- |
| Frontend | http://localhost:3000 |
| API      | http://localhost:8000 |
| Database | localhost:5432        |

Useful commands:

```bash
# show container status
docker compose ps

# stream logs
docker compose logs -f

# stop services
docker compose down
```

## Run Mobile App Separately

The mobile app is not started by Docker Compose. Run it independently while backend services are available.

1. Make sure the API is running:

```bash
docker compose up -d backend db
```

2. Install mobile dependencies:

```bash
cd mobile
npm install
```

3. Set the API base URL in `mobile/.env` (already copied from `.env.example`):

| Target | Value |
| :----- | :---- |
| Android emulator | `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000` |
| iOS simulator | `EXPO_PUBLIC_API_BASE_URL=http://localhost:8000` |
| Physical device (Wi-Fi) | `EXPO_PUBLIC_API_BASE_URL=http://<YOUR_MACHINE_IP>:8000` |

For physical device testing, also add your machine IP to the root `.env`:

```bash
ALLOWED_HOSTS=localhost,127.0.0.1,<YOUR_MACHINE_IP>
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://<YOUR_MACHINE_IP>:8081
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://<YOUR_MACHINE_IP>:8081
```

Find your IP with `hostname -I` (macOS/Linux) or `ipconfig` (Windows).

4. Start Expo:

```bash
npx expo start
```

## Migrations

Run backend migrations locally:

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

Run migrations in Docker:

```bash
docker compose exec backend python manage.py migrate
```

## Tests

Backend tests:

```bash
docker compose exec backend python manage.py test
```

Web tests:

```bash
docker compose exec frontend npm ci
docker compose exec frontend npm run test
```

Mobile tests:

```bash
cd mobile
npm ci
npm run test
```

## APK Build (Android)

### Local arm64 APK build

1. Set mobile API URL in `mobile/.env`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://your-api-host:8000
```

2. Build APK:

```bash
cd mobile
npm run apk:arm64
```

Output APK:

```text
mobile/android/app/build/outputs/apk/release/app-release.apk
```

### EAS Build (Expo Application Services)

To build the APK without `google-services.json`:

1. **Modify `mobile/app.json`:** Ensure the line `"googleServicesFile": "./google-services.json"` is commented out (this has been done in the current repo state).

2. **Development Build:**
    ```bash
    cd mobile
    eas build --profile development --platform android --local
    ```

3. **Production APK Build:**
    ```bash
    cd mobile
    eas build --profile production_apk --platform android --local
    ```

> [!TIP]
> **APK vs AAB:** By default, the `production` profile produces an `.aab` file for the Play Store. To get an installable `.apk` file for testing on your phone, use the `production_apk` profile.

### Manual Build (Android SDK & Gradle)

If you have the Android SDK and JDK (17+) installed locally:

1. **Prebuild:** Ensure the `android/` directory is generated:
    ```bash
    cd mobile
    npx expo prebuild
    ```

2. **Build with Gradle:**
    ```bash
    cd mobile/android
    ./gradlew assembleRelease
    ```
    *Note: Use `gradlew.bat` on Windows.*

3. **Output APK:**
    `mobile/android/app/build/outputs/apk/release/app-release.apk`

### GitHub Actions APK workflow

Workflow file:

```text
.github/workflows/mobile-apk.yml
```

What it does:

- validates `EXPO_PUBLIC_API_BASE_URL` secret
- runs Expo prebuild for Android
- builds arm64 debug APK
- uploads artifact

Required GitHub secret:

- `EXPO_PUBLIC_API_BASE_URL` (must start with `http://` or `https://`)

## Third-Party Services & Fallback Behaviors

The project integrates several third-party services. To ensure the application remains functional for evaluators and assistants without these credentials, we have implemented the following graceful fallbacks:

| Service | Primary Feature | Fallback Behavior |
| :--- | :--- | :--- |
| **Firebase Firestore** | Real-time Messaging | **2-second HTTP Polling** (Automatically detected) |
| **Firebase Cloud Messaging** | Push Notifications | **10-second HTTP Polling** (Automatically detected) |
| **Google Cloud Storage** | Media Hosting | **Local Filesystem Storage** (Stored in `backend/media/`) |
| **SMTP Server** | Email Verification | **Console Logging** (Links printed to backend terminal/logs) |
| **Google OAuth 2.0** | Social Login | **Disabled** (Evaluators should use Email/Password login) |

### 1. Environment Setup for Fallback Mode

If sensitive credential files are removed, follow these steps to use the fallback mode:

1.  **Copy Environment Examples:**
    -   Root: `cp .env.example .env`
    -   Backend: `cp backend/.env.example backend/.env`
    -   Mobile: `cp mobile/.env.example mobile/.env`

    > [!TIP]
    > **For Physical Device Testing:** If you are testing the mobile app on a physical device, you must use your machine's local IP address instead of `localhost`.
    > - Find your IP: Run `hostname -I` or `ifconfig` (Linux/macOS) or `ipconfig` (Windows).
    > - Update Root `.env`: Add your IP to `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, and `CSRF_TRUSTED_ORIGINS`.
    > - Update Mobile `.env`: Set `EXPO_PUBLIC_API_BASE_URL=http://<YOUR_IP>:8000`.

2.  **Leave Credentials Empty:**
    In the created `.env` files, keep the following sections empty or with their default values:
    -   `VITE_FIREBASE_*` / `EXPO_PUBLIC_FIREBASE_*`
    -   `VITE_GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_ID`
    -   `GS_BUCKET_NAME` (Ensure this is empty to use local media storage)
    -   `EMAIL_BACKEND` (Set to `django.core.mail.backends.console.EmailBackend`)

### 2. Email & Verification Logic

The system handles email verification based on the `REQUIRE_EMAIL_VERIFICATION` flag in `backend/.env`:

-   **If `REQUIRE_EMAIL_VERIFICATION=False` (Default for Fallback):**
    -   New users are created as **automatically verified**.
    -   Email sending is **skipped** upon registration to reduce console noise.
    -   Email sending remains **active** for the "Forgot Password" feature.
-   **If `REQUIRE_EMAIL_VERIFICATION=True`:**
    -   Users must click the link in the verification email to activate their account's verified status.
    -   Access to protected features (e.g., mentorship requests, community posts) will be blocked with a "Please verify your email" message until verification is complete.

> [!IMPORTANT]
> **Forgot Password Console Logs:** To prevent "User Enumeration" attacks, the system always returns a `200 OK` response even if the email does not exist in the database. If you click "Forgot Password" and do **not** see an email in the backend console, double-check for typos in the email address or ensure the user is registered and active.

### 3. Testing the Web UI

1. Start the project: `docker compose up --build`
2. Access `http://localhost:3000`.
3. Log in with the default admin account: `admin@test.com` / `AdminPass123!`.

## Documentation

- [Wiki Home Page](https://github.com/bounswe/bounswe2026group5/wiki)
- [Project Standards and Workflow](https://github.com/bounswe/bounswe2026group5/wiki/Project-Standards-&-Workflow)
- [Knowledge Base](https://github.com/bounswe/bounswe2026group5/wiki/Knowledge-Base)

## Team

Developed and maintained by Boğaziçi University Software Engineering Team (Group 5).