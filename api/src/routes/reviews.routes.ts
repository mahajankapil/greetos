import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../middleware/error';
import { requireAuth } from '../middleware/auth';
import { recomputeProductRating } from '../utils/reviews';

const router = Router();

/**
 * Product reviews (client requirements Q5 and Q15).
 *
 * The client's flow is: a customer submits a rating, an admin approves it,
 * and only then does it appear under the product. Everything public in this
 * file therefore filters on `approved` — an unmoderated review must never be
 * readable by anyone but its author and an admin.
 */

const createSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().max(4000).optional(),
});

/**
 * Public: the reviews chosen for the home page carousel.
 *
 * Requires BOTH approved and showOnHome. Approval publishes a review on its
 * product page; appearing on the home page is a second, deliberate editorial
 * choice, so a newly approved review never silently lands on the front page.
 */
router.get(
  '/featured',
  asyncHandler(async (_req, res) => {
    const reviews = await prisma.review.findMany({
      where: { approved: true, showOnHome: true },
      orderBy: { createdAt: 'desc' },
      take: 12,
      // Explicit select: adminNote and userId are internal.
      select: {
        id: true,
        authorName: true,
        rating: true,
        title: true,
        body: true,
        verified: true,
        imageUrl: true,
        createdAt: true,
        product: { select: { handle: true, title: true } },
      },
    });
    res.json({ reviews });
  }),
);

/** Public: approved reviews for one product, newest first. */
router.get(
  '/product/:handle',
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { handle: req.params.handle },
      select: { id: true },
    });
    if (!product) throw new HttpError(404, 'Product not found');

    const reviews = await prisma.review.findMany({
      where: { productId: product.id, approved: true },
      orderBy: { createdAt: 'desc' },
      // Explicit select, not the whole row: `userId` and `adminNote` are
      // internal, and a moderation note must never reach the storefront.
      select: {
        id: true,
        authorName: true,
        rating: true,
        title: true,
        body: true,
        verified: true,
        imageUrl: true,
        createdAt: true,
      },
    });

    const distribution = [1, 2, 3, 4, 5].map(
      (star) => reviews.filter((r) => r.rating === star).length,
    );
    const average = reviews.length
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : 0;

    res.json({ reviews, total: reviews.length, average, distribution });
  }),
);

/**
 * The signed-in customer's own review of a product, approved or not.
 *
 * Without this the storefront cannot tell "you have not reviewed this" from
 * "your review is waiting for approval", and would invite the customer to
 * write a second one that the unique constraint then rejects.
 */
router.get(
  '/product/:handle/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { handle: req.params.handle },
      select: { id: true },
    });
    if (!product) throw new HttpError(404, 'Product not found');

    const review = await prisma.review.findUnique({
      where: { productId_userId: { productId: product.id, userId: req.user!.id } },
      select: { id: true, rating: true, title: true, body: true, approved: true, createdAt: true },
    });
    res.json({ review });
  }),
);

/** Customer: submit or replace a review. Always lands unapproved. */
router.post(
  '/product/:handle',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body);
    const product = await prisma.product.findUnique({
      where: { handle: req.params.handle },
      select: { id: true, title: true },
    });
    if (!product) throw new HttpError(404, 'Product not found');

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { name: true, email: true },
    });

    /**
     * "Verified" means this customer actually bought this piece.
     *
     * Matched on the order line's product TITLE, because OrderItem snapshots
     * the title rather than holding a product id — deliberately, so a past
     * order still reads correctly after a product is renamed or deleted. The
     * trade-off is that renaming a product stops matching its older orders;
     * that only ever costs a badge, never money, so it is the right side to
     * err on.
     */
    const purchased = await prisma.order.count({
      where: {
        userId: req.user!.id,
        paymentStatus: 'paid',
        items: { some: { productTitle: product.title } },
      },
    });

    const authorName = (user?.name || user?.email?.split('@')[0] || 'Customer').trim();

    const data = {
      rating: input.rating,
      title: input.title || null,
      body: input.body || null,
      authorName,
      verified: purchased > 0,
      // Editing an existing review sends it back for moderation: otherwise a
      // customer could get a 5-star review approved and then rewrite it.
      approved: false,
    };

    const review = await prisma.review.upsert({
      where: { productId_userId: { productId: product.id, userId: req.user!.id } },
      update: data,
      create: { ...data, productId: product.id, userId: req.user!.id },
      select: { id: true, rating: true, approved: true },
    });

    // An edited review may have been approved a moment ago and counted toward
    // the product's score; it is not any more.
    await recomputeProductRating(product.id);

    res.status(201).json({ review, message: 'Thanks — your review will appear once it is approved.' });
  }),
);

export default router;
