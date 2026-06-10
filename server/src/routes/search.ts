import { Router, Request, Response } from 'express';
import { searchYouTube } from '../services/youtube';
import { searchTracks, LastfmSearchTrack, getArtistInfo } from '../services/lastfm';

const router = Router();

const itunesCache = new Map<string, string>();
// Cache artist fallback image (artist name → url)
const artistImageCache = new Map<string, string>();

async function fetchItunesThumbnail(artist: string, track: string): Promise<string> {
  const key = `${artist}::${track}`.toLowerCase();
  if (itunesCache.has(key)) return itunesCache.get(key)!;

  try {
    const query = encodeURIComponent(`${artist} ${track}`);
    const res = await fetch(
      `https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=5`
    );
    const data = await res.json();
    const results: any[] = data.results ?? [];
    const artistLow = artist.toLowerCase();
    const trackLow = track.toLowerCase();

    // Prefer result where artist matches and track name contains query track name
    const best =
      results.find(
        (r) =>
          r.artistName?.toLowerCase().includes(artistLow) &&
          (r.trackName?.toLowerCase().includes(trackLow) || trackLow.includes(r.trackName?.toLowerCase() ?? ''))
      ) ??
      results.find((r) => r.artistName?.toLowerCase().includes(artistLow)) ??
      results[0];

    const artwork = best?.artworkUrl100 ?? '';
    const thumb = artwork ? artwork.replace('100x100bb', '300x300bb') : '';
    itunesCache.set(key, thumb);
    return thumb;
  } catch {
    return '';
  }
}

async function getArtistFallbackImage(artist: string): Promise<string> {
  if (artistImageCache.has(artist)) return artistImageCache.get(artist)!;
  try {
    const info = await getArtistInfo(artist);
    const img = info?.image ?? '';
    artistImageCache.set(artist, img);
    return img;
  } catch {
    return '';
  }
}

async function enrichWithThumbnails(tracks: LastfmSearchTrack[]): Promise<LastfmSearchTrack[]> {
  const PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f';

  // Fetch all iTunes thumbnails in parallel
  const itunesResults = await Promise.allSettled(
    tracks.map((t) => {
      const needsThumb = !t.thumbnail || t.thumbnail.includes(PLACEHOLDER);
      if (!needsThumb) return Promise.resolve(t.thumbnail);
      return fetchItunesThumbnail(t.artist, t.name);
    })
  );

  // Collect unique artists that still need fallback
  const missingArtists = new Set<string>();
  tracks.forEach((t, i) => {
    const thumb = itunesResults[i].status === 'fulfilled'
      ? (itunesResults[i] as PromiseFulfilledResult<string>).value
      : '';
    if (!thumb) missingArtists.add(t.artist);
  });

  // Fetch artist images for fallback (one per unique artist)
  await Promise.allSettled([...missingArtists].map((a) => getArtistFallbackImage(a)));

  return tracks.map((t, i) => {
    const itunesThumb = itunesResults[i].status === 'fulfilled'
      ? (itunesResults[i] as PromiseFulfilledResult<string>).value
      : '';
    const thumb = itunesThumb || artistImageCache.get(t.artist) || t.thumbnail;
    return { ...t, thumbnail: thumb };
  });
}

router.get('/', async (req: Request, res: Response) => {
  const q = req.query.q as string;
  const type = (req.query.type as string) ?? 'all';
  const source = (req.query.source as string) ?? 'youtube';
  if (!q) return res.status(400).json({ error: 'Missing query' });

  try {
    if (source === 'lastfm') {
      const lfmResults = await searchTracks(q, 30);
      const enriched = lfmResults.length > 0 ? await enrichWithThumbnails(lfmResults) : lfmResults;
      return res.json({ results: enriched, source: 'lastfm' });
    }
    const results = await searchYouTube(q, type);
    res.json({ results, source: 'youtube' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
