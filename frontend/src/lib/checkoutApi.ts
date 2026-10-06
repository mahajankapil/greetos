/**
 * Checkout calls. Browser-side, so they use the public API URL and send the
 * customer's token when there is one — the API accepts these endpoints from a
 * guest too, and links the order to an account only when signed in.
 */

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5002/api').replace(/\/$/, '');

export interface CheckoutItem {
  productTitle: string;
  optionName: string;
  price: number;
  quantity: number;
}

export interface AddressInput {
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface CreatePaymentOrderResult {
  keyId: string;
  /** Razorpay's order id, handed straight to their checkout widget. */
  razorpayOrderId: string;
  /** Amount in paise, as Razorpay counts it. */
  amount: number;
  currency: string;
  /** The server's own breakdown — display these, not a local estimate. */
  subtotal: number;
  discount: number;
  shippingCharge: number;
  total: number;
}

export interface PlacedOrder {
  orderNo: string;
  total: number;
  discount: number;
  shippingCharge: number;
  status: string;
  items: { productTitle: string; optionName: string; price: number; quantity: number }[];
}

function authHeaders(token?: string | null): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function call<T>(path: string, body: unknown, token?: string | null): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Something went wrong. Please try again.');
  return data as T;
}

/**
 * Step 1 — ask the API what this cart costs and open a Razorpay order for it.
 *
 * `state` travels with the cart because the delivery charge depends on it, and
 * this call is where the amount Razorpay will collect gets fixed. Leave it out
 * and the customer is charged for one destination and the order recorded with
 * the price of another.
 */
export function createPaymentOrder(
  input: { items: CheckoutItem[]; couponCode?: string; state?: string },
  token?: string | null,
) {
  return call<CreatePaymentOrderResult>('/payments/create-order', input, token);
}

/**
 * Step 2 — hand Razorpay's signed response back for verification. The local
 * order is created here, and only if the signature checks out.
 */
export function verifyPayment(
  input: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    customer: string;
    email?: string;
    phone: string;
    items: CheckoutItem[];
    couponCode?: string;
  } & AddressInput,
  token?: string | null,
) {
  return call<PlacedOrder | { order: PlacedOrder }>('/payments/verify', input, token);
}

export interface AppliedCoupon {
  code: string;
  discount: number;
  description?: string | null;
}

/** Validates a discount code against the current cart (does not consume it). */
export function applyCoupon(code: string, items: CheckoutItem[], token?: string | null) {
  return call<AppliedCoupon & { subtotal: number; discountedTotal: number }>(
    '/coupons/apply',
    { code, items },
    token,
  );
}

/** Public order lookup for the confirmation page. */
export async function fetchOrder(orderNo: string): Promise<PlacedOrder | null> {
  try {
    const res = await fetch(`${BASE}/orders/${encodeURIComponent(orderNo)}`);
    if (!res.ok) return null;
    return (await res.json()) as PlacedOrder;
  } catch {
    return null;
  }
}

/**
 * Loads Razorpay's checkout script once, on demand.
 *
 * Deliberately not a <script> in the layout: it would be fetched on every page
 * view for the small share of visitors who reach checkout, and it is a
 * third-party script on every page for no reason.
 */
export function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}
