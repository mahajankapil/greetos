import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * Abandoned-cart capture (client requirement Q7).
 *
 * A cart is recorded when a signed-in customer reaches checkout but has not
 * yet paid. Capture is deliberately keyed on the customer's EMAIL rather than
 * their user id, because the reminder is an email — a row we cannot mail is
 * of no use, and email is the one thing we are guaranteed to have (it is how
 * they signed in).
 */

const itemSchema = z.object({
  productTitle: z.string().min(1).max(300),
  optionName: z.string().max(300).default(''),
  price: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  handle: z.string().max(300).optional(),
  image: z.string().max(2000).optional(),
});

const captureSchema = z.object({
  items: z.array(itemSchema).max(100),
});

/**
 * Record (or refresh) the signed-in customer's current cart.
 *
 * Sending an empty cart deletes the row: the customer emptied their bag on
 * purpose, and mailing them about a cart they cleared themselves is exactly
 * the kind of message that gets a sender marked as spam.
 */
router.post(
  '/abandoned',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { items } = captureSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { email: true },
    });
    const email = user?.email?.trim().toLowerCase();
    if (!email) {
      // No address, nothing to remind. Not an error — just nothing to do.
      res.json({ ok: true, captured: false });
      return;
    }

    if (items.length === 0) {
      await prisma.abandonedCart.deleteMany({ where: { email } });
      res.json({ ok: true, captured: false });
      return;
    }

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    await prisma.abandonedCart.upsert({
      where: { email },
      // Re-arriving at checkout resets the reminder state: this is a fresh
      // abandonment, so it deserves a fresh reminder rather than being skipped
      // because an older cart was already mailed about.
      update: {
        items: items as object,
        subtotal,
        userId: req.user!.id,
        remindedAt: null,
        reminderCount: 0,
        recoveredAt: null,
      },
      create: { email, userId: req.user!.id, items: items as object, subtotal },
    });

    res.json({ ok: true, captured: true });
  }),
);

export default router;
