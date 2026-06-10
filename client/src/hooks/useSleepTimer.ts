import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/playerStore';

export function useSleepTimer() {
  const sleepAt = usePlayerStore((s) => s.sleepAt);
  const pause = usePlayerStore((s) => s.pause);
  const clearSleepTimer = usePlayerStore((s) => s.clearSleepTimer);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!sleepAt) return;

    intervalRef.current = setInterval(() => {
      if (Date.now() >= sleepAt) {
        pause();
        clearSleepTimer();
        clearInterval(intervalRef.current!);
      }
    }, 5000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [sleepAt]);
}

export function formatSleepRemaining(sleepAt: number | null): string {
  if (!sleepAt) return '';
  const ms = sleepAt - Date.now();
  if (ms <= 0) return '';
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
