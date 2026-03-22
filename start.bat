@echo off
echo ==========================================
echo 🚀 Starting Development Environment...
echo ==========================================

echo [1/3] Starting database (PostgreSQL) with Docker...
docker compose up -d

echo.
echo [2/3] Synchronizing database schema (migrate)...
cd backend
call venv\Scripts\activate
python manage.py migrate

echo.
echo [3/3] Activating backend virtual environment (venv)...
cmd /k "venv\Scripts\activate"