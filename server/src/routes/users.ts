import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/users/search?q=username
router.get('/search', requireAuth, async (req, res) => {
  const q = (req.query.q as string ?? '').trim();
  if (q.length < 2) return res.json([]);

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, username, avatar_url')
      .ilike('username', `%${q}%`)
      .neq('id', req.user!.id)
      .limit(10);

    if (error) throw error;
    res.json(data ?? []);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
