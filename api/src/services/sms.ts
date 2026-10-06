import { config } from '../config/config';

/**
 * Login codes over SMS, via IndiaHost.
 *
 * Their API only delivers a message — the code itself is generated here and
 * verified here, exactly like the email codes. That means nothing about how a
 * code is checked changes when the channel changes; SMS is only a different
 * way of putting the same four digits in front of the customer.
 *
 * Two things about this endpoint that its documentation gets wrong, both found
 * the hard way against the live service:
 *
 *   - It is GET-only in practice. A POST returns `200` with an empty body and
 *     no message is delivered, which reads exactly like a silent failure. The
 *     key therefore travels in a query string; that is the vendor's design,
 *     not a choice, and it is still HTTPS end to end.
 *   - It answers with JSON (`{"status":"success", ...}`), not the bare
 *     `SUCCESS` word the docs show. Both shapes are accepted below so this
 *     keeps working if they ever match their own documentation.
 *
 * The HTTP status is always 200, so only the body says whether it worked.
 */

const ENDPOINT = 'https://otp.indiahost.org/send_otp.php';

/** How long to wait on the gateway before giving up. */
const TIMEOUT_MS = 12000;

export function smsConfigured(): boolean {
  return Boolean(config.sms.user && config.sms.key);
}

/**
 * Normalises an Indian mobile number to the `+91XXXXXXXXXX` the gateway wants.
 *
 * Customers type these with spaces, dashes, a leading 0, or +91 already
 * attached; all of those reach here from the checkout form.
 */
export function toE164India(input: string): string | null {
  const digits = String(input || '').replace(/\D/g, '');
  // 9198… (with country code) or 098… (STD prefix) both reduce to the ten
  // digits that identify the subscriber.
  const local = digits.startsWith('91') && digits.length === 12
    ? digits.slice(2)
    : digits.startsWith('0') && digits.length === 11
      ? digits.slice(1)
      : digits;
  if (!/^[6-9]\d{9}$/.test(local)) return null;
  return `+91${local}`;
}

export class SmsError extends Error {
  constructor(
    message: string,
    /** The gateway's own word for what went wrong, for the logs. */
    readonly gatewayStatus?: string,
  ) {
    super(message);
    this.name = 'SmsError';
  }
}

/** What each gateway status means for the person waiting on the code. */
function describe(status: string): string {
  const s = status.toUpperCase();
  if (s.includes('INVALID MOBILE')) return 'That mobile number was rejected by the SMS provider.';
  if (s.includes('INVALID KEY')) return 'The SMS account is not configured correctly.';
  if (s.includes('LOW BALANCE')) return 'The SMS account is out of balance.';
  if (s.includes('MISSING PARAM')) return 'The SMS request was incomplete.';
  return 'The SMS could not be sent.';
}

/**
 * Reads the gateway's answer in either shape.
 *
 * An empty body counts as a failure: that is what a POST returns, and what a
 * silently dropped message looks like.
 */
function succeeded(body: string): boolean {
  if (!body) return false;
  try {
    const parsed = JSON.parse(body) as { status?: string };
    if (typeof parsed.status === 'string') return parsed.status.toLowerCase() === 'success';
  } catch {
    /* not JSON — fall through to the documented plain-text form */
  }
  return body.toUpperCase().includes('SUCCESS');
}

/** Pulls the human-readable reason out of a JSON error body, if there is one. */
function reasonFrom(body: string): string {
  if (!body) return 'empty response';
  try {
    const parsed = JSON.parse(body) as { message?: string; status?: string };
    return parsed.message ?? parsed.status ?? body;
  } catch {
    return body;
  }
}

/**
 * Sends one login code. Resolves on SUCCESS, throws otherwise.
 *
 * `phone` may be in any of the shapes a customer types; it is normalised here.
 */
export async function sendLoginOtpSms(phone: string, code: string): Promise<void> {
  const mobile = toE164India(phone);
  if (!mobile) throw new SmsError('Enter a valid 10-digit Indian mobile number.');
  if (!smsConfigured()) throw new SmsError('SMS is not configured on this server.');

  const params = new URLSearchParams({
    mobile,
    otp: code,
    user: config.sms.user,
    key: config.sms.key,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let body: string;
  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      method: 'GET',
      signal: controller.signal,
    });
    body = (await res.text()).trim();
    if (!res.ok) throw new SmsError('The SMS provider is unreachable.', `HTTP ${res.status}`);
  } catch (err) {
    if (err instanceof SmsError) throw err;
    const reason = (err as Error).name === 'AbortError' ? 'timed out' : (err as Error).message;
    throw new SmsError('The SMS provider is unreachable.', reason);
  } finally {
    clearTimeout(timer);
  }

  if (!succeeded(body)) {
    const reason = reasonFrom(body);
    throw new SmsError(describe(reason), reason.slice(0, 160));
  }
}
