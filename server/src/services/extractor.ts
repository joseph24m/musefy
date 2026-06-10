import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface StreamCache {
  url: string;
  expiresAt: number;
}

const cache = new Map<string, StreamCache>();

export async function getAudioStreamUrl(videoId: string, forceRefresh = false): Promise<{ url: string; expiresAt: number }> {
  const cached = cache.get(videoId);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  // Try yt-dlp first
  try {
    const { stdout } = await execAsync(
      `yt-dlp -f "bestaudio[ext=m4a]/bestaudio/best" --get-url --no-playlist "${url}"`,
      { timeout: 30000 }
    );
    const streamUrl = stdout.trim().split('\n')[0];
    if (streamUrl && streamUrl.startsWith('http')) {
      const expiresAt = Date.now() + 4 * 60 * 60 * 1000; // 4 hours
      cache.set(videoId, { url: streamUrl, expiresAt });
      return { url: streamUrl, expiresAt };
    }
  } catch (e) {
    console.warn('yt-dlp failed, trying ytdl-core fallback:', (e as Error).message);
  }

  // Fallback: ytdl-core
  try {
    const ytdl = await import('ytdl-core');
    const info = await ytdl.default.getInfo(url);
    const format = ytdl.default.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
    if (format?.url) {
      const expiresAt = Date.now() + 4 * 60 * 60 * 1000;
      cache.set(videoId, { url: format.url, expiresAt });
      return { url: format.url, expiresAt };
    }
  } catch (e2) {
    console.error('ytdl-core also failed:', (e2 as Error).message);
  }

  throw new Error('Unable to extract stream URL');
}
