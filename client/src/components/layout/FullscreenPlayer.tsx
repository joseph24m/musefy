import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/playerStore';
import { useLibraryStore } from '../../store/libraryStore';
import { formatDuration } from '../../services/api';
import { useState } from 'react';
import LyricsView from '../player/LyricsView';
import SleepTimerSheet from '../player/SleepTimerSheet';
import CrossfadeSheet from '../player/CrossfadeSheet';

export default function FullscreenPlayer() {
  const { currentTrack, isPlaying, toggle, next, prev, currentTime, duration, seek, setShowFullscreen, shuffle, toggleShuffle, repeat, toggleRepeat, setShowQueue } = usePlayerStore();
  const toggleFav = useLibraryStore((s) => s.toggleFavorite);
  const isFav = useLibraryStore((s) => currentTrack ? s.isFavorite(currentTrack.id) : false);
  const [seeking, setSeeking] = useState(false);
  const [seekVal, setSeekVal] = useState(0);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showSleep, setShowSleep] = useState(false);
  const [showCrossfade, setShowCrossfade] = useState(false);
  const { radioMode, toggleRadioMode, sleepAt, sleepTrackEnd, crossfadeSeconds } = usePlayerStore();

  if (!currentTrack) return null;

  const progress = duration > 0 ? (seeking ? seekVal : currentTime) / duration : 0;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      drag="y"
      dragConstraints={{ top: 0 }}
      dragElastic={0.2}
      onDragEnd={(_, info) => { if (info.offset.y > 150) setShowFullscreen(false); }}
    >
      {/* Blurred background */}
      <div className="absolute inset-0">
        <img src={currentTrack.thumbnail} alt="" className="w-full h-full object-cover scale-125 blur-3xl opacity-60" />
        <div className="absolute inset-0 bg-bg/70" />
      </div>

      <div
        className="relative flex flex-col h-full px-6"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
      >
        {/* Handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-white/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowFullscreen(false)} className="p-2 text-text-sec">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
            </svg>
          </motion.button>

          {/* Artwork / Lyrics toggle */}
          <div className="flex bg-surface-2/60 rounded-full p-1 gap-1">
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => setShowLyrics(false)}
              className={`px-4 py-1 rounded-full text-xs font-semibold transition-colors ${!showLyrics ? 'bg-white/20 text-text-pri' : 'text-text-ter'}`}
            >
              Copertina
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => setShowLyrics(true)}
              className={`px-4 py-1 rounded-full text-xs font-semibold transition-colors ${showLyrics ? 'bg-white/20 text-text-pri' : 'text-text-ter'}`}
            >
              Testo
            </motion.button>
          </div>

          <motion.button whileTap={{ scale: 0.9 }} className="p-2 text-text-sec" onClick={() => setShowQueue(true)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10"/>
            </svg>
          </motion.button>
        </div>

        {/* Main content area — artwork or lyrics */}
        <div className="flex-1 min-h-0 mb-4">
          <AnimatePresence mode="wait">
            {!showLyrics ? (
              <motion.div
                key="artwork"
                className="flex flex-col h-full"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {/* Artwork */}
                <motion.div
                  className="flex justify-center mb-8"
                  animate={{ scale: isPlaying ? 1 : 0.88 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                >
                  <img
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    className="w-full max-w-[300px] aspect-square rounded-[28px] object-cover"
                    style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}
                  />
                </motion.div>

                {/* Title + Fav */}
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-3">
                    <h1 className="text-[22px] font-bold text-text-pri truncate leading-tight">{currentTrack.title}</h1>
                    <p className="text-[15px] text-text-sec mt-1 truncate">{currentTrack.channel}</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.82 }}
                    onClick={() => toggleFav(currentTrack)}
                    className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                  >
                    <svg className={`w-6 h-6 transition-all ${isFav ? 'text-accent-alt' : 'text-text-ter'}`} fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                    </svg>
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="lyrics"
                className="h-full"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
              >
                {/* Title compact */}
                <div className="mb-3">
                  <h2 className="text-lg font-bold text-text-pri truncate">{currentTrack.title}</h2>
                  <p className="text-sm text-text-sec truncate">{currentTrack.channel}</p>
                </div>
                <div className="h-[calc(100%-56px)]">
                  <LyricsView />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Seek bar */}
        <div className="mb-5">
          <div className="relative mb-2">
            {/* Track */}
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-none"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            {/* Native input overlay — invisible but handles touch/mouse */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={seeking ? seekVal : currentTime}
              className="seek-bar absolute inset-0 w-full opacity-0 cursor-pointer"
              style={{
                background: `linear-gradient(to right, #1DB954 ${progress * 100}%, rgba(255,255,255,0.1) ${progress * 100}%)`
              }}
              onMouseDown={() => { setSeeking(true); setSeekVal(currentTime); }}
              onTouchStart={() => { setSeeking(true); setSeekVal(currentTime); }}
              onChange={(e) => setSeekVal(Number(e.target.value))}
              onMouseUp={(e) => { seek(Number((e.target as HTMLInputElement).value)); setSeeking(false); }}
              onTouchEnd={(e) => { seek(Number((e.target as HTMLInputElement).value)); setSeeking(false); }}
            />
            {/* Thumb dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md pointer-events-none transition-transform"
              style={{ left: `calc(${progress * 100}% - 7px)` }}
            />
          </div>
          <div className="flex justify-between text-xs text-text-ter">
            <span className="tabular-nums">{formatDuration(Math.floor(seeking ? seekVal : currentTime))}</span>
            <span className="tabular-nums">{formatDuration(Math.floor(duration))}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <motion.button whileTap={{ scale: 0.85 }} onClick={toggleShuffle}
            className={`p-2 ${shuffle ? 'text-accent' : 'text-text-sec'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l4 4m12-4h-4l-1.5 1.5M4 20l4-4m8 4h4v-4M16.5 8.5L18 10l1.5-1.5M4.5 14.5L6 16l1.5-1.5"/>
            </svg>
          </motion.button>

          <motion.button whileTap={{ scale: 0.85 }} onClick={prev} className="p-2 text-text-pri">
            <svg className="w-9 h-9" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggle}
            className="w-16 h-16 rounded-full bg-accent flex items-center justify-center shadow-lg shadow-accent/30"
          >
            {isPlaying ? (
              <svg className="w-8 h-8 text-bg" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            ) : (
              <svg className="w-8 h-8 text-bg ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </motion.button>

          <motion.button whileTap={{ scale: 0.85 }} onClick={next} className="p-2 text-text-pri">
            <svg className="w-9 h-9" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </motion.button>

          <motion.button whileTap={{ scale: 0.85 }} onClick={toggleRepeat}
            className={`p-2 relative ${repeat !== 'off' ? 'text-accent' : 'text-text-sec'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            {repeat === 'one' && <span className="absolute top-0 right-0 text-accent font-bold" style={{fontSize: '8px'}}>1</span>}
          </motion.button>
        </div>

        {/* Secondary controls row */}
        <div className="flex items-center justify-around mt-3 pt-3 border-t border-border">
          {/* Sleep Timer */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowSleep(true)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${(sleepAt || sleepTrackEnd) ? 'text-accent' : 'text-text-sec'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
            </svg>
            <span className="text-xs font-medium">Sleep</span>
          </motion.button>

          {/* Radio mode */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleRadioMode}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${radioMode ? 'text-accent' : 'text-text-sec'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/>
            </svg>
            <span className="text-xs font-medium">Radio</span>
          </motion.button>

          {/* Crossfade */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowCrossfade(true)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${crossfadeSeconds > 0 ? 'text-accent' : 'text-text-sec'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
            </svg>
            <span className="text-xs font-medium">
              {crossfadeSeconds > 0 ? `${crossfadeSeconds}s` : 'Fade'}
            </span>
          </motion.button>
        </div>
      </div>

      <SleepTimerSheet open={showSleep} onClose={() => setShowSleep(false)} />
      <CrossfadeSheet open={showCrossfade} onClose={() => setShowCrossfade(false)} />
    </motion.div>
  );
}
