import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth, requireCreator } from '../middleware/auth';
import { HttpError } from '../middleware/error';
import { getCreatorEarnings } from '../utils/creatorEarnings';
import { getCreatorSettings } from '../utils/creatorSettings';

/**
 * The partner portal's API.
 *
 * Its whole purpose is: show a partner what they've earned, and let them ask
 * to be paid. It deliberately exposes no order-level detail — a partner sees
 * how many sales their code made and what that earns them, never who bought
 * what, for how much, or when.
 *
 * Every route resolves the caller's own creator row from `Creator.userId`, so
 * no route ever takes a creator id from the URL and one partner physically
 * cannot address another's data.
 */
const router = Router();

router.use(requireAuth, requireCreator);

/** The signed-in partner's creator row, or 403. */
async function currentCreator(userId: string) {
  const creator = await prisma.creator.findUnique({
    where: { userId },
    include: { coupon: true },
  });
  if (!creator) throw new HttpError(403, 'This account is not linked to a partner profile.');
  if (!creator.isActive) throw new HttpError(403, 'This partner account is paused. Please contact us.');
  return creator;
}

/** Everything the portal renders: code, sales count, balance, payout history. */
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const creator = await currentCreator(req.user!.id);
    const [earnings, settings, payouts] = await Promise.all([
      getCreatorEarnings(creator.id),
      getCreatorSettings(),
      prisma.creatorPayout.findMany({ where: { creatorId: creator.id }, orderBy: { createdAt: 'desc' } }),
    ]);

    // Pre-fill the payout form with whatever they used last time.
    const last = payouts[0];

    res.json({
      profile: {
        name: creator.name,
        email: creator.email,
        handle: creator.handle,
        commissionType: creator.commissionType,
        commissionValue: creator.commissionValue,
        joinedAt: creator.createdAt,
      },
      coupon: {
        code: creator.coupon.code,
        discountType: creator.coupon.discountType,
        discountValue: creator.coupon.discountValue,
        minAmount: creator.coupon.minAmount,
        active: creator.coupon.active,
      },
      earnings,
      minPayout: settings.minPayout,
      payouts,
      lastPayoutDetails: last
        ? {
            method: last.method,
            upiId: last.upiId,
            accountName: last.accountName,
            accountNumber: last.accountNumber,
            ifsc: last.ifsc,
            bankName: last.bankName,
          }
        : null,
    });
  }),
);

/**
 * Where the money should go. Exactly one of the two shapes is required, so a
 * request can never arrive with a method the admin can't actually pay to.
 */
const payoutSchema = z
  .object({
    amount: z.number().int().positive(),
    note: z.string().trim().max(300).optional(),
  })
  .and(
    z.discriminatedUnion('method', [
      z.object({
        method: z.literal('upi'),
        // Deliberately loose: UPI handles vary widely (@okaxis, @ybl, @paytm…).
        upiId: z.string().trim().min(3).max(120).regex(/^[^@\s]+@[^@\s]+$/, 'Enter a valid UPI ID, e.g. name@bank'),
      }),
      z.object({
        method: z.literal('bank'),
        accountName: z.string().trim().min(2).max(120),
        accountNumber: z.string().trim().regex(/^\d{6,20}$/, 'Enter a valid account number'),
        ifsc: z
          .string()
          .trim()
          .toUpperCase()
          .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC code, e.g. HDFC0001234'),
        bankName: z.string().trim().max(120).optional(),
      }),
    ]),
  );

/**
 * Request a payout.
 *
 * The available balance is re-computed inside the transaction that writes the
 * request, so two rapid clicks can't each read the same balance and withdraw
 * it twice.
 */
router.post(
  '/me/payouts',
  asyncHandler(async (req, res) => {
    const input = payoutSchema.parse(req.body);
    const creator = await currentCreator(req.user!.id);
    const settings = await getCreatorSettings();

    const payout = await prisma.$transaction(async (tx) => {
      const earnings = await getCreatorEarnings(creator.id, tx);
      if (earnings.available <= 0) {
        throw new HttpError(400, 'You have nothing available to withdraw yet.');
      }
      if (input.amount > earnings.available) {
        throw new HttpError(400, `You can withdraw up to ₹${earnings.available} right now.`);
      }
      if (input.amount < settings.minPayout) {
        throw new HttpError(400, `The minimum payout is ₹${settings.minPayout}.`);
      }

      return tx.creatorPayout.create({
        data: {
          creatorId: creator.id,
          amount: input.amount,
          note: input.note || null,
          method: input.method,
          ...(input.method === 'upi'
            ? { upiId: input.upiId }
            : {
                accountName: input.accountName,
                accountNumber: input.accountNumber,
                ifsc: input.ifsc,
                bankName: input.bankName || null,
              }),
        },
      });
    });

    res.status(201).json(payout);
  }),
);

export default router;
