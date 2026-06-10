#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo -e "${BLUE}"
echo "================================================"
echo "  Muse — Setup VPS Ubuntu 22.04"
echo "================================================"
echo -e "${NC}"

# Ensure running as root or with sudo
if [ "$EUID" -ne 0 ]; then
  error "Esegui questo script come root: sudo bash setup.sh"
fi

# 1. Update system
info "Aggiornamento pacchetti di sistema..."
apt update && apt upgrade -y
apt install -y curl git ufw python3 python3-pip
success "Sistema aggiornato."

# 2. Install Node.js 20 via NodeSource
info "Installazione Node.js 20..."
if ! command -v node &>/dev/null || [[ "$(node --version)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
  success "Node.js $(node --version) installato."
else
  success "Node.js $(node --version) gia presente."
fi

# 3. Install PM2 + tsx globally
info "Installazione PM2 e tsx..."
npm install -g pm2 tsx
success "PM2 $(pm2 --version) e tsx installati."

# 4. Install Nginx
info "Installazione Nginx..."
apt install -y nginx
systemctl start nginx
systemctl enable nginx
success "Nginx installato e avviato."

# 5. Install yt-dlp
info "Installazione yt-dlp..."
pip3 install -U yt-dlp
success "yt-dlp $(yt-dlp --version) installato."

# 6. Install ffmpeg
info "Installazione ffmpeg..."
apt install -y ffmpeg
success "ffmpeg installato."

# 7. Create logs directory
info "Creazione directory logs..."
mkdir -p /home/muse/logs
chown -R muse:muse /home/muse/logs 2>/dev/null || true
success "Directory /home/muse/logs creata."

# 8. Copy nginx config to sites-available
NGINX_CONF_SRC="$(dirname "$0")/nginx.conf"
if [ -f "$NGINX_CONF_SRC" ]; then
  info "Copia configurazione Nginx..."
  cp "$NGINX_CONF_SRC" /etc/nginx/sites-available/muse
  success "nginx.conf copiato in /etc/nginx/sites-available/muse."
else
  warn "File nginx.conf non trovato in $(dirname "$0"). Copia manualmente."
fi

# 9. Enable site (symlink to sites-enabled)
if [ ! -L /etc/nginx/sites-enabled/muse ]; then
  info "Abilitazione sito Nginx..."
  ln -s /etc/nginx/sites-available/muse /etc/nginx/sites-enabled/muse
  success "Sito Nginx abilitato."
fi

# Remove default site if present
if [ -L /etc/nginx/sites-enabled/default ]; then
  rm /etc/nginx/sites-enabled/default
  info "Configurazione default di Nginx rimossa."
fi

# 10. Test nginx config and reload
info "Test configurazione Nginx..."
nginx -t && systemctl reload nginx
success "Nginx ricaricato con successo."

# 11. Configure firewall
info "Configurazione firewall UFW..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
success "Firewall configurato."

# Done
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Setup completato con successo!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${YELLOW}Prossimi passi:${NC}"
echo "  1. Carica il progetto in /home/muse/muse/"
echo "     (usa deploy/upload.sh dal tuo computer locale)"
echo "  2. Installa le dipendenze:"
echo "     npm install --prefix /home/muse/muse/client"
echo "     npm install --prefix /home/muse/muse/server"
echo "  3. Crea il file /home/muse/muse/server/.env"
echo "  4. Compila il frontend:"
echo "     npm run build --prefix /home/muse/muse/client"
echo "  5. Modifica /etc/nginx/sites-available/muse con il tuo dominio"
echo "  6. Ottieni il certificato SSL:"
echo "     certbot --nginx -d joserver.uk -d www.joserver.uk"
echo "  7. Avvia il server:"
echo "     cd /home/muse/muse && pm2 start ecosystem.config.js"
echo "     pm2 save && pm2 startup"
echo ""
