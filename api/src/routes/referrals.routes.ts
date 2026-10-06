import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { checkCoupon } from '../utils/coupon';
import { attachReferral, ensureReferralCode, getReferralSettings } from '../utils/referral';

const router = Router();

/**
 * Public: the headline terms, so the login page can say what a referral code is
 * actually worth before the customer commits to typing one.
 */
router.get(
  '/terms',
  asyncHandler(async (_req, res) => {
    const s = await getReferralSettings();
    res.json({
      enabled: s.enabled,
      refereePercent: s.refereePercent,
      referrerPercent: s.referrerPercent,
      maxDiscount: s.maxDiscount,
      minAmount: s.minAmount,
      validityDays: s.validityDays,
    });
  }),
);

/** Public: does this code exist? Used to validate before/at sign-in. */
router.get(
  '/check/:code',
  asyncHandler(async (req, res) => {
    const code = req.params.code.trim().toUpperCase();
    const settings = await getReferralSettings();
    if (!settings.enabled) {
      res.json({ valid: false, reason: 'The referral programme is not active' });
      return;
    }
    const owner = await prisma.user.findUnique({ where: { referralCode: code } });
    res.json(
      owner && owner.isActive
        ? { valid: true, referrerName: owner.name ?? null, refereePercent: settings.refereePercent }
        : { valid: false, reason: 'That referral code is not valid' },
    );
  }),
);

/**
 * Applies a referral code to the signed-in account. Called right after a
 * first-time login when the customer entered a code. Returns `applied: false`
 * with a reason rather than erroring — a bad code must never block sign-in.
 */
router.post(
  '/apply',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { code } = z.object({ code: z.string().trim().min(1) }).parse(req.body);
    const result = await attachReferral(req.user!.id, code);
    res.json(
      result.ok
        ? { applied: true, couponCode: result.couponCode }
        : { applied: false, reason: result.reason },
    );
  }),
);

/** The signed-in customer's own code plus how their referrals are doing. */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const [code, settings, referrals] = await Promise.all([
      ensureReferralCode(userId),
      getReferralSettings(),
      prisma.referral.findMany({
        where: { referrerId: userId },
        orderBy: { createdAt: 'desc' },
        include: { referee: { select: { name: true, email: true } } },
      }),
    ]);

    res.json({
      code,
      enabled: settings.enabled,
      refereePercent: settings.refereePercent,
      referrerPercent: settings.referrerPercent,
      shareUrl: `${process.env.STOREFRONT_URL ?? 'http://localhost:3000'}/?ref=${code}`,
      stats: {
        total: referrals.length,
        rewarded: referrals.filter((r) => r.status === 'rewarded').length,
        pending: referrals.filter((r) => r.status === 'pending').length,
      },
      referrals: referrals.map((r) => ({
        id: r.id,
        // Only ever a first name — never expose a referee's full email to the referrer.
        name: r.referee.name?.split(' ')[0] ?? 'A friend',
        status: r.status,
        createdAt: r.createdAt,
      })),
    });
  }),
);

/**
 * Coupons belonging to the signed-in customer — the /account/coupons page.
 * Includes both their personal referral rewards and any public codes on offer.
 */
router.get(
  '/coupons/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const now = new Date();

    const [personal, publicCoupons] = await Promise.all([
      prisma.coupon.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.coupon.findMany({
        where: { userId: null, active: true, source: { not: 'creator' } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const shape = (c: (typeof personal)[number], personalCoupon: boolean) => {
      const expired = c.validUntil != null && c.validUntil < now;
      const spent = c.usageLimit != null && c.usedCount >= c.usageLimit;
      return {
        code: c.code,
        description: c.description,
        discountType: c.discountType,
        discountValue: c.discountValue,
        minAmount: c.minAmount,
        maxDiscount: c.maxDiscount,
        validUntil: c.validUntil,
        source: c.source,
        personal: personalCoupon,
        // A personal coupon is single-use, so "used" is a meaningful state here.
        status: !c.active ? 'inactive' : expired ? 'expired' : spent ? 'used' : 'available',
      };
    };

    res.json({
      personal: personal.map((c) => shape(c, true)),
      offers: publicCoupons.filter((c) => checkCoupon(c, Number.MAX_SAFE_INTEGER).applicable).map((c) => shape(c, false)),
    });
  }),
);

export default router;
