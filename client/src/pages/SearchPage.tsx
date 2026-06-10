import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSearch, SearchSource } from '../hooks/useSearch';
import TrackCard from '../components/shared/TrackCard';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import type { LastfmSearchResult, Track } from '../services/api';
import { usePlayerStore } from '../store/playerStore';

const FILTERS = [
  { id: 'all', label: 'Tutti' },
  { id: 'songs', label: 'Brani' },
  { id: 'albums', label: 'Album' },
  { id: 'artists', label: 'Artisti' },
];

async function authFetch(url: string) {
  const { supabase } = await import('../lib/supabase');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? '';
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Errore fetch');
  return res.json();
}

function LastfmCard({ track, index }: { track: LastfmSearchResult; index: number }) {
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
        id: result.id,
        title: result.title,
        channel: result.channel,
        thumbnail: result.thumbnail,
        duration: result.duration,
        type: 'song',
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
        <p className="text-text-ter text-xs mt-0.5">
          {track.listeners > 0 ? `${track.listeners.toLocaleString('it-IT')} ascoltatori` : track.artist}
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

export default function SearchPage() {
  const { query, setQuery, results, lastfmResults, isLoading, suggestions, filter, setFilter, source, setSource } = useSearch();
  const [focused, setFocused] = useState(false);

  function toggleSource(s: SearchSource) {
    setSource(s);
    setFilter('all');
  }

  return (
    <div className="pb-36 pt-4">
      {/* Search Bar */}
      <div className="px-4 mb-3">
        <motion.div
          className="relative"
          animate={{ scale: focused ? 1.02 : 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-ter" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="search"
            placeholder="Brani, artisti, album..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="w-full bg-surface-2 text-text-pri placeholder-text-ter rounded-2xl pl-10 pr-4 py-3 text-base outline-none border border-border focus:border-accent/50 transition-colors"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-ter">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          )}
        </motion.div>
      </div>

      {/* Source Toggle */}
      <div className="px-4 mb-3">
        <div className="flex bg-surface-2 rounded-xl p-1 gap-1">
          <button
            onClick={() => toggleSource('lastfm')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              source === 'lastfm' ? 'bg-accent text-bg' : 'text-text-sec'
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
            </svg>
            Last.fm
          </button>
          <button
            onClick={() => toggleSource('youtube')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              source === 'youtube' ? 'bg-accent text-bg' : 'text-text-sec'
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21.582 7.186a2.506 2.506 0 00-1.762-1.773C18.265 5 12 5 12 5s-6.265 0-7.82.413a2.506 2.506 0 00-1.762 1.773C2 8.748 2 12 2 12s0 3.252.418 4.814a2.506 2.506 0 001.762 1.773C5.735 19 12 19 12 19s6.265 0 7.82-.413a2.506 2.506 0 001.762-1.773C22 15.252 22 12 22 12s0-3.252-.418-4.814zM10 15V9l5.2 3-5.2 3z"/>
            </svg>
            YouTube
          </button>
        </div>
      </div>

      {/* Filters (YouTube only) */}
      {query && source === 'youtube' && (
        <div className="flex gap-2 px-4 mb-4 overflow-x-auto">
          {FILTERS.map((f) => (
            <motion.button
              key={f.id}
              whileTap={{ scale: 0.93 }}
              onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                filter === f.id
                  ? 'bg-accent text-bg border-accent'
                  : 'bg-surface-2 text-text-sec border-border'
              }`}
            >
              {f.label}
            </motion.button>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {!results.length && !lastfmResults.length && suggestions.length > 0 && query && (
        <div className="px-4 mb-4 space-y-1">
          {suggestions.map((s) => (
            <button key={s} onClick={() => setQuery(s)} className="flex items-center gap-3 w-full py-2 text-text-sec text-sm">
              <svg className="w-4 h-4 text-text-ter" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <SkeletonLoader count={8} />
      ) : source === 'lastfm' ? (
        <div className="space-y-1">
          {lastfmResults.map((track, i) => (
            <LastfmCard key={`${track.artist}-${track.name}-${i}`} track={track} index={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {results.map((track) => (
            <TrackCard key={track.id} track={track} queue={results} />
          ))}
        </div>
      )}

      {!query && !isLoading && (
        <div className="flex flex-col items-center justify-center mt-16 text-text-ter">
          <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <p className="text-lg font-medium">Cerca la tua musica</p>
          <p className="text-sm mt-1 text-center px-8">
            {source === 'lastfm' ? 'Catalogo Last.fm — più preciso per brani e artisti' : 'Cerca direttamente su YouTube'}
          </p>
        </div>
      )}
    </div>
  );
}
