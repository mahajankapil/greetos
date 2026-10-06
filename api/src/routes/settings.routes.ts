import { Router } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * Settings the storefront is allowed to read.
 *
 * This endpoint is public and unauthenticated, so it returns an allowlist
 * rather than every row in the table. The table also holds the business's GST
 * identity and the invoice counter, and it is the natural place for an admin
 * to park a key or token later — none of which belongs in a response anyone
 * on the internet can fetch. Adding a setting no longer widens this surface
 * by accident: a new key is private until it is named here.
 */
const PUBLIC_SETTING_KEYS = [
  'announcement_text',
  'hero_banners',
  'hero_banner_desktop',
  'hero_banner_mobile',
  'home_categories',
  'homepage_gallery',
  'homepage_feature_banner',
  // Campaign/festival block and the first-visit welcome popup. Both are read
  // by the storefront, so both MUST be listed here — a key the storefront
  // reads but this allowlist omits is silently dead.
  'homepage_campaign',
  'welcome_popup',
  'blog_posts',
  'our_story_section',
  'legal_privacy_policy',
  'legal_refund_policy',
  'legal_terms_of_service',
  'legal_shipping_policy',
  // Delivery rates, so the storefront can show the same number the server
  // will charge. A key the storefront reads but this allowlist omits is
  // silently dead, which is how a preview drifts from the real total.
  'shipping_home_state',
  'shipping_local_rate',
  'shipping_other_rate',
  'shipping_free_above',
  /** Superseded by the pair above; still read as a fallback. */
  'shipping_flat_rate',
] as const;

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const settings = await prisma.setting.findMany({
      where: { key: { in: [...PUBLIC_SETTING_KEYS] } },
      select: { key: true, value: true },
    });
    const settingsMap = settings.reduce<Record<string, string>>((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    res.json(settingsMap);
  }),
);

export default router;
