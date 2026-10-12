'use client';

import React from 'react';
import Link from 'next/link';

export default function AboutUsPage() {
  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', fontFamily: 'var(--font-body)', color: '#1c2417' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', fontWeight: 800, color: '#1D1D1D', marginBottom: '20px', textAlign: 'center' }}>
        About Old Spice Agro Fresh LLP
      </h1>
      <div style={{ background: '#fafdf8', border: '1px solid #eef6e6', borderRadius: '12px', padding: '30px', lineHeight: '1.7', fontSize: '15px' }}>
        <p style={{ marginBottom: '16px' }}>
          Welcome to <strong>Old Spice Agro Fresh LLP</strong> — your trusted source for 100% organic farm fresh vegetables, herbs, and natural agricultural produce.
        </p>
        <p style={{ marginBottom: '16px' }}>
          At Old Spice Agro Fresh LLP, we believe in sustainable organic farming and delivering pure, pesticide-free harvest directly from farm to table. Our produce range includes farm fresh leafy greens, gourds, root vegetables, daily veggies, and fresh culinary herbs.
        </p>
        <p style={{ marginBottom: '16px' }}>
          Every vegetable is carefully harvested and packed to maintain peak freshness and nutrition for your family.
        </p>
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <Link
            href="/collections/all"
            style={{
              display: 'inline-block',
              background: '#88b950',
              color: '#ffffff',
              padding: '12px 28px',
              borderRadius: '8px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Explore Our Products
          </Link>
        </div>
      </div>
    </div>
  );
}
