import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/playerStore';
import { formatSleepRemaining } from '../../hooks/useSleepTimer';
import { useEffect, useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const PRESETS = [
  { label: '5 min', minutes: 5 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 ora', minutes: 60 },
  { label: '2 ore', minutes: 120 },
];

export default function SleepTimerSheet({ open, onClose }: Props) {
  const { sleepAt, sleepTrackEnd, setSleepTimer, setSleepTrackEnd, clearSleepTimer } = usePlayerStore();
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!sleepAt) { setRemaining(''); return; }
    const tick = () => setRemaining(formatSleepRemaining(sleepAt));
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [sleepAt]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[61] bg-surface-2 rounded-t-3xl px-6 pt-4 pb-10"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y" dragConstraints={{ top: 0 }} dragElastic={0.2}
            onDragEnd={(_, info) => { if (info.offset.y > 80) onClose(); }}
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text-pri">Sleep Timer</h2>
              {(sleepAt || sleepTrackEnd) && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-accent font-medium">
                    {sleepTrackEnd ? 'Fine brano' : `Tra ${remaining}`}
                  </span>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { clearSleepTimer(); }}
                    className="text-xs text-accent-alt bg-accent-alt/10 px-3 py-1 rounded-full"
                  >
                    Annulla
                  </motion.button>
                </div>
              )}
            </div>

            {/* Fine brano */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { setSleepTrackEnd(true); onClose(); }}
              className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl mb-3 border transition-colors ${
                sleepTrackEnd ? 'bg-accent/15 border-accent' : 'bg-surface border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/>
                </svg>
                <span className="text-text-pri font-medium">Fine brano corrente</span>
              </div>
              {sleepTrackEnd && (
                <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              )}
            </motion.button>

            {/* Preset grid */}
            <div className="grid grid-cols-3 gap-3">
              {PRESETS.map(({ label, minutes }) => {
                const isActive = sleepAt !== null && Math.abs((sleepAt - Date.now()) / 60000 - minutes) < 1;
                return (
                  <motion.button
                    key={minutes}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => { setSleepTimer(minutes); onClose(); }}
                    className={`py-4 rounded-2xl font-semibold text-base border transition-colors ${
                      isActive
                        ? 'bg-accent text-bg border-accent'
                        : 'bg-surface text-text-pri border-border'
                    }`}
                  >
                    {label}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
