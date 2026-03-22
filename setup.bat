@echo off
echo ========================================================
echo Campus Neighborhood Mentorship Network - Kurulum Basliyor
echo ========================================================

echo [0/4] Sistem gereksinimleri kontrol ediliyor...

:: Python Kontrolu ve Kurulumu
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Python bulunamadi. Winget ile kuruluyor...
    winget install -e --id Python.Python.3.11 --accept-package-agreements --accept-source-agreements
    echo Lutfen terminali kapatip yeniden acin ve scripti tekrar calistirin.
    pause
    exit
) ELSE (
    echo [OK] Python kurulu.
)

:: Node.js Kontrolu ve Kurulumu
node --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Node.js bulunamadi. Winget ile kuruluyor...
    winget install -e --id OpenJS.NodeJS --accept-package-agreements --accept-source-agreements
    echo Lutfen terminali kapatip yeniden acin ve scripti tekrar calistirin.
    pause
    exit
) ELSE (
    echo [OK] Node.js kurulu.
)

:: Docker Kontrolu ve Kurulumu
docker --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Docker bulunamadi. Winget ile Docker Desktop kuruluyor...
    winget install -e --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements
    echo UYARI: Docker kurulumu sonrasi bilgisayarinizi YENIDEN BASLATMANIZ ve Docker Desktop'i acmaniz gerekebilir!
    pause
    exit
) ELSE (
    echo [OK] Docker kurulu.
)

echo.
echo [1/4] Ortam degiskenleri (.env) ayarlaniyor...
if not exist "backend\.env" (
    echo Backend .env dosyasi olusturuluyor...
    copy backend\.env.example backend\.env
)
if not exist "web\.env" (
    echo Frontend .env dosyasi olusturuluyor...
    copy web\.env.example web\.env
)

echo.
echo [2/4] Veritabani (PostgreSQL) Docker uzerinde ayaga kaldiriliyor...
docker-compose up -d

echo.
echo [3/4] Backend (Django) sanal ortami ve bagimliliklari kuruluyor...
cd backend
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
cd ..

echo.
echo [4/4] Frontend (React/Vite) paketleri kuruluyor...
cd web
call npm install
cd ..

echo ========================================================
echo Kurulum Basariyla Tamamlandi!
echo Ortami baslatmak icin README.md dosyasindaki adimlari izleyin.
echo ========================================================
pause