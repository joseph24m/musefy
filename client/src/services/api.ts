export interface Track {
  id: string;
  title: string;
  channel: string;
  duration: number;
  thumbnail: string;
  type: 'song';
}

export async function search(query: string, type = 'all'): Promise<Track[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${type}`);
  if (!res.ok) throw new Error('Search failed');
  const data = await res.json();
  return data.results;
}

export interface LastfmSearchResult {
  name: string;
  artist: string;
  listeners: number;
  duration: number;
  thumbnail: string;
}

export async function searchLastfm(query: string): Promise<LastfmSearchResult[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&source=lastfm`);
  if (!res.ok) throw new Error('Search failed');
  const data = await res.json();
  return data.results ?? [];
}

export async function getSuggestions(query: string): Promise<string[]> {
  const res = await fetch(`/api/suggestions?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.suggestions;
}

export async function getStreamUrl(videoId: string, forceRefresh = false): Promise<string> {
  const res = await fetch(`/api/stream/${videoId}${forceRefresh ? '?refresh=true' : ''}`);
  if (!res.ok) throw new Error('Stream fetch failed');
  const data = await res.json();
  return data.url;
}

export async function getRelated(videoId: string): Promise<Track[]> {
  const res = await fetch(`/api/related/${videoId}`);
  if (!res.ok) throw new Error('Related fetch failed');
  const data = await res.json();
  return data.tracks;
}

export async function getPlaylist(url: string): Promise<Track[]> {
  const res = await fetch(`/api/playlist?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error('Playlist fetch failed');
  const data = await res.json();
  return data.tracks;
}

export interface LyricsLine {
  time: number; // seconds
  text: string;
}

export interface LyricsData {
  synced: LyricsLine[] | null;
  plain: string | null;
}

export async function getLyrics(title: string, artist: string, duration?: number): Promise<LyricsData> {
  const params = new URLSearchParams({ title, artist });
  if (duration) params.set('duration', String(Math.floor(duration)));
  const res = await fetch(`/api/lyrics?${params}`);
  if (!res.ok) return { synced: null, plain: null };
  const data = await res.json();
  if (!data) return { synced: null, plain: null };

  const synced = data.syncedLyrics ? parseLrc(data.syncedLyrics) : null;
  const plain = data.plainLyrics ?? null;
  return { synced, plain };
}

function parseLrc(lrc: string): LyricsLine[] {
  const lines: LyricsLine[] = [];
  for (const raw of lrc.split('\n')) {
    const m = raw.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
    if (!m) continue;
    const time = parseInt(m[1]) * 60 + parseInt(m[2]) + parseInt(m[3]) / (m[3].length === 3 ? 1000 : 100);
    const text = m[4].trim();
    lines.push({ time, text });
  }
  return lines.filter((l) => l.text.length > 0);
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
