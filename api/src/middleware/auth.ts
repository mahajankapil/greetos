import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../config/prisma';

/** Requires a valid Bearer JWT; loads the user and confirms it's active. */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing authorization token' });
      return;
    }
    const token = header.slice(7);
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid or inactive account' });
      return;
    }
    req.user = { id: user.id, role: user.role, phone: user.phone };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Attaches the user when a valid token is present, and simply continues when
 * one is not.
 *
 * This is what makes guest checkout possible: the same endpoint serves a
 * signed-in customer (order linked to their account) and a guest (order linked
 * to nobody), without the caller having to pick a different route. A bad or
 * expired token is treated as "not signed in" rather than as an error —
 * someone whose session quietly lapsed should still be able to buy.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const payload = verifyToken(header.slice(7));
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (user?.isActive) req.user = { id: user.id, role: user.role, phone: user.phone };
    }
  } catch {
    // Not signed in. Deliberately not an error.
  }
  next();
}

/** Must run after requireAuth. Rejects non-admins. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

/**
 * Must run after requireAuth. Rejects anyone who isn't a partner/creator.
 *
 * Deliberately does NOT admit admins: creator routes answer "which creator am
 * I?" from `Creator.userId`, and an admin has no creator row. Admins read the
 * same numbers through /api/admin/creators instead.
 */
export function requireCreator(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'creator') {
    res.status(403).json({ error: 'Partner access required' });
    return;
  }
  next();
}
