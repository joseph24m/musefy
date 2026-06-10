import { useQuery } from '@tanstack/react-query';
import { getLyrics, LyricsData, LyricsLine } from '../services/api';
import { usePlayerStore } from '../store/playerStore';

export function useLyrics() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);

  const { data, isLoading } = useQuery<LyricsData>({
    queryKey: ['lyrics', currentTrack?.id],
    queryFn: () => getLyrics(currentTrack!.title, currentTrack!.channel, duration || currentTrack!.duration),
    enabled: !!currentTrack,
    staleTime: Infinity,
  });

  const lines = data?.synced ?? null;
  const plain = data?.plain ?? null;

  // Find the index of the current line
  let activeIndex = -1;
  if (lines && lines.length > 0) {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (currentTime >= lines[i].time) {
        activeIndex = i;
        break;
      }
    }
  }

  return { lines, plain, activeIndex, isLoading, hasLyrics: !!(lines || plain) };
}
