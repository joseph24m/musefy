const API_KEY = process.env.LASTFM_API_KEY!;
const BASE = 'https://ws.audioscrobbler.com/2.0';

async function lfm(params: Record<string, string>) {
  const url = new URL(BASE);
  url.search = new URLSearchParams({ ...params, api_key: API_KEY, format: 'json' }).toString();
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Last.fm error ${res.status}`);
  return res.json();
}

export interface LastfmTrack {
  name: string;
  artist: string;
  duration: number;   // seconds (0 if unknown)
  listeners: number;
  mbid?: string;
}

export interface LastfmArtistInfo {
  name: string;
  image: string;      // largest image URL
  bio: string;
  listeners: number;
}

export async function getArtistTopTracks(artist: string, limit = 50): Promise<LastfmTrack[]> {
  const data = await lfm({ method: 'artist.getTopTracks', artist, limit: String(limit), autocorrect: '1' });
  const tracks = data?.toptracks?.track ?? [];
  return tracks.map((t: any) => ({
    name: t.name,
    artist: t.artist?.name ?? artist,
    duration: parseInt(t.duration ?? '0', 10) || 0,
    listeners: parseInt(t.listeners ?? '0', 10) || 0,
    mbid: t.mbid || undefined,
  }));
}

export async function getArtistInfo(artist: string): Promise<LastfmArtistInfo | null> {
  try {
    const data = await lfm({ method: 'artist.getInfo', artist, autocorrect: '1' });
    const a = data?.artist;
    if (!a) return null;
    const images: any[] = a.image ?? [];
    const image = images.find((i: any) => i.size === 'extralarge')?.['#text']
      ?? images.find((i: any) => i.size === 'large')?.['#text']
      ?? '';
    return {
      name: a.name,
      image,
      bio: a.bio?.summary?.replace(/<[^>]+>/g, '').split('Read more')[0].trim() ?? '',
      listeners: parseInt(a.stats?.listeners ?? '0', 10),
    };
  } catch {
    return null;
  }
}

export async function searchArtist(query: string): Promise<{ name: string; listeners: number }[]> {
  const data = await lfm({ method: 'artist.search', artist: query, limit: '5' });
  const results = data?.results?.artistmatches?.artist ?? [];
  return results.map((a: any) => ({
    name: a.name,
    listeners: parseInt(a.listeners ?? '0', 10),
  }));
}

export interface LastfmSearchTrack {
  name: string;
  artist: string;
  listeners: number;
  duration: number;
  thumbnail: string;
}

export async function getSimilarArtists(artist: string, limit = 5): Promise<string[]> {
  const data = await lfm({ method: 'artist.getSimilar', artist, limit: String(limit), autocorrect: '1' });
  const results = data?.similarartists?.artist ?? [];
  const list = Array.isArray(results) ? results : [results];
  return list.map((a: any) => a.name).filter(Boolean);
}

export async function getTopChartTracks(limit = 20): Promise<LastfmSearchTrack[]> {
  const data = await lfm({ method: 'chart.getTopTracks', limit: String(limit) });
  const results = data?.tracks?.track ?? [];
  const list = Array.isArray(results) ? results : [results];
  return list.map((t: any) => ({
    name: t.name ?? '',
    artist: t.artist?.name ?? '',
    listeners: parseInt(t.listeners ?? '0', 10) || 0,
    duration: parseInt(t.duration ?? '0', 10) || 0,
    thumbnail: '',
  })).filter((t: LastfmSearchTrack) => t.name && t.artist);
}

export async function getGeoTopTracks(country: string, limit = 20): Promise<LastfmSearchTrack[]> {
  const data = await lfm({ method: 'geo.getTopTracks', country, limit: String(limit) });
  const results = data?.tracks?.track ?? [];
  const list = Array.isArray(results) ? results : [results];
  return list.map((t: any) => ({
    name: t.name ?? '',
    artist: t.artist?.name ?? '',
    listeners: parseInt(t.listeners ?? '0', 10) || 0,
    duration: parseInt(t.duration ?? '0', 10) || 0,
    thumbnail: '',
  })).filter((t: LastfmSearchTrack) => t.name && t.artist);
}

export async function getTagTopTracks(tag: string, limit = 30): Promise<LastfmSearchTrack[]> {
  const data = await lfm({ method: 'tag.getTopTracks', tag, limit: String(limit) });
  const results = data?.tracks?.track ?? [];
  const list = Array.isArray(results) ? results : [results];
  return list.map((t: any) => ({
    name: t.name ?? '',
    artist: t.artist?.name ?? '',
    listeners: 0,
    duration: parseInt(t.duration ?? '0', 10) || 0,
    thumbnail: '',
  })).filter((t: LastfmSearchTrack) => t.name && t.artist);
}

export async function getSimilarArtistsWithInfo(artist: string, limit = 8): Promise<{ name: string; image: string; listeners: number }[]> {
  const names = await getSimilarArtists(artist, limit);
  const infos = await Promise.allSettled(names.map((n) => getArtistInfo(n)));
  return infos
    .map((r, i) => r.status === 'fulfilled' && r.value
      ? { name: r.value.name, image: r.value.image, listeners: r.value.listeners }
      : { name: names[i], image: '', listeners: 0 }
    );
}

export async function searchTracks(query: string, limit = 30): Promise<LastfmSearchTrack[]> {
  const data = await lfm({ method: 'track.search', track: query, limit: String(limit) });
  const results = data?.results?.trackmatches?.track ?? [];
  const list = Array.isArray(results) ? results : [results];
  return list.map((t: any) => {
    const images: any[] = t.image ?? [];
    const thumb = images.find((i: any) => i.size === 'large')?.['#text']
      ?? images.find((i: any) => i.size === 'medium')?.['#text']
      ?? '';
    return {
      name: t.name ?? '',
      artist: t.artist ?? '',
      listeners: parseInt(t.listeners ?? '0', 10) || 0,
      duration: parseInt(t.duration ?? '0', 10) || 0,
      thumbnail: thumb,
    };
  }).filter((t: LastfmSearchTrack) => t.name && t.artist);
}
