import { prisma } from '../config/prisma';

/**
 * Delivery charges the admin controls (client requirement Q16).
 *
 * These live in the Setting table rather than in source so the client can
 * change a rate without a deploy. Crucially, the *server* is the only thing
 * that computes the charge — the storefront shows a preview using the same
 * public settings, but what a customer is charged is decided here, so a
 * tampered cart cannot post itself free delivery.
 *
 * The rate depends on where it is going: one price inside the home state,
 * a higher one everywhere else. `freeAbove` still waives both, so a large
 * order ships free wherever it lands.
 */

export const SHIPPING_SETTING_KEYS = {
  /** The state charged the local rate. Everywhere else pays `otherRate`. */
  homeState: 'shipping_home_state',
  localRate: 'shipping_local_rate',
  otherRate: 'shipping_other_rate',
  freeAbove: 'shipping_free_above',
  /**
   * Superseded by the pair above. Still read once, as the seed for both rates
   * on a store that has not been reconfigured yet, so upgrading does not
   * silently change what anyone is charged.
   */
  legacyFlatRate: 'shipping_flat_rate',
} as const;

export interface ShippingSettings {
  /** Compared case-insensitively against the delivery address's state. */
  homeState: string;
  /** Charge for an address inside `homeState`, in whole rupees. */
  localRate: number;
  /** Charge for any other state, in whole rupees. */
  otherRate: number;
  /**
   * Order subtotal (after discount) at or above which delivery is free.
   * 0 disables the threshold, so a rate always applies.
   */
  freeAbove: number;
}

export const SHIPPING_DEFAULTS: ShippingSettings = {
  homeState: 'Maharashtra',
  localRate: 90,
  otherRate: 200,
  freeAbove: 0,
};

function toWholeRupees(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  // A negative delivery charge would pay the customer to order; NaN would
  // poison every total that touches it. Both fall back rather than propagate.
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n);
}

export async function getShippingSettings(): Promise<ShippingSettings> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: Object.values(SHIPPING_SETTING_KEYS) } },
  });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));

  // A store configured before rates were split by state keeps paying its old
  // flat rate everywhere until someone sets the new ones.
  const legacy = byKey.get(SHIPPING_SETTING_KEYS.legacyFlatRate);
  const localFallback = toWholeRupees(legacy, SHIPPING_DEFAULTS.localRate);
  const otherFallback = toWholeRupees(legacy, SHIPPING_DEFAULTS.otherRate);

  return {
    homeState: (byKey.get(SHIPPING_SETTING_KEYS.homeState) || SHIPPING_DEFAULTS.homeState).trim(),
    localRate: toWholeRupees(byKey.get(SHIPPING_SETTING_KEYS.localRate), localFallback),
    otherRate: toWholeRupees(byKey.get(SHIPPING_SETTING_KEYS.otherRate), otherFallback),
    freeAbove: toWholeRupees(byKey.get(SHIPPING_SETTING_KEYS.freeAbove), SHIPPING_DEFAULTS.freeAbove),
  };
}

/**
 * The delivery charge for an order going to `state`.
 *
 * `payable` is the subtotal AFTER any coupon discount, deliberately: a
 * threshold that ignored the discount would promise free delivery on an order
 * the customer did not actually pay that much for.
 *
 * An unknown or missing state is charged the higher rate. Guessing low would
 * mean the shop absorbs the difference on every address it cannot parse.
 */
export function computeShipping(payable: number, state: string | null | undefined, s: ShippingSettings): number {
  if (s.freeAbove > 0 && payable >= s.freeAbove) return 0;
  const isHome = (state ?? '').trim().toLowerCase() === s.homeState.toLowerCase();
  return isHome ? s.localRate : s.otherRate;
}

/** Convenience: read the settings and apply them in one call. */
export async function shippingFor(payable: number, state?: string | null): Promise<number> {
  return computeShipping(payable, state, await getShippingSettings());
}
