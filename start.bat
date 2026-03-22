@echo off
echo ==========================================
echo 🚀 Geliştirme Ortamı Başlatılıyor...
echo ==========================================

echo [1/2] Veritabanı (PostgreSQL) Docker üzerinde ayağa kaldırılıyor...
docker compose up -d

echo.
echo [2/2] Backend sanal ortamı (venv) aktif ediliyor...
cd backend
cmd /k "venv\Scripts\activate"