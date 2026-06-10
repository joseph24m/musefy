# Schema: YouTube Music PWA — stile Spotify per iOS

## Obiettivo

Costruire una Progressive Web App (PWA) mobile-first con estetica iOS/Spotify che riproduce audio da YouTube **senza API ufficiali e senza video**, eliminando così le pubblicità video. L'app funziona interamente nel browser, è installabile come app nativa su iPhone tramite "Aggiungi a schermata Home", e usa tecniche di scraping/proxy lato server per estrarre gli stream audio.

---

## Stack tecnico

### Frontend
- **React 18** + **TypeScript**
- **Vite** come bundler
- **Tailwind CSS v3** per lo stile
- **Framer Motion** per le animazioni iOS-like
- **Zustand** per lo state management globale
- **React Query (TanStack Query v5)** per il fetching e caching
- **Workbox** per il Service Worker e le funzionalità PWA

### Backend (Node.js)
- **Express.js** come server HTTP
- **`ytdl-core`** o **`yt-dlp-wrap`** (wrapper Node.js per `yt-dlp`) per estrarre l'URL dello stream audio da un video YouTube
- **`youtubei.js`** (libreria Innertube non ufficiale) per la ricerca, i suggerimenti e i metadati, **senza usare la YouTube Data API v3** (nessuna API key richiesta)
- **CORS** configurato per accettare richieste solo dal frontend
- Nessun database: tutto in memoria o LocalStorage lato client

### PWA
- **`manifest.json`** con `display: standalone`, `theme_color`, icone 192x512px
- Service Worker con **cache-first** per asset statici
- **Media Session API** per i controlli nel lock screen di iOS (play/pause/skip con copertina)

---

## Architettura del progetto

```
/
├── client/                  # React frontend
│   ├── public/
│   │   ├── manifest.json
│   │   └── icons/           # icone PWA (192, 512)
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── BottomNav.tsx
│   │   │   │   ├── MiniPlayer.tsx
│   │   │   │   └── FullscreenPlayer.tsx
│   │   │   ├── search/
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   └── SearchResults.tsx
│   │   │   ├── home/
│   │   │   │   ├── FeaturedSection.tsx
│   │   │   │   └── RecentlyPlayed.tsx
│   │   │   └── shared/
│   │   │       ├── TrackCard.tsx
│   │   │       ├── SkeletonLoader.tsx
│   │   │       └── SwipeHandler.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── SearchPage.tsx
│   │   │   ├── LibraryPage.tsx
│   │   │   └── PlayerPage.tsx
│   │   ├── store/
│   │   │   ├── playerStore.ts   # Zustand: brano corrente, queue, stato play
│   │   │   └── libraryStore.ts  # Zustand: preferiti, cronologia
│   │   ├── hooks/
│   │   │   ├── usePlayer.ts
│   │   │   ├── useSearch.ts
│   │   │   └── useMediaSession.ts
│   │   ├── services/
│   │   │   └── api.ts           # chiamate al backend Express
│   │   └── styles/
│   │       └── globals.css
│   └── vite.config.ts
│
├── server/                  # Express backend
│   ├── index.ts
│   ├── routes/
│   │   ├── search.ts        # GET /api/search?q=...
│   │   ├── stream.ts        # GET /api/stream/:videoId
│   │   └── suggestions.ts   # GET /api/suggestions?q=...
│   └── services/
│       ├── youtube.ts       # youtubei.js — ricerca e metadati
│       └── extractor.ts     # yt-dlp — estrazione URL audio
│
└── package.json             # monorepo semplice (o due package.json separati)
```

---

## Funzionalità da implementare

### 1. Ricerca
- Barra di ricerca in stile iOS con animazione focus (expand da centro)
- Ricerca testi, artisti, album tramite `youtubei.js` Innertube (endpoint `search`)
- Suggerimenti in tempo reale con debounce 300ms (`/api/suggestions`)
- Risultati mostrati come card con: thumbnail, titolo, canale, durata
- Filtri a pill scrollabili orizzontalmente: Tutti · Brani · Album · Artisti

### 2. Riproduzione audio
- **Flusso:** utente clicca track → frontend chiama `GET /api/stream/:videoId` → il server usa `yt-dlp` (o `ytdl-core`) per ottenere l'URL diretto dello stream audio (formato `m4a` o `webm` audio-only) → restituisce l'URL al client → il client assegna l'URL a un elemento `<audio>` HTML nativo
- **Nessun video** viene mai richiesto o riprodotto → zero pre-roll e mid-roll
- Controlli: play/pause, skip avanti/indietro, seek bar con thumb touch-friendly, volume
- Crossfade opzionale tra brani (0–12 secondi, configurabile)
- Gestione errori: se l'URL scade, ritentare automaticamente il fetch

### 3. Coda e playlist
- Queue visualizzata come sheet bottom draggable (Framer Motion drag)
- Riordino brani con drag-and-drop
- Shuffle e repeat (off / repeat one / repeat all)
- "Aggiungi a coda" da qualsiasi punto dell'app

### 4. Player UI — due stati

**Mini Player** (barra in basso, sopra la BottomNav):
- Thumbnail circolare animata che ruota durante la riproduzione
- Titolo + artista con marquee se troppo lungo
- Pulsante play/pause e skip forward
- Tap per espandere al Full Player
- Swipe down per chiudere, swipe up per aprire

**Full Screen Player** (sheet modale che copre l'intera schermata):
- Artwork quadrato con angoli arrotondati, ombra morbida, scalato al 85% della larghezza
- Titolo e artista con font bold/large
- Seek bar con previsualizzazione posizione al touch
- Controlli centrali: shuffle · prev · play/pause · next · repeat
- Icone secondarie in basso: like (cuore), coda, share
- Background: artwork blurrato + overlay scuro (effetto Spotify)
- Animazione di apertura: slide-up con spring physics (Framer Motion)
- Gesto swipe-down per chiudere

### 5. Home Page
- Sezione "Riproduzioni recenti" (da LocalStorage)
- Sezione "Consigliati" (basata sulle recenti, query automatica)
- Layout a griglia 2 colonne per le card
- Pull-to-refresh nativo

### 6. Libreria
- Tab: Preferiti · Playlist · Artisti
- Salvataggio preferiti in LocalStorage (Zustand persist)
- Creazione playlist locali (nome, copertina automatica dal primo brano)
- Importazione playlist YouTube tramite URL (parsing manuale o `youtubei.js`)

### 7. Media Session API
```typescript
// in useMediaSession.ts
navigator.mediaSession.metadata = new MediaMetadata({
  title: track.title,
  artist: track.channel,
  album: '',
  artwork: [{ src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
});
navigator.mediaSession.setActionHandler('play', () => playerStore.play());
navigator.mediaSession.setActionHandler('pause', () => playerStore.pause());
navigator.mediaSession.setActionHandler('nexttrack', () => playerStore.next());
navigator.mediaSession.setActionHandler('previoustrack', () => playerStore.prev());
```
Questo mostra i controlli nella Dynamic Island / lock screen su iOS.

---

## Design system — estetica iOS/Spotify

### Palette
```
--color-bg:         #0A0A0A   /* nero quasi puro */
--color-surface:    #121212   /* card e sheet */
--color-surface-2:  #1C1C1E   /* iOS systemGroupedBackground dark */
--color-accent:     #1DB954   /* verde Spotify */
--color-accent-alt: #FF2D55   /* iOS red per cuori/like */
--color-text-pri:   #FFFFFF
--color-text-sec:   #A8A8A8
--color-text-ter:   #535353
--color-border:     rgba(255,255,255,0.08)
```

### Typography
```
font-family: -apple-system, "SF Pro Display", BlinkMacSystemFont, sans-serif
/* Sfrutta il font di sistema iOS nativo */

--text-xs:    11px / 1.3  /* caption, durata */
--text-sm:    13px / 1.4  /* metadati secondari */
--text-base:  15px / 1.5  /* corpo, elenchi */
--text-lg:    17px / 1.3  /* titoli card — iOS Large Title weight */
--text-xl:    22px / 1.2  /* titolo player */
--text-2xl:   28px / 1.1  /* heading home */
```

### Componenti UI chiave

**Bottom Navigation** — 4 tab (Home, Cerca, Libreria, Profilo):
- Sfondo `--color-surface` con `backdrop-filter: blur(20px)` e bordo top sottile
- Icone SF Symbols via SVG inline (o Heroicons come fallback)
- Tab attivo: icona colorata con `--color-accent` + label visibile
- Safe area bottom: `padding-bottom: env(safe-area-inset-bottom)`

**Track Card**:
- Thumbnail 56×56px con `border-radius: 6px`
- Due righe testo (titolo + artista)
- Pulsante `···` per menu contestuale (Sheet iOS-style)
- Pressed state: `scale(0.97)` con spring, sfondo evidenziato

**Seek Bar**:
- Track height: 4px, thumb: 14px (si ingrandisce a 20px al tocco)
- Colore fill: `--color-accent`
- Aggiornamento ogni 200ms tramite `timeupdate` event
- Touch target minimo 44×44px (linee guida HIG Apple)

**Sheet / Bottom Drawer** (Framer Motion):
```typescript
// drag verso il basso per chiudere
<motion.div
  drag="y"
  dragConstraints={{ top: 0 }}
  dragElastic={0.2}
  onDragEnd={(_, info) => { if (info.offset.y > 150) close() }}
  initial={{ y: '100%' }}
  animate={{ y: 0 }}
  exit={{ y: '100%' }}
  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
/>
```

**Skeleton Loader**:
- Shimmer animation CSS (`background: linear-gradient(...)` animato)
- Stessa geometria del contenuto reale (evita layout shift)

---

## API backend — specifiche endpoint

### `GET /api/search?q={query}&type={all|songs|albums|artists}`
```json
{
  "results": [
    {
      "id": "dQw4w9WgXcQ",
      "title": "Never Gonna Give You Up",
      "channel": "Rick Astley",
      "duration": 213,
      "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      "type": "song"
    }
  ]
}
```

### `GET /api/suggestions?q={query}`
```json
{ "suggestions": ["never gonna give you up", "never gonna let you down"] }
```

### `GET /api/stream/:videoId`
Logica server:
1. Chiama `yt-dlp --format bestaudio[ext=m4a] --get-url https://youtube.com/watch?v={videoId}`
2. Restituisce l'URL diretto (pre-signed) dello stream audio CDN di YouTube
3. Cache in memoria (Map) con TTL 4 ore (gli URL scadono)
```json
{ "url": "https://rr3---sn-xxx.googlevideo.com/videoplayback?...", "expiresAt": 1719000000 }
```
> **Nota:** il client usa l'URL direttamente nell'`<audio src="">`. Non si fa proxy del flusso audio attraverso il server per evitare bandwidth eccessiva.

### `GET /api/playlist?url={youtubePlaylistUrl}`
Parsing della playlist YouTube (lista di videoId + metadati) tramite `youtubei.js`.

---

## Gestione errori e edge case

| Situazione | Comportamento |
|---|---|
| Stream URL scaduto (403) | `onerror` sull'elemento `<audio>` → retry automatico `/api/stream/:id` con forceRefresh |
| Video non disponibile | Toast "Brano non disponibile" + skip al successivo |
| Nessuna connessione | Service Worker serve cache + banner offline |
| `yt-dlp` non installato sul server | Fallback a `ytdl-core` (meno affidabile ma no dipendenza binaria) |
| iOS Safari: autoplay bloccato | Primo play deve essere da interazione utente diretta (tap) |
| Schermata bloccata iOS | Media Session API garantisce controlli; audio continua in background |

---

## Setup e installazione (istruzioni per Claude Code)

### Prerequisiti
- Node.js ≥ 18
- `yt-dlp` installato globalmente: `pip install yt-dlp` (Python) o binary scaricabile
- (opzionale) `ffmpeg` per conversione formato

### Comandi iniziali
```bash
# Struttura monorepo
mkdir youtube-music-app && cd youtube-music-app
npm init -y

# Frontend
npm create vite@latest client -- --template react-ts
cd client && npm install

# Dipendenze frontend
npm install framer-motion zustand @tanstack/react-query tailwindcss autoprefixer postcss

# Backend
cd ../
mkdir server && cd server && npm init -y
npm install express cors youtubei.js yt-dlp-wrap ytdl-core typescript ts-node @types/express @types/cors
```

### `vite.config.ts` — proxy verso il backend in dev
```typescript
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
}
```

### `manifest.json`
```json
{
  "name": "Muse",
  "short_name": "Muse",
  "description": "La tua musica da YouTube, senza interruzioni",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0A0A0A",
  "theme_color": "#0A0A0A",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

---

## Note legali e di uso

- L'app è per uso **personale e non commerciale**.
- Non bypassa tecnicamente la crittografia di YouTube ma usa URL pubblicamente accessibili restituiti dall'API interna di YouTube (Innertube).
- Non redistribuire i contenuti audio né usare l'app per scopi commerciali.
- Verificare sempre i Terms of Service di YouTube prima del deployment pubblico.

---

## Priorità di sviluppo (ordine suggerito per Claude Code)

1. **Server Express** con endpoint `/api/stream` funzionante (verificare con curl)
2. **Player core**: elemento `<audio>`, store Zustand, controlli base
3. **Ricerca**: endpoint backend + UI SearchPage
4. **Full Screen Player** con animazioni Framer Motion
5. **Mini Player** persistente
6. **Home Page** con recenti e suggerimenti
7. **Media Session API** (controlli lock screen)
8. **PWA**: manifest, Service Worker, icone
9. **Libreria**: preferiti e playlist locali
10. **Polish**: skeleton loaders, gestione errori, toast, haptic feedback (Vibration API)
