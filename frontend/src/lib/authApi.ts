/**
 * Customer auth calls. These run in the browser, so they use the public API
 * URL rather than the server-only one used for the catalogue.
 */

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5002/api').replace(/\/$/, '');

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  role: string;
  dob: string | null;
}

export interface RequestOtpResult {
  sent: boolean;
  expiresInMinutes: number;
  /** Present only on a demo box — the API never sends this in production. */
  devOtp?: string;
}

export interface VerifyOtpResult {
  token: string;
  isNewUser: boolean;
  /** True when we still need a name to put on the delivery. */
  needsProfile: boolean;
  user: AuthUser;
}

/**
 * Turns an API error into something worth showing a customer.
 * The API sends `{ error }`; anything else means the server is unreachable,
 * which is a different problem and should read like one.
 */
async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Something went wrong. Please try again.');
  return data as T;
}

/**
 * Sends a login code by SMS.
 *
 * `phone` is whatever the customer typed; the API normalises it, so "98…",
 * "098…" and "+91 98…" all reach the same account.
 */
export function requestOtp(phone: string) {
  return post<RequestOtpResult>('/auth/request-phone-otp', { phone });
}

export function verifyOtp(phone: string, otp: string) {
  return post<VerifyOtpResult>('/auth/verify-phone-otp', { phone, otp });
}

export async function updateProfile(
  token: string,
  input: { name: string; phone?: string; dob?: string },
): Promise<{ user: AuthUser }> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Could not save your details.');
  return data as { user: AuthUser };
}

export type MeResult =
  /** The token is good; here is who it belongs to. */
  | { status: 'ok'; user: AuthUser }
  /** The server actively rejected the token — expired, revoked, deactivated. */
  | { status: 'rejected' }
  /** We could not ask. Says nothing about the token. */
  | { status: 'unreachable' };

/**
 * Resolves a stored token to a user.
 *
 * The three outcomes are kept distinct on purpose. Collapsing "the server said
 * no" and "I could not reach the server" into one null is what logs people out
 * whenever the API blips, a laptop wakes on a dead network, or a deploy
 * restarts the backend — the token was fine the whole time.
 */
export async function fetchMe(token: string): Promise<MeResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    return { status: 'unreachable' };
  }
  if (res.status === 401 || res.status === 403) return { status: 'rejected' };
  if (!res.ok) return { status: 'unreachable' };
  try {
    const data = (await res.json()) as { user?: AuthUser };
    return data.user ? { status: 'ok', user: data.user } : { status: 'rejected' };
  } catch {
    return { status: 'unreachable' };
  }
}
