# Campus Neighborhood Mentorship Network

![Status](https://img.shields.io/badge/status-active-success.svg)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Django](https://img.shields.io/badge/Django-092E20?style=flat&logo=django&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=flat&logo=docker&logoColor=white)

## About

Campus Neighborhood Mentorship Network connects students for mentorship, matching, and scheduling.
This monorepo includes:

- Web frontend (React + TypeScript)
- Backend API (Django + DRF)
- Mobile app (Expo + React Native)
- PostgreSQL database

## Production Runtime Stack

- Frontend (Web): React, TypeScript, Vite
- Backend: Python, Django, Django REST Framework
- Database: PostgreSQL
- Containerization: Docker, Docker Compose

## Prerequisites

- Docker Desktop (running)
- Node.js 18+ (required to run mobile app locally)

## Environment Configuration

Create a root `.env` file from `.env.example`:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Update values in `.env` before deployment, especially:

- `SECRET_KEY`
- `POSTGRES_PASSWORD`
- `DEBUG` (set to `False` for production)
- `ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`

## Run the Application with Docker Compose

This starts database, backend API, and web frontend.

### 1. Build and start all services

```bash
docker compose up --build -d
```

### 2. Verify running services

```bash
docker compose ps
```

### 3. Access services

- Web frontend: http://localhost:3000
- Backend API: http://localhost:8000
- PostgreSQL: localhost:5432

### 4. View logs

```bash
docker compose logs -f
```

### 5. Stop services

```bash
docker compose down
```

### 6. Stop and remove database volume (destructive)

```bash
docker compose down -v
```

## Run Mobile App Separately

The mobile app is not part of Docker Compose and should be run from the `mobile` folder.

### 1. Ensure backend API is running

You can use Docker Compose (recommended):

```bash
docker compose up -d backend db
```

### 2. Configure mobile API URL

Create `mobile/.env.local`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Notes:

- Android emulator usually needs `http://10.0.2.2:8000`
- iOS simulator can use `http://127.0.0.1:8000` or `http://localhost:8000`
- Physical device should use your machine's local network IP (for example `http://192.168.1.20:8000`)

### 3. Install mobile dependencies

```bash
cd mobile
npm install
```

### 4. Start Expo

```bash
npx expo start
```

## Useful Links

- Wiki: https://github.com/bounswe/bounswe2026group5/wiki
- Project Standards & Workflow: https://github.com/bounswe/bounswe2026group5/wiki/Project-Standards-&-Workflow
- Knowledge Base: https://github.com/bounswe/bounswe2026group5/wiki/Knowledge-Base
