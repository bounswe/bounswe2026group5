# Campus Neighborhood Mentorship Network

![Status](https://img.shields.io/badge/status-active-success.svg)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Django](https://img.shields.io/badge/Django-092E20?style=flat&logo=django&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=flat&logo=docker&logoColor=white)

## 📌 About The Project

Campus Neighborhood Mentorship Network is a platform designed to connect students for academic and professional guidance. Built as a scalable monorepo, this repository houses both the modern, type-safe frontend client and the robust backend API services required to facilitate seamless mentor-mentee matching, communication, and scheduling within the university ecosystem.

## 🚀 Tech Stack

**Frontend (Web):**
- **Core:** React (TypeScript), Vite
- **Routing & State:** TanStack Router, TanStack Query
- **Styling & UI:** TailwindCSS, Shadcn UI
- **Validation:** Zod
- **Testing:** Vitest

**Backend:**
- **Core:** Python, Django
- **API:** Django REST Framework (DRF), drf-spectacular (OpenAPI/Swagger)
- **Database:** PostgreSQL

**Infrastructure & Code Quality:**
- **Containerization:** Docker & Docker Compose
- **Linting & Formatting:** ESLint, Prettier (Frontend) / Flake8, Black, Isort (Backend)
- **Analysis:** SonarQube

## 🧰 Required Tools & Software

To ensure a smooth and standardized development experience across the team, please install the following tools before proceeding with the setup:

**1. Core System Requirements:**
- **[Git](https://git-scm.com/):** Version control system.
- **[Node.js](https://nodejs.org/) (v18+):** Required for the React frontend.
- **[Python](https://www.python.org/downloads/) (3.10+):** Required for the Django backend.
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/):** Must be installed and running in the background to host our PostgreSQL database container.

**2. Recommended IDE & Extensions:**
- **[Visual Studio Code](https://code.visualstudio.com/):** The officially supported IDE for this project.
- _Note on Extensions:_ When you open this repository in VS Code, you will be prompted to install our recommended extensions (ESLint, Prettier, Black, Flake8, and **SonarLint**). Please install them to ensure your code aligns with our auto-formatting and quality standards.

**3. Database Management:**
- **[DBeaver](https://dbeaver.io/) (Community Edition):** Highly recommended for visually managing and querying our local PostgreSQL database. Alternatively, you can use JetBrains DataGrip or pgAdmin.

**4. Browser Extensions (For Accessibility Testing):**
- **[axe DevTools](https://www.deque.com/axe/devtools/):** Chrome/Edge extension to catch WCAG 2.1 AA accessibility issues during UI development.
- **[WAVE](https://wave.webaim.org/extension/):** Visual tool for evaluating structural and color contrast accessibility.

## 🛠 Getting Started

### Quick Setup

Clone the repository and run the setup script corresponding to your operating system. This will automatically initialize the database container, install all dependencies, and run database migrations.

**Windows Users:**
```cmd
.\setup.bat
```

**Mac/Linux Users:**
```bash
chmod +x setup.sh
./setup.sh
```

### 🐳 Docker-based Local Development

The project can be run fully inside Docker for a consistent local development environment across the team. This starts the PostgreSQL database, Django backend, and React frontend in isolated containers with volume mounts enabled for hot-reloading.

**Start all services**
```bash
docker compose up --build
```

**Run in detached mode**
```bash
docker compose up --build -d
```

**Stop all services**
```bash
docker compose down
```

**Stop and remove the database volume**
```bash
docker compose down -v
```

**Service URLs**
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:8000
- **Database:** localhost:5432

**Initial database migration**
Migrations are applied automatically when the backend container starts. If needed, they can also be run manually:
```bash
docker compose exec backend python manage.py migrate
```

**Create new migrations**
```bash
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
```

**Notes**
- Backend source code is mounted into the container for automatic reload during development.
- Frontend source code is mounted into the container and Vite hot-reload is enabled.
- The backend connects to PostgreSQL using the Docker Compose service name db.
- If migration history becomes inconsistent during development, reset the local database volume with:
```bash
docker compose down -v
```

### 💻 Daily Development Workflow

For your day-to-day development after the initial setup, you can start the environment using either the automated VS Code tasks or manually via the terminal.

**Option A: The One-Click Way (VS Code)**
If you are using Visual Studio Code, simply press F5 or go to the "Run and Debug" panel and launch 🚀 Start Full Stack. This will automatically spin up the Docker database, start the frontend, and run the backend with debuggers attached.

**Option B: The Manual Way (Terminal)**
If you prefer managing the services manually, open your terminal and follow these steps:

**1. Start the Database:**
Make sure Docker Desktop is open, then run:
```bash
docker compose up -d
# or
docker-compose up -d
```

**2. Start the Backend (Django):**
Open a terminal, activate the virtual environment, and run the server:
```bash
cd backend
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
python manage.py runserver
```

**3. Start the Frontend (Vite):**
Open a new, separate terminal and start the client:
```bash
cd web
npm run dev
```

### 🔄 Manual Database Migration

If you need to manually synchronize or create migrations, use the commands below.

**Apply existing migrations (recommended before runserver):**
```bash
cd backend
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
python manage.py migrate
```

**Create new migration files after model changes:**
```bash
cd backend
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
python manage.py makemigrations
python manage.py migrate
```

**Create migration for a specific app only (example: accounts):**
```bash
cd backend
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
python manage.py makemigrations accounts
python manage.py migrate
```

### 🗄️ Connecting to the Database

To view, manage, and query the local PostgreSQL database, we recommend using DBeaver (or DataGrip/pgAdmin). Create a new PostgreSQL connection using the following credentials:

- **Host:** 127.0.0.1 (or localhost)
- **Port:** 5432
- **Database:** mentorship
- **Username:** In .env file
- **Password:** In .env file

Note: Ensure the Docker database container is running (docker compose up -d) before attempting to connect.

## 📖 Documentation & Guidelines

To keep this repository clean, all detailed documentation, architectural decisions, and workflows are maintained in our GitHub Wiki. Please review these carefully before opening a Pull Request.

- **[Wiki Home Page](https://github.com/bounswe/bounswe2026group5/wiki):** Main page of this project's wiki.
- **[Project Standards & Workflow](https://github.com/bounswe/bounswe2026group5/wiki/Project-Standards-&-Workflow):** Branching strategies, PR rules, Conventional Commits, and Definition of Done.
- **[Knowledge Base](https://github.com/bounswe/bounswe2026group5/wiki/Knowledge-Base):** Useful resources, setup guides, and technical references for developers.

## 👥 Team

This project is developed and maintained by Boğaziçi University Software Engineering Team (Group 5).