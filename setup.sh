#!/bin/bash

echo "========================================================"
echo "Campus Neighborhood Mentorship Network - Kurulum Başlıyor"
echo "========================================================"

echo "[0/4] Sistem gereksinimleri kontrol ediliyor..."

OS="$(uname -s)"

if [ "$OS" = "Darwin" ]; then
    # Mac (Homebrew kullanılarak)
    if ! command -v brew &> /dev/null; then
        echo "Homebrew bulunamadı. Kuruluyor..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    if ! command -v python3 &> /dev/null; then echo "Python kuruluyor..."; brew install python@3.11; fi
    if ! command -v node &> /dev/null; then echo "Node.js kuruluyor..."; brew install node@18; fi
    if ! command -v docker &> /dev/null; then echo "Docker kuruluyor..."; brew install --cask docker; open /Applications/Docker.app; sleep 15; fi

elif [ "$(expr substr $OS 1 5)" = "Linux" ]; then
    # Linux (Apt/Debian tabanlı sistemler varsayılarak)
    if ! command -v python3 &> /dev/null; then echo "Python kuruluyor..."; sudo apt update && sudo apt install -y python3 python3-venv python3-pip; fi
    if ! command -v node &> /dev/null; then echo "Node.js kuruluyor..."; curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install -y nodejs; fi
    if ! command -v docker &> /dev/null; then echo "Docker kuruluyor..."; sudo apt update && sudo apt install -y docker.io docker-compose; sudo systemctl start docker; sudo systemctl enable docker; fi
fi

echo "[OK] Temel gereksinimler sağlandı."
echo ""

echo "[1/4] Ortam değişkenleri (.env) ayarlanıyor..."
if [ ! -f "backend/.env" ]; then
    echo "Backend .env dosyası oluşturuluyor..."
    cp backend/.env.example backend/.env
fi
if [ ! -f "web/.env" ]; then
    echo "Frontend .env dosyası oluşturuluyor..."
    cp web/.env.example web/.env
fi

echo ""
echo "[2/4] Veritabanı (PostgreSQL) Docker üzerinde ayağa kaldırılıyor..."
docker-compose up -d

echo ""
echo "[3/4] Backend (Django) sanal ortamı ve bağımlılıkları kuruluyor..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
cd ..

echo ""
echo "[4/4] Frontend (React/Vite) paketleri kuruluyor..."
cd web
npm install
cd ..

echo "========================================================"
echo "✅ Kurulum Başarıyla Tamamlandı!"
echo "Ortamı başlatmak için README.md dosyasındaki adımları izleyin."
echo "========================================================"