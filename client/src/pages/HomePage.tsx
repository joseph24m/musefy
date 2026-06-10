import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueries } from '@tanstack/react-query';
import { useLibraryStore } from '../store/libraryStore';
import { useAuthStore } from '../store/authStore';
import TrackCard from '../components/shared/TrackCard';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import { usePlayerStore } from '../store/playerStore';
import type { Track } from '../services/api';

const CHARTS = [
  { id: 'global', label: 'Global' },
  { id: 'italy', label: 'Italia' },
  { id: 'united-states', label: 'Stati Uniti' },
  { id: 'united-kingdom', label: 'Regno Unito' },
  { id: 'france', label: 'Francia' },
  { id: 'germany', label: 'Germania' },
  { id: 'spain', label: 'Spagna' },
  { id: 'japan', label: 'Giappone' },
  { id: 'brazil', label: 'Brasile' },
];

interface LastfmRec { name: string; artist: string; listeners: number; duration: number }

async function authFetch(url: string) {
  const { supabase } = await import('../lib/supabase');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? '';
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json();
}

function RecCard({ track, index }: { track: LastfmRec; index: number }) {
  const [loading, setLoading] = useState(false);
  const setTrack = usePlayerStore((s) => s.setTrack);

  async function handlePlay() {
    setLoading(true);
    try {
      const result = await authFetch(
        `/api/artist/resolve?artist=${encodeURIComponent(track.artist)}&track=${encodeURIComponent(track.name)}`
      );
      if (!result?.id) return;
      const t: Track = {
        id: result.id, title: result.title, channel: result.channel,
        thumbnail: result.thumbnail, duration: result.duration, type: 'song',
      };
      setTrack(t, [t]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={handlePlay}
      disabled={loading}
      className="w-full flex items-center gap-3 px-4 py-3 active:bg-surface-2 text-left"
    >
      <span className="text-text-ter text-sm w-5 text-center flex-shrink-0">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-text-pri text-sm font-medium truncate">{track.name}</p>
        <p className="text-text-ter text-xs truncate">
          {track.artist}
          {track.listeners > 0 ? ` · ${track.listeners.toLocaleString('it-IT')} ascoltatori` : ''}
        </p>
      </div>
      <div className="flex-shrink-0">
        {loading ? (
          <svg className="w-4 h-4 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
          </svg>
        ) : (
          <svg className="w-4 h-4 text-text-ter" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </div>
    </motion.button>
  );
}

// Charts section with tab selector
function ChartsSection() {
  const [activeChart, setActiveChart] = useState('italy');
  const authLoading = useAuthStore((s) => s.loading);

  const { data, isLoading } = useQuery<{ tracks: LastfmRec[] }>({
    queryKey: ['charts', activeChart],
    queryFn: () => authFetch(`/api/charts?country=${activeChart}&limit=20`),
    staleTime: 60 * 60_000,
    enabled: !authLoading,
  });

  const tracks = data?.tracks ?? [];

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold px-4 mb-3 text-text-pri">Classifiche</h2>

      {/* Horizontal tab scroll */}
      <div className="flex gap-2 px-4 mb-4 overflow-x-auto pb-1 scrollbar-none">
        {CHARTS.map((c) => (
          <motion.button
            key={c.id}
            whileTap={{ scale: 0.93 }}
            onClick={() => setActiveChart(c.id)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              activeChart === c.id
                ? 'bg-accent text-bg border-accent'
                : 'bg-surface-2 text-text-sec border-border'
            }`}
          >
            {c.label}
          </motion.button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonLoader count={6} />
      ) : (
        <div className="space-y-1">
          {tracks.map((track, i) => (
            <RecCard key={`${track.artist}-${track.name}`} track={track} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}

const MOODS = [
  { id: 'relax',   label: 'Relax',    emoji: '🌙' },
  { id: 'focus',   label: 'Focus',    emoji: '🧠' },
  { id: 'workout', label: 'Workout',  emoji: '💪' },
  { id: 'party',   label: 'Party',    emoji: '🎉' },
  { id: 'sad',     label: 'Sad',      emoji: '🌧️' },
  { id: 'hype',    label: 'Hype',     emoji: '🔥' },
  { id: 'love',    label: 'Love',     emoji: '❤️' },
  { id: 'sleep',   label: 'Sleep',    emoji: '😴' },
];

function MoodSection() {
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const authLoading = useAuthStore((s) => s.loading);

  const { data, isLoading } = useQuery<{ tracks: LastfmRec[] }>({
    queryKey: ['mood', activeMood],
    queryFn: () => authFetch(`/api/mood?mood=${activeMood}`),
    enabled: !!activeMood && !authLoading,
    staleTime: 4 * 3600_000,
  });

  const tracks = data?.tracks ?? [];

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold px-4 mb-3 text-text-pri">Mood</h2>

      {/* Mood pills */}
      <div className="flex gap-2 px-4 mb-4 overflow-x-auto pb-1 scrollbar-none">
        {MOODS.map((m) => (
          <motion.button
            key={m.id}
            whileTap={{ scale: 0.93 }}
            onClick={() => setActiveMood(activeMood === m.id ? null : m.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              activeMood === m.id
                ? 'bg-accent text-bg border-accent'
                : 'bg-surface-2 text-text-sec border-border'
            }`}
          >
            <span>{m.emoji}</span>
            <span>{m.label}</span>
          </motion.button>
        ))}
      </div>

      {activeMood && (
        isLoading ? (
          <SkeletonLoader count={5} />
        ) : (
          <div className="space-y-1">
            {tracks.map((track, i) => (
              <RecCard key={`${track.artist}-${track.name}`} track={track} index={i} />
            ))}
          </div>
        )
      )}
    </section>
  );
}

function NovitaSection() {
  const followedArtists = useLibraryStore((s) => s.followedArtists);
  const authLoading = useAuthStore((s) => s.loading);
  const setTrack = usePlayerStore((s) => s.setTrack);

  const artists = followedArtists.slice(0, 6);

  const results = useQueries({
    queries: artists.map((a) => ({
      queryKey: ['artist-latest', a.name],
      queryFn: () => authFetch(`/api/artist/latest?artist=${encodeURIComponent(a.name)}`),
      enabled: !authLoading,
      staleTime: 3600_000,
    })),
  });

  if (artists.length === 0) return null;

  const isLoading = results.some((r) => r.isLoading);

  type YtTrack = { id: string; title: string; channel: string; thumbnail: string; duration: number };
  const entries: { artist: string; track: YtTrack }[] = [];
  results.forEach((r, i) => {
    const tracks = (r.data as YtTrack[] | undefined) ?? [];
    if (tracks[0]) entries.push({ artist: artists[i].name, track: tracks[0] });
  });

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold px-4 mb-3 text-text-pri">Novità per te</h2>
      <p className="text-text-ter text-xs px-4 mb-3">Dagli artisti che segui</p>

      {isLoading ? (
        <SkeletonLoader count={4} />
      ) : entries.length === 0 ? (
        <p className="text-text-ter text-sm px-4">Nessuna novità trovata</p>
      ) : (
        <div className="space-y-1">
          {entries.map(({ track }) => {
            const t: Track = { ...track, type: 'song' };
            return <TrackCard key={track.id} track={t} queue={entries.map(e => ({ ...e.track, type: 'song' as const }))} />;
          })}
        </div>
      )}
    </section>
  );
}

export default function HomePage() {
  const recentlyPlayed = useLibraryStore((s) => s.recentlyPlayed);
  const authLoading = useAuthStore((s) => s.loading);

  const seedArtists = [...new Map(
    recentlyPlayed.map((t) => [t.channel.toLowerCase(), t.channel])
  ).values()].slice(0, 4);
  const artistsParam = seedArtists.join(',');

  const [tracks, setTracks] = useState<LastfmRec[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialDone, setInitialDone] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const artistsParamRef = useRef(artistsParam);

  const fetchPage = useCallback(async (p: number, artists: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const url = `/api/recommendations?artists=${encodeURIComponent(artists)}&page=${p}`;
      const data = await authFetch(url);
      setTracks((prev) => {
        const existing = new Set(prev.map((t) => `${t.artist}::${t.name}`));
        const fresh = (data.tracks as LastfmRec[]).filter(
          (t) => !existing.has(`${t.artist}::${t.name}`)
        );
        return [...prev, ...fresh];
      });
      setHasMore(data.hasMore ?? false);
      setInitialDone(true);
    } catch {
      setHasMore(false);
      setInitialDone(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (artistsParamRef.current !== artistsParam) {
      artistsParamRef.current = artistsParam;
      setTracks([]);
      setPage(1);
      setHasMore(true);
      setInitialDone(false);
    }
  }, [artistsParam]);

  useEffect(() => {
    if (authLoading) return;
    fetchPage(page, artistsParamRef.current);
  }, [page, fetchPage, authLoading]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          setPage((p) => p + 1);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loading, hasMore]);

  return (
    <div className="pb-36 pt-4">
      <div className="px-4 mb-7">
        <h1 className="text-[32px] font-bold tracking-tight text-text-pri">Ciao</h1>
        <p className="text-text-ter text-sm mt-0.5">Cosa vuoi ascoltare oggi?</p>
      </div>

      {recentlyPlayed.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold px-4 mb-3 text-text-pri">Ascoltati di recente</h2>
          <div className="space-y-1">
            {recentlyPlayed.slice(0, 6).map((track) => (
              <TrackCard key={track.id} track={track} queue={recentlyPlayed} />
            ))}
          </div>
        </section>
      )}

      <NovitaSection />

      <MoodSection />

      <ChartsSection />

      <section>
        <h2 className="text-xl font-bold px-4 mb-3 text-text-pri">Consigliati per te</h2>

        {!initialDone ? (
          <SkeletonLoader count={8} />
        ) : (
          <div className="space-y-1">
            {tracks.map((track, i) => (
              <RecCard key={`${track.artist}-${track.name}`} track={track} index={i} />
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="h-8 flex items-center justify-center">
          {loading && initialDone && (
            <svg className="w-5 h-5 animate-spin text-text-ter" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
            </svg>
          )}
        </div>
      </section>
    </div>
  );
}
