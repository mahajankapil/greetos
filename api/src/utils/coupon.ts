import { Coupon, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { HttpError } from '../middleware/error';

export interface AppliedCoupon {
  code: string;
  discount: number;
  description: string | null;
}

/** Pure discount math for a coupon against a subtotal (no validation). */
export function computeDiscount(coupon: Coupon, subtotal: number): number {
  let discount =
    coupon.discountType === 'flat' ? coupon.discountValue : Math.floor((subtotal * coupon.discountValue) / 100);
  if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
  return Math.max(0, Math.min(discount, subtotal));
}

/** Non-throwing applicability check for listing coupons (does NOT check per-user limit). */
export function checkCoupon(
  coupon: Coupon,
  subtotal: number,
): { applicable: boolean; reason?: string; potentialDiscount: number } {
  const now = new Date();
  const potentialDiscount = computeDiscount(coupon, subtotal);
  if (!coupon.active) return { applicable: false, reason: 'Not available', potentialDiscount };
  if (coupon.validFrom && now < coupon.validFrom) return { applicable: false, reason: 'Not active yet', potentialDiscount };
  if (coupon.validUntil && now > coupon.validUntil) return { applicable: false, reason: 'Expired', potentialDiscount };
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit)
    return { applicable: false, reason: 'Usage limit reached', potentialDiscount };
  if (subtotal < coupon.minAmount)
    return { applicable: false, reason: `Add ₹${coupon.minAmount - subtotal} more to avail this offer`, potentialDiscount };
  return { applicable: true, potentialDiscount };
}

/**
 * Validates a coupon against a subtotal + user and returns the discount, or throws
 * HttpError(400) with a friendly message. Used both to preview at checkout and to
 * apply at the payment endpoints, so the discount can never be forged client-side.
 */
export async function applyCoupon(
  rawCode: string,
  subtotal: number,
  /**
   * The redeeming customer, or undefined for a guest checkout. A guest cannot
   * be held to a personal or per-user limit — there is no identity to count
   * against — so codes carrying either restriction are refused rather than
   * quietly granted without their limit being enforced.
   */
  userId?: string,
): Promise<AppliedCoupon> {
  const code = rawCode.trim().toUpperCase();
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.active) throw new HttpError(400, 'This coupon code is not valid.');

  // Referral rewards are personal: only the customer they were issued to may
  // redeem them, even though the code would otherwise validate.
  if (coupon.userId && coupon.userId !== userId) {
    throw new HttpError(400, 'This coupon code is not valid.');
  }

  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom) throw new HttpError(400, 'This coupon is not active yet.');
  if (coupon.validUntil && now > coupon.validUntil) throw new HttpError(400, 'This coupon has expired.');
  if (subtotal < coupon.minAmount)
    throw new HttpError(400, `Add ₹${coupon.minAmount - subtotal} more to use this coupon.`);
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit)
    throw new HttpError(400, 'This coupon has reached its usage limit.');
  if (coupon.perUserLimit != null) {
    if (!userId) {
      throw new HttpError(400, 'Please sign in to use this coupon code.');
    }
    const usedByUser = await prisma.order.count({ where: { couponCode: coupon.code, userId } });
    if (usedByUser >= coupon.perUserLimit) throw new HttpError(400, "You've already used this coupon.");
  }

  return { code: coupon.code, discount: computeDiscount(coupon, subtotal), description: coupon.description };
}

/** What a creator earns on one order, given their rate. */
export function computeCommission(
  creator: { commissionType: string; commissionValue: number },
  orderTotal: number,
): number {
  if (creator.commissionType === 'flat') return Math.max(0, creator.commissionValue);
  return Math.max(0, Math.floor((orderTotal * creator.commissionValue) / 100));
}

/**
 * Records a redemption against a paid order and bumps the coupon's counter.
 *
 * Money is snapshotted here rather than recomputed at report time, so editing a
 * coupon or a creator's rate later never rewrites history. Must be given the
 * same transaction client that created the order so the two can't drift apart.
 */
export async function recordRedemption(
  tx: Prisma.TransactionClient,
  input: { code: string; orderId: string; userId: string | null; subtotal: number; discount: number; orderTotal: number },
): Promise<void> {
  const coupon = await tx.coupon.findUnique({ where: { code: input.code }, include: { creator: true } });
  if (!coupon) return;

  const commission = coupon.creator ? computeCommission(coupon.creator, input.orderTotal) : 0;

  await tx.couponRedemption.create({
    data: {
      couponId: coupon.id,
      orderId: input.orderId,
      userId: input.userId,
      code: coupon.code,
      subtotal: input.subtotal,
      discount: input.discount,
      orderTotal: input.orderTotal,
      creatorId: coupon.creator?.id ?? null,
      commission,
    },
  });

  await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
}
