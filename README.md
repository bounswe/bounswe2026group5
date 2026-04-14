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

1. Create an environment file at repository root:

```bash
cp .env.example .env
```

Windows PowerShell alternative:

```powershell
Copy-Item .env.example .env
```

2. Review and update required values in `.env`:

- `SECRET_KEY`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `VITE_API_BASE_URL`
- `ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`

3. For production-like usage, set:

- `DEBUG=False`
- `AUTH_COOKIE_SECURE=True`

## Quick Start (First Run Order)

Follow this order on a fresh machine:

1. Create `.env` from `.env.example` and set required values.
2. Start containers:

```bash
docker compose up --build -d
```

3. Run backend migrations:

```bash
docker compose exec backend python manage.py migrate
```

4. Verify services:

- Frontend: `http://localhost:3000`
- API: `http://localhost:8000`

5. (Optional) Start mobile app using the steps in "Run Mobile App Separately".

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

1. Make sure API is running (preferred):

```bash
docker compose up -d backend db
```

2. Install mobile dependencies:

```bash
cd mobile
npm install
```

3. Configure mobile API base URL with `mobile/.env.local`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Use your machine IP instead of `127.0.0.1` when testing on a physical device.

Example for physical device on same Wi-Fi:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.23:8000
```

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

1. Set mobile API URL in `mobile/.env.local`:

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

## Documentation

- [Wiki Home Page](https://github.com/bounswe/bounswe2026group5/wiki)
- [Project Standards and Workflow](https://github.com/bounswe/bounswe2026group5/wiki/Project-Standards-&-Workflow)
- [Knowledge Base](https://github.com/bounswe/bounswe2026group5/wiki/Knowledge-Base)

## Team

Developed and maintained by Boğaziçi University Software Engineering Team (Group 5).
