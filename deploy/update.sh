#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }

PROJECT_DIR="/home/muse/muse"

echo -e "${BLUE}"
echo "================================"
echo "  Muse — Deploy aggiornamento"
echo "================================"
echo -e "${NC}"

# 1. cd to project directory
info "Entro nella directory del progetto..."
cd "$PROJECT_DIR"

# 2. git pull origin main
info "Pull ultime modifiche da Git..."
git pull origin main
success "Codice aggiornato."

# 3. npm install --prefix client
info "Aggiornamento dipendenze frontend..."
npm install --prefix client
success "Dipendenze frontend aggiornate."

# 4. npm install --prefix server
info "Aggiornamento dipendenze backend..."
npm install --prefix server
success "Dipendenze backend aggiornate."

# 5. npm run build --prefix client
info "Build del frontend..."
npm run build --prefix client
success "Frontend compilato in client/dist/."

# 6. pm2 restart muse-server
info "Riavvio server con PM2..."
pm2 restart muse-server
success "Server riavviato."

# 7. Done
echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  Deploy completato!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
pm2 status muse-server
