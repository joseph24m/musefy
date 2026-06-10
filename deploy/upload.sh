#!/bin/bash
# Usage: ./deploy/upload.sh user@your-vps-ip
# Uploads the project to the VPS via rsync, then triggers install + build + restart.
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# --- Argument check ---
if [ -z "$1" ]; then
  echo -e "${YELLOW}Uso: $0 user@your-vps-ip${NC}"
  echo "Esempio: $0 muse@123.45.67.89"
  exit 1
fi

VPS_TARGET="$1"
VPS_USER="${VPS_TARGET%%@*}"
VPS_HOST="${VPS_TARGET##*@}"
REMOTE_DIR="/home/${VPS_USER}/muse"

# Detect project root (parent of the deploy/ folder this script lives in)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}"
echo "========================================="
echo "  Muse — Upload progetto su VPS"
echo "========================================="
echo -e "${NC}"
echo "  Sorgente locale : $PROJECT_ROOT"
echo "  Destinazione    : $VPS_TARGET:$REMOTE_DIR"
echo ""

# --- rsync: exclude heavy/sensitive directories ---
info "Sincronizzazione file con rsync..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'client/node_modules' \
  --exclude 'server/node_modules' \
  --exclude 'client/dist' \
  --exclude '.env' \
  --exclude 'server/.env' \
  --exclude '.git' \
  --exclude '*.log' \
  --exclude '.DS_Store' \
  --exclude 'Thumbs.db' \
  "$PROJECT_ROOT/" \
  "$VPS_TARGET:$REMOTE_DIR/"

success "File caricati su $VPS_TARGET:$REMOTE_DIR"

# --- Remote: install deps + build + restart ---
info "Esecuzione installazione e build sul VPS..."
ssh "$VPS_TARGET" bash <<EOF
  set -e

  cd "$REMOTE_DIR"

  echo "[INFO] Installazione dipendenze frontend..."
  npm install --prefix client

  echo "[INFO] Installazione dipendenze backend..."
  npm install --prefix server

  echo "[INFO] Build del frontend..."
  npm run build --prefix client

  # Copy ecosystem config to project root if not present
  if [ ! -f "$REMOTE_DIR/ecosystem.config.js" ]; then
    cp "$REMOTE_DIR/deploy/ecosystem.config.js" "$REMOTE_DIR/ecosystem.config.js"
    echo "[INFO] ecosystem.config.js copiato."
  fi

  # Create logs dir
  mkdir -p /home/${VPS_USER}/logs

  # Restart or start PM2
  if pm2 describe muse-server > /dev/null 2>&1; then
    echo "[INFO] Riavvio server PM2..."
    pm2 restart muse-server
  else
    echo "[INFO] Avvio server PM2 per la prima volta..."
    pm2 start "$REMOTE_DIR/ecosystem.config.js"
    pm2 save
  fi

  echo ""
  echo "========================================="
  echo "  Upload e deploy completati!"
  echo "========================================="
  pm2 status muse-server
EOF

success "Deploy su $VPS_HOST completato con successo."
echo ""
warn "Ricorda:"
echo "  - Crea/aggiorna /home/${VPS_USER}/muse/server/.env sul VPS se non l'hai fatto"
echo "  - Verifica che il dominio in /etc/nginx/sites-available/muse sia corretto"
echo "  - Se e il primo deploy, esegui: certbot --nginx -d joserver.uk -d www.joserver.uk"
