import { Router, Request, Response } from 'express';
import { getAudioStreamUrl } from '../services/extractor';

const router = Router();

router.get('/:videoId', async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const forceRefresh = req.query.refresh === 'true';
  if (!videoId) return res.status(400).json({ error: 'Missing videoId' });
  try {
    const result = await getAudioStreamUrl(videoId, forceRefresh);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Stream extraction failed' });
  }
});

export default router;
