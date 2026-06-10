import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';

export function useMediaSession() {
  const { currentTrack, play, pause, next, prev } = usePlayerStore();

  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.channel,
      album: '',
      artwork: [{ src: currentTrack.thumbnail, sizes: '512x512', type: 'image/jpeg' }],
    });

    navigator.mediaSession.setActionHandler('play', play);
    navigator.mediaSession.setActionHandler('pause', pause);
    navigator.mediaSession.setActionHandler('nexttrack', next);
    navigator.mediaSession.setActionHandler('previoustrack', prev);
  }, [currentTrack]);
}
