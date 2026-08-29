import type { Metadata, Viewport } from 'next';
import { Manrope, Playfair_Display } from 'next/font/google';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import CartDrawerLazy from '@/components/cart/CartDrawerLazy';
import { CartProvider } from '@/lib/cart-context';
import { SITE } from '@/lib/site-config';
import { getMetadataBaseUrl } from '@/lib/site-url';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  variable: '--font-display',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
};

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: getMetadataBaseUrl(),
  title: {
    default: `${SITE.brandName} — ${SITE.tagline}`,
    template: `%s | ${SITE.brandName}`,
  },
  description: SITE.description,
  applicationName: SITE.brandName,
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    type: 'website',
    locale: 'sr_RS',
    url: '/',
    siteName: SITE.brandName,
    title: `${SITE.brandName} — ${SITE.tagline}`,
    description: SITE.description,
  },
  ...(googleVerification ? { verification: { google: googleVerification } } : {}),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sr" className={`${playfair.variable} ${manrope.variable}`}>
      <body className="flex min-h-screen flex-col bg-canvas text-ink antialiased">
        <CartProvider>
          <Navigation />
          <CartDrawerLazy />
          <div className="flex-1 pt-[100px]">{children}</div>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
