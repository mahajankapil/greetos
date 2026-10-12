'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, Package, Truck } from 'lucide-react';
import { fetchOrder, type PlacedOrder } from '@/lib/checkoutApi';
import { SITE } from '@/lib/site';

const money = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Order confirmation.
 *
 * Reached only after the payment signature has been verified server-side, so
 * everything shown here is what was actually recorded — the page re-reads the
 * order from the API rather than echoing back what the browser thought it sent.
 */
export default function OrderSuccessPage({ params }: { params: { orderNo: string } }) {
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder(params.orderNo).then((o) => {
      setOrder(o);
      setLoading(false);
    });
  }, [params.orderNo]);

  return (
    <div style={{ background: '#f8faf6', minHeight: '75vh', padding: '46px 16px 70px' }}>
      <div style={{ maxWidth: '620px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '26px' }}>
          <CheckCircle2 size={52} color="#88b950" style={{ marginBottom: '12px' }} />
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '30px',
              fontWeight: 800,
              color: '#1c2417',
              margin: '0 0 8px',
            }}
          >
            Thank you for your order
          </h1>
          <p style={{ fontSize: '14.5px', color: '#4a5568', margin: 0 }}>
            Your payment went through and we&rsquo;ve started packing.
          </p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '18px' }}>
            <span style={{ fontSize: '13px', color: '#718096' }}>Order number</span>
            <strong style={{ fontFamily: 'monospace', fontSize: '16px', color: '#1c2417' }}>{params.orderNo}</strong>
          </div>

          {loading ? (
            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '14px' }}>
              <Loader2 size={15} className="spin" /> Loading your order…
            </p>
          ) : order ? (
            <>
              <div style={{ borderTop: '1px solid #edf2f7', paddingTop: '16px' }}>
                {order.items.map((i, n) => (
                  <div
                    key={`${i.productTitle}-${i.optionName}-${n}`}
                    style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '10px', fontSize: '14px' }}
                  >
                    <span style={{ color: '#2d3748' }}>
                      {i.productTitle}
                      <span style={{ color: '#718096' }}>
                        {' '}
                        · {i.optionName} × {i.quantity}
                      </span>
                    </span>
                    <span style={{ whiteSpace: 'nowrap', color: '#2d3748' }}>{money(i.price * i.quantity)}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid #edf2f7', marginTop: '10px', paddingTop: '14px', fontSize: '14px' }}>
                {order.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px', color: '#2c6b30' }}>
                    <span>Discount</span>
                    <span>−{money(order.discount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px', color: '#4a5568' }}>
                  <span>Shipping</span>
                  <span>{order.shippingCharge === 0 ? 'FREE' : money(order.shippingCharge)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '17px',
                    fontWeight: 800,
                    color: '#1c2417',
                    marginTop: '10px',
                  }}
                >
                  <span>Paid</span>
                  <span>{money(order.total)}</span>
                </div>
              </div>
            </>
          ) : (
            // The payment succeeded regardless — say that, and give them a way
            // to reach a human rather than implying something went wrong.
            <p style={{ fontSize: '14px', color: '#4a5568', lineHeight: 1.6 }}>
              We couldn&rsquo;t load the details right now, but your order is placed. Quote the order number above if
              you need to contact us at {SITE.email}.
            </p>
          )}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px', marginTop: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1c2417', margin: '0 0 12px' }}>What happens next</h2>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', fontSize: '13.5px', color: '#4a5568' }}>
            <Package size={17} color="#88b950" style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>We pack your order and hand it to a courier within {SITE.shipping.dispatchDays}.</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', fontSize: '13.5px', color: '#4a5568' }}>
            <Truck size={17} color="#88b950" style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>
              We&rsquo;ll email you the courier name and docket number once it&rsquo;s dispatched. Delivery usually takes{' '}
              {SITE.shipping.deliveryDays}.
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '26px' }}>
          <Link
            href="/collections/all"
            style={{
              display: 'inline-block',
              background: '#88b950',
              color: '#fff',
              padding: '13px 28px',
              borderRadius: '30px',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '14.5px',
            }}
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
