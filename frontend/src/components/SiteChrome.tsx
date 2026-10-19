'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { AnnouncementBar } from '@/components/AnnouncementBar';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { FloatingCartBar } from '@/components/FloatingCartBar';
import { WhatsAppButton } from '@/components/WhatsAppButton';

const BUSINESS_SCHEDULE = [
  { day: 'Sunday', location: 'Konark Campus, Viman Nagar', hours: '8:00 AM - 1:00 PM' },
  { day: 'Monday', location: 'Riverdale Heights, Kharadi', hours: '8:00 AM - 1:00 PM' },
  { day: 'Tuesday', location: 'Lunkad Gold Coast, Viman Nagar', hours: '8:00 AM - 1:00 PM' },
  { day: 'Wednesday', location: 'Corner Campus, Viman Nagar', hours: '8:00 AM - 1:00 PM' },
  { day: 'Thursday', location: 'Godrej Infinity, Keshav Nagar', hours: '8:00 AM - 1:00 PM' },
  { day: 'Friday', location: 'Oxy Beaumonde, Viman Nagar', hours: '8:00 AM - 1:00 PM' },
  { day: 'Saturday', location: 'Closed', hours: '' },
];

const BusinessSchedule: React.FC = () => (
  <section className="business-schedule" aria-labelledby="business-schedule-title">
    <div className="business-schedule__inner">
      <header className="business-schedule__header">
        <h2 id="business-schedule-title">Business Shops &amp; Timings</h2>
        <p>Our weekly locations around Pune</p>
      </header>
      <div className="business-schedule__list">
        {BUSINESS_SCHEDULE.map(({ day, location, hours }) => (
          <details className="business-schedule__item" key={day}>
            <summary className="business-schedule__summary">
              <span className="business-schedule__day">{day}</span>
              <span className="business-schedule__hours">{hours || 'Closed'}</span>
              <span className="business-schedule__toggle" aria-hidden="true"><ChevronDown size={18} /></span>
            </summary>
            <p className="business-schedule__location">{location}</p>
          </details>
        ))}
      </div>
    </div>
  </section>
);

/**
 * The site's shell — announcement bar, header, footer, cart drawer, and cart action.
 *
 * Hidden on checkout. A checkout page carries its own minimal chrome on
 * purpose: every nav link, search box and cart drawer on that page is a way for
 * someone with their card out to wander off, which is why essentially every
 * serious store strips them. The root layout is a server component and cannot
 * read the path, so the decision lives here.
 */
function isBareRoute(pathname: string): boolean {
  return pathname === '/checkout' || pathname.startsWith('/checkout/');
}

export const SiteHeader: React.FC = () => {
  const pathname = usePathname();
  if (isBareRoute(pathname)) return null;
  return (
    <>
      <AnnouncementBar />
      <Header />
    </>
  );
};

export const SiteFooter: React.FC = () => {
  const pathname = usePathname();
  if (isBareRoute(pathname)) return null;
  return (
    <>
      <BusinessSchedule />
      <Footer />
      <CartDrawer />
      <FloatingCartBar />
    </>
  );
};
