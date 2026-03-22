#!/bin/bash

echo "========================================================"
echo "Campus Neighborhood Mentorship Network - Setup Starting"
echo "========================================================"

echo "[0/4] Checking system requirements..."

OS="$(uname -s)"

if [ "$OS" = "Darwin" ]; then
    # Mac (using Homebrew)
    if ! command -v brew &> /dev/null; then
        echo "Homebrew not found. Installing..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    if ! command -v python3 &> /dev/null; then echo "Installing Python..."; brew install python@3.12; fi
    if ! command -v node &> /dev/null; then echo "Installing Node.js..."; brew install node@18; fi
    if ! command -v docker &> /dev/null; then echo "Installing Docker..."; brew install --cask docker; open /Applications/Docker.app; sleep 15; fi

elif [ "$(expr substr $OS 1 5)" = "Linux" ]; then
    # Linux (assuming Apt/Debian-based systems)
    if ! command -v python3 &> /dev/null; then echo "Installing Python..."; sudo apt update && sudo apt install -y python3 python3-venv python3-pip; fi
    if ! command -v node &> /dev/null; then echo "Installing Node.js..."; curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install -y nodejs; fi
    if ! command -v docker &> /dev/null; then echo "Installing Docker..."; sudo apt update && sudo apt install -y docker.io docker-compose; sudo systemctl start docker; sudo systemctl enable docker; fi
fi

echo "[OK] Core requirements are ready."
echo ""

echo "[1/4] Configuring environment variables (.env)..."
if [ ! -f ".env" ]; then
    echo "Creating root .env file from .env.example..."
    cp .env.example .env
fi

echo ""
echo "[2/4] Starting database (PostgreSQL) with Docker..."
sudo docker compose up -d || sudo docker-compose up -d

echo ""
echo "[3/4] Setting up backend (Django) virtual environment and dependencies..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
cd ..

echo ""
echo "[4/4] Installing frontend (React/Vite) packages..."
cd web
npm install
cd ..

echo "========================================================"
echo "✅ Setup completed successfully!"
echo "Follow the steps in README.md to start the environment."
echo "========================================================"