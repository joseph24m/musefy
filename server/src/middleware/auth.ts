import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email?: string };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.slice(7);
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = { id: data.user.id, email: data.user.email };
    return next();
  } catch {
    return res.status(401).json({ error: 'Auth verification failed' });
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.slice(7);
  try {
    const { data } = await supabaseAdmin.auth.getUser(token);
    if (data.user) {
      req.user = { id: data.user.id, email: data.user.email };
    }
  } catch {
    // ignore
  }
  return next();
}
