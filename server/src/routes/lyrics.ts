import { Router, Request, Response } from 'express';

const router = Router();

interface LrclibResponse {
  id: number;
  trackName: string;
  artistName: string;
  syncedLyrics: string | null;
  plainLyrics: string | null;
}

const cache = new Map<string, { data: LrclibResponse | null; ts: number }>();
const TTL = 24 * 60 * 60 * 1000; // 24h

router.get('/', async (req: Request, res: Response) => {
  const title = req.query.title as string;
  const artist = req.query.artist as string;
  const duration = req.query.duration as string;

  if (!title || !artist) return res.status(400).json({ error: 'Missing title or artist' });

  const key = `${title}|${artist}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < TTL) {
    return res.json(cached.data);
  }

  try {
    const params = new URLSearchParams({ track_name: title, artist_name: artist });
    if (duration) params.set('duration', duration);

    const response = await fetch(`https://lrclib.net/api/get?${params}`, {
      headers: { 'User-Agent': 'Muse PWA (https://github.com/muse)' },
    });

    if (!response.ok) {
      cache.set(key, { data: null, ts: Date.now() });
      return res.json(null);
    }

    const data: LrclibResponse = await response.json();
    cache.set(key, { data, ts: Date.now() });
    res.json(data);
  } catch (e) {
    console.error('Lyrics fetch error:', e);
    res.json(null);
  }
});

export default router;
