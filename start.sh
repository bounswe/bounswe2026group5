#!/bin/bash
echo "=========================================="
echo "🚀 Geliştirme Ortamı Başlatılıyor..."
echo "=========================================="

echo "[1/2] Veritabanı (PostgreSQL) Docker üzerinde ayağa kaldırılıyor..."
docker compose up -d || docker-compose up -d

echo ""
echo "[2/2] Backend sanal ortamı (venv) aktif ediliyor..."
echo "Not: Sanal ortamda kalmak için bu scripti 'source ./start.sh' şeklinde çalıştırın."
cd backend
source venv/bin/activate
exec $SHELL