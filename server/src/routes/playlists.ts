import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/playlists — own + shared playlists
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    const [ownResult, sharedResult] = await Promise.all([
      supabaseAdmin
        .from('playlists')
        .select('*, playlist_tracks(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('shared_playlists')
        .select('can_edit, playlists(*, playlist_tracks(*))')
        .eq('invited_user_id', userId),
    ]);

    const own = ownResult.data ?? [];
    const shared = (sharedResult.data ?? []).map((row) => ({
      ...(row.playlists as object),
      can_edit: row.can_edit,
      is_shared: true,
    }));

    res.json({ own, shared });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/playlists — create
router.post('/', requireAuth, async (req, res) => {
  const { name, cover_url, is_public } = req.body as {
    name: string;
    cover_url?: string;
    is_public?: boolean;
  };

  try {
    const { data, error } = await supabaseAdmin
      .from('playlists')
      .insert({ user_id: req.user!.id, name, cover_url, is_public: is_public ?? false })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/playlists/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('playlists')
      .select('*, playlist_tracks(*)')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Playlist not found' });

    const userId = req.user!.id;
    const isOwner = data.user_id === userId;
    const isPublic = data.is_public;

    if (!isOwner && !isPublic) {
      // Check shared
      const { data: share } = await supabaseAdmin
        .from('shared_playlists')
        .select('id')
        .eq('playlist_id', req.params.id)
        .eq('invited_user_id', userId)
        .single();
      if (!share) return res.status(403).json({ error: 'Access denied' });
    }

    res.json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PUT /api/playlists/:id
router.put('/:id', requireAuth, async (req, res) => {
  const { name, cover_url, is_public } = req.body as {
    name?: string;
    cover_url?: string;
    is_public?: boolean;
  };

  try {
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (cover_url !== undefined) updates.cover_url = cover_url;
    if (is_public !== undefined) updates.is_public = is_public;

    const { data, error } = await supabaseAdmin
      .from('playlists')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Playlist not found or not owned' });
    res.json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/playlists/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('playlists')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/playlists/:id/tracks — add track
router.post('/:id/tracks', requireAuth, async (req, res) => {
  const { track_id, title, channel, thumbnail, duration } = req.body as {
    track_id: string;
    title: string;
    channel: string;
    thumbnail: string;
    duration?: number;
  };

  try {
    // Get current max position
    const { count } = await supabaseAdmin
      .from('playlist_tracks')
      .select('*', { count: 'exact', head: true })
      .eq('playlist_id', req.params.id);

    const { data, error } = await supabaseAdmin
      .from('playlist_tracks')
      .insert({
        playlist_id: req.params.id,
        track_id,
        title,
        channel,
        thumbnail,
        duration: duration ?? 0,
        position: (count ?? 0) + 1,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/playlists/:id/tracks/:trackId
router.delete('/:id/tracks/:trackId', requireAuth, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('playlist_tracks')
      .delete()
      .eq('playlist_id', req.params.id)
      .eq('track_id', req.params.trackId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/playlists/:id/share — invite user by email
router.post('/:id/share', requireAuth, async (req, res) => {
  const { username, can_edit } = req.body as { username: string; can_edit?: boolean };

  try {
    // Verify playlist ownership
    const { data: pl } = await supabaseAdmin
      .from('playlists')
      .select('user_id')
      .eq('id', req.params.id)
      .single();

    if (!pl || pl.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not playlist owner' });
    }

    // Find user by username
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (!profile) return res.status(404).json({ error: 'User not found' });

    const { data, error } = await supabaseAdmin
      .from('shared_playlists')
      .insert({
        playlist_id: req.params.id,
        invited_user_id: profile.id,
        can_edit: can_edit ?? false,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/playlists/:id/share/:userId
router.delete('/:id/share/:userId', requireAuth, async (req, res) => {
  try {
    const { data: pl } = await supabaseAdmin
      .from('playlists')
      .select('user_id')
      .eq('id', req.params.id)
      .single();

    if (!pl || pl.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not playlist owner' });
    }

    await supabaseAdmin
      .from('shared_playlists')
      .delete()
      .eq('playlist_id', req.params.id)
      .eq('invited_user_id', req.params.userId);

    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
