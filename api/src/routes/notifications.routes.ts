import { Router } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/** Public: active notifications, newest first (shown in the storefront bell). */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const notifications = await prisma.notification.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(
      notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        createdAt: n.createdAt,
      })),
    );
  }),
);

export default router;
