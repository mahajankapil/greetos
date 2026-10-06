import { useEffect, useState } from 'react';
import { SITE } from '@/lib/site';

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5002/api').replace(/\/$/, '');

export interface ShippingRates {
  homeState: string;
  localRate: number;
  otherRate: number;
  freeAbove: number;
  /** The charge for a payable total going to `state`, in whole rupees. */
  chargeFor: (payable: number, state: string | null | undefined) => number;
}

const num = (raw: unknown, fallback: number): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
};

/**
 * The live delivery rates, so the checkout previews the number the server will
 * actually charge rather than a constant baked into the bundle.
 *
 * This mirrors `computeShipping` in the API on purpose. The server is still
 * the only thing that decides what a customer pays — this exists so the total
 * on screen does not change when they press pay.
 */
export function useShippingRates(): ShippingRates {
  const [rates, setRates] = useState<{
    homeState: string;
    localRate: number;
    otherRate: number;
    freeAbove: number;
  }>({
    homeState: 'Maharashtra',
    localRate: SITE.shipping.flatRate,
    otherRate: SITE.shipping.flatRate,
    freeAbove: SITE.shipping.freeAbove,
  });

  useEffect(() => {
    let cancelled = false;
    fetch(`${BASE}/settings`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((s: Record<string, string>) => {
        if (cancelled) return;
        // A store configured before rates were split by state still has only
        // the old flat rate; use it for both until someone sets the new ones.
        const legacy = s.shipping_flat_rate;
        setRates({
          homeState: (s.shipping_home_state || 'Maharashtra').trim(),
          localRate: num(s.shipping_local_rate ?? legacy, SITE.shipping.flatRate),
          otherRate: num(s.shipping_other_rate ?? legacy, SITE.shipping.flatRate),
          freeAbove: num(s.shipping_free_above, SITE.shipping.freeAbove),
        });
      })
      .catch(() => {
        /* keep the shipped defaults — the server still decides the real charge */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    ...rates,
    chargeFor: (payable, state) => {
      if (rates.freeAbove > 0 && payable >= rates.freeAbove) return 0;
      // An unknown state is quoted the higher rate, matching the server.
      const isHome = (state ?? '').trim().toLowerCase() === rates.homeState.toLowerCase();
      return isHome ? rates.localRate : rates.otherRate;
    },
  };
}
