import { Router, Request, Response } from 'express';
import { getRelated } from '../services/youtube';

const router = Router();

router.get('/:videoId', async (req: Request, res: Response) => {
  const { videoId } = req.params;
  try {
    const tracks = await getRelated(videoId);
    res.json({ tracks });
  } catch (e) {
    console.error('getRelated failed:', e);
    res.status(500).json({ error: 'Related fetch failed' });
  }
});

export default router;
