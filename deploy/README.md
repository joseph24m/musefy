# Guida al Deploy — Muse YouTube Music PWA

Guida completa per deployare Muse su un VPS Ubuntu 22.04 (Aruba) con Nginx, PM2 e Cloudflare.

---

## Prerequisiti

- Accesso SSH al tuo VPS Aruba (es. `ssh root@YOUR_VPS_IP`)
- Ubuntu 22.04 LTS installato
- Un dominio configurato su Cloudflare (es. `muse.tuodominio.com`)
- Il progetto Muse (cartella locale)

---

## 1. Setup iniziale del VPS

Connettiti al VPS come root e aggiorna i pacchetti di sistema:

```bash
ssh root@YOUR_VPS_IP

apt update && apt upgrade -y
apt install -y curl git ufw
```

### Crea un utente non-root `muse`

Per sicurezza, non eseguire mai l'app come root. Crea un utente dedicato:

```bash
adduser muse
# Inserisci una password sicura quando richiesto

usermod -aG sudo muse
```

### Configura il firewall

```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

Da questo punto in poi, lavora come utente `muse`:

```bash
su - muse
```

---

## 2. Installare Node.js 20

Usa il repository ufficiale NodeSource per installare Node.js 20 LTS:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verifica l'installazione
node --version   # deve mostrare v20.x.x
npm --version
```

---

## 3. Installare PM2 e tsx

PM2 mantiene il server Node.js sempre in esecuzione (anche dopo riavvii del VPS). `tsx` permette di eseguire TypeScript direttamente senza compilazione:

```bash
sudo npm install -g pm2 tsx

# Verifica
pm2 --version
tsx --version
```

---

## 4. Installare Nginx

Nginx fa da reverse proxy: riceve le richieste HTTPS dall'esterno e le smista tra i file statici del frontend e il server Express del backend:

```bash
sudo apt install -y nginx

# Avvia Nginx e abilitalo all'avvio automatico
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 5. Installare Certbot (SSL gratuito Let's Encrypt)

> **Nota Cloudflare:** Se usi la modalità SSL "Full (Strict)" su Cloudflare, hai bisogno di un certificato valido sul VPS. Certbot lo gestisce automaticamente.

```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## 6. Installare yt-dlp e ffmpeg

Il backend usa `yt-dlp` per estrarre gli stream audio da YouTube, e `ffmpeg` per eventuali conversioni:

```bash
sudo apt install -y python3 python3-pip ffmpeg
sudo pip3 install yt-dlp

# Verifica
yt-dlp --version
ffmpeg -version
```

---

## 7. Caricare il progetto sul VPS

### Opzione A — rsync (consigliato, esegui dal tuo computer locale)

Usa lo script `deploy/upload.sh` dal tuo computer locale (Mac/Linux/WSL):

```bash
chmod +x deploy/upload.sh
./deploy/upload.sh muse@YOUR_VPS_IP
```

### Opzione B — Git clone

Se hai il progetto su GitHub, clonalo direttamente sul VPS:

```bash
# Sul VPS, come utente muse
cd /home/muse
git clone https://github.com/TUOUTENTE/muse.git muse
cd muse
```

---

## 8. Installare le dipendenze Node.js

```bash
cd /home/muse/muse

# Dipendenze del frontend
npm install --prefix client

# Dipendenze del backend
npm install --prefix server
```

---

## 9. Creare il file `.env` di produzione

Il server legge le variabili d'ambiente da un file `.env` nella cartella `server/`:

```bash
nano /home/muse/muse/server/.env
```

Inserisci il seguente contenuto, sostituendo i valori con i tuoi:

```env
# Ambiente
NODE_ENV=production
PORT=3001

# CORS — domini autorizzati ad accedere all'API
# Separati da virgola se hai piu domini
ALLOWED_ORIGINS=https://muse.tuodominio.com

# Supabase (se usi autenticazione/database)
SUPABASE_URL=https://XXXXXXXXXXXXXXXX.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# JWT secret per i token di sessione
JWT_SECRET=una_stringa_casuale_molto_lunga_e_sicura
```

> **Sicurezza:** Non committare mai il file `.env` su Git. Il file `.gitignore` dovrebbe gia escluderlo.

---

## 10. Build del frontend

Compila il frontend React/Vite in file statici ottimizzati:

```bash
npm run build --prefix client
```

I file compilati vengono generati in `client/dist/`. Nginx li servira direttamente.

---

## 11. Configurare Nginx

Copia il file di configurazione Nginx nella cartella appropriata:

```bash
sudo cp /home/muse/muse/deploy/nginx.conf /etc/nginx/sites-available/muse

# Apri il file e sostituisci "yourdomain.com" con il tuo dominio reale
sudo nano /etc/nginx/sites-available/muse

# Abilita il sito (crea un symlink)
sudo ln -s /etc/nginx/sites-available/muse /etc/nginx/sites-enabled/muse

# Rimuovi la configurazione di default (opzionale ma consigliato)
sudo rm -f /etc/nginx/sites-enabled/default

# Testa la configurazione
sudo nginx -t

# Ricarica Nginx
sudo systemctl reload nginx
```

---

## 12. Certificato SSL con Certbot

Ottieni e installa automaticamente il certificato SSL per il tuo dominio:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot modifichera automaticamente il file Nginx per gestire HTTPS (porta 443) e il redirect da HTTP.

Per il rinnovo automatico (gia configurato da Certbot, verifica che funzioni):

```bash
sudo certbot renew --dry-run
```

---

## 13. Avviare il server con PM2

Crea la cartella per i log e avvia il server:

```bash
mkdir -p /home/muse/logs

# Copia il file di configurazione PM2
cp /home/muse/muse/deploy/ecosystem.config.js /home/muse/muse/ecosystem.config.js

# Avvia il server
cd /home/muse/muse
pm2 start ecosystem.config.js

# Salva la lista dei processi (per il riavvio automatico dopo reboot)
pm2 save

# Configura PM2 per avviarsi automaticamente al boot del sistema
pm2 startup
# Esegui il comando che PM2 ti mostra (inizia con "sudo env PATH=...")
```

### Comandi PM2 utili

```bash
pm2 status              # stato dei processi
pm2 logs muse-server    # log in tempo reale
pm2 restart muse-server # riavvia il server
pm2 stop muse-server    # ferma il server
```

---

## 14. Configurazione Cloudflare

Accedi alla dashboard Cloudflare per il tuo dominio e segui questi passaggi:

### DNS

1. Vai su **DNS > Records**
2. Aggiungi (o modifica) un record **A**:
   - **Name:** `@` (o il sottodominio, es. `muse`)
   - **IPv4 address:** `YOUR_VPS_IP`
   - **Proxy status:** Arancione (Proxied) — attivo

### SSL/TLS

1. Vai su **SSL/TLS > Overview**
2. Imposta la modalita su **Full** (o **Full (Strict)** se hai Certbot installato)

> Non usare "Flexible" — causerebbe loop di redirect tra Cloudflare e Nginx.

### Cache (opzionale ma consigliato)

1. Vai su **Caching > Cache Rules**
2. Crea una regola per i file statici:
   - **When:** `URI Path matches regex` → `\.(js|css|png|jpg|svg|ico|woff2)$`
   - **Then:** Cache Level = Cache Everything, Edge TTL = 1 month

### Sicurezza

1. Vai su **Security > Settings**
2. Imposta **Security Level** su "Medium"
3. Abilita **Bot Fight Mode**

---

## 15. Aggiornare le impostazioni Supabase

Se usi Supabase per l'autenticazione, devi aggiungere il dominio di produzione:

1. Vai su [app.supabase.com](https://app.supabase.com) e apri il tuo progetto
2. **Authentication > URL Configuration**:
   - **Site URL:** `https://muse.tuodominio.com`
   - **Redirect URLs:** aggiungi `https://muse.tuodominio.com/**`
3. **Settings > API > CORS**:
   - Aggiungi `https://muse.tuodominio.com` alla lista dei domini consentiti

---

## 16. Deploy degli aggiornamenti

Ogni volta che vuoi aggiornare l'app in produzione, usa lo script `deploy/update.sh`:

```bash
# Sul VPS, come utente muse
cd /home/muse/muse
bash deploy/update.sh
```

Oppure eseguilo tramite SSH dal tuo computer locale:

```bash
ssh muse@YOUR_VPS_IP "cd /home/muse/muse && bash deploy/update.sh"
```

---

## Verifica finale

Dopo il deploy, controlla che tutto funzioni:

```bash
# Stato del server Node.js
pm2 status

# Log del server (cerca errori)
pm2 logs muse-server --lines 50

# Stato Nginx
sudo systemctl status nginx

# Test dell'API
curl https://muse.tuodominio.com/api/search?q=test
```

Apri il browser e visita `https://muse.tuodominio.com` — dovresti vedere l'app Muse funzionante.

---

## Struttura finale sul VPS

```
/home/muse/
├── muse/                    # cartella del progetto
│   ├── client/
│   │   └── dist/            # frontend compilato (servito da Nginx)
│   ├── server/
│   │   ├── src/
│   │   └── .env             # variabili d'ambiente (NON su Git)
│   ├── deploy/
│   │   ├── nginx.conf
│   │   ├── ecosystem.config.js
│   │   ├── setup.sh
│   │   └── update.sh
│   └── ecosystem.config.js  # usato da PM2
└── logs/
    ├── out.log              # log stdout del server
    └── err.log              # log errori del server
```

---

## Risoluzione problemi comuni

| Problema | Soluzione |
|---|---|
| `502 Bad Gateway` | Il server Node.js non e in esecuzione — controlla `pm2 status` e `pm2 logs` |
| `ERR_SSL_PROTOCOL_ERROR` | Controlla la modalita SSL su Cloudflare (deve essere "Full", non "Flexible") |
| `CORS error` nel browser | Verifica che `ALLOWED_ORIGINS` nel `.env` contenga il dominio esatto |
| `yt-dlp: command not found` | Esegui `sudo pip3 install yt-dlp` e riavvia il server con `pm2 restart muse-server` |
| Pagina bianca dopo il build | Controlla `client/dist/` esiste e che Nginx punti al percorso corretto |
| PM2 non si avvia al reboot | Riesegui `pm2 startup` e copia il comando che mostra |
