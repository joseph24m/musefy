import { Router } from 'express';
import { getArtistTopTracks, getArtistInfo, getSimilarArtists, getSimilarArtistsWithInfo } from '../services/lastfm';
import { searchYouTube } from '../services/youtube';
import { requireAuth } from '../middleware/auth';

const router = Router();

const tracksCache = new Map<string, { data: unknown; exp: number }>();
const ytCache     = new Map<string, { data: unknown; exp: number }>();
const simCache    = new Map<string, { data: unknown; exp: number }>();
const latestCache = new Map<string, { data: unknown; exp: number }>();
const radioCache  = new Map<string, { data: unknown; exp: number }>();

// GET /api/artist/info?q=Artist+Name
router.get('/info', requireAuth, async (req, res) => {
  const q = (req.query.q as string ?? '').trim();
  if (!q) return res.status(400).json({ error: 'q richiesto' });
  try {
    const info = await getArtistInfo(q);
    res.json(info ?? {});
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/artist/tracks?q=Artist+Name
router.get('/tracks', requireAuth, async (req, res) => {
  const q = (req.query.q as string ?? '').trim();
  if (!q) return res.status(400).json({ error: 'q richiesto' });
  const key = q.toLowerCase();
  const cached = tracksCache.get(key);
  if (cached && cached.exp > Date.now()) return res.json(cached.data);
  try {
    const tracks = await getArtistTopTracks(q, 50);
    tracksCache.set(key, { data: tracks, exp: Date.now() + 3600_000 });
    res.json(tracks);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/artist/resolve?artist=X&track=Y
router.get('/resolve', requireAuth, async (req, res) => {
  const artist = (req.query.artist as string ?? '').trim();
  const track  = (req.query.track  as string ?? '').trim();
  if (!artist || !track) return res.status(400).json({ error: 'artist e track richiesti' });
  const key = `${artist}::${track}`.toLowerCase();
  const cached = ytCache.get(key);
  if (cached && cached.exp > Date.now()) return res.json(cached.data);
  try {
    const results = await searchYouTube(`${artist} - ${track} official`);
    const artistLower = artist.toLowerCase();
    const trackLower  = track.toLowerCase();
    const best = results.find((r) =>
      r.channel.toLowerCase().includes(artistLower) && r.title.toLowerCase().includes(trackLower)
    ) ?? results.find((r) => r.title.toLowerCase().includes(trackLower)) ?? results[0];
    const payload = best
      ? { id: best.id, title: best.title, channel: best.channel, thumbnail: best.thumbnail, duration: best.duration }
      : null;
    if (payload) ytCache.set(key, { data: payload, exp: Date.now() + 4 * 3600_000 });
    res.json(payload ?? { error: 'Non trovato' });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/artist/similar?q=Artist+Name — similar artists with image
router.get('/similar', requireAuth, async (req, res) => {
  const q = (req.query.q as string ?? '').trim();
  if (!q) return res.status(400).json({ error: 'q richiesto' });
  const key = q.toLowerCase();
  const cached = simCache.get(key);
  if (cached && cached.exp > Date.now()) return res.json(cached.data);
  try {
    const artists = await getSimilarArtistsWithInfo(q, 10);
    simCache.set(key, { data: artists, exp: Date.now() + 2 * 3600_000 });
    res.json(artists);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/artist/latest?artist=X — latest YouTube videos for artist
router.get('/latest', requireAuth, async (req, res) => {
  const artist = (req.query.artist as string ?? '').trim();
  if (!artist) return res.status(400).json({ error: 'artist richiesto' });
  const key = artist.toLowerCase();
  const cached = latestCache.get(key);
  if (cached && cached.exp > Date.now()) return res.json(cached.data);
  try {
    const results = await searchYouTube(`${artist} official`, 10);
    const filtered = results.filter((r) => r.duration > 60 && r.duration < 600);
    latestCache.set(key, { data: filtered, exp: Date.now() + 3600_000 });
    res.json(filtered);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/radio?artist=X — radio seed: similar artists top tracks
router.get('/radio', requireAuth, async (req, res) => {
  const artist = (req.query.artist as string ?? '').trim();
  if (!artist) return res.status(400).json({ error: 'artist richiesto' });
  const key = artist.toLowerCase();
  const cached = radioCache.get(key);
  if (cached && cached.exp > Date.now()) return res.json(cached.data);
  try {
    const similar = await getSimilarArtists(artist, 8);
    const all = [artist, ...similar];
    const trackSets = await Promise.allSettled(all.map((a) => getArtistTopTracks(a, 5)));
    const pool: { name: string; artist: string }[] = [];
    trackSets.forEach((r) => {
      if (r.status === 'fulfilled') r.value.forEach((t) => pool.push({ name: t.name, artist: t.artist }));
    });
    const shuffled = pool.sort(() => Math.random() - 0.5);
    radioCache.set(key, { data: shuffled, exp: Date.now() + 2 * 3600_000 });
    res.json(shuffled);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
