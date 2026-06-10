import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLyrics } from '../../hooks/useLyrics';

export default function LyricsView() {
  const { lines, plain, activeIndex, isLoading, hasLyrics } = useLyrics();
  const activeRef = useRef<HTMLParagraphElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active line to center
  useEffect(() => {
    if (!activeRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const el = activeRef.current;
    const offset = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
    container.scrollTo({ top: offset, behavior: 'smooth' });
  }, [activeIndex]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 px-2 pt-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={`h-5 rounded shimmer ${i % 3 === 0 ? 'w-3/4' : i % 3 === 1 ? 'w-full' : 'w-1/2'}`} />
        ))}
      </div>
    );
  }

  if (!hasLyrics) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-ter gap-3">
        <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
        </svg>
        <p className="text-sm">Testo non disponibile</p>
      </div>
    );
  }

  // Synced lyrics
  if (lines) {
    return (
      <div
        ref={containerRef}
        className="overflow-y-auto h-full px-2 pt-8 pb-32"
        style={{ scrollbarWidth: 'none' }}
      >
        {lines.map((line, i) => {
          const isActive = i === activeIndex;
          const isPast = i < activeIndex;
          return (
            <motion.p
              key={i}
              ref={isActive ? activeRef : null}
              animate={{
                opacity: isActive ? 1 : isPast ? 0.35 : 0.5,
                scale: isActive ? 1.05 : 1,
              }}
              transition={{ duration: 0.3 }}
              className={`text-2xl font-bold leading-snug mb-5 origin-left cursor-default ${
                isActive ? 'text-text-pri' : 'text-text-sec'
              }`}
            >
              {line.text}
            </motion.p>
          );
        })}
      </div>
    );
  }

  // Plain lyrics fallback
  return (
    <div
      ref={containerRef}
      className="overflow-y-auto h-full px-2 pt-8 pb-32"
      style={{ scrollbarWidth: 'none' }}
    >
      {plain!.split('\n').map((line, i) => (
        <p key={i} className={`text-lg leading-relaxed mb-2 text-text-sec ${line === '' ? 'mb-5' : ''}`}>
          {line || ' '}
        </p>
      ))}
    </div>
  );
}
