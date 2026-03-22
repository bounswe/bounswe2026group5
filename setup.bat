@echo off
echo ========================================================
echo Campus Neighborhood Mentorship Network - Setup Starting
echo ========================================================

echo [0/4] Checking system requirements...

:: Python check and install
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Python not found. Installing via Winget...
    winget install -e --id Python.Python.3.12 --accept-package-agreements --accept-source-agreements
    echo Please close and reopen the terminal, then run this script again.
    pause
    exit
) ELSE (
    echo [OK] Python is installed.
)

:: Node.js check and install
node --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Node.js not found. Installing via Winget...
    winget install -e --id OpenJS.NodeJS --accept-package-agreements --accept-source-agreements
    echo Please close and reopen the terminal, then run this script again.
    pause
    exit
) ELSE (
    echo [OK] Node.js is installed.
)

:: Docker check and install
docker --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Docker not found. Installing Docker Desktop via Winget...
    winget install -e --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements
    echo WARNING: After Docker installation, you may need to restart your computer and open Docker Desktop.
    pause
    exit
) ELSE (
    echo [OK] Docker is installed.
)

echo.
echo [1/4] Configuring environment variables (.env)...
if not exist ".env" (
    echo Creating root .env file from .env.example...
    copy .env.example .env
)

echo.
echo [2/4] Starting database (PostgreSQL) with Docker...
docker-compose up -d

echo.
echo [3/4] Setting up backend (Django) virtual environment and dependencies...
cd backend
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
cd ..

echo.
echo [4/4] Installing frontend (React/Vite) packages...
cd web
call npm install
cd ..

echo ========================================================
echo Setup completed successfully!
echo Follow the steps in README.md to start the environment.
echo ========================================================
pause