import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/playerStore';
import type { Track } from '../services/api';

async function authFetch(url: string) {
  const { supabase } = await import('../lib/supabase');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? '';
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('radio fetch failed');
  return res.json();
}

async function resolveTrack(artist: string, name: string): Promise<Track | null> {
  try {
    const r = await authFetch(
      `/api/artist/resolve?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(name)}`
    );
    if (!r?.id) return null;
    return { id: r.id, title: r.title, channel: r.channel, thumbnail: r.thumbnail, duration: r.duration, type: 'song' };
  } catch {
    return null;
  }
}

export function useRadio() {
  const radioMode = usePlayerStore((s) => s.radioMode);
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const appendRadioTracks = usePlayerStore((s) => s.appendRadioTracks);
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (!radioMode || !currentTrack) return;
    const remaining = queue.length - queueIndex - 1;
    if (remaining > 3 || fetchingRef.current) return;

    fetchingRef.current = true;
    const artist = currentTrack.channel;

    authFetch(`/api/artist/radio?artist=${encodeURIComponent(artist)}`)
      .then(async (seeds: { name: string; artist: string }[]) => {
        const existingIds = new Set(queue.map((t) => t.id));
        const resolved: Track[] = [];
        for (const seed of seeds.slice(0, 8)) {
          if (resolved.length >= 5) break;
          const t = await resolveTrack(seed.artist, seed.name);
          if (t && !existingIds.has(t.id)) {
            resolved.push(t);
            existingIds.add(t.id);
          }
        }
        if (resolved.length > 0) appendRadioTracks(resolved);
      })
      .catch(() => {})
      .finally(() => { fetchingRef.current = false; });
  }, [queueIndex, radioMode, currentTrack?.id]);
}

// One-shot radio starter: build initial queue from artist radio seeds
export async function startRadio(track: Track): Promise<Track[]> {
  const artist = track.channel;
  try {
    const { supabase } = await import('../lib/supabase');
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? '';
    const res = await fetch(`/api/artist/radio?artist=${encodeURIComponent(artist)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [track];
    const seeds: { name: string; artist: string }[] = await res.json();
    const resolved: Track[] = [track];
    const seen = new Set([track.id]);
    for (const seed of seeds.slice(0, 12)) {
      if (resolved.length >= 10) break;
      const t = await resolveTrack(seed.artist, seed.name);
      if (t && !seen.has(t.id)) {
        resolved.push(t);
        seen.add(t.id);
      }
    }
    return resolved;
  } catch {
    return [track];
  }
}
