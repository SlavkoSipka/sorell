import type { Metadata, Viewport } from 'next';
import { Manrope, Playfair_Display } from 'next/font/google';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import CartDrawerLazy from '@/components/cart/CartDrawerLazy';
import CartAddedToast from '@/components/cart/CartAddedToast';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import { CartProvider } from '@/lib/cart-context';
import { SITE } from '@/lib/site-config';
import { getMetadataBaseUrl } from '@/lib/site-url';
import { SEO_DEFAULT_DESCRIPTION, SEO_DEFAULT_TITLE, SEO_KEYWORDS, jsonLd } from '@/lib/seo';
import { getWebsiteJsonLd } from '@/lib/seo-server';
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
    default: SEO_DEFAULT_TITLE,
    template: `%s | ${SITE.brandName}`,
  },
  description: SEO_DEFAULT_DESCRIPTION,
  keywords: SEO_KEYWORDS,
  applicationName: SITE.brandName,
  creator: SITE.brandName,
  publisher: SITE.brandName,
  category: 'Kozmetika za nokte',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  // Telefon i adresa u tekstu ne smeju da postanu plavi linkovi na iPhone-u.
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: 'website',
    locale: 'sr_RS',
    url: '/',
    siteName: SITE.brandName,
    title: SEO_DEFAULT_TITLE,
    description: SEO_DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO_DEFAULT_TITLE,
    description: SEO_DEFAULT_DESCRIPTION,
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
          <CartAddedToast />
          <div className="flex-1 pt-[100px]">{children}</div>
          <Footer />
        </CartProvider>
        <GoogleAnalytics />
        {/* Ime sajta za Google — prikazuje se iznad adrese u rezultatima. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(getWebsiteJsonLd()) }}
        />
      </body>
    </html>
  );
}
