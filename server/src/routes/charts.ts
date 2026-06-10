import { Router } from 'express';
import { getTopChartTracks, getGeoTopTracks } from '../services/lastfm';
import type { LastfmSearchTrack } from '../services/lastfm';
import { requireAuth } from '../middleware/auth';

const router = Router();

const cache = new Map<string, { data: LastfmSearchTrack[]; exp: number }>();
const TTL = 60 * 60_000; // 1 hour

const SUPPORTED_COUNTRIES: Record<string, string> = {
  global: 'Global',
  italy: 'Italia',
  'united-states': 'USA',
  'united-kingdom': 'UK',
  france: 'Francia',
  germany: 'Germania',
  spain: 'Spagna',
  japan: 'Giappone',
  brazil: 'Brasile',
};

// GET /api/charts/list — returns available charts
router.get('/list', requireAuth, (_req, res) => {
  const list = Object.entries(SUPPORTED_COUNTRIES).map(([id, label]) => ({ id, label }));
  res.json({ charts: list });
});

// GET /api/charts?country=italy&limit=20
router.get('/', requireAuth, async (req, res) => {
  const country = ((req.query.country as string) ?? 'global').toLowerCase();
  const limit = Math.min(50, parseInt(req.query.limit as string ?? '20', 10));
  const key = `${country}:${limit}`;

  const cached = cache.get(key);
  if (cached && cached.exp > Date.now()) return res.json({ tracks: cached.data, country });

  try {
    const tracks = country === 'global'
      ? await getTopChartTracks(limit)
      : await getGeoTopTracks(country, limit);

    cache.set(key, { data: tracks, exp: Date.now() + TTL });
    res.json({ tracks, country });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
