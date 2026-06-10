import { Router } from 'express';
import { getTagTopTracks } from '../services/lastfm';
import type { LastfmSearchTrack } from '../services/lastfm';
import { requireAuth } from '../middleware/auth';

const router = Router();

const MOOD_TAGS: Record<string, string> = {
  relax:   'chill',
  focus:   'study',
  workout: 'workout',
  party:   'party',
  sad:     'sad',
  hype:    'hip-hop',
  love:    'romance',
  sleep:   'sleep',
};

const cache = new Map<string, { data: LastfmSearchTrack[]; exp: number }>();

// GET /api/mood?mood=relax
router.get('/', requireAuth, async (req, res) => {
  const mood = ((req.query.mood as string) ?? 'relax').toLowerCase();
  const tag  = MOOD_TAGS[mood] ?? mood;
  const key  = tag;

  const cached = cache.get(key);
  if (cached && cached.exp > Date.now()) return res.json({ tracks: cached.data, mood });

  try {
    const tracks = await getTagTopTracks(tag, 30);
    cache.set(key, { data: tracks, exp: Date.now() + 4 * 3600_000 });
    res.json({ tracks, mood });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
