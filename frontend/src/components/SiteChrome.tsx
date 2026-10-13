'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AnnouncementBar } from '@/components/AnnouncementBar';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { FloatingCartBar } from '@/components/FloatingCartBar';
import { WhatsAppButton } from '@/components/WhatsAppButton';

/**
 * The site's shell — announcement bar, header, footer, cart drawer, mobile nav.
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
      <Footer />
      <CartDrawer />
      <MobileBottomNav />
      <FloatingCartBar />
    </>
  );
};
