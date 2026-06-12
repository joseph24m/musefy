import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import searchRouter from './routes/search';
import streamRouter from './routes/stream';
import suggestionsRouter from './routes/suggestions';
import playlistRouter from './routes/playlist';
import lyricsRouter from './routes/lyrics';
import relatedRouter from './routes/related';
import profileRouter from './routes/profile';
import playlistsRouter from './routes/playlists';
import favoritesRouter from './routes/favorites';
import friendsRouter from './routes/friends';
import usersRouter from './routes/users';
import artistRouter from './routes/artist';
import recommendationsRouter from './routes/recommendations';
import chartsRouter from './routes/charts';
import messagesRouter from './routes/messages';
import moodRouter from './routes/mood';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust Cloudflare proxy so rate-limit uses real client IP from X-Forwarded-For
app.set('trust proxy', 1);

// Simple in-memory rate limiter (no external deps)
function makeRateLimiter(maxReq: number, windowMs: number) {
  const counts = new Map<string, { n: number; reset: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || 'unknown';
    const now = Date.now();
    const entry = counts.get(ip);
    if (!entry || now > entry.reset) {
      counts.set(ip, { n: 1, reset: now + windowMs });
      return next();
    }
    entry.n++;
    if (entry.n > maxReq) {
      res.status(429).json({ error: 'Too many requests' });
      return;
    }
    next();
  };
}

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:4173'];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Rate limiting — 200 req/min globale, 30/min su stream
app.use(makeRateLimiter(200, 60_000));
app.use('/api/stream', makeRateLimiter(30, 60_000));

// Existing routes
app.use('/api/search', searchRouter);
app.use('/api/stream', streamRouter);
app.use('/api/suggestions', suggestionsRouter);
app.use('/api/playlist', playlistRouter);
app.use('/api/lyrics', lyricsRouter);
app.use('/api/related', relatedRouter);

// Auth-enabled routes
app.use('/api/profile', profileRouter);
app.use('/api/playlists', playlistsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/friends', friendsRouter);
app.use('/api/users', usersRouter);
app.use('/api/artist', artistRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/charts', chartsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/mood', moodRouter);

const server = app.listen(PORT, () => {
  console.log(`Musefy server running on http://localhost:${PORT}`);
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
