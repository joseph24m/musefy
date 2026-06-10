import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/friends — accepted friends with profile info
router.get('/', requireAuth, async (req, res) => {
  const uid = req.user!.id;
  try {
    const { data, error } = await supabaseAdmin
      .from('friendships')
      .select(`
        id, status, created_at, requester_id, addressee_id,
        requester:profiles!friendships_requester_id_fkey(id, username, avatar_url),
        addressee:profiles!friendships_addressee_id_fkey(id, username, avatar_url)
      `)
      .eq('status', 'accepted')
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`);

    if (error) throw error;

    const friends = (data ?? []).map((f: any) => {
      const friend = f.requester_id === uid ? f.addressee : f.requester;
      return { friendshipId: f.id, ...friend };
    });

    res.json(friends);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/friends/requests — pending incoming requests
router.get('/requests', requireAuth, async (req, res) => {
  try {
    console.log('[friends/requests] user:', req.user!.id);
    const { data, error } = await supabaseAdmin
      .from('friendships')
      .select(`
        id, created_at,
        requester:profiles!friendships_requester_id_fkey(id, username, avatar_url)
      `)
      .eq('addressee_id', req.user!.id)
      .eq('status', 'pending');

    console.log('[friends/requests] data:', JSON.stringify(data), 'error:', error);
    if (error) throw error;
    res.json(data ?? []);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/friends/request — send request by username
router.post('/request', requireAuth, async (req, res) => {
  const { username } = req.body as { username: string };
  const uid = req.user!.id;
  console.log('[friends/request] from:', uid, 'to username:', username);

  try {
    // Find target user
    const { data: target, error: findError } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .eq('username', username.trim())
      .single();

    console.log('[friends/request] target found:', target, 'findError:', findError);
    if (findError || !target) return res.status(404).json({ error: 'Utente non trovato' });
    if (target.id === uid) return res.status(400).json({ error: 'Non puoi aggiungere te stesso' });

    // Check existing
    const { data: existing } = await supabaseAdmin
      .from('friendships')
      .select('id, status')
      .or(`and(requester_id.eq.${uid},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${uid})`)
      .maybeSingle();

    if (existing) {
      const msg = existing.status === 'accepted' ? 'Siete già amici' : 'Richiesta già inviata';
      return res.status(400).json({ error: msg });
    }

    const { data, error } = await supabaseAdmin
      .from('friendships')
      .insert({ requester_id: uid, addressee_id: target.id })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /api/friends/:id/accept
router.patch('/:id/accept', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', req.params.id)
      .eq('addressee_id', req.user!.id)
      .eq('status', 'pending')
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: 'Richiesta non trovata' });
    res.json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /api/friends/:id/reject
router.patch('/:id/reject', requireAuth, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('friendships')
      .delete()
      .eq('id', req.params.id)
      .eq('addressee_id', req.user!.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/friends/:id — remove friend
router.delete('/:id', requireAuth, async (req, res) => {
  const uid = req.user!.id;
  try {
    const { error } = await supabaseAdmin
      .from('friendships')
      .delete()
      .eq('id', req.params.id)
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/friends/:userId/favorites — shared favorites of a friend
router.get('/:userId/favorites', requireAuth, async (req, res) => {
  const uid = req.user!.id;
  const friendId = req.params.userId;

  try {
    // Verify they are friends
    const { data: friendship } = await supabaseAdmin
      .from('friendships')
      .select('id')
      .eq('status', 'accepted')
      .or(`and(requester_id.eq.${uid},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${uid})`)
      .maybeSingle();

    if (!friendship) return res.status(403).json({ error: 'Non sei amico con questo utente' });

    const { data, error } = await supabaseAdmin
      .from('favorites')
      .select('*')
      .eq('user_id', friendId)
      .eq('shared', true)
      .order('added_at', { ascending: false });

    if (error) throw error;
    res.json(data ?? []);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
