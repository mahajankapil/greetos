import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';
import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: `${SITE.name} — ${SITE.tagline}`,
  description:
    'Shop Old Spice Agro Fresh LLP for 100% organic farm fresh vegetables, herbs, and natural agricultural produce.',
  icons: {
    icon: SITE.logoUrl,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#2d451e',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: 'Assistant, sans-serif',
          color: '#1c2417',
          backgroundColor: '#ffffff',
        }}
      >
        <AuthProvider>
          <CartProvider>
            {/* Header and footer hide themselves on checkout — see SiteChrome. */}
            <SiteHeader />
            <main style={{ minHeight: '70vh' }}>{children}</main>
            <SiteFooter />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
