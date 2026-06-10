import { motion } from 'framer-motion';
import { usePlayerStore } from '../../store/playerStore';

export default function MiniPlayer() {
  const { currentTrack, isPlaying, toggle, next, setShowFullscreen, currentTime, duration } = usePlayerStore();

  if (!currentTrack) return null;

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <motion.div
      className="fixed left-3 right-3 z-30 rounded-2xl overflow-hidden shadow-2xl"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 90px)' }}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      onClick={() => setShowFullscreen(true)}
    >
      {/* Blurred thumbnail background */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={currentTrack.thumbnail}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-150 blur-2xl opacity-30"
        />
        <div className="absolute inset-0 bg-surface-2/85" />
      </div>

      <div className="relative flex items-center gap-3 px-3 py-3">
        {/* Rotating disc */}
        <div className="relative flex-shrink-0 w-11 h-11">
          <img
            src={currentTrack.thumbnail}
            alt={currentTrack.title}
            className={`w-11 h-11 object-cover shadow-lg ${isPlaying ? 'animate-spin-slow' : 'animate-spin-slow paused'}`}
            style={{ borderRadius: '50%' }}
          />
          {/* Center hole */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-2.5 h-2.5 rounded-full bg-surface-2/80 ring-1 ring-white/10" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-text-pri leading-tight">{currentTrack.title}</p>
          <p className="text-xs text-text-ter truncate mt-0.5">{currentTrack.channel}</p>
        </div>

        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.82 }}
            onClick={(e) => { e.stopPropagation(); toggle(); }}
            className="w-9 h-9 flex items-center justify-center text-text-pri"
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1.5"/>
                <rect x="14" y="4" width="4" height="16" rx="1.5"/>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.82 }}
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="w-9 h-9 flex items-center justify-center text-text-sec"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Thin progress bar */}
      <div className="relative h-0.5 bg-white/10">
        <motion.div
          className="absolute left-0 top-0 h-full bg-accent rounded-full"
          style={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.2, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
}
