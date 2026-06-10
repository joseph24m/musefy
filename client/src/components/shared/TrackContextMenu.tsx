import { createPortal } from 'react-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Track } from '../../services/api';
import { useLibraryStore } from '../../store/libraryStore';
import { usePlayerStore } from '../../store/playerStore';
import { useQuery } from '@tanstack/react-query';
import { startRadio } from '../../hooks/useRadio';

interface Props {
  track: Track;
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

export default function TrackContextMenu({ track, onClose }: Props) {
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [radioLoading, setRadioLoading] = useState(false);

  const { data: friendsData } = useQuery({
    queryKey: ['friends'],
    queryFn: () => apiFetch('/api/friends'),
    staleTime: 60_000,
  });
  const friends: { id: string; username: string; friendshipId: string }[] = Array.isArray(friendsData) ? friendsData : (friendsData?.friends ?? []);

  async function sendToFriend(friendId: string, friendUsername: string) {
    try {
      await apiFetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          receiver_id: friendId,
          track_id: track.id,
          track_title: track.title,
          track_channel: track.channel,
          track_thumbnail: track.thumbnail,
          track_duration: track.duration,
        }),
      });
      setSentTo(friendUsername);
      setTimeout(onClose, 1200);
    } catch { /* silent */ }
  }

  const isFav = useLibraryStore((s) => s.isFavorite(track.id));
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);
  const playlists = useLibraryStore((s) => s.playlists);
  const addToPlaylist = useLibraryStore((s) => s.addToPlaylist);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const setTrack = usePlayerStore((s) => s.setTrack);
  const toggleRadioMode = usePlayerStore((s) => s.toggleRadioMode);

  async function handleStartRadio() {
    setRadioLoading(true);
    try {
      const radioQueue = await startRadio(track);
      toggleRadioMode();
      setTrack(track, radioQueue);
    } finally {
      setRadioLoading(false);
      onClose();
    }
  }
  const followArtist = useLibraryStore((s) => s.followArtist);
  const unfollowArtist = useLibraryStore((s) => s.unfollowArtist);
  const isFollowing = useLibraryStore((s) => s.isFollowingArtist(track.channel));
  const recentlyPlayed = useLibraryStore((s) => s.recentlyPlayed);
  const removeFromRecentlyPlayed = useLibraryStore((s) => s.removeFromRecentlyPlayed);
  const isRecent = recentlyPlayed.some((t) => t.id === track.id);

  const artistId = track.channel;

  function handle(action: () => void) {
    action();
    onClose();
  }

  return createPortal(
    <>
    <motion.div
      className="fixed inset-0 z-[999] flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => { if (info.offset.y > 100) onClose(); }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="relative w-full max-w-lg bg-surface rounded-t-3xl px-4 pt-3 pb-10 z-10"
        >
          <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />

          {/* Track info */}
          <div className="flex items-center gap-3 mb-5 px-1">
            <img src={track.thumbnail} alt={track.title} className="w-12 h-12 rounded-xl object-cover" />
            <div className="min-w-0">
              <p className="text-text-pri font-semibold text-sm truncate">{track.title}</p>
              <p className="text-text-sec text-xs truncate">{track.channel}</p>
            </div>
          </div>

          <div className="space-y-1">
            {/* Favorite */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => handle(() => toggleFavorite(track))}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl active:bg-surface-2 text-left"
            >
              <svg className={`w-5 h-5 ${isFav ? 'text-accent-alt' : 'text-text-sec'}`} fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-text-pri text-sm font-medium">
                {isFav ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
              </span>
            </motion.button>

            {/* Follow artist */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => handle(() => isFollowing
                ? unfollowArtist(artistId)
                : followArtist({ id: artistId, name: track.channel, thumbnail: track.thumbnail })
              )}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl active:bg-surface-2 text-left"
            >
              <svg className={`w-5 h-5 ${isFollowing ? 'text-accent' : 'text-text-sec'}`} fill={isFollowing ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-text-pri text-sm font-medium">
                {isFollowing ? 'Non seguire più' : 'Segui artista'}
              </span>
            </motion.button>

            {/* Send to friend */}
            {friends.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowFriendPicker(true)}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl active:bg-surface-2 text-left"
              >
                <svg className="w-5 h-5 text-text-sec" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
                <span className="text-text-pri text-sm font-medium">Invia ad un amico</span>
              </motion.button>
            )}

            {/* Remove from recently played */}
            {isRecent && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => handle(() => removeFromRecentlyPlayed(track.id))}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl active:bg-surface-2 text-left"
              >
                <svg className="w-5 h-5 text-text-sec" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6" />
                </svg>
                <span className="text-text-pri text-sm font-medium">Rimuovi dai recenti</span>
              </motion.button>
            )}

            {/* Add to queue */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => handle(() => addToQueue(track))}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl active:bg-surface-2 text-left"
            >
              <svg className="w-5 h-5 text-text-sec" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-text-pri text-sm font-medium">Aggiungi alla coda</span>
            </motion.button>

            {/* Start radio */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={radioLoading}
              onClick={handleStartRadio}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl active:bg-surface-2 text-left disabled:opacity-50"
            >
              {radioLoading ? (
                <svg className="w-5 h-5 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5 text-text-sec" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/>
                </svg>
              )}
              <span className="text-text-pri text-sm font-medium">Avvia radio</span>
            </motion.button>

            {/* Add to playlist */}
            {playlists.length > 0 && (
              <>
                <div className="px-4 pt-3 pb-1">
                  <p className="text-text-ter text-xs font-medium uppercase tracking-wide">Aggiungi a playlist</p>
                </div>
                {playlists.map((pl) => {
                  const alreadyIn = pl.tracks.some((t) => t.id === track.id);
                  return (
                    <motion.button
                      key={pl.id}
                      whileTap={{ scale: 0.97 }}
                      disabled={alreadyIn}
                      onClick={() => handle(() => addToPlaylist(pl.id, track))}
                      className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl active:bg-surface-2 text-left disabled:opacity-40"
                    >
                      {pl.cover ? (
                        <img src={pl.cover} alt={pl.name} className="w-9 h-9 rounded-lg object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center">
                          <svg className="w-4 h-4 text-text-ter" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-text-pri text-sm font-medium truncate">{pl.name}</p>
                        <p className="text-text-ter text-xs">{pl.tracks.length} brani</p>
                      </div>
                      {alreadyIn && <span className="text-accent text-xs">Già aggiunto</span>}
                    </motion.button>
                  );
                })}
              </>
            )}

            {playlists.length === 0 && (
              <div className="px-4 py-3">
                <p className="text-text-ter text-xs">Nessuna playlist. Creane una nella Libreria.</p>
              </div>
            )}
          </div>
        </motion.div>
    </motion.div>

    {/* Friend picker sheet */}
    <AnimatePresence>
      {showFriendPicker && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-end justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowFriendPicker(false)} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full max-w-lg bg-surface rounded-t-3xl px-4 pt-3 pb-10 z-10"
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
            <p className="text-text-pri font-semibold text-base mb-1 px-1">Invia a</p>
            <p className="text-text-ter text-xs mb-4 px-1 truncate">{track.title}</p>

            {sentTo ? (
              <div className="flex flex-col items-center py-6 gap-2">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <p className="text-text-pri text-sm font-medium">Inviato a {sentTo}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {friends.map((f) => (
                  <motion.button
                    key={f.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => sendToFriend(f.id, f.username)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl active:bg-surface-2 text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm flex-shrink-0">
                      {f.username[0].toUpperCase()}
                    </div>
                    <span className="text-text-pri text-sm font-medium">{f.username}</span>
                    <svg className="w-4 h-4 text-text-ter ml-auto" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                    </svg>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    </>,
    document.body
  );
}
