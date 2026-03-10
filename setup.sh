#!/bin/bash

echo "========================================================"
echo "Campus Neighborhood Mentorship Network - Kurulum Başlıyor"
echo "========================================================"

echo "[1/3] Veritabanı (PostgreSQL) Docker üzerinde ayağa kaldırılıyor..."
docker-compose up -d

echo "[2/3] Backend (Django) sanal ortamı ve bağımlılıkları kuruluyor..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
cd ..

echo "[3/3] Frontend (React/Vite) paketleri kuruluyor..."
cd web
npm install
cd ..

echo "========================================================"
echo "✅ Kurulum Başarıyla Tamamlandı!"
echo "Ortamı başlatmak için README.md dosyasındaki adımları izleyin."
echo "========================================================"