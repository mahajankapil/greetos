import type { Metadata, Viewport } from 'next';
import { Fraunces, Outfit } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';
import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import { SITE } from '@/lib/site';
import StyledJsxRegistry from './StyledJsxRegistry';

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

// Typefaces, self-hosted with the build by next/font. (The theme's own fonts
// were hot-linked from another site and never loaded here.)
//   Fraunces — headings: a soft, warm serif for an organic produce brand.
//   Outfit   — body, menu, buttons, prices: clean and easy to read small.
// Both are variable fonts, so one file each covers every weight in use.
const displayFont = Fraunces({ subsets: ['latin'], display: 'swap', axes: ['opsz', 'SOFT'], variable: '--font-display' });
const sansFont = Outfit({ subsets: ['latin'], display: 'swap', variable: '--font-sans' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${sansFont.variable}`}>
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
