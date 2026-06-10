import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/favorites
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('favorites')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('added_at', { ascending: false });

    if (error) throw error;
    res.json(data ?? []);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/favorites — add favorite
router.post('/', requireAuth, async (req, res) => {
  const { track_id, title, channel, thumbnail, duration } = req.body as {
    track_id: string;
    title: string;
    channel: string;
    thumbnail: string;
    duration?: number;
  };

  try {
    const { data, error } = await supabaseAdmin
      .from('favorites')
      .upsert({
        user_id: req.user!.id,
        track_id,
        title,
        channel,
        thumbnail,
        duration: duration ?? 0,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /api/favorites/:trackId/share — toggle shared
router.patch('/:trackId/share', requireAuth, async (req, res) => {
  const { shared } = req.body as { shared: boolean };
  try {
    const { data, error } = await supabaseAdmin
      .from('favorites')
      .update({ shared })
      .eq('user_id', req.user!.id)
      .eq('track_id', req.params.trackId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/favorites/:trackId
router.delete('/:trackId', requireAuth, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('favorites')
      .delete()
      .eq('user_id', req.user!.id)
      .eq('track_id', req.params.trackId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
