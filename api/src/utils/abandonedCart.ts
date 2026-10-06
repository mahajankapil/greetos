import { prisma } from '../config/prisma';

/**
 * Marks a customer's abandoned cart as recovered once they actually order.
 *
 * Called from both order paths. Two reasons it matters:
 *  - the nightly reminder job skips recovered rows, so a customer who has
 *    already bought is never emailed asking them to come back and buy;
 *  - `recoveredAt` is what makes the feature measurable — without it there is
 *    no way to say whether the reminders were worth sending.
 *
 * Never throws: an order must not fail because this bookkeeping did.
 */
export async function markCartRecovered(email: string | null | undefined): Promise<void> {
  const key = email?.trim().toLowerCase();
  if (!key) return;
  try {
    await prisma.abandonedCart.updateMany({
      where: { email: key, recoveredAt: null },
      data: { recoveredAt: new Date() },
    });
  } catch (e) {
    console.error('Failed to mark abandoned cart recovered for', key, e);
  }
}
