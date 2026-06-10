import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import type { Playlist } from '../../store/libraryStore';

interface Props {
  playlist: Playlist;
  onClose: () => void;
}

async function apiFetch(url: string, opts?: RequestInit) {
  const { supabase } = await import('../../lib/supabase');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? '';
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts?.headers },
  });
  if (!res.ok) throw new Error('Errore');
  return res.json();
}

export default function PlaylistShareModal({ playlist, onClose }: Props) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const { data: friendsData } = useQuery({
    queryKey: ['friends'],
    queryFn: () => apiFetch('/api/friends'),
    staleTime: 60_000,
  });
  const friends: { id: string; username: string }[] = Array.isArray(friendsData) ? friendsData : (friendsData?.friends ?? []);

  async function sendToFriend(friendId: string, friendUsername: string) {
    setError(null);
    setSending(true);
    try {
      await apiFetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          receiver_id: friendId,
          message_type: 'playlist',
          playlist_name: playlist.name,
          playlist_tracks: playlist.tracks.map((t) => ({
            id: t.id, title: t.title, channel: t.channel,
            thumbnail: t.thumbnail, duration: t.duration,
          })),
        }),
      });
      setSentTo(friendUsername);
      setTimeout(onClose, 1400);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Errore sconosciuto');
    } finally {
      setSending(false);
    }
  }

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[999] flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        drag="y" dragConstraints={{ top: 0 }} dragElastic={0.2}
        onDragEnd={(_, info) => { if (info.offset.y > 100) onClose(); }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-w-lg bg-surface rounded-t-3xl px-4 pt-3 pb-10 z-10"
      >
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 px-1">
          {playlist.cover ? (
            <img src={playlist.cover} alt={playlist.name} className="w-12 h-12 rounded-xl object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center">
              <svg className="w-6 h-6 text-text-ter" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-text-pri font-semibold text-sm truncate">{playlist.name}</p>
            <p className="text-text-ter text-xs">{playlist.tracks.length} brani</p>
          </div>
        </div>

        {sentTo ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <p className="text-text-pri text-sm font-medium">Inviata a {sentTo}</p>
          </div>
        ) : friends.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-2 text-text-ter">
            <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm font-medium">Nessun amico</p>
            <p className="text-xs text-center px-8">Aggiungi amici dal tuo profilo per condividere playlist</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-text-ter text-xs font-medium uppercase tracking-wide px-1 mb-3">Invia a</p>
            {error && <p className="text-accent-alt text-xs px-1 mb-2">{error}</p>}
            {friends.map((f) => (
              <motion.button
                key={f.id}
                whileTap={{ scale: 0.97 }}
                disabled={sending}
                onClick={() => sendToFriend(f.id, f.username)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl active:bg-surface-2 text-left disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm flex-shrink-0">
                  {f.username[0].toUpperCase()}
                </div>
                <span className="text-text-pri text-sm font-medium flex-1">{f.username}</span>
                <svg className="w-4 h-4 text-text-ter" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body
  );
}
