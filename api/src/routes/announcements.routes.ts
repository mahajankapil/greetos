import { Router } from 'express';
import { prisma } from '../config/prisma';
import { DEFAULT_ANNOUNCEMENTS } from '../data/announcements';
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
    if (announcements.length > 0) {
      res.json(announcements.map((announcement) => announcement.message));
      return;
    }

    const legacySetting = await prisma.setting.findUnique({
      where: { key: 'announcement_text' },
      select: { value: true },
    });
    const legacyMessages = legacySetting?.value.split('|').map((message) => message.trim()).filter(Boolean) ?? [];
    res.json(legacyMessages.length > 0 ? legacyMessages : DEFAULT_ANNOUNCEMENTS);
  }),
);

export default router;
