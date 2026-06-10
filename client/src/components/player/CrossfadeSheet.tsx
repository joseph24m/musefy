import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/playerStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CrossfadeSheet({ open, onClose }: Props) {
  const crossfadeSeconds = usePlayerStore((s) => s.crossfadeSeconds);
  const setCrossfade = usePlayerStore((s) => s.setCrossfade);

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

            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-text-pri">Crossfade</h2>
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${crossfadeSeconds > 0 ? 'text-accent bg-accent/10' : 'text-text-ter bg-surface'}`}>
                {crossfadeSeconds === 0 ? 'Disattivato' : `${crossfadeSeconds}s`}
              </span>
            </div>

            <p className="text-sm text-text-sec mb-6">
              Sovrappone la fine di un brano con l'inizio del successivo.
            </p>

            {/* Slider */}
            <div className="mb-6">
              <input
                type="range"
                min={0}
                max={12}
                step={1}
                value={crossfadeSeconds}
                onChange={(e) => setCrossfade(Number(e.target.value))}
                className="w-full"
                style={{ accentColor: '#1DB954' }}
              />
              <div className="flex justify-between text-xs text-text-ter mt-1">
                <span>Off</span>
                <span>12s</span>
              </div>
            </div>

            {/* Quick presets */}
            <div className="grid grid-cols-4 gap-2">
              {[0, 2, 5, 8].map((s) => (
                <motion.button
                  key={s}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => setCrossfade(s)}
                  className={`py-3 rounded-2xl text-sm font-semibold border transition-colors ${
                    crossfadeSeconds === s
                      ? 'bg-accent text-bg border-accent'
                      : 'bg-surface text-text-pri border-border'
                  }`}
                >
                  {s === 0 ? 'Off' : `${s}s`}
                </motion.button>
              ))}
            </div>

            {/* Visualizzazione crossfade */}
            {crossfadeSeconds > 0 && (
              <div className="mt-6 p-4 bg-surface rounded-2xl">
                <p className="text-xs text-text-sec mb-3">Anteprima transizione</p>
                <div className="flex items-end gap-1 h-10">
                  {/* Track A fade out */}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={`a${i}`}
                      className="flex-1 bg-accent rounded-sm transition-all"
                      style={{ height: `${100 - i * 12}%`, opacity: 0.8 - i * 0.08 }}
                    />
                  ))}
                  <div className="w-px bg-border mx-1 h-full" />
                  {/* Track B fade in */}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={`b${i}`}
                      className="flex-1 bg-accent/60 rounded-sm"
                      style={{ height: `${i * 12 + 4}%`, opacity: 0.3 + i * 0.08 }}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
