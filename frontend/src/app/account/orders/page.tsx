'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Package, Truck, ExternalLink, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { listMyOrders, type MyOrder } from '@/lib/accountApi';
import { AccountShell, CARD } from '@/components/account/AccountShell';
import { SITE } from '@/lib/site';

const money = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/** Colour by lifecycle stage — cancelled reads as a problem, delivered as done. */
function statusStyle(status: string): React.CSSProperties {
  const s = status.toLowerCase();
  if (s === 'cancelled') return { background: '#fff1f1', color: '#b33131' };
  if (s === 'delivered') return { background: '#eaf3ed', color: '#127748' };
  if (s === 'shipped' || s === 'out for delivery') return { background: '#eef4fb', color: '#2b5f9e' };
  return { background: '#f4f8ef', color: '#4d7a1f' };
}

export default function MyOrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<MyOrder[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    listMyOrders(token)
      .then(setOrders)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your orders.'));
  }, [token]);

  return (
    <AccountShell title="My orders" subtitle="Everything you've ordered from us" backTo="/account">
      {error && (
        <p style={{ background: '#fff1f1', color: '#b33131', padding: '12px 14px', borderRadius: '10px', fontSize: '13.5px' }}>
          {error}
        </p>
      )}

      {!orders && !error && (
        <p style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '14px' }}>
          <Loader2 size={16} className="spin" /> Loading your orders…
        </p>
      )}

      {orders?.length === 0 && (
        <div style={{ ...CARD, padding: '46px 24px', textAlign: 'center' }}>
          <ShoppingBag size={30} color="#b8c4ae" style={{ marginBottom: '12px' }} />
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#1c2417', margin: '0 0 6px' }}>No orders yet</h2>
          <p style={{ fontSize: '13.5px', color: '#7b8a72', margin: '0 0 20px' }}>
            When you place an order it will show up here, with its tracking details.
          </p>
          <Link
            href="/collections/all"
            style={{
              display: 'inline-block',
              background: '#88b950',
              color: '#fff',
              padding: '11px 26px',
              borderRadius: '30px',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            Start shopping
          </Link>
        </div>
      )}

      {orders && orders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {orders.map((o) => (
            <div key={o.id} style={{ ...CARD, padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div>
                  <p style={{ margin: 0, fontFamily: 'monospace', fontSize: '14.5px', fontWeight: 700, color: '#1c2417' }}>
                    {o.orderNo}
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#8a9a80' }}>
                    {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span
                  style={{
                    ...statusStyle(o.status),
                    borderRadius: '30px',
                    padding: '5px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {o.status}
                </span>
              </div>

              <div style={{ borderTop: '1px solid #f0f4ec', marginTop: '14px', paddingTop: '12px' }}>
                {o.items.map((i) => (
                  <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13.5px', marginBottom: '6px' }}>
                    <span style={{ color: '#2d3748' }}>
                      {i.productTitle}
                      <span style={{ color: '#8a9a80' }}>
                        {' '}
                        · {i.optionName} × {i.quantity}
                      </span>
                    </span>
                    <span style={{ whiteSpace: 'nowrap', color: '#2d3748' }}>{money(i.price * i.quantity)}</span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  borderTop: '1px solid #f0f4ec',
                  marginTop: '10px',
                  paddingTop: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span style={{ fontSize: '12.5px', color: '#8a9a80' }}>
                  {o.paymentStatus === 'paid' ? 'Paid' : 'Payment pending'}
                  {o.shippingCharge > 0 && ` · incl. ${money(o.shippingCharge)} delivery`}
                </span>
                <strong style={{ fontSize: '16px', color: '#1c2417' }}>{money(o.total)}</strong>
              </div>

              {/* Fulfilment is manual, so tracking is whatever was recorded when
                  the parcel actually went out — not a live carrier feed. */}
              {o.dispatchedAt ? (
                <div style={{ marginTop: '12px', background: '#f4f8ef', borderRadius: '12px', padding: '12px 14px' }}>
                  <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 700, color: '#1c2417' }}>
                    <Truck size={15} color="#4d7a1f" /> Dispatched
                  </p>
                  <p style={{ margin: '5px 0 0', fontSize: '12.5px', color: '#5a6b52' }}>
                    {o.courierName ?? 'Courier'}
                    {o.trackingNumber ? ` · Docket ${o.trackingNumber}` : ''}
                  </p>
                  {o.trackingUrl && (
                    <a
                      href={o.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        marginTop: '7px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        color: '#4d7a1f',
                      }}
                    >
                      Track this parcel <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              ) : (
                o.status !== 'Cancelled' && (
                  <p
                    style={{
                      marginTop: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      fontSize: '12.5px',
                      color: '#8a9a80',
                    }}
                  >
                    <Package size={14} color="#b8c4ae" /> Packing now — dispatched within {SITE.shipping.dispatchDays}.
                  </p>
                )
              )}

              {o.addressLine1 && (
                <p style={{ marginTop: '12px', fontSize: '12px', color: '#8a9a80', lineHeight: 1.5 }}>
                  Delivering to {o.addressLine1}
                  {o.addressLine2 ? `, ${o.addressLine2}` : ''}, {o.city}, {o.state} {o.pincode}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </AccountShell>
  );
}
