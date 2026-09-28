import 'server-only';

import { SITE } from '@/lib/site-config';
import { getSiteUrl } from '@/lib/site-url';
import { getSalonData } from '@/lib/salon-server';
import { discountedUnitPriceRsd } from '@/lib/price';
import { SEO_DEFAULT_DESCRIPTION } from '@/lib/seo';

async function restGet<T>(path: string): Promise<T[] | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

export type ProductOffer = { low: number; high: number; count: number };

/**
 * Najniža i najviša cena proizvoda POSLE popusta — za Google (Product/Offer).
 *
 * Isto pravilo kao na sajtu i u /api/orders: popust pakovanja → popust
 * proizvoda → globalni popust. Ako se ovo razlikuje od cene na stranici,
 * Google Merchant prijavljuje neslaganje, pa se ne sme računati drugačije.
 * null = proizvod nema nijednu objavljenu cenu.
 */
export async function getProductOffer(slug: string): Promise<ProductOffer | null> {
  const s = encodeURIComponent(slug);
  const [variants, products, settings] = await Promise.all([
    restGet<{ price_rsd: number | string | null; discount_percent: number | string | null; is_active: boolean }>(
      `product_variants?select=price_rsd,discount_percent,is_active&product_slug=eq.${s}`,
    ),
    restGet<{ discount_percent: number | string | null }>(
      `products?select=discount_percent&slug=eq.${s}`,
    ),
    restGet<{ site_discount_percent: number | string | null }>(
      'site_settings?select=site_discount_percent&id=eq.1',
    ),
  ]);

  const productPct = products?.[0]?.discount_percent;
  const sitePct = Number(settings?.[0]?.site_discount_percent ?? 0) || 0;

  const cene = (variants ?? [])
    .filter((v) => v.is_active !== false && v.price_rsd != null && Number(v.price_rsd) > 0)
    .map((v) => {
      const pct =
        v.discount_percent != null
          ? Number(v.discount_percent)
          : productPct != null
            ? Number(productPct)
            : sitePct;
      return discountedUnitPriceRsd(Number(v.price_rsd), pct || 0);
    });

  if (cene.length === 0) return null;
  return { low: Math.min(...cene), high: Math.max(...cene), count: cene.length };
}

/**
 * Salon kao lokalni posao (schema.org NailSalon) — adresa, telefon i radno
 * vreme iz istog mesta kao Kontakt i footer. Google ga koristi za Mape i
 * pretrage tipa „manikir Obrenovac".
 */
export async function getBusinessJsonLd() {
  const salon = await getSalonData();
  const base = getSiteUrl();
  const [postalCode, ...cityParts] = salon.city.split(' ');
  const imaPostanski = /^\d{5}$/.test(postalCode ?? '');

  return {
    '@context': 'https://schema.org',
    '@type': 'NailSalon',
    '@id': `${base}/#salon`,
    name: SITE.brandName,
    alternateName: salon.title,
    description: SEO_DEFAULT_DESCRIPTION,
    url: base,
    logo: `${base}/icon.svg`,
    image: salon.image || `${base}/opengraph-image`,
    telephone: salon.phone,
    email: SITE.salon.email,
    priceRange: 'RSD',
    address: {
      '@type': 'PostalAddress',
      streetAddress: salon.address,
      addressLocality: imaPostanski ? cityParts.join(' ') : salon.city,
      ...(imaPostanski ? { postalCode } : {}),
      addressCountry: 'RS',
    },
    areaServed: { '@type': 'Country', name: 'Srbija' },
    paymentAccepted: 'Gotovina (pouzećem), uplata na račun',
  };
}

/** Sajt kao celina — ime koje Google prikazuje uz rezultate. */
export function getWebsiteJsonLd() {
  const base = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${base}/#sajt`,
    name: SITE.brandName,
    url: base,
    inLanguage: 'sr-Latn-RS',
    publisher: { '@id': `${base}/#salon` },
  };
}
