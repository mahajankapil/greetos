import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

/**
 * Referral programme.
 *
 * Both sides are rewarded with a personal, single-use coupon, but at different
 * moments: the referee gets theirs the instant they sign up with a code (that's
 * the incentive to enter one), while the referrer only gets theirs once the
 * referee has actually paid for an order. Rewarding the referrer at signup would
 * let one person mint unlimited coupons from throwaway accounts.
 *
 * All the numbers are admin-editable and live in the Setting table.
 */

export interface ReferralSettings {
  enabled: boolean;
  refereePercent: number;
  referrerPercent: number;
  maxDiscount: number | null;
  minAmount: number;
  validityDays: number;
}

export const REFERRAL_DEFAULTS: ReferralSettings = {
  enabled: true,
  refereePercent: 10,
  referrerPercent: 15,
  maxDiscount: 500,
  minAmount: 0,
  validityDays: 90,
};

export const REFERRAL_SETTING_KEYS = {
  enabled: 'referral_enabled',
  refereePercent: 'referral_referee_percent',
  referrerPercent: 'referral_referrer_percent',
  maxDiscount: 'referral_max_discount',
  minAmount: 'referral_min_amount',
  validityDays: 'referral_validity_days',
} as const;

function toInt(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function getReferralSettings(): Promise<ReferralSettings> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: Object.values(REFERRAL_SETTING_KEYS) } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const rawMax = map[REFERRAL_SETTING_KEYS.maxDiscount];

  return {
    enabled: (map[REFERRAL_SETTING_KEYS.enabled] ?? String(REFERRAL_DEFAULTS.enabled)) !== 'false',
    refereePercent: toInt(map[REFERRAL_SETTING_KEYS.refereePercent], REFERRAL_DEFAULTS.refereePercent),
    referrerPercent: toInt(map[REFERRAL_SETTING_KEYS.referrerPercent], REFERRAL_DEFAULTS.referrerPercent),
    maxDiscount: rawMax === '' || rawMax === '0' ? null : toInt(rawMax, REFERRAL_DEFAULTS.maxDiscount ?? 0) || null,
    minAmount: toInt(map[REFERRAL_SETTING_KEYS.minAmount], REFERRAL_DEFAULTS.minAmount),
    validityDays: toInt(map[REFERRAL_SETTING_KEYS.validityDays], REFERRAL_DEFAULTS.validityDays),
  };
}

/** Unambiguous alphabet — no O/0, I/1 — so codes survive being read aloud. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomToken(length: number): string {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** Derives a readable prefix from a name/email so codes look personal. */
function prefixFor(user: { name: string | null; email: string | null }): string {
  const base = (user.name ?? user.email?.split('@')[0] ?? 'SYW').toUpperCase().replace(/[^A-Z]/g, '');
  return (base.slice(0, 5) || 'SYW').padEnd(3, 'X');
}

/**
 * Returns the user's referral code, generating and persisting one on first use.
 * Retries on the (unlikely) unique collision rather than failing the request.
 */
export async function ensureReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  if (user.referralCode) return user.referralCode;

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = `${prefixFor(user)}${randomToken(4)}`;
    try {
      const updated = await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
      return updated.referralCode!;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
      throw e;
    }
  }
  throw new Error('Could not allocate a referral code');
}

/** Creates a personal, single-use percentage coupon owned by one customer. */
async function issuePersonalCoupon(opts: {
  userId: string;
  percent: number;
  label: string;
  description: string;
  settings: ReferralSettings;
}): Promise<string | null> {
  if (opts.percent <= 0) return null;

  const validUntil = new Date(Date.now() + opts.settings.validityDays * 24 * 60 * 60 * 1000);

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = `${opts.label}${randomToken(5)}`;
    try {
      const coupon = await prisma.coupon.create({
        data: {
          code,
          description: opts.description,
          discountType: 'percent',
          discountValue: opts.percent,
          minAmount: opts.settings.minAmount,
          maxDiscount: opts.settings.maxDiscount,
          usageLimit: 1,
          perUserLimit: 1,
          validUntil,
          source: 'referral',
          userId: opts.userId,
        },
      });
      return coupon.id;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
      throw e;
    }
  }
  return null;
}

export type ReferralAttachResult =
  | { ok: true; couponCode: string | null }
  | { ok: false; reason: string };

/**
 * Links a brand-new customer to the owner of `rawCode` and issues the referee's
 * reward immediately. Safe to call with any user input — every failure mode
 * returns a reason rather than throwing, because a bad referral code must never
 * block someone from logging in.
 */
export async function attachReferral(refereeId: string, rawCode: string): Promise<ReferralAttachResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, reason: 'No code supplied' };

  const settings = await getReferralSettings();
  if (!settings.enabled) return { ok: false, reason: 'The referral programme is not active' };

  const referrer = await prisma.user.findUnique({ where: { referralCode: code } });
  if (!referrer) return { ok: false, reason: 'That referral code is not valid' };
  if (referrer.id === refereeId) return { ok: false, reason: 'You cannot refer yourself' };
  if (!referrer.isActive) return { ok: false, reason: 'That referral code is no longer active' };

  const already = await prisma.referral.findUnique({ where: { refereeId } });
  if (already) return { ok: false, reason: 'This account has already used a referral code' };

  const couponId = await issuePersonalCoupon({
    userId: refereeId,
    percent: settings.refereePercent,
    label: 'WELCOME',
    description: `${settings.refereePercent}% off your first order — thanks for joining via a referral`,
    settings,
  });

  await prisma.referral.create({
    data: { referrerId: referrer.id, refereeId, code, refereeCouponId: couponId },
  });

  const coupon = couponId ? await prisma.coupon.findUnique({ where: { id: couponId } }) : null;
  return { ok: true, couponCode: coupon?.code ?? null };
}

/**
 * Releases the referrer's reward once their referee has paid for an order.
 * Called after a successful payment; a no-op for customers who weren't referred
 * or whose referrer has already been paid out.
 */
export async function rewardReferrerIfDue(refereeId: string): Promise<void> {
  const referral = await prisma.referral.findUnique({ where: { refereeId } });
  if (!referral || referral.status !== 'pending') return;

  const settings = await getReferralSettings();
  if (!settings.enabled) return;

  const couponId = await issuePersonalCoupon({
    userId: referral.referrerId,
    percent: settings.referrerPercent,
    label: 'THANKS',
    description: `${settings.referrerPercent}% off — someone you referred placed their first order`,
    settings,
  });

  await prisma.referral.update({
    where: { id: referral.id },
    data: { status: 'rewarded', referrerCouponId: couponId, rewardedAt: new Date() },
  });
}
