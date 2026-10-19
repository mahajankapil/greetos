import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../middleware/error';

/**
 * Turns the browser's coordinates into something a delivery form can use.
 *
 * Proxied through the API rather than called from the page for three reasons:
 * OpenStreetMap's terms want a contactable User-Agent, which a browser will
 * not let us set; their CORS support is not something to depend on; and doing
 * it here means the provider can be swapped later without shipping a new
 * storefront build.
 */

const router = Router();

const coordsSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

/** OSM asks that automated users identify themselves and contact details. */
const USER_AGENT = 'GREETOS/1.0 (+https://oldspice.pcgnp.co)';
const TIMEOUT_MS = 8000;

interface NominatimAddress {
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  village?: string;
  town?: string;
  city?: string;
  city_district?: string;
  county?: string;
  state_district?: string;
  state?: string;
  postcode?: string;
  house_number?: string;
}

/**
 * Reverse geocode. Returns the fields the checkout form asks for, with
 * whatever could not be determined left empty for the customer to fill in.
 *
 * Never returns an error for "we couldn't work out your street" — a partial
 * fill that saves typing the city and pincode is still worth having.
 */
router.get(
  '/reverse',
  asyncHandler(async (req, res) => {
    const { lat, lng } = coordsSchema.parse(req.query);

    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    // 18 is roughly building level; anything coarser loses the street.
    url.searchParams.set('zoom', '18');
    url.searchParams.set('addressdetails', '1');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let data: { address?: NominatimAddress; display_name?: string };
    try {
      const upstream = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
        signal: controller.signal,
      });
      if (!upstream.ok) throw new Error(`HTTP ${upstream.status}`);
      data = (await upstream.json()) as typeof data;
    } catch (err) {
      const why = (err as Error).name === 'AbortError' ? 'timed out' : (err as Error).message;
      console.error(`Reverse geocode failed for ${lat},${lng}: ${why}`);
      throw new HttpError(502, 'Could not look up that location. Please type your address instead.');
    } finally {
      clearTimeout(timer);
    }

    const a = data.address ?? {};
    // House number and road together are the closest thing to "line 1"; the
    // neighbourhood is a useful second line in Indian addresses.
    const line1 = [a.house_number, a.road].filter(Boolean).join(' ').trim();
    const locality = a.neighbourhood || a.suburb || '';
    const city = a.city || a.town || a.village || a.city_district || a.county || '';
    const state = a.state || '';
    const pincode = /^\d{6}$/.test(a.postcode ?? '') ? a.postcode! : '';

    res.json({
      addressLine1: line1,
      addressLine2: locality,
      city,
      state,
      pincode,
      /** Full text, shown so the customer can sanity-check what was found. */
      formatted: data.display_name ?? '',
    });
  }),
);

export default router;
