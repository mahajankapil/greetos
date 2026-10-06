'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, ShoppingBag, ChevronDown, Tag, Check, ChevronRight, MapPin, Home } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { INDIAN_STATES, SHIP_TO_COUNTRY } from '@/data/indianStates';
import { SITE } from '@/lib/site';
import { CheckoutSignIn } from '@/components/checkout/CheckoutSignIn';
import { updateProfile } from '@/lib/authApi';
import { locateMe } from '@/lib/geoApi';
import { useShippingRates } from '@/hooks/useShippingRates';
import {
  applyCoupon,
  createPaymentOrder,
  loadRazorpay,
  verifyPayment,
  type CheckoutItem,
} from '@/lib/checkoutApi';
import { listAddresses, type SavedAddress } from '@/lib/accountApi';

/**
 * One-page checkout.
 *
 * Two steps: sign in, then delivery and payment. Signing in first means every
 * order belongs to an account, so the customer can see it and its tracking
 * afterwards, and support can find it by who placed it rather than only by
 * order number.
 *
 * Every rupee shown here is a preview. The amount actually charged is computed
 * by the API from the same cart, so a tampered client cannot pay less than the
 * catalogue says; when the server's number differs from the preview, the
 * server's is what gets rendered before the Razorpay window opens.
 */

const money = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const field: React.CSSProperties = {
  width: '100%',
  padding: '13px 14px',
  borderRadius: '8px',
  border: '1px solid #d5dbdf',
  fontSize: '15px',
  background: '#fff',
  outline: 'none',
  color: '#1c2417',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#6b7280',
  marginBottom: '5px',
};

const sectionTitle: React.CSSProperties = {
  fontSize: '19px',
  fontWeight: 700,
  color: '#1c2417',
  margin: '0 0 14px',
};

interface FormState {
  email: string;
  marketingOptIn: boolean;
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  billingSameAsShipping: boolean;
}

const EMPTY: FormState = {
  email: '',
  marketingOptIn: true,
  firstName: '',
  lastName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  billingSameAsShipping: true,
};

/** Copies a saved address over the delivery fields, leaving the rest alone. */
function applySaved(form: FormState, a: SavedAddress): FormState {
  return {
    ...form,
    addressLine1: a.addressLine1,
    addressLine2: a.addressLine2 ?? '',
    city: a.city,
    state: a.state,
    pincode: a.pincode,
  };
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, hydrated, subtotal, totalItems, clearCart } = useCart();
  const { user, token, loading: authLoading, setUser } = useAuth();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  /** Cart emptied by a completed order — stops the redirect below firing on success. */
  const [done, setDone] = useState(false);

  /**
   * Live delivery rates. The preview has to use the same numbers the server
   * charges, and those now depend on which state the order is going to.
   */
  const rates = useShippingRates();

  /** Addresses already on the customer's profile, offered instead of retyping. */
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [usedSavedId, setUsedSavedId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateNote, setLocateNote] = useState('');

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Prefill what we already know about a signed-in customer. The number came
  // from signing in, so it is filled and stays editable only in the sense that
  // a delivery can go to someone else's phone.
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      email: f.email || user.email || '',
      phone: f.phone || user.phone || '',
      firstName: f.firstName || (user.name?.split(' ')[0] ?? ''),
      lastName: f.lastName || (user.name?.split(' ').slice(1).join(' ') ?? ''),
    }));
  }, [user]);

  // Their saved addresses, so a returning customer picks one instead of typing
  // it again. The most recent order's address is saved automatically.
  useEffect(() => {
    if (!token) {
      setSavedAddresses([]);
      return;
    }
    let cancelled = false;
    listAddresses(token)
      .then((rows) => {
        if (cancelled || rows.length === 0) return;
        setSavedAddresses(rows);
        // Fill from the default one straight away, but only while the form is
        // still untouched — never overwrite something they have started typing.
        const preferred = rows.find((r) => r.isDefault) ?? rows[0];
        setForm((f) => (f.addressLine1.trim() ? f : applySaved(f, preferred)));
        setUsedSavedId((current) => current ?? preferred.id);
      })
      .catch(() => {
        /* not fatal — they can type the address */
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // An empty cart has nothing to check out. Skipped once an order completes,
  // because clearing the cart is the last thing a successful order does.
  useEffect(() => {
    if (hydrated && !done && cart.length === 0) router.replace('/cart');
  }, [hydrated, cart.length, done, router]);

  const items: CheckoutItem[] = useMemo(
    () =>
      cart.map((l) => ({
        productTitle: l.product.title,
        optionName: l.option.name,
        price: l.option.price,
        quantity: l.quantity,
      })),
    [cart],
  );

  const discount = applied?.discount ?? 0;
  const addressComplete = form.pincode.length === 6 && form.state !== '' && form.addressLine1.trim().length >= 3;
  // Null until there is an address: the charge depends on the state, so
  // showing a number before one is chosen would just be a guess.
  const shipping = !addressComplete ? null : rates.chargeFor(subtotal - discount, form.state);
  const total = subtotal - discount + (shipping ?? 0);

  // No email requirement: customers sign in with a mobile number now, so an
  // address is a nice-to-have for the receipt rather than something we hold
  // the order back for.
  const canPay =
    form.firstName.trim() !== '' &&
    form.addressLine1.trim().length >= 3 &&
    form.city.trim() !== '' &&
    form.state !== '' &&
    /^\d{6}$/.test(form.pincode) &&
    /^\d{10}$/.test(form.phone) &&
    cart.length > 0;

  /**
   * Fills the delivery fields from the device's location.
   *
   * Whatever comes back is a starting point, not an answer: the fields stay
   * editable and the flat/house number almost always still needs typing, so
   * the note below says what was found rather than implying it is correct.
   */
  const useMyLocation = async () => {
    setLocating(true);
    setLocateNote('');
    try {
      const found = await locateMe();
      setForm((f) => ({
        ...f,
        // Only fill blanks for line 1 — if they have already typed a house
        // number, a street name from the map is a downgrade.
        addressLine1: f.addressLine1.trim() || found.addressLine1,
        addressLine2: f.addressLine2.trim() || found.addressLine2,
        city: found.city || f.city,
        state: INDIAN_STATES.includes(found.state) ? found.state : f.state,
        pincode: found.pincode || f.pincode,
      }));
      setUsedSavedId(null);
      setLocateNote(
        found.formatted
          ? `Found: ${found.formatted}. Please check the details and add your flat or house number.`
          : 'Location found. Please check the details and add your flat or house number.',
      );
    } catch (err) {
      setLocateNote(err instanceof Error ? err.message : 'Could not get your location.');
    } finally {
      setLocating(false);
    }
  };

  const tryCoupon = async () => {
    if (!coupon.trim()) return;
    setCouponBusy(true);
    setCouponError('');
    try {
      const res = await applyCoupon(coupon.trim(), items, token);
      setApplied({ code: res.code, discount: res.discount });
    } catch (e) {
      setApplied(null);
      setCouponError(e instanceof Error ? e.message : 'That code could not be applied.');
    } finally {
      setCouponBusy(false);
    }
  };

  const pay = async () => {
    setPaying(true);
    setError('');
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error('Could not load the payment window. Check your connection and try again.');

      const order = await createPaymentOrder({ items, couponCode: applied?.code, state: form.state }, token);

      const customer = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
      const address = {
        addressLine1: form.addressLine1.trim(),
        addressLine2: form.addressLine2.trim() || undefined,
        city: form.city.trim(),
        state: form.state,
        pincode: form.pincode.trim(),
      };

      const RazorpayCtor = (window as unknown as { Razorpay: new (o: unknown) => { open: () => void } }).Razorpay;
      const rzp = new RazorpayCtor({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: SITE.name,
        description: `Order · ${totalItems} item${totalItems === 1 ? '' : 's'}`,
        order_id: order.razorpayOrderId,
        prefill: { name: customer, email: form.email.trim(), contact: form.phone.trim() },
        theme: { color: '#88b950' },
        // Razorpay calls this on success; the order does not exist locally
        // until the signature is verified server-side.
        handler: async (resp: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const placed = await verifyPayment(
              {
                ...resp,
                customer,
                email: form.email.trim(),
                phone: form.phone.trim(),
                items,
                couponCode: applied?.code,
                ...address,
              },
              token,
            );
            const orderNo =
              (placed as { orderNo?: string }).orderNo ??
              (placed as { order?: { orderNo: string } }).order?.orderNo;

            // A brand-new account has no name yet — sign-in only asked for a
            // mobile number. Backfill from what they just typed for delivery,
            // so the account is complete without ever asking the same question
            // twice. Never fatal: the order is already paid and recorded.
            // The delivery address is filed to the profile server-side, once
            // the payment is verified.
            if (token && !user?.name) {
              updateProfile(token, { name: customer })
                .then((r) => setUser(r.user))
                .catch(() => {});
            }

            setDone(true);
            clearCart();
            router.push(`/checkout/success/${orderNo ?? ''}`);
          } catch (e) {
            // The money left their account but we could not record it. Say so
            // plainly with the payment id — support can find it from that.
            setError(
              `Your payment went through but we could not confirm the order. Please contact ${SITE.email} quoting payment ${resp.razorpay_payment_id}.`,
            );
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
          },
        },
      });
      rzp.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the payment.');
      setPaying(false);
    }
  };

  if (!hydrated || (cart.length === 0 && !done)) return null;

  /** Step one is done once we have a signed-in customer with a name to deliver to. */
  const signedIn = !!user;
  const step = signedIn ? 2 : 1;
  /**
   * A stored session takes a moment to resolve on a cold load. Showing the
   * sign-in step during that moment told already-signed-in customers to sign
   * in again — and since each attempt sends a real SMS, that cost them a code
   * they did not need.
   */
  const resolvingSession = authLoading && !user;

  const stepBadge = (n: number, label: string) => {
    const active = step === n;
    const complete = step > n;
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 700,
            background: complete ? '#88b950' : active ? '#1c2417' : '#e5e7eb',
            color: complete || active ? '#fff' : '#9ca3af',
          }}
        >
          {complete ? <Check size={13} /> : n}
        </span>
        <span
          style={{
            fontSize: '13px',
            fontWeight: active || complete ? 700 : 500,
            color: active || complete ? '#1c2417' : '#9ca3af',
          }}
        >
          {label}
        </span>
      </span>
    );
  };

  const summary = (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
        {cart.map((l) => (
          <div key={`${l.product.id}:${l.option.id}`} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={l.product.primaryImage}
                alt={l.product.title}
                style={{
                  width: '58px',
                  height: '58px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  background: '#fff',
                }}
              />
              <span
                aria-label={`Quantity ${l.quantity}`}
                style={{
                  position: 'absolute',
                  top: '-7px',
                  right: '-7px',
                  minWidth: '20px',
                  height: '20px',
                  borderRadius: '10px',
                  background: '#6b7280',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 5px',
                }}
              >
                {l.quantity}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1c2417' }}>{l.product.title}</p>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#6b7280' }}>{l.option.name}</p>
            </div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#1c2417', whiteSpace: 'nowrap' }}>
              {money(l.option.price * l.quantity)}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
        <input
          value={coupon}
          onChange={(e) => setCoupon(e.target.value.toUpperCase())}
          placeholder="Discount code"
          aria-label="Discount code"
          style={{ ...field, flex: 1 }}
        />
        <button
          type="button"
          onClick={tryCoupon}
          disabled={couponBusy || !coupon.trim()}
          style={{
            padding: '0 20px',
            borderRadius: '8px',
            border: '1px solid #d5dbdf',
            background: '#f3f4f6',
            fontSize: '14px',
            fontWeight: 600,
            color: '#374151',
            cursor: couponBusy ? 'wait' : 'pointer',
          }}
        >
          {couponBusy ? <Loader2 size={15} className="spin" /> : 'Apply'}
        </button>
      </div>
      {couponError && <p style={{ color: '#b33131', fontSize: '12.5px', margin: '-10px 0 14px' }}>{couponError}</p>}
      {applied && (
        <p
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#2c6b30',
            fontSize: '13px',
            fontWeight: 600,
            margin: '-10px 0 14px',
          }}
        >
          <Tag size={13} /> {applied.code} applied
        </p>
      )}

      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', fontSize: '14px', color: '#374151' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '9px' }}>
          <span>Subtotal · {totalItems} item{totalItems === 1 ? '' : 's'}</span>
          <span>{money(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '9px', color: '#2c6b30' }}>
            <span>Discount</span>
            <span>−{money(discount)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '9px' }}>
          <span>Shipping</span>
          <span style={{ color: shipping === null ? '#6b7280' : undefined }}>
            {shipping === null ? 'Enter shipping address' : shipping === 0 ? 'FREE' : money(shipping)}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            borderTop: '1px solid #e5e7eb',
            paddingTop: '14px',
            marginTop: '6px',
          }}
        >
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#1c2417' }}>Total</span>
          <span style={{ fontSize: '21px', fontWeight: 700, color: '#1c2417' }}>
            <span style={{ fontSize: '12px', color: '#6b7280', marginRight: '6px' }}>INR</span>
            {money(total)}
          </span>
        </div>
      </div>
    </>
  );

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      {/* Checkout gets its own minimal chrome. The site nav is deliberately
          absent: every link out of here is a way to lose the order. */}
      <header className="checkout-header" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <div
          style={{
            maxWidth: '1160px',
            margin: '0 auto',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            href="/"
            style={{ fontFamily: 'Goli, sans-serif', fontSize: '22px', fontWeight: 800, color: '#1c2417', textDecoration: 'none' }}
          >
            {SITE.name}
          </Link>
          <Link className="touch-icon" href="/cart" aria-label="Back to cart" style={{ color: '#4b5563' }}>
            <ShoppingBag size={22} />
          </Link>
        </div>
      </header>

      {/* Mobile: the summary collapses to a single tappable line, as it does on
          any checkout worth copying. */}
      <div className="checkout-mobile-summary" style={{ borderBottom: '1px solid #e5e7eb', background: '#fafafa' }}>
        <button
          type="button"
          onClick={() => setSummaryOpen((o) => !o)}
          aria-expanded={summaryOpen}
          style={{
            width: '100%',
            maxWidth: '1160px',
            margin: '0 auto',
            padding: '15px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#4d7a1f', fontWeight: 600, fontSize: '14px' }}>
            Order summary
            <ChevronDown size={16} style={{ transform: summaryOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </span>
          <span style={{ fontWeight: 700, fontSize: '16px', color: '#1c2417' }}>{money(total)}</span>
        </button>
        {summaryOpen && <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '0 20px 22px' }}>{summary}</div>}
      </div>

      <div className="checkout-grid" style={{ maxWidth: '1160px', margin: '0 auto', padding: '0 20px 70px' }}>
        {/* ── Left: sign in, then the form ───────────────────── */}
        <div style={{ paddingTop: '30px', paddingRight: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              paddingBottom: '20px',
              marginBottom: '24px',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            {stepBadge(1, 'Sign in')}
            <ChevronRight size={15} color="#d1d5db" />
            {stepBadge(2, 'Delivery & payment')}
          </div>

          {resolvingSession && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '18px 0', color: '#6b7280', fontSize: '14px' }}>
              <Loader2 size={16} className="spin" />
              Checking if you’re already signed in…
            </div>
          )}
          {!resolvingSession && !signedIn && <CheckoutSignIn />}

          {signedIn && (
          <>
          {error && (
            <p
              role="alert"
              style={{
                background: '#fff1f1',
                color: '#b33131',
                fontSize: '13.5px',
                fontWeight: 600,
                padding: '12px 14px',
                borderRadius: '8px',
                marginBottom: '20px',
                lineHeight: 1.5,
              }}
            >
              {error}
            </p>
          )}

          <section style={{ marginBottom: '30px' }}>
            <h2 style={sectionTitle}>Contact</h2>
            {/* Read-only: this is the number they just proved they control, and
                the account the order will be filed under. */}
            <div style={{ marginBottom: '11px' }}>
              <span style={labelStyle}>Mobile</span>
              <input
                readOnly
                aria-readonly
                aria-label="Mobile number"
                value={user?.phone ? `+91 ${user.phone}` : ''}
                style={{ ...field, background: '#f3f4f6', color: '#6b7280' }}
              />
            </div>
            <div>
              <span style={labelStyle}>Email (optional)</span>
              <input
                type="email"
                aria-label="Email"
                autoComplete="email"
                placeholder="For your order confirmation"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                style={field}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '9px', marginTop: '11px', fontSize: '14px', color: '#374151' }}>
              <input
                type="checkbox"
                checked={form.marketingOptIn}
                onChange={(e) => set('marketingOptIn', e.target.checked)}
              />
              Keep me posted about news and offers
            </label>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={sectionTitle}>Delivery</h2>

            {savedAddresses.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <span style={labelStyle}>Saved addresses</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {savedAddresses.map((a) => {
                    const active = usedSavedId === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setForm((f) => applySaved(f, a));
                          setUsedSavedId(a.id);
                          setLocateNote('');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          textAlign: 'left',
                          padding: '12px 13px',
                          borderRadius: '8px',
                          border: `1.5px solid ${active ? '#88b950' : '#d5dbdf'}`,
                          background: active ? '#f4f9ee' : '#fff',
                          cursor: 'pointer',
                          fontSize: '13.5px',
                          color: '#1c2417',
                          lineHeight: 1.5,
                        }}
                      >
                        <Home size={15} style={{ marginTop: '2px', flexShrink: 0, color: active ? '#4d7a1f' : '#9ca3af' }} />
                        <span>
                          {a.addressLine1}
                          {a.addressLine2 ? `, ${a.addressLine2}` : ''}
                          <br />
                          <span style={{ color: '#6b7280' }}>
                            {a.city}, {a.state} {a.pincode}
                          </span>
                          {a.isDefault && (
                            <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: 700, color: '#4d7a1f' }}>DEFAULT</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px',
                marginBottom: '11px',
                borderRadius: '8px',
                border: '1.5px dashed #88b950',
                background: '#f8fbf4',
                color: '#4d7a1f',
                fontSize: '14px',
                fontWeight: 700,
                cursor: locating ? 'wait' : 'pointer',
                opacity: locating ? 0.7 : 1,
              }}
            >
              {locating ? <Loader2 size={15} className="spin" /> : <MapPin size={15} />}
              {locating ? 'Finding your location…' : 'Use my current location'}
            </button>
            {locateNote && (
              <p style={{ fontSize: '12.5px', color: '#6b7280', margin: '-4px 0 13px', lineHeight: 1.55 }}>
                {locateNote}
              </p>
            )}

            <div style={{ marginBottom: '11px' }}>
              <span style={labelStyle}>Country/Region</span>
              {/* We ship only within India, so this states a fact rather than
                  offering a choice that would fail at the warehouse. */}
              <input value={SHIP_TO_COUNTRY} readOnly aria-readonly style={{ ...field, background: '#f3f4f6', color: '#6b7280' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '11px', marginBottom: '11px' }}>
              <input
                placeholder="First name"
                aria-label="First name"
                autoComplete="given-name"
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                style={field}
              />
              <input
                placeholder="Last name"
                aria-label="Last name"
                autoComplete="family-name"
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                style={field}
              />
            </div>

            <input
              placeholder="Address"
              aria-label="Address"
              autoComplete="address-line1"
              value={form.addressLine1}
              onChange={(e) => set('addressLine1', e.target.value)}
              style={{ ...field, marginBottom: '11px' }}
            />
            <input
              placeholder="Apartment, suite, etc. (optional)"
              aria-label="Apartment, suite, etc."
              autoComplete="address-line2"
              value={form.addressLine2}
              onChange={(e) => set('addressLine2', e.target.value)}
              style={{ ...field, marginBottom: '11px' }}
            />

            <div className="checkout-city-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '11px', marginBottom: '11px' }}>
              <input
                placeholder="City"
                aria-label="City"
                autoComplete="address-level2"
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                style={field}
              />
              <div>
                <select
                  aria-label="State"
                  value={form.state}
                  onChange={(e) => set('state', e.target.value)}
                  style={{ ...field, color: form.state ? '#1c2417' : '#9ca3af' }}
                >
                  <option value="">State</option>
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <input
                placeholder="PIN code"
                aria-label="PIN code"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                value={form.pincode}
                onChange={(e) => set('pincode', e.target.value.replace(/\D/g, ''))}
                style={field}
              />
            </div>

            <input
              placeholder="Phone"
              aria-label="Phone"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              value={form.phone}
              onChange={(e) => set('phone', e.target.value.replace(/\D/g, ''))}
              style={field}
            />
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '6px 0 0' }}>
              10 digits. The courier needs a number to call on delivery.
            </p>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={sectionTitle}>Shipping method</h2>
            <div
              style={{
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                fontSize: '14px',
                color: '#6b7280',
              }}
            >
              {shipping === null ? (
                'Enter your shipping address to view available shipping methods.'
              ) : (
                <span style={{ display: 'flex', justifyContent: 'space-between', color: '#1c2417' }}>
                  <span>Standard delivery · {SITE.shipping.deliveryDays}</span>
                  <strong>{shipping === 0 ? 'FREE' : money(shipping)}</strong>
                </span>
              )}
            </div>
          </section>

          <section style={{ marginBottom: '26px' }}>
            <h2 style={sectionTitle}>Payment</h2>
            <p style={{ fontSize: '13.5px', color: '#6b7280', margin: '-8px 0 12px' }}>
              All transactions are secure and encrypted.
            </p>
            <div style={{ border: '2px solid #88b950', borderRadius: '8px', padding: '15px', background: '#f7fbf3' }}>
              <p style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#1c2417' }}>
                Razorpay Secure (UPI, Card, Net Banking, Wallet)
              </p>
              <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#4b5563', lineHeight: 1.55 }}>
                You&rsquo;ll complete your payment in a secure Razorpay window. Cash on delivery is not available.
              </p>
            </div>
          </section>

          <section style={{ marginBottom: '26px' }}>
            <h2 style={sectionTitle}>Billing address</h2>
            <div style={{ border: '1px solid #d5dbdf', borderRadius: '8px', overflow: 'hidden' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '14px 15px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  background: form.billingSameAsShipping ? '#f7fbf3' : '#fff',
                }}
              >
                <input
                  type="radio"
                  name="billing"
                  checked={form.billingSameAsShipping}
                  onChange={() => set('billingSameAsShipping', true)}
                />
                Same as shipping address
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '14px 15px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  borderTop: '1px solid #e5e7eb',
                  background: !form.billingSameAsShipping ? '#f7fbf3' : '#fff',
                }}
              >
                <input
                  type="radio"
                  name="billing"
                  checked={!form.billingSameAsShipping}
                  onChange={() => set('billingSameAsShipping', false)}
                />
                Use a different billing address
              </label>
            </div>
            {!form.billingSameAsShipping && (
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '10px', lineHeight: 1.55 }}>
                Razorpay will collect your billing details in the payment window.
              </p>
            )}
          </section>

          <button
            type="button"
            onClick={pay}
            disabled={!canPay || paying}
            style={{
              width: '100%',
              background: canPay && !paying ? '#88b950' : '#cbd5e1',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '17px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: canPay && !paying ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '9px',
            }}
          >
            {paying ? <Loader2 size={17} className="spin" /> : <Lock size={16} />}
            {paying ? 'Opening payment…' : `Pay now · ${money(total)}`}
          </button>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              marginTop: '26px',
              paddingTop: '18px',
              borderTop: '1px solid #e5e7eb',
              fontSize: '12.5px',
            }}
          >
            <Link href="/refund-policy" style={{ color: '#4d7a1f' }}>
              Refund policy
            </Link>
            <Link href="/privacy-policy" style={{ color: '#4d7a1f' }}>
              Privacy policy
            </Link>
            <Link href="/terms" style={{ color: '#4d7a1f' }}>
              Terms of service
            </Link>
            <Link href="/shipping-policy" style={{ color: '#4d7a1f' }}>
              Shipping policy
            </Link>
          </div>
          </>
          )}
        </div>

        {/* ── Right: the summary (desktop) ───────────────────── */}
        <aside className="checkout-summary" style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: '38px', paddingTop: '30px' }}>
          <div style={{ position: 'sticky', top: '24px' }}>{summary}</div>
        </aside>
      </div>
    </div>
  );
}
