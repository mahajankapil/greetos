import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

/**
 * What a partner has earned, and what they can actually withdraw.
 *
 * There is deliberately no per-redemption settlement state. Commission becomes
 * payable the moment its order reaches Delivered, which is a property of the
 * order itself — so "payable" is a query filter, not a column anyone has to
 * remember to flip. Settlement is then a running balance: payouts are
 * subtracted from lifetime earnings.
 *
 * Both the admin panel and the partner portal read these same numbers, so the
 * two sides can never disagree about what is owed.
 */

/**
 * The one definition of "this commission is real money we owe".
 *
 * Delivered      — the goods actually arrived (the rule the client asked for).
 * paid           — excludes COD orders that were never collected. A COD order
 *                  flips to paid when an admin marks it Delivered, so in
 *                  practice this only screens out genuinely unpaid orders.
 * no accepted return — a delivered order that came back isn't a sale.
 */
export const PAYABLE_ORDER_FILTER = {
  status: 'Delivered',
  paymentStatus: 'paid',
  returnRequests: { none: { status: 'Accepted' } },
} satisfies Prisma.OrderWhereInput;

export interface CreatorEarnings {
  /** Orders that counted — delivered, paid, not returned. */
  confirmedOrders: number;
  /** Orders placed with the code but not yet delivered. */
  pendingOrders: number;
  /** Commission on delivered, paid, un-returned orders. */
  payableCommission: number;
  /** Commission on orders still in flight — shown to the partner, never withdrawable. */
  pendingCommission: number;
  /** Everything the partner has ever earned. */
  lifetimeEarned: number;
  /** Already requested (awaiting settlement) — held back so it can't be requested twice. */
  requestedPayouts: number;
  /** Already settled. */
  paidPayouts: number;
  /** What the partner can withdraw right now. Never negative. */
  available: number;
}

/**
 * Computes one partner's balance.
 *
 * Pass `tx` when calling inside a transaction (payout requests do, so the
 * available balance can't be read stale between two rapid clicks).
 */
export async function getCreatorEarnings(
  creatorId: string,
  tx: Prisma.TransactionClient = prisma,
): Promise<CreatorEarnings> {
  const [payableAgg, pendingAgg, payoutRows] = await Promise.all([
    tx.couponRedemption.aggregate({
      _count: { id: true },
      _sum: { commission: true },
      where: { creatorId, order: PAYABLE_ORDER_FILTER },
    }),
    tx.couponRedemption.aggregate({
      _count: { id: true },
      _sum: { commission: true },
      where: { creatorId, order: { NOT: PAYABLE_ORDER_FILTER } },
    }),
    tx.creatorPayout.groupBy({
      by: ['status'],
      _sum: { amount: true },
      where: { creatorId, status: { in: ['requested', 'paid'] } },
    }),
  ]);

  const payableCommission = payableAgg._sum.commission ?? 0;
  const pendingCommission = pendingAgg._sum.commission ?? 0;
  const requestedPayouts = payoutRows.find((r) => r.status === 'requested')?._sum.amount ?? 0;
  const paidPayouts = payoutRows.find((r) => r.status === 'paid')?._sum.amount ?? 0;

  return {
    confirmedOrders: payableAgg._count.id,
    pendingOrders: pendingAgg._count.id,
    payableCommission,
    pendingCommission,
    lifetimeEarned: payableCommission,
    requestedPayouts,
    paidPayouts,
    // Clamped: a return accepted after a payout was already settled can push
    // lifetime earnings below what's been committed. That shortfall must never
    // become a negative balance or be silently re-withdrawable.
    available: Math.max(0, payableCommission - requestedPayouts - paidPayouts),
  };
}

/**
 * Payable commission for many creators at once, keyed by creator id.
 *
 * Used by the admin list so it doesn't have to load every redemption row for
 * every creator just to add up four numbers.
 */
export async function payableCommissionByCreator(): Promise<Map<string, number>> {
  const rows = await prisma.couponRedemption.groupBy({
    by: ['creatorId'],
    _sum: { commission: true },
    where: { creatorId: { not: null }, order: PAYABLE_ORDER_FILTER },
  });
  return new Map(rows.map((r) => [r.creatorId as string, r._sum.commission ?? 0]));
}

/** Payout totals per creator per status, keyed `${creatorId}:${status}`. */
export async function payoutsByCreator(): Promise<Map<string, number>> {
  const rows = await prisma.creatorPayout.groupBy({
    by: ['creatorId', 'status'],
    _sum: { amount: true },
  });
  return new Map(rows.map((r) => [`${r.creatorId}:${r.status}`, r._sum.amount ?? 0]));
}

/** True when this redemption's commission is real money owed (per PAYABLE_ORDER_FILTER). */
export function isRedemptionPayable(order: {
  status: string;
  paymentStatus: string;
  returnRequests?: { status: string }[];
}): boolean {
  return (
    order.status === 'Delivered' &&
    order.paymentStatus === 'paid' &&
    !(order.returnRequests ?? []).some((r) => r.status === 'Accepted')
  );
}
