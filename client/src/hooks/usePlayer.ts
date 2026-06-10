import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { useLibraryStore } from '../store/libraryStore';
import { getStreamUrl } from '../services/api';

// Primary audio element
let audioEl: HTMLAudioElement | null = null;
// Secondary element for crossfade
let audioEl2: HTMLAudioElement | null = null;
let crossfadeActive = false;

function getAudio(): HTMLAudioElement {
  if (!audioEl) { audioEl = new Audio(); audioEl.preload = 'auto'; }
  return audioEl;
}

function getAudio2(): HTMLAudioElement {
  if (!audioEl2) { audioEl2 = new Audio(); audioEl2.preload = 'auto'; }
  return audioEl2;
}

function rampVolume(el: HTMLAudioElement, from: number, to: number, durationMs: number) {
  const steps = 20;
  const interval = durationMs / steps;
  const delta = (to - from) / steps;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    el.volume = Math.max(0, Math.min(1, from + delta * step));
    if (step >= steps) clearInterval(timer);
  }, interval);
}

export function usePlayer() {
  const store = usePlayerStore();
  const addRecentlyPlayed = useLibraryStore((s) => s.addRecentlyPlayed);
  const loadingRef = useRef(false);
  const crossfadeTriggeredRef = useRef(false);

  useEffect(() => {
    const audio = getAudio();

    const onTimeUpdate = () => {
      store.setCurrentTime(audio.currentTime);

      // Crossfade trigger
      const { crossfadeSeconds, duration, queue, queueIndex, repeat, isPlaying } = usePlayerStore.getState();
      if (
        crossfadeSeconds > 0 &&
        duration > 0 &&
        audio.duration - audio.currentTime <= crossfadeSeconds &&
        !crossfadeActive &&
        !crossfadeTriggeredRef.current &&
        isPlaying
      ) {
        const nextIdx = repeat === 'one' ? queueIndex : queueIndex + 1;
        const nextTrack = repeat === 'all' && nextIdx >= queue.length
          ? queue[0]
          : queue[nextIdx];

        if (nextTrack) {
          crossfadeTriggeredRef.current = true;
          crossfadeActive = true;
          const audio2 = getAudio2();

          getStreamUrl(nextTrack.id).then((url) => {
            audio2.src = url;
            audio2.volume = 0;
            audio2.play().catch(() => {});

            const ms = crossfadeSeconds * 1000;
            rampVolume(audio, audio.volume, 0, ms);
            rampVolume(audio2, 0, 1, ms);

            // When primary ends, swap elements and advance store
            setTimeout(() => {
              audio.pause();
              audio.src = '';
              // Swap references
              audioEl = audio2;
              audioEl2 = audio;
              crossfadeActive = false;
              crossfadeTriggeredRef.current = false;
              usePlayerStore.getState().next();
            }, ms);
          }).catch(() => { crossfadeActive = false; crossfadeTriggeredRef.current = false; });
        }
      }
    };

    const onDurationChange = () => store.setDuration(audio.duration || 0);
    const onEnded = () => {
      if (!crossfadeActive) {
        crossfadeTriggeredRef.current = false;
        store.next();
      }
    };
    const onError = async () => {
      if (store.currentTrack && !loadingRef.current) {
        loadingRef.current = true;
        try {
          const url = await getStreamUrl(store.currentTrack.id, true);
          audio.src = url;
          audio.play();
        } catch {}
        loadingRef.current = false;
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  // Load track when currentTrack changes
  useEffect(() => {
    const audio = getAudio();
    if (!store.currentTrack) return;
    if (crossfadeActive) return; // crossfade handles this transition

    addRecentlyPlayed(store.currentTrack);
    loadingRef.current = true;
    crossfadeTriggeredRef.current = false;

    getStreamUrl(store.currentTrack.id).then((url) => {
      audio.src = url;
      audio.volume = store.volume;
      if (store.isPlaying) audio.play().catch(() => {});
      loadingRef.current = false;
    }).catch(() => { loadingRef.current = false; });
  }, [store.currentTrack?.id]);

  // Sync play/pause
  useEffect(() => {
    const audio = getAudio();
    if (store.isPlaying) audio.play().catch(() => {});
    else audio.pause();
  }, [store.isPlaying]);

  // Sync volume
  useEffect(() => {
    if (!crossfadeActive) getAudio().volume = store.volume;
  }, [store.volume]);

  // Sync seek
  const prevSeek = useRef(0);
  useEffect(() => {
    const audio = getAudio();
    if (Math.abs(store.currentTime - audio.currentTime) > 1 && store.currentTime !== prevSeek.current) {
      audio.currentTime = store.currentTime;
      prevSeek.current = store.currentTime;
    }
  }, [store.currentTime]);

  return store;
}
