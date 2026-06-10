import { Innertube } from 'youtubei.js';

let yt: Innertube | null = null;

async function getYT(): Promise<Innertube> {
  if (!yt) {
    yt = await Innertube.create({ cache: undefined, generate_session_locally: true });
  }
  return yt;
}

export interface TrackResult {
  id: string;
  title: string;
  channel: string;
  duration: number;
  thumbnail: string;
  type: 'song';
}

export async function searchYouTube(query: string, _type: string = 'all'): Promise<TrackResult[]> {
  const innertube = await getYT();
  const results = await innertube.search(query, { type: 'video' });
  const tracks: TrackResult[] = [];

  for (const item of results.videos.slice(0, 20)) {
    if (item.type !== 'Video') continue;
    const id = (item as any).id ?? (item as any).video_id;
    const title = (item as any).title?.text ?? 'Unknown';
    const channel = (item as any).author?.name ?? (item as any).channel?.name ?? 'Unknown';
    const durationText: string = (item as any).duration?.text ?? '0:00';
    const parts = durationText.split(':').map(Number);
    const duration = parts.length === 3
      ? parts[0] * 3600 + parts[1] * 60 + parts[2]
      : parts.length === 2
        ? parts[0] * 60 + parts[1]
        : 0;
    const thumbs = (item as any).thumbnails ?? (item as any).best_thumbnail ? [(item as any).best_thumbnail] : [];
    const thumbnail = thumbs[thumbs.length - 1]?.url ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

    if (id) tracks.push({ id, title, channel, duration, thumbnail, type: 'song' });
  }
  return tracks;
}

export async function getSuggestions(query: string): Promise<string[]> {
  try {
    const innertube = await getYT();
    const completions = await innertube.getSearchSuggestions(query);
    return completions.map((s: any) => (typeof s === 'string' ? s : s?.suggestion?.text ?? '')).filter(Boolean).slice(0, 8);
  } catch {
    return [];
  }
}

export async function getRelated(videoId: string): Promise<TrackResult[]> {
  const innertube = await getYT();
  const info = await innertube.getInfo(videoId);
  const feed: any[] = (info as any).watch_next_feed ?? [];
  const tracks: TrackResult[] = [];

  for (const item of feed) {
    if (item?.type !== 'LockupView' || item?.content_type !== 'VIDEO') continue;
    const id: string = item.content_id;
    if (!id || typeof id !== 'string' || id.length < 5) continue;

    const title: string = item.metadata?.title?.text ?? 'Unknown';
    const rows: any[] = item.metadata?.metadata?.metadata_rows ?? [];
    const channel: string = rows[0]?.metadata_parts?.[0]?.text?.text ?? 'Unknown';
    const thumbnail = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

    tracks.push({ id, title, channel, duration: 0, thumbnail, type: 'song' });
    if (tracks.length >= 15) break;
  }
  return tracks;
}

export async function getArtistTracks(artistName: string): Promise<TrackResult[]> {
  const innertube = await getYT();

  // Search for the artist as a channel first
  const channelSearch = await innertube.search(artistName, { type: 'channel' });
  const channelItem = (channelSearch as any).channels?.[0] ?? (channelSearch as any).results?.[0];
  const channelId: string | null = channelItem?.id ?? channelItem?.channel_id ?? null;

  // If we found a channel, fetch their videos with pagination
  if (channelId) {
    try {
      const channel = await innertube.getChannel(channelId);
      let videosTab = await (channel as any).getVideos?.();
      const tracks: TrackResult[] = [];
      let pages = 0;

      while (videosTab && pages < 3) {
        const items: any[] = videosTab?.videos ?? videosTab?.contents ?? [];

        for (const item of items) {
          const id = item?.id ?? item?.video_id;
          if (!id) continue;
          const title: string = item?.title?.text ?? item?.title ?? 'Unknown';
          const durationText: string = item?.duration?.text ?? '0:00';
          const parts = durationText.split(':').map(Number);
          const duration = parts.length === 3
            ? parts[0] * 3600 + parts[1] * 60 + parts[2]
            : parts.length === 2 ? parts[0] * 60 + parts[1] : 0;
          // Skip videos longer than 12 min (likely live concerts/interviews)
          if (duration > 720) continue;
          const thumbnail = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
          tracks.push({ id, title, channel: artistName, duration, thumbnail, type: 'song' });
        }

        // Try to get next page
        if (videosTab?.has_continuation) {
          try {
            videosTab = await videosTab.getContinuation?.();
          } catch {
            break;
          }
        } else {
          break;
        }
        pages++;
      }

      if (tracks.length > 0) return tracks;
    } catch {
      // fallback to filtered search below
    }
  }

  // Fallback: search videos and keep only exact channel matches
  const results = await innertube.search(`${artistName} official`, { type: 'video' });
  const tracks: TrackResult[] = [];
  const nameLower = artistName.toLowerCase();

  for (const item of (results as any).videos?.slice(0, 30) ?? []) {
    if (item?.type !== 'Video') continue;
    const channel: string = item?.author?.name ?? item?.channel?.name ?? '';
    if (!channel.toLowerCase().includes(nameLower) && !nameLower.includes(channel.toLowerCase())) continue;
    const id = item?.id ?? item?.video_id;
    if (!id) continue;
    const title: string = item?.title?.text ?? 'Unknown';
    const durationText: string = item?.duration?.text ?? '0:00';
    const parts = durationText.split(':').map(Number);
    const duration = parts.length === 3
      ? parts[0] * 3600 + parts[1] * 60 + parts[2]
      : parts.length === 2 ? parts[0] * 60 + parts[1] : 0;
    const thumbnail = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    tracks.push({ id, title, channel, duration, thumbnail, type: 'song' });
    if (tracks.length >= 20) break;
  }
  return tracks;
}

export async function getPlaylist(playlistId: string): Promise<TrackResult[]> {
  const innertube = await getYT();
  const playlist = await innertube.getPlaylist(playlistId);
  const tracks: TrackResult[] = [];

  for (const item of (playlist.videos ?? []).slice(0, 50)) {
    const id = (item as any).id ?? (item as any).video_id;
    if (!id) continue;
    const title = (item as any).title?.text ?? 'Unknown';
    const channel = (item as any).author?.name ?? 'Unknown';
    const thumbnail = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    tracks.push({ id, title, channel, duration: 0, thumbnail, type: 'song' });
  }
  return tracks;
}
