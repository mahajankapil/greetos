/**
 * A short, human-quotable order number. Customers read these out over the
 * phone, so it is 5 digits rather than a cuid.
 *
 * Not guaranteed unique by construction — `Order.orderNo` is unique in the
 * database, which is what actually enforces it.
 */
export function makeOrderNo(): string {
  return `rvq-${Math.floor(10000 + Math.random() * 90000)}`;
}

/**
 * The order lifecycle the client asked for: placed, reviewed, processed, then
 * the courier stages. `title` is the value stored in `Order.status`, so these
 * strings are the vocabulary — they must match the admin panel's dropdown and
 * the status→email map in admin.routes.ts, or a stage silently stops notifying.
 */
const STEP_TITLES = [
  { title: 'Order Placed', desc: 'We have your order' },
  { title: 'In Review', desc: 'Confirming your order details' },
  { title: 'In Process', desc: 'Your pieces are being packed' },
  { title: 'Shipped', desc: 'Handed to the courier' },
  { title: 'Out for Delivery', desc: 'On the way to you' },
  { title: 'Delivered', desc: 'Delivered to your address' },
];

/**
 * Builds the tracking timeline for a given order status. Every stage up to and
 * including the current status is marked completed; later stages are pending.
 * This is what the customer's My Orders / Track Order pages render, so calling
 * it whenever the admin changes status keeps the customer's timeline in sync.
 */
export function stepsForStatus(status: string): unknown {
  const idx = status === 'Cancelled' ? 0 : Math.max(0, STEP_TITLES.findIndex((s) => s.title === status));
  return STEP_TITLES.map((s, i) => ({
    ...s,
    status: i <= idx ? 'completed' : 'pending',
    date: i <= idx ? 'Done' : 'Pending',
  }));
}

export function initialOrderSteps(): unknown {
  return stepsForStatus('Order Placed');
}
