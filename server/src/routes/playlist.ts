import { Router, Request, Response } from 'express';
import { getPlaylist } from '../services/youtube';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).json({ error: 'Missing url' });
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (!match) return res.status(400).json({ error: 'Invalid playlist URL' });
  try {
    const tracks = await getPlaylist(match[1]);
    res.json({ tracks });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Playlist fetch failed' });
  }
});

export default router;
