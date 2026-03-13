#!/bin/bash
echo "=========================================="
echo "🚀 Starting Development Environment..."
echo "=========================================="

echo "[1/3] Starting database (PostgreSQL) with Docker..."
docker compose up -d || docker-compose up -d

echo ""
echo "[2/3] Synchronizing database schema (migrate)..."
cd backend
source venv/bin/activate
python manage.py migrate

echo ""
echo "[3/3] Activating backend virtual environment (venv)..."
echo "Note: To stay inside the virtual environment, run this script as 'source ./start.sh'."
exec $SHELL