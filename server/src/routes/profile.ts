import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/profile — own profile
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user!.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PUT /api/profile — update username/avatar
router.put('/', requireAuth, async (req, res) => {
  const { username, avatar_url } = req.body as { username?: string; avatar_url?: string };
  const updates: Record<string, string> = {};
  if (username !== undefined) updates.username = username.trim();
  if (avatar_url !== undefined) updates.avatar_url = avatar_url;

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', req.user!.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/profile/:userId — public profile
router.get('/:userId', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, username, avatar_url, created_at')
      .eq('id', req.params.userId)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Profile not found' });
    res.json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
