import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { optionalAuth } from '../middleware/auth';
import { applyCoupon, checkCoupon } from '../utils/coupon';

const router = Router();

const itemSchema = z.object({
  productTitle: z.string().min(1),
  optionName: z.string().min(1),
  price: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
});

function subtotalOf(items: z.infer<typeof itemSchema>[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

/** Preview a coupon against the current cart (does not consume it). */
router.post(
  '/apply',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { code, items } = z.object({ code: z.string().min(1), items: z.array(itemSchema).min(1) }).parse(req.body);
    const subtotal = subtotalOf(items);
    const applied = await applyCoupon(code, subtotal, req.user?.id);
    res.json({ ...applied, subtotal, discountedTotal: subtotal - applied.discount });
  }),
);

/** List active coupons for the current cart, flagged available / unavailable. */
router.post(
  '/available',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { items } = z.object({ items: z.array(itemSchema).min(1) }).parse(req.body);
    const subtotal = subtotalOf(items);
    const coupons = await prisma.coupon.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' } });
    res.json(
      coupons.map((c) => {
        const evalResult = checkCoupon(c, subtotal);
        return {
          code: c.code,
          description: c.description,
          discountType: c.discountType,
          discountValue: c.discountValue,
          minAmount: c.minAmount,
          ...evalResult,
        };
      }),
    );
  }),
);

export default router;
