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

## 🛠 Getting Started

To run this project on your local machine, ensure you have **Node.js (v18+)**, **Python (3.10+)**, and **Docker Desktop** installed and running.

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

### Running the Development Servers

Once setup is complete, open two separate terminals to start the environment:

**1. Backend (Django API):**

```bash
cd backend
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
python manage.py runserver

```

**2. Frontend (Vite Client):**

```bash
cd web
npm run dev

```

## 📖 Documentation & Guidelines

To keep this repository clean, all detailed documentation, architectural decisions, and workflows are maintained in our GitHub Wiki. Please review these carefully before opening a Pull Request.

- **[Wiki Home Page](https://github.com/bounswe/bounswe2026group5/wiki):** Main page of this project's wiki.
- **[Project Standards & Workflow](https://github.com/bounswe/bounswe2026group5/wiki/Project-Standards-&-Workflow):** Branching strategies, PR rules, Conventional Commits, and Definition of Done.
- **[Knowledge Base](https://github.com/bounswe/bounswe2026group5/wiki/Knowledge-Base):** Useful resources, setup guides, and technical references for developers.

## 👥 Team

This project is developed and maintained by Boğaziçi University Software Engineering Team (Group 5).
