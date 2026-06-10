import { createPortal } from 'react-dom';
import { useState, useRef } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { usePlayerStore } from '../../store/playerStore';
import type { Track } from '../../services/api';

/* Single draggable row — drag handle on the right grip icon */
function QueueRow({
  track,
  index,
  isCurrent,
  isPlayed,
  onPlay,
  onRemove,
}: {
  track: Track;
  index: number;
  isCurrent: boolean;
  isPlayed: boolean;
  onPlay: () => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={track}
      dragListener={false}
      dragControls={controls}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl mb-1 select-none ${
        isCurrent
          ? 'bg-accent/10 border border-accent/20'
          : isPlayed
          ? 'opacity-35'
          : 'bg-transparent'
      }`}
      style={{ touchAction: 'none' }}
      whileDrag={{ scale: 1.03, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 10 }}
      transition={{ duration: 0.15 }}
    >
      {/* Position / playing indicator */}
      <div className="w-5 text-center flex-shrink-0">
        {isCurrent ? (
          <svg className="w-3.5 h-3.5 text-accent mx-auto" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        ) : (
          <span className="text-text-ter text-xs">{index + 1}</span>
        )}
      </div>

      {/* Thumbnail */}
      <img
        src={track.thumbnail}
        alt={track.title}
        className="w-10 h-10 rounded-xl object-cover flex-shrink-0 cursor-pointer"
        onClick={onPlay}
      />

      {/* Info */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onPlay}>
        <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-accent' : 'text-text-pri'}`}>
          {track.title}
        </p>
        <p className="text-xs text-text-ter truncate">{track.channel}</p>
      </div>

      {/* Right controls: remove + drag handle */}
      {!isPlayed && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isCurrent && (
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onRemove}
              className="p-1.5 text-text-ter"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          )}

          {/* Drag handle — touch & mouse */}
          <div
            className="p-2 text-text-ter cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={(e) => {
              e.preventDefault();
              controls.start(e);
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
            </svg>
          </div>
        </div>
      )}
    </Reorder.Item>
  );
}

export default function QueueSheet() {
  const showQueue    = usePlayerStore((s) => s.showQueue);
  const setShowQueue = usePlayerStore((s) => s.setShowQueue);
  const queue        = usePlayerStore((s) => s.queue);
  const queueIndex   = usePlayerStore((s) => s.queueIndex);
  const setTrack     = usePlayerStore((s) => s.setTrack);

  /* Local copy for smooth Reorder animation; sync to store on reorder end */
  const [localQueue, setLocalQueue] = useState<Track[]>(queue);
  const syncedRef = useRef(queue);

  /* Keep localQueue in sync when queue changes externally (track skip, add, etc.) */
  if (syncedRef.current !== queue) {
    syncedRef.current = queue;
    setLocalQueue(queue);
  }

  function commitReorder(newQueue: Track[]) {
    setLocalQueue(newQueue);
    const newIndex = newQueue.findIndex((t) => t.id === queue[queueIndex]?.id);
    usePlayerStore.setState({
      queue: newQueue,
      queueIndex: newIndex >= 0 ? newIndex : queueIndex,
      currentTrack: newQueue[newIndex >= 0 ? newIndex : queueIndex],
    });
    syncedRef.current = newQueue;
  }

  function removeAt(track: Track) {
    const newQueue = localQueue.filter((t) => t !== track);
    if (newQueue.length === 0) return;
    const currentId = queue[queueIndex]?.id;
    const newIndex = newQueue.findIndex((t) => t.id === currentId);
    const safeIndex = newIndex >= 0 ? newIndex : Math.max(0, queueIndex - 1);
    usePlayerStore.setState({ queue: newQueue, queueIndex: safeIndex, currentTrack: newQueue[safeIndex] });
    syncedRef.current = newQueue;
    setLocalQueue(newQueue);
  }

  return createPortal(
    <AnimatePresence>
      {showQueue && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowQueue(false)} />

          <motion.div
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => { if (info.offset.y > 120) setShowQueue(false); }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full max-w-lg bg-surface rounded-t-3xl z-10 flex flex-col"
            style={{ maxHeight: '80vh' }}
          >
            {/* Handle + header */}
            <div className="flex-shrink-0 pt-3 pb-2 px-4">
              <div className="w-10 h-1 bg-border rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-text-pri">Coda</h2>
                <span className="text-text-ter text-xs">{localQueue.length} brani</span>
              </div>
            </div>

            {/* Reorderable list */}
            <Reorder.Group
              axis="y"
              values={localQueue}
              onReorder={commitReorder}
              className="overflow-y-auto flex-1 px-2 pb-8"
              style={{ listStyle: 'none', margin: 0, padding: '0 8px 32px' }}
              as="div"
            >
              {localQueue.map((track, i) => (
                <QueueRow
                  key={track.id + '-' + i}
                  track={track}
                  index={i}
                  isCurrent={i === queueIndex}
                  isPlayed={i < queueIndex}
                  onPlay={() => setTrack(track, localQueue)}
                  onRemove={() => removeAt(track)}
                />
              ))}
            </Reorder.Group>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
