import { Router } from 'express';
import { getSimilarArtists, getArtistTopTracks, getTopChartTracks } from '../services/lastfm';
import type { LastfmSearchTrack } from '../services/lastfm';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Cache the full expanded pool per artist set (not per page)
const poolCache = new Map<string, { data: LastfmSearchTrack[]; exp: number }>();

async function buildPool(artistsParam: string): Promise<LastfmSearchTrack[]> {
  const cached = poolCache.get(artistsParam);
  if (cached && cached.exp > Date.now()) return cached.data;

  const seedArtists = artistsParam.split(',').map((a) => a.trim()).filter(Boolean).slice(0, 4);

  // Get up to 10 similar artists per seed for a large pool
  const similarSets = await Promise.allSettled(
    seedArtists.map((a) => getSimilarArtists(a, 10))
  );

  const similarArtists = new Set<string>();
  seedArtists.forEach((a) => similarArtists.add(a));
  similarSets.forEach((r) => {
    if (r.status === 'fulfilled') r.value.forEach((a) => similarArtists.add(a));
  });

  // Get top 5 tracks per artist
  const artistList = [...similarArtists].slice(0, 30);
  const trackSets = await Promise.allSettled(
    artistList.map((a) => getArtistTopTracks(a, 5))
  );

  const all: LastfmSearchTrack[] = [];
  trackSets.forEach((r) => {
    if (r.status === 'fulfilled') {
      all.push(...r.value.map((t) => ({
        name: t.name,
        artist: t.artist,
        listeners: t.listeners,
        duration: t.duration,
        thumbnail: '',
      })));
    }
  });

  // Shuffle once and cache the full pool (TTL 30 min)
  const pool = all.sort(() => Math.random() - 0.5);
  poolCache.set(artistsParam, { data: pool, exp: Date.now() + 30 * 60_000 });
  return pool;
}

// GET /api/recommendations?artists=A,B&page=1&limit=20
router.get('/', requireAuth, async (req, res) => {
  const artistsParam = (req.query.artists as string ?? '').trim();
  const page = Math.max(1, parseInt(req.query.page as string ?? '1', 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    let pool: LastfmSearchTrack[];

    if (!artistsParam) {
      // No history → charts (always 20, no pagination needed)
      pool = await getTopChartTracks(100);
    } else {
      pool = await buildPool(artistsParam);
    }

    const slice = pool.slice(offset, offset + limit);
    const hasMore = offset + limit < pool.length;
    res.json({ tracks: slice, hasMore, total: pool.length });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
