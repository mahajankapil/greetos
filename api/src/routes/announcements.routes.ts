import { Router } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/** Public: active announcement bar messages, ordered. */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const announcements = await prisma.announcement.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    // Return plain strings — matches the storefront's current announcement shape.
    res.json(announcements.map((a) => a.message));
  }),
);

export default router;
