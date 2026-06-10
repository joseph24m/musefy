import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePlayerStore } from '../store/playerStore';
import { useLibraryStore } from '../store/libraryStore';

const API = '/api';

type Tab = 'friends' | 'requests' | 'search' | 'inbox' | 'sent';

interface Profile { id: string; username: string; avatar_url?: string }
interface Friend extends Profile { friendshipId: string }
interface FriendRequest { id: string; created_at: string; requester: Profile }
interface FavoriteTrack {
  track_id: string; title: string; channel: string;
  thumbnail: string; duration: number;
}

interface Message {
  id: string;
  sender_id: string;
  message_type?: string;
  // track
  track_id?: string;
  track_title?: string;
  track_channel?: string;
  track_thumbnail?: string;
  track_duration?: number;
  // playlist
  playlist_name?: string;
  playlist_tracks?: { id: string; title: string; channel: string; thumbnail: string; duration: number }[];
  reaction?: string;
  read: boolean;
  created_at: string;
  sender: { id: string; username: string; avatar_url?: string } | null;
}

async function apiFetch(url: string, opts?: RequestInit) {
  const { supabase } = await import('../lib/supabase');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? '';
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Errore');
  }
  return res.json();
}

function Avatar({ profile, size = 10 }: { profile: Profile; size?: number }) {
  const initial = (profile.username ?? '?')[0].toUpperCase();
  return profile.avatar_url ? (
    <img src={profile.avatar_url} alt={profile.username} className={`w-${size} h-${size} rounded-full object-cover`} />
  ) : (
    <div className={`w-${size} h-${size} rounded-full bg-accent flex items-center justify-center text-bg font-bold text-sm`}>
      {initial}
    </div>
  );
}

function FriendFavorites({ friend, onClose }: { friend: Friend; onClose: () => void }) {
  const { data: favs = [], isLoading } = useQuery<FavoriteTrack[]>({
    queryKey: ['friend-favorites', friend.id],
    queryFn: () => apiFetch(`${API}/friends/${friend.id}/favorites`),
  });
  const setTrack = usePlayerStore((s) => s.setTrack);

  function playTrack(_t: FavoriteTrack, idx: number) {
    const queue = favs.map((f) => ({
      id: f.track_id, title: f.title, channel: f.channel,
      thumbnail: f.thumbnail, duration: f.duration, type: 'song' as const,
    }));
    setTrack(queue[idx], queue);
  }

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-0 bg-bg z-50 flex flex-col"
    >
      <div className="flex items-center gap-3 px-4 pt-safe pb-3 border-b border-border">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="text-text-sec p-2 -ml-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>
        <Avatar profile={friend} size={8} />
        <div>
          <p className="text-text-pri font-semibold">{friend.username}</p>
          <p className="text-text-ter text-xs">Preferiti condivisi</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-14 h-14 bg-surface-2 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-surface-2 rounded w-3/4" />
                  <div className="h-3 bg-surface-2 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!isLoading && favs.length === 0 && (
          <p className="text-text-ter text-sm text-center mt-16">Nessun preferito condiviso</p>
        )}
        <div className="space-y-1">
          {favs.map((f, idx) => (
            <motion.button
              key={f.track_id}
              whileTap={{ scale: 0.97 }}
              onClick={() => playTrack(f, idx)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl active:bg-surface-2 text-left"
            >
              <img src={f.thumbnail} alt={f.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-text-pri text-sm font-medium truncate">{f.title}</p>
                <p className="text-text-sec text-xs truncate">{f.channel}</p>
              </div>
              <svg className="w-5 h-5 text-text-ter ml-auto flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

const EMOJIS = ['❤️', '🔥', '😮', '😂', '👎'];

function InboxView() {
  const setTrack = usePlayerStore((s) => s.setTrack);
  const saveSharedPlaylist = useLibraryStore((s) => s.saveSharedPlaylist);
  const qc = useQueryClient();
  const [saved, setSaved] = useState<string | null>(null);
  const [reacting, setReacting] = useState<string | null>(null); // message id with emoji picker open

  const reactMutation = useMutation({
    mutationFn: ({ id, reaction }: { id: string; reaction: string }) =>
      apiFetch(`${API}/messages/${id}/react`, { method: 'PATCH', body: JSON.stringify({ reaction }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox'] });
      setReacting(null);
    },
  });

  const { data, isLoading, refetch } = useQuery<Message[]>({
    queryKey: ['inbox'],
    queryFn: async () => {
      const res = await apiFetch(`${API}/messages/inbox`);
      return res.messages ?? [];
    },
    refetchInterval: 30_000,
  });

  const messages = data ?? [];
  const unreadCount = messages.filter((m) => !m.read).length;

  async function handlePlay(msg: Message) {
    if (!msg.read) {
      await apiFetch(`${API}/messages/${msg.id}/read`, { method: 'PATCH' }).catch(() => {});
      qc.invalidateQueries({ queryKey: ['inbox'] });
      qc.invalidateQueries({ queryKey: ['inbox-unread'] });
    }
    if (msg.message_type === 'playlist' && msg.playlist_tracks?.length) {
      const queue = msg.playlist_tracks.map((t) => ({ ...t, type: 'song' as const }));
      setTrack(queue[0], queue);
    } else if (msg.track_id) {
      setTrack({
        id: msg.track_id,
        title: msg.track_title ?? '',
        channel: msg.track_channel ?? '',
        thumbnail: msg.track_thumbnail ?? '',
        duration: msg.track_duration ?? 0,
        type: 'song',
      }, []);
    }
  }

  if (isLoading) return (
    <div className="space-y-3 mt-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse p-3">
          <div className="w-12 h-12 rounded-full bg-surface-2 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-surface-2 rounded w-2/3" />
            <div className="h-3 bg-surface-2 rounded w-1/3" />
          </div>
          <div className="w-14 h-14 rounded-xl bg-surface-2 flex-shrink-0" />
        </div>
      ))}
    </div>
  );

  if (messages.length === 0) return (
    <div className="flex flex-col items-center justify-center mt-20 text-text-ter">
      <svg className="w-14 h-14 mb-3 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
      </svg>
      <p className="text-sm font-medium">Nessuna canzone ricevuta</p>
      <p className="text-xs mt-1 text-center px-8">Quando un amico ti invia un brano, apparirà qui</p>
    </div>
  );

  return (
    <div className="space-y-2 mt-2">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between px-1 mb-3">
          <p className="text-text-ter text-xs">{unreadCount} {unreadCount === 1 ? 'non letto' : 'non letti'}</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={async () => {
              await apiFetch(`${API}/messages/read-all`, { method: 'PATCH', body: JSON.stringify({}) }).catch(() => {});
              refetch();
              qc.invalidateQueries({ queryKey: ['inbox-unread'] });
            }}
            className="text-accent text-xs font-medium"
          >
            Segna tutti come letti
          </motion.button>
        </div>
      )}

      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`rounded-2xl transition-colors ${
            !msg.read ? 'bg-accent/5 border border-accent/15' : 'bg-surface-2'
          }`}
        >
          {/* Main row */}
          <div className="flex items-center gap-3 p-3">
            {/* Sender avatar */}
            <div className="flex-shrink-0">
              {msg.sender?.avatar_url ? (
                <img src={msg.sender.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">
                  {(msg.sender?.username ?? '?')[0].toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-text-sec text-xs font-medium truncate">{msg.sender?.username ?? 'Utente'}</p>
                {!msg.read && <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />}
              </div>
              {msg.message_type === 'playlist' ? (
                <>
                  <p className="text-text-pri text-sm font-semibold truncate mt-0.5">{msg.playlist_name}</p>
                  <p className="text-text-ter text-xs">{msg.playlist_tracks?.length ?? 0} brani · Playlist</p>
                </>
              ) : (
                <>
                  <p className="text-text-pri text-sm font-semibold truncate mt-0.5">{msg.track_title}</p>
                  <p className="text-text-ter text-xs truncate">{msg.track_channel}</p>
                </>
              )}
            </div>

            {/* Thumbnail + play */}
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <motion.div whileTap={{ scale: 0.95 }} onClick={() => handlePlay(msg)} className="relative cursor-pointer">
                {msg.message_type === 'playlist' ? (
                  <div className="w-14 h-14 rounded-xl bg-surface flex items-center justify-center">
                    <svg className="w-6 h-6 text-text-ter" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                ) : (
                  <img src={msg.track_thumbnail} alt={msg.track_title} className="w-14 h-14 rounded-xl object-cover" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </motion.div>
              {/* Save playlist button */}
              {msg.message_type === 'playlist' && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (saved === msg.id) return;
                    saveSharedPlaylist(
                      msg.playlist_name ?? 'Playlist',
                      (msg.playlist_tracks ?? []).map((t) => ({ ...t, type: 'song' as const })),
                      msg.sender?.username ?? 'Amico'
                    );
                    setSaved(msg.id);
                  }}
                  className={`text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors ${
                    saved === msg.id ? 'text-accent bg-accent/10' : 'text-text-ter bg-surface-2 active:bg-surface'
                  }`}
                >
                  {saved === msg.id ? '✓ Salvata' : '+ Salva'}
                </motion.button>
              )}
            </div>
          </div>

          {/* Reaction row — separate from flex items-center, no clipping */}
          <div className="flex items-center justify-between px-3 pb-2.5 -mt-1">
            {msg.reaction ? (
              <span className="text-xl leading-none">{msg.reaction}</span>
            ) : (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setReacting(reacting === msg.id ? null : msg.id)}
                className="text-base leading-none opacity-30 active:opacity-70 select-none"
              >
                ＋ Reagisci
              </motion.button>
            )}
          </div>

          {/* Emoji picker — full-width row, always visible when open */}
          <AnimatePresence>
            {reacting === msg.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex justify-center gap-3 px-3 pb-3">
                  {EMOJIS.map((emoji) => (
                    <motion.button
                      key={emoji}
                      whileTap={{ scale: 0.75 }}
                      onClick={() => reactMutation.mutate({ id: msg.id, reaction: emoji })}
                      disabled={reactMutation.isPending}
                      className="text-2xl leading-none p-1.5 rounded-xl active:bg-surface disabled:opacity-40"
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

interface SentMessage {
  id: string;
  message_type?: string;
  track_id?: string;
  track_title?: string;
  track_channel?: string;
  track_thumbnail?: string;
  playlist_name?: string;
  playlist_tracks?: { id: string; title: string; channel: string; thumbnail: string; duration: number }[];
  reaction?: string;
  created_at: string;
  receiver: { id: string; username: string; avatar_url?: string } | null;
}

function SentView() {
  const setTrack = usePlayerStore((s) => s.setTrack);

  const { data, isLoading } = useQuery<SentMessage[]>({
    queryKey: ['sent-messages'],
    queryFn: async () => {
      const res = await apiFetch(`${API}/messages/sent`);
      return res.messages ?? [];
    },
    refetchInterval: 30_000,
  });

  const messages = data ?? [];

  function handlePlay(msg: SentMessage) {
    if (msg.message_type === 'playlist' && msg.playlist_tracks?.length) {
      const queue = msg.playlist_tracks.map((t) => ({ ...t, type: 'song' as const }));
      setTrack(queue[0], queue);
    } else if (msg.track_id) {
      setTrack({
        id: msg.track_id,
        title: msg.track_title ?? '',
        channel: msg.track_channel ?? '',
        thumbnail: msg.track_thumbnail ?? '',
        duration: 0,
        type: 'song',
      }, []);
    }
  }

  if (isLoading) return (
    <div className="space-y-3 mt-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse p-3">
          <div className="w-12 h-12 rounded-xl bg-surface-2 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-surface-2 rounded w-2/3" />
            <div className="h-3 bg-surface-2 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );

  if (messages.length === 0) return (
    <div className="flex flex-col items-center justify-center mt-20 text-text-ter">
      <svg className="w-14 h-14 mb-3 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
      </svg>
      <p className="text-sm font-medium">Nessun brano inviato</p>
    </div>
  );

  return (
    <div className="space-y-2 mt-2">
      {messages.map((msg) => (
        <div key={msg.id} className="bg-surface-2 rounded-2xl">
          <div className="flex items-center gap-3 p-3">
            {/* Thumbnail */}
            <motion.div whileTap={{ scale: 0.95 }} onClick={() => handlePlay(msg)} className="relative cursor-pointer flex-shrink-0">
              {msg.message_type === 'playlist' ? (
                <div className="w-14 h-14 rounded-xl bg-surface flex items-center justify-center">
                  <svg className="w-6 h-6 text-text-ter" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
              ) : (
                msg.track_thumbnail && <img src={msg.track_thumbnail} alt={msg.track_title} className="w-14 h-14 rounded-xl object-cover" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </motion.div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-text-pri text-sm font-semibold truncate">
                {msg.message_type === 'playlist' ? msg.playlist_name : msg.track_title}
              </p>
              <p className="text-text-ter text-xs truncate">
                {msg.message_type === 'playlist' ? `${msg.playlist_tracks?.length ?? 0} brani` : msg.track_channel}
              </p>
              <p className="text-text-ter text-xs mt-0.5">
                A <span className="text-text-sec">{msg.receiver?.username ?? 'utente'}</span>
              </p>
            </div>

            {/* Reaction badge */}
            <div className="flex-shrink-0 flex flex-col items-center gap-1">
              {msg.reaction ? (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-2xl leading-none">{msg.reaction}</span>
                  <span className="text-text-ter text-[10px]">{msg.receiver?.username}</span>
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center">
                  <span className="text-text-ter text-lg">…</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FriendsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('friends');
  const [searchQ, setSearchQ] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

  const { data: friends = [] } = useQuery<Friend[]>({
    queryKey: ['friends'],
    queryFn: () => apiFetch(`${API}/friends`),
  });

  const { data: requests = [] } = useQuery<FriendRequest[]>({
    queryKey: ['friend-requests'],
    queryFn: () => apiFetch(`${API}/friends/requests`),
  });

  const { data: searchResults = [], isFetching: searching } = useQuery<Profile[]>({
    queryKey: ['user-search', searchQ],
    queryFn: () => searchQ.length >= 2 ? apiFetch(`${API}/users/search?q=${encodeURIComponent(searchQ)}`) : [],
    enabled: searchQ.length >= 2,
  });

  const sendRequest = useMutation({
    mutationFn: (username: string) => apiFetch(`${API}/friends/request`, {
      method: 'POST', body: JSON.stringify({ username }),
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friends'] }),
  });

  const acceptRequest = useMutation({
    mutationFn: (id: string) => apiFetch(`${API}/friends/${id}/accept`, { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends'] });
      qc.invalidateQueries({ queryKey: ['friend-requests'] });
    },
  });

  const rejectRequest = useMutation({
    mutationFn: (id: string) => apiFetch(`${API}/friends/${id}/reject`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friend-requests'] }),
  });

  const removeFriend = useMutation({
    mutationFn: (id: string) => apiFetch(`${API}/friends/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friends'] }),
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['inbox-unread'],
    queryFn: () => apiFetch(`${API}/messages/unread-count`),
    refetchInterval: 30_000,
  });
  const unreadCount = unreadData?.count ?? 0;

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'friends', label: 'Amici' },
    { key: 'inbox', label: 'Ricevuti', badge: unreadCount },
    { key: 'sent', label: 'Inviati' },
    { key: 'requests', label: 'Richieste', badge: requests.length },
    { key: 'search', label: 'Cerca' },
  ];

  return (
    <>
      <div className="pb-36 pt-4 px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="text-text-sec p-2 -ml-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </motion.button>
          <h1 className="text-2xl font-bold text-text-pri">Amici</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map((t) => (
            <motion.button
              key={t.key}
              whileTap={{ scale: 0.97 }}
              onClick={() => setTab(t.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors ${
                tab === t.key ? 'bg-accent text-bg' : 'bg-surface-2 text-text-sec'
              }`}
            >
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-bg/20 text-bg' : 'bg-accent text-bg'}`}>
                  {t.badge}
                </span>
              )}
            </motion.button>
          ))}
        </div>

        {/* Friends list */}
        {tab === 'friends' && (
          <div className="space-y-2">
            {friends.length === 0 && (
              <p className="text-text-ter text-sm text-center mt-12">Nessun amico ancora. Cerca qualcuno!</p>
            )}
            {friends.map((f) => (
              <div key={f.id} className="bg-surface-2 rounded-2xl p-3 flex items-center gap-3">
                <Avatar profile={f} size={11} />
                <div className="flex-1 min-w-0">
                  <p className="text-text-pri font-medium truncate">{f.username}</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedFriend(f)}
                  className="bg-surface px-3 py-1.5 rounded-xl text-xs text-accent font-medium border border-accent/30"
                >
                  Preferiti
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => removeFriend.mutate(f.friendshipId)}
                  className="p-2 text-text-ter"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>
            ))}
          </div>
        )}

        {/* Pending requests */}
        {tab === 'requests' && (
          <div className="space-y-2">
            {requests.length === 0 && (
              <p className="text-text-ter text-sm text-center mt-12">Nessuna richiesta in arrivo</p>
            )}
            {requests.map((r) => (
              <div key={r.id} className="bg-surface-2 rounded-2xl p-3 flex items-center gap-3">
                <Avatar profile={r.requester} size={11} />
                <div className="flex-1 min-w-0">
                  <p className="text-text-pri font-medium truncate">{r.requester.username}</p>
                  <p className="text-text-ter text-xs">vuole essere tuo amico</p>
                </div>
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => acceptRequest.mutate(r.id)}
                    className="bg-accent text-bg px-3 py-1.5 rounded-xl text-xs font-semibold"
                  >
                    Accetta
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => rejectRequest.mutate(r.id)}
                    className="bg-surface text-text-sec px-3 py-1.5 rounded-xl text-xs font-medium border border-border"
                  >
                    Rifiuta
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Inbox */}
        {tab === 'inbox' && <InboxView />}

        {/* Sent */}
        {tab === 'sent' && <SentView />}

        {/* Search users */}
        {tab === 'search' && (
          <div>
            <div className="relative mb-4">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-ter" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
              </svg>
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Cerca per username..."
                className="w-full bg-surface-2 border border-border rounded-2xl pl-10 pr-4 py-3 text-text-pri placeholder-text-ter text-sm outline-none focus:border-accent/60"
              />
              {searching && (
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-text-ter" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
              )}
            </div>

            <div className="space-y-2">
              {searchResults.map((u) => {
                const alreadyFriend = friends.some((f) => f.id === u.id);
                return (
                  <div key={u.id} className="bg-surface-2 rounded-2xl p-3 flex items-center gap-3">
                    <Avatar profile={u} size={11} />
                    <div className="flex-1 min-w-0">
                      <p className="text-text-pri font-medium truncate">{u.username}</p>
                    </div>
                    {alreadyFriend ? (
                      <span className="text-text-ter text-xs px-3 py-1.5">Già amici</span>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => sendRequest.mutate(u.username)}
                        disabled={sendRequest.isPending}
                        className="bg-accent text-bg px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-50"
                      >
                        + Aggiungi
                      </motion.button>
                    )}
                  </div>
                );
              })}
              {sendRequest.isError && (
                <p className="text-accent-alt text-xs text-center mt-2">
                  {(sendRequest.error as Error).message}
                </p>
              )}
              {sendRequest.isSuccess && (
                <p className="text-accent text-xs text-center mt-2">Richiesta inviata!</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Friend favorites overlay */}
      <AnimatePresence>
        {selectedFriend && (
          <FriendFavorites friend={selectedFriend} onClose={() => setSelectedFriend(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
