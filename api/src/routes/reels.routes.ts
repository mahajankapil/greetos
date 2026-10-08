import { Router } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();


/** Public: get all active reels ordered by sortOrder asc */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const reels = await (prisma as any).reel.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(reels);
  }),
);

/** Admin: get all reels (active and inactive) */
router.get(
  '/admin',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const reels = await (prisma as any).reel.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    res.json(reels);
  }),
);

/** Admin: create new reel */
router.post(
  '/',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { title, videoUrl, thumbnailUrl, caption, hashtags, instagramUrl, productLink, productName, sortOrder, isActive } = req.body;
    
    if (!videoUrl) {
      res.status(400).json({ error: 'Video URL is required' });
      return;
    }

    const reel = await (prisma as any).reel.create({
      data: {
        title: title ?? null,
        videoUrl,
        thumbnailUrl: thumbnailUrl ?? null,
        caption: caption ?? null,
        hashtags: Array.isArray(hashtags) ? hashtags : (hashtags ? hashtags.split(',').map((s: string) => s.trim()) : []),
        instagramUrl: instagramUrl ?? null,
        productLink: productLink ?? null,
        productName: productName ?? null,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
        isActive: typeof isActive === 'boolean' ? isActive : true,
      },
    });

    res.status(201).json(reel);
  }),
);

/** Admin: update reel */
router.put(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, videoUrl, thumbnailUrl, caption, hashtags, instagramUrl, productLink, productName, sortOrder, isActive } = req.body;

    const existing = await (prisma as any).reel.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Reel not found' });
      return;
    }

    const updated = await (prisma as any).reel.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existing.title,
        videoUrl: videoUrl !== undefined ? videoUrl : existing.videoUrl,
        thumbnailUrl: thumbnailUrl !== undefined ? thumbnailUrl : existing.thumbnailUrl,
        caption: caption !== undefined ? caption : existing.caption,
        hashtags: hashtags !== undefined ? (Array.isArray(hashtags) ? hashtags : (hashtags ? hashtags.split(',').map((s: string) => s.trim()) : [])) : existing.hashtags,
        instagramUrl: instagramUrl !== undefined ? instagramUrl : existing.instagramUrl,
        productLink: productLink !== undefined ? productLink : existing.productLink,
        productName: productName !== undefined ? productName : existing.productName,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : existing.sortOrder,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });

    res.json(updated);
  }),
);

/** Admin: delete reel */
router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await (prisma as any).reel.delete({ where: { id } });
    res.json({ ok: true, id });
  }),
);

export default router;
