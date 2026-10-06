'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Footer: React.FC = () => {
  const pathname = usePathname();
  const isHomepage = pathname === '/';

  return (
    <footer
      className={`rovique-footer ${!isHomepage ? 'hide-on-mobile' : ''}`}
      style={{
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        color: '#1c2417',
        paddingTop: '50px',
        paddingBottom: '30px',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px', marginBottom: '40px' }}>
          
          {/* Column 1: Products */}
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#1c2417', marginBottom: '16px' }}>Products</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <li><Link href="/collections/all" style={{ color: '#4a5568', textDecoration: 'none' }}>All Products</Link></li>
              <li><Link href="/collections/best-sellers" style={{ color: '#4a5568', textDecoration: 'none' }}>Best Sellers</Link></li>
              <li><Link href="/collections/super-saver-combos" style={{ color: '#4a5568', textDecoration: 'none' }}>Super Saver Combos</Link></li>
            </ul>
          </div>

          {/* Column 2: Customer Policy */}
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#1c2417', marginBottom: '16px' }}>Customer Policy</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <li><Link href="/privacy-policy" style={{ color: '#4a5568', textDecoration: 'none' }}>Privacy Policy</Link></li>
              <li><Link href="/refund-policy" style={{ color: '#4a5568', textDecoration: 'none' }}>Refund Policy</Link></li>
              <li><Link href="/terms" style={{ color: '#4a5568', textDecoration: 'none' }}>Terms of Service</Link></li>
              <li><Link href="/shipping-policy" style={{ color: '#4a5568', textDecoration: 'none' }}>Shipping &amp; Delivery</Link></li>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#1c2417', marginBottom: '16px' }}>Support</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <li><Link href="/contact" style={{ color: '#4a5568', textDecoration: 'none' }}>Contact Us</Link></li>
              <li><Link href="/about-us" style={{ color: '#4a5568', textDecoration: 'none' }}>About Us</Link></li>
              <li><Link href="/account/login" style={{ color: '#4a5568', textDecoration: 'none' }}>Track Your Order</Link></li>
            </ul>
          </div>

          {/* Column 4: Newsletter */}
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#1c2417', marginBottom: '16px' }}>Subscribe to our newsletter</h4>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
              Promotions, new products and sales. Directly to your inbox.
            </p>
            <form className="footer-newsletter" onSubmit={(e) => { e.preventDefault(); alert('Subscribed successfully to Old Spice Agro Fresh LLP!'); }} style={{ display: 'flex', gap: '6px' }}>
              <input
                type="email"
                aria-label="Email address for newsletter"
                autoComplete="email"
                placeholder="Enter your email"
                required
                style={{ flex: 1, minWidth: 0, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }}
              />
              <button
                type="submit"
                style={{ background: '#2d451e', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '8px 18px', fontWeight: 800, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}
              >
                Subscribe
              </button>
            </form>
          </div>

        </div>

        {/* Bottom Bar */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b' }}>
          <p>© {new Date().getFullYear()} Old Spice Agro Fresh LLP. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '12px', fontSize: '16px' }}>
            <span>📷</span>
            <span>📘</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
