/**
 * The signed-in customer's own data: orders and saved addresses.
 * Every call here requires a token — these are personal records.
 */

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5002/api').replace(/\/$/, '');

export interface OrderItemRow {
  id: string;
  productTitle: string;
  optionName: string;
  price: number;
  quantity: number;
}

export interface MyOrder {
  id: string;
  orderNo: string;
  customer: string;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  total: number;
  discount: number;
  shippingCharge: number;
  couponCode: string | null;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  courierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  dispatchedAt: string | null;
  createdAt: string;
  items: OrderItemRow[];
}

export interface SavedAddress {
  id: string;
  label: string | null;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface AddressInput {
  label?: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Something went wrong.');
  return data as T;
}

export const listMyOrders = (token: string) => request<MyOrder[]>('/orders/mine', token);

export const listAddresses = (token: string) => request<SavedAddress[]>('/addresses', token);

export const createAddress = (token: string, input: AddressInput) =>
  request<SavedAddress>('/addresses', token, { method: 'POST', body: JSON.stringify(input) });

export const updateAddress = (token: string, id: string, input: Partial<AddressInput>) =>
  request<SavedAddress>(`/addresses/${id}`, token, { method: 'PUT', body: JSON.stringify(input) });

export const deleteAddress = (token: string, id: string) =>
  request<{ ok: true }>(`/addresses/${id}`, token, { method: 'DELETE' });
