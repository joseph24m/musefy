import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();
const supabase = supabaseAdmin;

// GET /api/messages/inbox
router.get('/inbox', requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:sender_id(id, username, avatar_url)')
    .eq('receiver_id', userId)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ messages: data ?? [] });
});

// GET /api/messages/sent
router.get('/sent', requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { data, error } = await supabase
    .from('messages')
    .select('*, receiver:receiver_id(id, username, avatar_url)')
    .eq('sender_id', userId)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ messages: data ?? [] });
});

// GET /api/messages/unread-count
router.get('/unread-count', requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .eq('read', false);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ count: count ?? 0 });
});

// POST /api/messages
router.post('/', requireAuth, async (req: any, res) => {
  const senderId = req.user.id;
  const { receiver_id, message_type = 'track', track_id, track_title, track_channel, track_thumbnail, track_duration, playlist_name, playlist_tracks } = req.body;
  if (!receiver_id) return res.status(400).json({ error: 'Dati mancanti' });

  const payload: Record<string, unknown> = { sender_id: senderId, receiver_id, message_type };
  if (message_type === 'playlist') {
    if (!playlist_name) return res.status(400).json({ error: 'Dati mancanti' });
    payload.playlist_name = playlist_name;
    payload.playlist_tracks = playlist_tracks ?? [];
    payload.track_thumbnail = playlist_tracks?.[0]?.thumbnail ?? '';
  } else {
    if (!track_id) return res.status(400).json({ error: 'Dati mancanti' });
    payload.track_id = track_id;
    payload.track_title = track_title;
    payload.track_channel = track_channel;
    payload.track_thumbnail = track_thumbnail;
    payload.track_duration = track_duration ?? 0;
  }

  const { data, error } = await supabase.from('messages').insert(payload).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: data });
});

// PATCH /api/messages/read-all
router.patch('/read-all', requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { sender_id } = req.body;
  const query = supabase.from('messages').update({ read: true }).eq('receiver_id', userId);
  if (sender_id) query.eq('sender_id', sender_id);
  const { error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// PATCH /api/messages/:id/read
router.patch('/:id/read', requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { error } = await supabase.from('messages').update({ read: true }).eq('id', req.params.id).eq('receiver_id', userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// PATCH /api/messages/:id/react — add emoji reaction (receiver only)
router.patch('/:id/react', requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const { reaction } = req.body;
  const VALID = ['❤️', '🔥', '😮', '😂', '👎'];
  if (!VALID.includes(reaction)) return res.status(400).json({ error: 'Reazione non valida' });
  const { error } = await supabase.from('messages').update({ reaction }).eq('id', req.params.id).eq('receiver_id', userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

export default router;
