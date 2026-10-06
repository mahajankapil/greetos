import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  source: z.enum(['popup', 'footer']).default('popup'),
});

/**
 * Capture an email from the welcome popup or the footer newsletter.
 *
 * Public and unauthenticated by necessity — the whole point is to capture a
 * visitor before they have an account.
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { email, source } = subscribeSchema.parse(req.body);

    // The welcome code lives in Settings so the admin owns it. Read here
    // rather than trusted from the client: the browser must not get to decide
    // which coupon it is handed.
    const row = await prisma.setting.findUnique({ where: { key: 'welcome_popup' } });
    let couponCode: string | null = null;
    try {
      const cfg = row ? JSON.parse(row.value) : null;
      const code = typeof cfg?.couponCode === 'string' ? cfg.couponCode.trim().toUpperCase() : '';
      if (code) {
        // Only hand back a code that actually exists and is still usable —
        // showing someone a coupon that fails at checkout is worse than
        // showing them none at all.
        const coupon = await prisma.coupon.findUnique({ where: { code } });
        const now = new Date();
        const live =
          coupon &&
          coupon.active &&
          // A personal coupon (referral reward) must never be handed to a
          // stranger through this form.
          coupon.userId === null &&
          (!coupon.validFrom || coupon.validFrom <= now) &&
          (!coupon.validUntil || coupon.validUntil > now) &&
          (coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit);
        if (live) couponCode = coupon.code;
      }
    } catch {
      // A malformed setting must not break the capture — the email is the
      // thing worth keeping.
      couponCode = null;
    }

    /**
     * Re-subscribing is not an error. `update` deliberately does not touch
     * createdAt, so the original signup date survives, but the coupon code is
     * refreshed in case the campaign has changed since.
     */
    await prisma.subscriber.upsert({
      where: { email },
      update: { couponCode },
      create: { email, source, couponCode },
    });

    res.status(201).json({ ok: true, couponCode });
  }),
);

export default router;
