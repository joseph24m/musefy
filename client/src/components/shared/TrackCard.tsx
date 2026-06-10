import { useState } from 'react';
import { motion } from 'framer-motion';
import { Track, formatDuration } from '../../services/api';
import { usePlayerStore } from '../../store/playerStore';
import { useLibraryStore } from '../../store/libraryStore';
import TrackContextMenu from './TrackContextMenu';

interface Props {
  track: Track;
  queue?: Track[];
  shared?: boolean;
  onToggleShare?: () => void;
}

export default function TrackCard({ track, queue, shared, onToggleShare }: Props) {
  const setTrack = usePlayerStore((s) => s.setTrack);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isFav = useLibraryStore((s) => s.isFavorite(track.id));
  const isActive = currentTrack?.id === track.id;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <motion.div
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors ${isActive ? 'bg-accent/5' : 'active:bg-surface-2'}`}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        onClick={() => setTrack(track, queue)}
      >
        {/* Thumbnail */}
        <div className="relative flex-shrink-0">
          <img
            src={track.thumbnail}
            alt={track.title}
            className={`w-12 h-12 rounded-xl object-cover transition-all ${isActive ? 'ring-2 ring-accent/70 shadow-lg shadow-accent/20' : ''}`}
          />
          {isActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
              {isPlaying ? (
                <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1.5"/>
                  <rect x="14" y="4" width="4" height="16" rx="1.5"/>
                </svg>
              ) : (
                <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </div>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className={`text-[14px] font-semibold truncate leading-snug ${isActive ? 'text-accent' : 'text-text-pri'}`}>
            {track.title}
          </p>
          <p className="text-[12px] text-text-ter truncate mt-0.5">{track.channel}</p>
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-2 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {isFav && (
            <svg className="w-3.5 h-3.5 text-accent-alt" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          )}
          {onToggleShare !== undefined && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onToggleShare(); }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                shared ? 'bg-accent/15 text-accent' : 'bg-surface-2 text-text-ter'
              }`}
            >
              <svg className="w-3 h-3" fill={shared ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {shared ? 'Condiviso' : 'Condividi'}
            </motion.button>
          )}
          <span className="text-[11px] text-text-ter tabular-nums">{formatDuration(track.duration)}</span>
          <motion.button
            whileTap={{ scale: 0.85 }}
            className="p-1 text-text-ter"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(true); }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
            </svg>
          </motion.button>
        </div>
      </motion.div>

      {menuOpen && <TrackContextMenu track={track} onClose={() => setMenuOpen(false)} />}
    </>
  );
}
