/**
 * Sends abandoned-cart reminders (client requirement Q7).
 *
 * Run on a schedule, e.g. hourly:
 *   0 * * * * cd <repo>/api && npx tsx scripts/send-cart-reminders.ts
 *
 * Safe to run as often as you like: a cart is only mailed once it has been
 * idle for DELAY_HOURS, at most MAX_REMINDERS times, never after the customer
 * has ordered, and never twice within GAP_HOURS. Those four conditions are the
 * difference between a reminder and spam.
 */
import { prisma } from '../src/config/prisma';
import { emailConfigured, sendAbandonedCartEmail, type AbandonedCartEmailItem } from '../src/services/email';

/** How long a cart must sit untouched before the first reminder. */
const DELAY_HOURS = 4;
/** Minimum gap between the first and second reminder. */
const GAP_HOURS = 44;
/** Total reminders per abandoned cart, ever. */
const MAX_REMINDERS = 2;

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

async function main() {
  if (!emailConfigured()) {
    console.log('SMTP is not configured — nothing sent.');
    return;
  }

  const candidates = await prisma.abandonedCart.findMany({
    where: {
      recoveredAt: null,
      reminderCount: { lt: MAX_REMINDERS },
      // Idle long enough to count as abandoned rather than in-progress.
      updatedAt: { lt: hoursAgo(DELAY_HOURS) },
      OR: [{ remindedAt: null }, { remindedAt: { lt: hoursAgo(GAP_HOURS) } }],
    },
    orderBy: { updatedAt: 'asc' },
    // A cap so a backlog cannot turn into one enormous send.
    take: 200,
  });

  console.log(`${candidates.length} cart(s) due a reminder.`);
  let sent = 0;

  for (const cart of candidates) {
    const items = (Array.isArray(cart.items) ? cart.items : []) as AbandonedCartEmailItem[];
    if (items.length === 0) continue;

    try {
      await sendAbandonedCartEmail(cart.email, items, cart.subtotal);
      // Written only after the send succeeds, so a transient SMTP failure
      // leaves the cart eligible for the next run instead of burning its
      // one-and-only reminder on an email that never arrived.
      await prisma.abandonedCart.update({
        where: { id: cart.id },
        data: { remindedAt: new Date(), reminderCount: { increment: 1 } },
      });
      sent += 1;
    } catch (e) {
      console.error(`Reminder failed for ${cart.email}:`, e instanceof Error ? e.message : e);
    }
  }

  console.log(`Sent ${sent} reminder(s).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
