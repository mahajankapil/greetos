'use client';

import React from 'react';
import Link from 'next/link';
import { useShippingRates } from '@/hooks/useShippingRates';

export default function OffersPage() {
  const { freeAbove } = useShippingRates();
  const offers = [
    {
      title: 'Free Delivery',
      code: 'NO CODE NEEDED',
      desc: `Free delivery on all orders above ₹${freeAbove}. Applied automatically at checkout.`,
      bg: '#fafdf8',
      border: '#eef6e6',
    },
  ];

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', fontFamily: 'Assistant, sans-serif', color: '#1c2417' }}>
      <h1 style={{ fontFamily: 'Goli, sans-serif', fontSize: '32px', fontWeight: 800, color: '#1D1D1D', marginBottom: '10px', textAlign: 'center' }}>
        Special Offers & Coupons
      </h1>
      <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '30px', fontSize: '14px' }}>
        Current offers from Old Spice Agro Fresh
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {offers.map((offer, idx) => (
          <div key={idx} style={{ background: offer.bg, border: `1px solid ${offer.border}`, borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, background: '#88b950', color: '#fff', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                Active Offer
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1D1D1D', marginTop: '12px', marginBottom: '8px' }}>
                {offer.title}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.4', marginBottom: '16px' }}>
                {offer.desc}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '14px' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '15px', color: '#88b950', letterSpacing: '1px' }}>
                {offer.code}
              </span>
              <Link href="/collections/all" style={{ fontSize: '13px', fontWeight: 700, color: '#88b950', textDecoration: 'none' }}>
                Shop Now →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
