'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Leaf, Mail, MapPin, Truck } from 'lucide-react';
import { SITE } from '@/lib/site';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  // Not connected to POST /subscribers (which accepts source 'footer'): the old
  // form only showed an alert and stored nothing. This keeps that behaviour but
  // shows the confirmation on the page instead of alert().
  const [subscribed, setSubscribed] = useState(false);
  return (
    <>
    {/* Phones get one line instead of the full footer — see .footer-compact in globals.css. */}
    <footer className="footer-compact" aria-label="Legal">
      <span className="footer-compact__copy">© {new Date().getFullYear()} Old Spice</span>
      <Link href="/terms">Terms</Link>
      <Link href="/privacy-policy">Privacy</Link>
      <Link href="/refund-policy">Refund</Link>
      <Link href="/shipping-policy">Shipping</Link>
    </footer>
    <footer className={`oldspice-footer footer-full ${styles.footer}`}>
      <div className={styles.wrap}>
        <div className={styles.grid}>
          <div className={styles.brandCol}>
            <div>
              <Link href="/" className={styles.brand} aria-label={`${SITE.name} home`}>
                <span className={styles.logo}><img src={SITE.logoUrl} alt="" /></span>
                <span className={styles.brandName}>{SITE.name}</span>
              </Link>
              <p className={styles.blurb}>{SITE.tagline}. Harvested on our farm and delivered fresh to your kitchen.</p>
            </div>
            <ul className={styles.contact}>
              <li><a href={`mailto:${SITE.email}`}><Mail size={18} aria-hidden="true" />{SITE.email}</a></li>
              <li><span><MapPin size={18} aria-hidden="true" />{SITE.address.city}, {SITE.address.state}</span></li>
            </ul>
          </div>

          <nav aria-label="Shop">
            <h2 className={styles.heading}>Shop</h2>
            <ul className={styles.links}>
              <li><Link href="/collections/all">All Products</Link></li>
              <li><Link href="/collections/best-sellers">Best Sellers</Link></li>
              <li><Link href="/collections/super-saver-combos">Organic Baskets</Link></li>
              <li><Link href="/weekly-planner">Weekly Planner<span className={styles.badgeNew}>New</span></Link></li>
            </ul>
          </nav>

          <nav aria-label="Help">
            <h2 className={styles.heading}>Help</h2>
            <ul className={styles.links}>
              <li><Link href="/contact">Contact Us</Link></li>
              <li><Link href="/about-us">About Us</Link></li>
              <li><Link href="/account/login">Track Your Order</Link></li>
            </ul>
          </nav>

          <nav aria-label="Policies">
            <h2 className={styles.heading}>Policies</h2>
            <ul className={styles.links}>
              <li><Link href="/privacy-policy">Privacy Policy</Link></li>
              <li><Link href="/refund-policy">Refund Policy</Link></li>
              <li><Link href="/terms">Terms of Service</Link></li>
              <li><Link href="/shipping-policy">Shipping &amp; Delivery</Link></li>
            </ul>
          </nav>

          <div className={`${styles.news} ${styles.newsCol}`}>
            <h2 className={styles.heading}>Newsletter</h2>
            <p>Seasonal harvests, new vegetables and offers, straight to your inbox.</p>
            {subscribed ? (
              <p className={styles.thanks} role="status"><Check size={18} aria-hidden="true" /> Thanks, you are on the list.</p>
            ) : (
              <form className={styles.form} onSubmit={(e) => { e.preventDefault(); setSubscribed(true); }}>
                <input
                  type="email"
                  className={styles.input}
                  aria-label="Email address for newsletter"
                  autoComplete="email"
                  placeholder="Your email"
                  required
                />
                <button type="submit" className={styles.submit}>Subscribe</button>
              </form>
            )}
          </div>
        </div>

        <div className={styles.bottom}>
          <p>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
          <div className={styles.trust}>
            <span><Leaf size={16} aria-hidden="true" />100% organic</span>
            <span><Truck size={16} aria-hidden="true" />Farm to doorstep</span>
          </div>
        </div>
      </div>
    </footer>
    </>
  );
};
