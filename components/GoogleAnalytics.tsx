import Script from 'next/script';
import { SITE } from '@/lib/site-config';

/**
 * Google Analytics (GA4).
 *
 * ID se čita iz `NEXT_PUBLIC_GA_ID` — isto kao verifikacija za Search Console.
 * Učitava se samo u produkciji, da lokalni rad i probe ne ulaze u klijentkinjinu
 * statistiku. Prazan ili neispravan ID = skripta se ne ubacuje uopšte.
 *
 * Prelaze između stranica GA4 hvata sam, preko „Enhanced measurement" (prati
 * promene istorije browsera), pa ovde nema ručnog slanja `page_view`.
 */
export default function GoogleAnalytics() {
  // Merni ID nije tajna i ne menja se, pa stoji u lib/site-config.ts — tako
  // analitika radi na svakom hostingu bez podešavanja. NEXT_PUBLIC_GA_ID ga
  // po potrebi pregazi (npr. za probni nalog).
  const id = process.env.NEXT_PUBLIC_GA_ID?.trim() || SITE.googleAnalyticsId.trim();

  // Vrednost ide u URL i u inline skriptu — otud provera oblika, a ne samo dužine.
  if (!/^G-[A-Z0-9]{4,20}$/.test(id)) return null;
  if (process.env.NODE_ENV !== 'production') return null;
  // Na Vercelu i preview deploy radi kao produkcija; njegov saobraćaj ne treba
  // da ulazi u klijentkinjinu statistiku.
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview') return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');`}
      </Script>
    </>
  );
}
