@echo off
echo ========================================================
echo Campus Neighborhood Mentorship Network - Kurulum Basliyor
echo ========================================================

echo [1/3] Veritabani (PostgreSQL) Docker uzerinde ayaga kaldiriliyor...
docker-compose up -d

echo [2/3] Backend (Django) sanal ortami ve bagimliliklari kuruluyor...
cd backend
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
cd ..

echo [3/3] Frontend (React/Vite) paketleri kuruluyor...
cd web
call npm install
cd ..

echo ========================================================
echo Kurulum Basariyla Tamamlandi!
echo Ortami baslatmak icin README.md dosyasindaki adimlari izleyin.
echo ========================================================
pause