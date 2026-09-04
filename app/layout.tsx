import type { Metadata, Viewport } from 'next';
import { Manrope, Playfair_Display } from 'next/font/google';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import CartDrawerLazy from '@/components/cart/CartDrawerLazy';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import { CartProvider } from '@/lib/cart-context';
import { SITE } from '@/lib/site-config';
import { getMetadataBaseUrl } from '@/lib/site-url';
import { getHeaderTheme } from '@/lib/theme-server';
import { headerThemeCss } from '@/lib/theme';
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

/** Boja adresne trake na mobilnom prati pozadinu navigacije. */
export async function generateViewport(): Promise<Viewport> {
  const theme = await getHeaderTheme();
  return { themeColor: theme.navBg };
}

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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const headerTheme = await getHeaderTheme();

  return (
    <html lang="sr" className={`${playfair.variable} ${manrope.variable}`}>
      <body className="flex min-h-screen flex-col bg-canvas text-ink antialiased">
        {/* Boje zaglavlja iz admina; vrednosti su provereno HEX (lib/theme.ts). */}
        <style dangerouslySetInnerHTML={{ __html: headerThemeCss(headerTheme) }} />
        <CartProvider>
          <Navigation />
          <CartDrawerLazy />
          <div className="flex-1 pt-[100px]">{children}</div>
          <Footer />
        </CartProvider>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
