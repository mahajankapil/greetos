/**
 * Single source of truth for the brand's public details.
 *
 * These are not decoration. A store running Google Ads (or applying to
 * AdSense) is expected to publish a real business identity — a working contact
 * address, phone and postal address — and the policy pages reference these in
 * several places. Keeping them here means updating the business address once
 * rather than in nine files, and makes it obvious what is still a placeholder.
 *
 * TODO: every value marked PLACEHOLDER must be replaced with the
 * client's real registered details before the site goes live. Google rejects
 * stores whose contact and policy pages are unverifiable.
 */
export const SITE = {
  name: 'Old Spice Agro Fresh LLP',
  legalName: 'Old Spice Agro Fresh LLP',
  tagline: '100% Organic Farm Fresh Vegetables & Herbs',
  logoUrl: 'https://mkpillllll.sirv.com/oldspice/categ/products/logooldspice.png',
  /** Used to build canonical + structured-data URLs. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://oldspiceagrofresh.com',
  email: 'support@oldspiceagrofresh.com',
  phone: '+91 98765 43210',
  /** Shown on Contact and cited by the policy pages. */
  address: {
    line1: 'Agro Fresh Organic Farms',
    city: 'Indapur',
    state: 'Maharashtra',
    pincode: '413106',
    country: 'India',
  },
  /** Kept in step with the seeded shipping settings in the API. */
  shipping: {
    flatRate: 50,
    freeAbove: 499,
    dispatchDays: 'Same day harvest & dispatch',
    deliveryDays: '1–2 business days',
  },
  returnWindowDays: 7,
} as const;

export function formattedAddress(): string {
  const a = SITE.address;
  return `${a.line1}, ${a.city}, ${a.state} ${a.pincode}, ${a.country}`;
}
