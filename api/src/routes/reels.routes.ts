import { Router } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// Seed initial reels if table is empty or update existing default reels to English
async function seedDefaultReelsIfEmpty() {
  try {
    const count = await (prisma as any).reel.count();
    if (count === 0) {
      await (prisma as any).reel.createMany({
        data: [
          {
            title: 'Pure Herbal Skincare Essentials',
            videoUrl: 'https://mkpillllll.sirv.com/herbal/videos/reel1.mp4',
            thumbnailUrl: null,
            caption: `Discover the secret to effortless, budget-friendly natural skincare! ✨🌿

Our Day Cream provides lightweight daily hydration infused with aloe vera, niacinamide, and shea butter. Keep your skin feeling soft, deeply nourished, and glowing all day long.

How do you use your favourite herbal skincare essentials in your daily routine? Let us know in the comments below! 👇`,
            hashtags: ['RoviqueHerbal', 'HerbalSkincare', 'GlowingSkin', 'NaturalBeauty', 'Ayurveda'],
            instagramUrl: 'https://www.instagram.com/roviqueherbal/',
            productLink: '/products/day-cream',
            productName: 'Day Cream',
            sortOrder: 1,
            isActive: true,
          },
          {
            title: 'Overnight Skin Repair & Nourishment',
            videoUrl: 'https://mkpillllll.sirv.com/herbal/videos/reels2.mp4',
            thumbnailUrl: null,
            caption: `Transform your night skincare routine with 100% natural herbal ingredients! 🌙✨

Our Night Cream is formulated with Saffron, Licorice Extract, and Shea Butter to repair dullness, diminish dark spots, and restore radiant skin overnight.

Experience gentle, chemical-free care crafted with traditional Ayurvedic wisdom for soft, glowing skin every morning.`,
            hashtags: ['OvernightRepair', 'RoviqueHerbal', 'AyurvedicCare', 'HealthySkin', 'GlowSecrets'],
            instagramUrl: 'https://www.instagram.com/roviqueherbal/',
            productLink: '/products/night-cream',
            productName: 'Night Cream',
            sortOrder: 2,
            isActive: true,
          },
        ],
      });
    } else {
      // Update any non-English/old defaults to fresh English content
      await (prisma as any).reel.updateMany({
        where: { videoUrl: 'https://mkpillllll.sirv.com/herbal/videos/reel1.mp4' },
        data: {
          title: 'Pure Herbal Skincare Essentials',
          caption: `Discover the secret to effortless, budget-friendly natural skincare! ✨🌿

Our Day Cream provides lightweight daily hydration infused with aloe vera, niacinamide, and shea butter. Keep your skin feeling soft, deeply nourished, and glowing all day long.

How do you use your favourite herbal skincare essentials in your daily routine? Let us know in the comments below! 👇`,
          hashtags: ['RoviqueHerbal', 'HerbalSkincare', 'GlowingSkin', 'NaturalBeauty', 'Ayurveda'],
          productLink: '/products/day-cream',
          productName: 'Day Cream',
        },
      });

      await (prisma as any).reel.updateMany({
        where: { videoUrl: 'https://mkpillllll.sirv.com/herbal/videos/reels2.mp4' },
        data: {
          title: 'Overnight Skin Repair & Nourishment',
          caption: `Transform your night skincare routine with 100% natural herbal ingredients! 🌙✨

Our Night Cream is formulated with Saffron, Licorice Extract, and Shea Butter to repair dullness, diminish dark spots, and restore radiant skin overnight.

Experience gentle, chemical-free care crafted with traditional Ayurvedic wisdom for soft, glowing skin every morning.`,
          hashtags: ['OvernightRepair', 'RoviqueHerbal', 'AyurvedicCare', 'HealthySkin', 'GlowSecrets'],
          productLink: '/products/night-cream',
          productName: 'Night Cream',
        },
      });
    }
  } catch (err) {
    console.error('Error seeding default reels:', err);
  }
}

// Initial seed trigger
seedDefaultReelsIfEmpty();

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
