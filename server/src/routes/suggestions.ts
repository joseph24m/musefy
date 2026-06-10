import { Router, Request, Response } from 'express';
import { getSuggestions } from '../services/youtube';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const q = req.query.q as string;
  if (!q) return res.json({ suggestions: [] });
  try {
    const suggestions = await getSuggestions(q);
    res.json({ suggestions });
  } catch {
    res.json({ suggestions: [] });
  }
});

export default router;
