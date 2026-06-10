import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import type { Track } from '../services/api';

import { useLibraryStore } from '../store/libraryStore';
import type { Playlist } from '../store/libraryStore';
import TrackCard from '../components/shared/TrackCard';
import PlaylistShareModal from '../components/shared/PlaylistShareModal';
import { usePlayerStore } from '../store/playerStore';

const TABS = ['Preferiti', 'Playlist', 'Artisti'];

async function authFetch(url: string) {
  const { supabase } = await import('../lib/supabase');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? '';
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Errore fetch');
  return res.json();
}

interface LastfmTrack { name: string; artist: string; duration: number; listeners: number }
interface ArtistInfo { name: string; image: string; bio: string; listeners: number }

function ArtistTrackRow({ track, artist, index, onPlay }: {
  track: LastfmTrack; artist: string; index: number; onPlay: (t: LastfmTrack) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handlePlay() {
    setLoading(true);
    try { await onPlay(track); } finally { setLoading(false); }
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={handlePlay}
      className="w-full flex items-center gap-3 px-4 py-3 active:bg-surface-2 text-left"
    >
      <span className="text-text-ter text-sm w-5 text-center flex-shrink-0">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-text-pri text-sm font-medium truncate">{track.name}</p>
        <p className="text-text-ter text-xs">{(track.listeners ?? 0).toLocaleString('it-IT')} ascoltatori</p>
      </div>
      {loading ? (
        <svg className="w-4 h-4 animate-spin text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
        </svg>
      ) : (
        <svg className="w-4 h-4 text-text-ter flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z"/>
        </svg>
      )}
    </motion.button>
  );
}

type ArtistTab = 'brani' | 'simili' | 'novita';

interface SimilarArtist { name: string; image: string; listeners: number }

function ArtistDetail({ artistId, artist, onBack, onUnfollow }: {
  artistId: string;
  artist: { id: string; name: string; thumbnail: string };
  onBack: () => void;
  onUnfollow: () => void;
}) {
  const setTrack = usePlayerStore((s) => s.setTrack);
  const followArtist = useLibraryStore((s) => s.followArtist);
  const followedArtists = useLibraryStore((s) => s.followedArtists);
  const [artistTab, setArtistTab] = useState<ArtistTab>('brani');

  const { data: info } = useQuery<ArtistInfo>({
    queryKey: ['artist-info', artistId],
    queryFn: () => authFetch(`/api/artist/info?q=${encodeURIComponent(artist.name)}`),
    staleTime: 3600_000,
  });

  const { data: tracks = [], isLoading: tracksLoading } = useQuery<LastfmTrack[]>({
    queryKey: ['artist-tracks-lfm', artistId],
    queryFn: () => authFetch(`/api/artist/tracks?q=${encodeURIComponent(artist.name)}`),
    staleTime: 3600_000,
    enabled: artistTab === 'brani',
  });

  const { data: similar = [], isLoading: simLoading } = useQuery<SimilarArtist[]>({
    queryKey: ['artist-similar', artistId],
    queryFn: () => authFetch(`/api/artist/similar?q=${encodeURIComponent(artist.name)}`),
    staleTime: 2 * 3600_000,
    enabled: artistTab === 'simili',
  });

  const { data: latestTracks = [], isLoading: latestLoading } = useQuery<Track[]>({
    queryKey: ['artist-latest', artist.name],
    queryFn: async () => {
      const data = await authFetch(`/api/artist/latest?artist=${encodeURIComponent(artist.name)}`);
      return (data as { id: string; title: string; channel: string; thumbnail: string; duration: number }[])
        .map((t) => ({ ...t, type: 'song' as const }));
    },
    staleTime: 3600_000,
    enabled: artistTab === 'novita',
  });

  async function resolveAndPlay(track: LastfmTrack) {
    const url = `/api/artist/resolve?artist=${encodeURIComponent(artist.name)}&track=${encodeURIComponent(track.name)}`;
    const result = await authFetch(url);
    if (!result?.id) return;
    const t: Track = {
      id: result.id, title: result.title, channel: result.channel,
      thumbnail: result.thumbnail, duration: result.duration, type: 'song',
    };
    setTrack(t, [t]);
  }

  if (!artist) return null;

  const artistImage = info?.image && info.image !== '' ? info.image : artist.thumbnail;

  return (
    <div className="-mx-4">
      {/* Hero */}
      <div className="relative h-52 mb-0">
        <img src={artistImage} alt={artist.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg/40 to-bg" />
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-bg/60 backdrop-blur-sm flex items-center justify-center text-text-pri"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>
      </div>

      {/* Name + meta */}
      <div className="px-4 pb-4 -mt-8">
        <h1 className="text-3xl font-bold text-text-pri mb-1">{info?.name ?? artist.name}</h1>
        {info?.listeners ? (
          <p className="text-text-ter text-xs mb-3">{info.listeners.toLocaleString('it-IT')} ascoltatori mensili</p>
        ) : <div className="mb-3" />}

        {/* Bio */}
        {info?.bio && (
          <p className="text-text-ter text-xs mb-4 line-clamp-3 leading-relaxed">{info.bio}</p>
        )}

        {/* Unfollow */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onUnfollow}
          className="px-4 py-1.5 rounded-full border border-border text-text-sec text-xs mb-4"
        >
          Non seguire
        </motion.button>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['brani', 'simili', 'novita'] as ArtistTab[]).map((t) => (
            <motion.button
              key={t}
              whileTap={{ scale: 0.93 }}
              onClick={() => setArtistTab(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                artistTab === t ? 'bg-accent text-bg border-accent' : 'bg-surface-2 text-text-sec border-border'
              }`}
            >
              {t === 'brani' ? 'Top brani' : t === 'simili' ? 'Simili' : 'Novità'}
            </motion.button>
          ))}
        </div>

        {/* Tab content */}
        {artistTab === 'brani' && (
          tracksLoading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-5 h-3 bg-surface-2 rounded" />
                  <div className="flex-1 space-y-2"><div className="h-3 bg-surface-2 rounded w-3/4" /><div className="h-2 bg-surface-2 rounded w-1/3" /></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-0">
              {tracks.map((t, i) => (
                <ArtistTrackRow
                  key={`${t.name}-${i}`}
                  track={t}
                  artist={artist.name}
                  index={i}
                  onPlay={(track) => resolveAndPlay(track)}
                />
              ))}
            </div>
          )
        )}

        {artistTab === 'simili' && (
          simLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => <div key={i} className="flex items-center gap-3 animate-pulse"><div className="w-12 h-12 bg-surface-2 rounded-full" /><div className="flex-1 space-y-2"><div className="h-3 bg-surface-2 rounded w-1/2" /></div></div>)}
            </div>
          ) : similar.length === 0 ? (
            <p className="text-text-ter text-sm text-center mt-8">Nessun artista simile trovato</p>
          ) : (
            <div className="space-y-2">
              {similar.map((a) => {
                const isFollowed = followedArtists.some((f) => f.name.toLowerCase() === a.name.toLowerCase());
                return (
                  <div key={a.name} className="flex items-center gap-3 py-2">
                    {a.image ? (
                      <img src={a.image} alt={a.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center flex-shrink-0">
                        <span className="text-text-ter text-lg font-bold">{a.name[0]}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-text-pri text-sm font-medium truncate">{a.name}</p>
                      {a.listeners > 0 && <p className="text-text-ter text-xs">{a.listeners.toLocaleString('it-IT')} ascoltatori</p>}
                    </div>
                    {!isFollowed && (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => followArtist({ id: a.name, name: a.name, thumbnail: a.image ?? '' })}
                        className="px-3 py-1 rounded-full border border-accent/50 text-accent text-xs font-medium flex-shrink-0"
                      >
                        + Segui
                      </motion.button>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {artistTab === 'novita' && (
          latestLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="flex items-center gap-3 animate-pulse"><div className="w-14 h-14 bg-surface-2 rounded-xl" /><div className="flex-1 space-y-2"><div className="h-3 bg-surface-2 rounded w-3/4" /></div></div>)}
            </div>
          ) : latestTracks.length === 0 ? (
            <p className="text-text-ter text-sm text-center mt-8">Nessuna novità trovata</p>
          ) : (
            <div className="space-y-1">
              {latestTracks.map((t) => (
                <TrackCard key={t.id} track={t} queue={latestTracks} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function PlaylistItem({ pl, onShare }: { pl: Playlist; onShare: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(pl.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const removePlaylist = useLibraryStore((s) => s.removePlaylist);
  const removeFromPlaylist = useLibraryStore((s) => s.removeFromPlaylist);
  const renamePlaylist = useLibraryStore((s) => s.renamePlaylist);
  const setTrack = usePlayerStore((s) => s.setTrack);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const toggle = usePlayerStore((s) => s.toggle);

  const isThisPlaylistActive = pl.tracks.some((t) => t.id === currentTrack?.id);
  const isThisPlaylistPlaying = isThisPlaylistActive && isPlaying;

  function playAll() {
    if (pl.tracks.length === 0) return;
    if (isThisPlaylistActive) { toggle(); return; }
    setTrack(pl.tracks[0], pl.tracks);
  }

  function saveRename() {
    const trimmed = newName.trim();
    if (trimmed && trimmed !== pl.name) renamePlaylist(pl.id, trimmed);
    else setNewName(pl.name);
    setRenaming(false);
  }

  return (
    <div className="bg-surface-2 rounded-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <motion.button whileTap={{ scale: 0.95 }} onClick={playAll} className="flex-shrink-0">
          {pl.cover ? (
            <img src={pl.cover} alt={pl.name} className="w-14 h-14 rounded-xl object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-surface flex items-center justify-center">
              <svg className="w-7 h-7 text-text-ter" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
          )}
        </motion.button>

        <div className="flex-1 min-w-0">
          {renaming ? (
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={saveRename}
              onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') { setNewName(pl.name); setRenaming(false); } }}
              className="bg-surface text-text-pri rounded-lg px-2 py-1 text-sm w-full border border-accent/50 outline-none"
            />
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <p className="font-semibold text-text-pri truncate">{pl.name}</p>
              {pl.sharedBy && (
                <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/20">
                  ricevuta
                </span>
              )}
            </div>
          )}
          <p className="text-xs text-text-sec mt-0.5">
            {pl.sharedBy ? `Da ${pl.sharedBy} · ` : ''}{pl.tracks.length} brani
          </p>
        </div>

        <div className="flex items-center gap-1">
          {/* Play/Pause */}
          <motion.button whileTap={{ scale: 0.9 }} onClick={playAll} className="p-2 text-accent">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              {isThisPlaylistPlaying ? (
                <>
                  <rect x="6" y="4" width="4" height="16" rx="1"/>
                  <rect x="14" y="4" width="4" height="16" rx="1"/>
                </>
              ) : (
                <path d="M8 5v14l11-7z"/>
              )}
            </svg>
          </motion.button>
          {/* Expand/collapse */}
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setExpanded((v) => !v)} className="p-2 text-text-ter">
            <motion.svg
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </motion.svg>
          </motion.button>
          {/* More options */}
          <div className="relative">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setMenuOpen((v) => !v)} className="p-2 text-text-ter">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
              </svg>
            </motion.button>
            <AnimatePresence>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -4 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="absolute right-0 top-10 z-40 bg-surface border border-border rounded-2xl shadow-xl overflow-hidden min-w-44"
                  >
                    {[
                      { label: isThisPlaylistPlaying ? 'Pausa' : 'Riproduci tutto', icon: isThisPlaylistPlaying ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z' : 'M8 5v14l11-7z', filled: true, action: () => { playAll(); setMenuOpen(false); } },
                      { label: 'Rinomina', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', filled: false, action: () => { setRenaming(true); setMenuOpen(false); } },
                      { label: 'Condividi', icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z', filled: false, action: () => { onShare(); setMenuOpen(false); } },
                      { label: 'Elimina', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16', filled: false, action: () => { removePlaylist(pl.id); setMenuOpen(false); }, danger: true },
                    ].map((item) => (
                      <motion.button
                        key={item.label}
                        whileTap={{ scale: 0.97 }}
                        onClick={item.action}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors active:bg-surface-2 ${item.danger ? 'text-accent-alt' : 'text-text-pri'}`}
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill={item.filled ? 'currentColor' : 'none'} stroke={item.filled ? 'none' : 'currentColor'} strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                        </svg>
                        {item.label}
                      </motion.button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Track list */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="overflow-hidden border-t border-border rounded-b-2xl"
          >
            {pl.tracks.length === 0 ? (
              <p className="text-text-ter text-sm text-center py-6">
                Nessun brano. Usa il menu ··· su qualsiasi brano per aggiungerlo.
              </p>
            ) : (
              <div className="py-2">
                {pl.tracks.map((track) => (
                  <div key={track.id} className="flex items-center group">
                    <div className="flex-1 min-w-0">
                      <TrackCard track={track} queue={pl.tracks} />
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeFromPlaylist(pl.id, track.id)}
                      className="flex-shrink-0 p-3 mr-2 text-accent-alt/50 active:text-accent-alt"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </motion.button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LibraryPage() {
  const [tab, setTab] = useState(0);
  const favorites = useLibraryStore((s) => s.favorites);
  const playlists = useLibraryStore((s) => s.playlists);
  const recentlyPlayed = useLibraryStore((s) => s.recentlyPlayed);
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);
  const isFavoriteShared = useLibraryStore((s) => s.isFavoriteShared);
  const toggleFavoriteShared = useLibraryStore((s) => s.toggleFavoriteShared);
  const followedArtists = useLibraryStore((s) => s.followedArtists);
  const unfollowArtist = useLibraryStore((s) => s.unfollowArtist);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [sharePlaylist, setSharePlaylist] = useState<Playlist | null>(null);

  return (
    <div className="pb-36 pt-4">
      <h1 className="text-3xl font-bold px-4 mb-6 text-text-pri">La tua libreria</h1>

      {/* Tabs */}
      <div className="flex gap-2 px-4 mb-6 overflow-x-auto scrollbar-hide">
        {TABS.map((t, i) => (
          <motion.button
            key={t}
            whileTap={{ scale: 0.93 }}
            onClick={() => setTab(i)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              tab === i ? 'bg-accent text-bg border-accent' : 'bg-surface-2 text-text-sec border-border'
            }`}
          >
            {t}
          </motion.button>
        ))}
      </div>

      {/* Preferiti */}
      {tab === 0 && (
        <div>
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-20 text-text-ter">
              <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
              <p className="text-lg font-medium">Nessun preferito</p>
              <p className="text-sm mt-1">Tocca il cuore su un brano per salvarlo</p>
            </div>
          ) : (
            <div className="space-y-1">
              {favorites.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  queue={favorites}
                  shared={isFavoriteShared(track.id)}
                  onToggleShare={() => toggleFavoriteShared(track.id, !isFavoriteShared(track.id))}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Playlist */}
      {tab === 1 && (
        <div>
          {/* Crea playlist */}
          <div className="px-4 mb-5 flex gap-2">
            <input
              placeholder="Nome nuova playlist..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) {
                  createPlaylist(newName.trim());
                  setNewName('');
                }
              }}
              className="flex-1 bg-surface-2 text-text-pri placeholder-text-ter rounded-xl px-4 py-3 text-sm border border-border outline-none focus:border-accent/50"
            />
            <motion.button
              whileTap={{ scale: 0.93 }}
              disabled={!newName.trim()}
              onClick={() => { createPlaylist(newName.trim()); setNewName(''); }}
              className="bg-accent text-bg px-4 py-3 rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Crea
            </motion.button>
          </div>

          {playlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-12 text-text-ter px-8 text-center">
              <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
              </svg>
              <p className="text-lg font-medium">Nessuna playlist</p>
              <p className="text-sm mt-1">Crea una playlist, poi aggiungi brani usando il menu ··· su qualsiasi brano</p>
            </div>
          ) : (
            <div className="space-y-3 px-4">
              {playlists.map((pl) => (
                <PlaylistItem
                  key={pl.id}
                  pl={pl}
                  onShare={() => setSharePlaylist(pl)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Artisti */}
      {tab === 2 && (
        <div className="px-4">
          <AnimatePresence mode="wait">
            {selectedArtist && followedArtists.find((a) => a.id === selectedArtist) ? (
              <motion.div
                key="artist-detail"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              >
                <ArtistDetail
                  artistId={selectedArtist}
                  artist={followedArtists.find((a) => a.id === selectedArtist)!}
                  onBack={() => setSelectedArtist(null)}
                  onUnfollow={() => { unfollowArtist(selectedArtist); setSelectedArtist(null); }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="artist-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {followedArtists.length === 0 ? (
                  <div className="flex flex-col items-center justify-center mt-20 text-text-ter text-center">
                    <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    <p className="text-lg font-medium">Nessun artista</p>
                    <p className="text-sm mt-1 px-6">Usa il menu ··· su un brano e tocca "Segui artista"</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    {followedArtists.map((artist) => (
                      <motion.button
                        key={artist.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedArtist(artist.id)}
                        className="flex flex-col items-center gap-3 bg-surface-2 rounded-2xl p-4"
                      >
                        <img
                          src={artist.thumbnail}
                          alt={artist.name}
                          className="w-20 h-20 rounded-full object-cover"
                        />
                        <p className="text-text-pri text-sm font-semibold text-center truncate w-full">{artist.name}</p>
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {sharePlaylist && (
        <PlaylistShareModal playlist={sharePlaylist} onClose={() => setSharePlaylist(null)} />
      )}
    </div>
  );
}
