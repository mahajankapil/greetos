const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5002/api').replace(/\/$/, '');

export interface ResolvedLocation {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  /** Full text of what was found, so the customer can check it looks right. */
  formatted: string;
}

/**
 * Asks the browser where the device is, then turns that into address fields.
 *
 * Two failure modes matter and read very differently to a customer: the
 * browser refusing (they declined the prompt, or the page is not on HTTPS) and
 * the lookup failing (no signal, provider down). Both end with them typing the
 * address themselves, so both messages say that.
 */
export async function locateMe(): Promise<ResolvedLocation> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('This browser cannot share your location. Please type your address.');
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        reject(new Error('Location access was blocked. Allow it in your browser, or type your address.'));
      } else if (err.code === err.TIMEOUT) {
        reject(new Error('Finding your location took too long. Please type your address.'));
      } else {
        reject(new Error('Could not get your location. Please type your address.'));
      }
    }, {
      // Street-level accuracy is the point — a city-centre guess would fill in
      // the wrong pincode, which is worse than filling in nothing.
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
    });
  });

  const { latitude, longitude } = position.coords;
  let res: Response;
  try {
    res = await fetch(`${BASE}/geo/reverse?lat=${latitude}&lng=${longitude}`);
  } catch {
    throw new Error('Could not reach the server. Please type your address.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Could not find that address. Please type it in.');
  }
  return data as ResolvedLocation;
}
