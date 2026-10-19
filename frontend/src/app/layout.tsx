import type { Metadata, Viewport } from 'next';
import { PT_Sans, PT_Sans_Caption } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';
import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import { SITE } from '@/lib/site';
import StyledJsxRegistry from './StyledJsxRegistry';

export const metadata: Metadata = {
  title: `${SITE.name} — ${SITE.tagline}`,
  description:
    'Shop GREETOS for 100% organic farm fresh vegetables, herbs, and natural agricultural produce.',
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

// One typeface across the whole storefront, self-hosted with the build by
// next/font (same families as the Google Fonts @import the brand supplied,
// without the render-blocking request to fonts.googleapis.com).
//   PT Sans          — everything: headings, body, buttons, prices, form fields.
//   PT Sans Caption  — menu and small labels.
// PT Sans ships 400 and 700 only; other weights in the CSS snap to the nearest.
const sansFont = PT_Sans({ subsets: ['latin'], display: 'swap', weight: ['400', '700'], style: ['normal', 'italic'], variable: '--font-sans' });
const captionFont = PT_Sans_Caption({ subsets: ['latin'], display: 'swap', weight: ['400', '700'], variable: '--font-caption' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sansFont.variable} ${captionFont.variable}`}>
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: 'var(--font-body)',
          color: '#1c2417',
          backgroundColor: '#ffffff',
        }}
      >
        <StyledJsxRegistry>
          <AuthProvider>
            <CartProvider>
              {/* Header and footer hide themselves on checkout — see SiteChrome. */}
              <SiteHeader />
              <main style={{ minHeight: '70vh' }}>{children}</main>
              <SiteFooter />
            </CartProvider>
          </AuthProvider>
        </StyledJsxRegistry>
      </body>
    </html>
  );
}
