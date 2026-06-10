import { create } from 'zustand';
import { Track } from '../services/api';

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  showFullscreen: boolean;
  showQueue: boolean;
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  currentTime: number;
  duration: number;
  volume: number;
  // Sleep timer
  sleepAt: number | null;        // timestamp ms when to pause
  sleepTrackEnd: boolean;        // pause at end of current track
  // Radio mode
  radioMode: boolean;
  // Crossfade
  crossfadeSeconds: number;      // 0 = off, 1-12

  setTrack: (track: Track, queue?: Track[]) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setShowFullscreen: (v: boolean) => void;
  setShowQueue: (v: boolean) => void;
  addToQueue: (track: Track) => void;
  reorderQueue: (from: number, to: number) => void;
  // Sleep timer
  setSleepTimer: (minutes: number | null) => void;
  setSleepTrackEnd: (v: boolean) => void;
  clearSleepTimer: () => void;
  // Radio
  toggleRadioMode: () => void;
  appendRadioTracks: (tracks: Track[]) => void;
  // Crossfade
  setCrossfade: (seconds: number) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  queueIndex: 0,
  isPlaying: false,
  showFullscreen: false,
  showQueue: false,
  shuffle: false,
  repeat: 'off',
  currentTime: 0,
  duration: 0,
  volume: 1,
  sleepAt: null,
  sleepTrackEnd: false,
  radioMode: false,
  crossfadeSeconds: 0,

  setTrack: (track, queue) => {
    const q = queue ?? [track];
    const idx = q.findIndex((t) => t.id === track.id);
    set({ currentTrack: track, queue: q, queueIndex: idx >= 0 ? idx : 0, isPlaying: true, currentTime: 0 });
  },
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
  next: () => {
    const { queue, queueIndex, shuffle, repeat, sleepTrackEnd } = get();
    if (repeat === 'one') { set({ currentTime: 0 }); return; }
    if (sleepTrackEnd) { set({ isPlaying: false, sleepTrackEnd: false }); return; }
    let next = queueIndex + 1;
    if (shuffle) next = Math.floor(Math.random() * queue.length);
    if (next >= queue.length) {
      if (repeat === 'all') next = 0;
      else { set({ isPlaying: false }); return; }
    }
    set({ currentTrack: queue[next], queueIndex: next, isPlaying: true, currentTime: 0 });
  },
  prev: () => {
    const { queue, queueIndex, currentTime } = get();
    if (currentTime > 3) { set({ currentTime: 0 }); return; }
    const prev = Math.max(0, queueIndex - 1);
    set({ currentTrack: queue[prev], queueIndex: prev, isPlaying: true, currentTime: 0 });
  },
  seek: (time) => set({ currentTime: time }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),
  setVolume: (v) => set({ volume: v }),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  toggleRepeat: () => set((s) => ({ repeat: s.repeat === 'off' ? 'one' : s.repeat === 'one' ? 'all' : 'off' })),
  setShowFullscreen: (v) => set({ showFullscreen: v }),
  setShowQueue: (v) => set({ showQueue: v }),
  addToQueue: (track) => set((s) => ({ queue: [...s.queue, track] })),
  reorderQueue: (from, to) => {
    const q = [...get().queue];
    const [item] = q.splice(from, 1);
    q.splice(to, 0, item);
    set({ queue: q });
  },

  setSleepTimer: (minutes) => set({
    sleepAt: minutes ? Date.now() + minutes * 60 * 1000 : null,
    sleepTrackEnd: false,
  }),
  setSleepTrackEnd: (v) => set({ sleepTrackEnd: v, sleepAt: null }),
  clearSleepTimer: () => set({ sleepAt: null, sleepTrackEnd: false }),

  toggleRadioMode: () => set((s) => ({ radioMode: !s.radioMode })),
  appendRadioTracks: (tracks) => set((s) => {
    const existingIds = new Set(s.queue.map((t) => t.id));
    const fresh = tracks.filter((t) => !existingIds.has(t.id));
    return { queue: [...s.queue, ...fresh] };
  }),

  setCrossfade: (seconds) => set({ crossfadeSeconds: seconds }),
}));
