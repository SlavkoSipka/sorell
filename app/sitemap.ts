import type { MetadataRoute } from 'next';
import { bundles, products } from '@/lib/data/products';
import { getSiteUrl } from '@/lib/site-url';

/** Javne stranice (bez korpe, porudžbine, zahvalnice, prijave i panela). */
const STATIC_PATHS: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[0]['changeFrequency'];
  priority: number;
}> = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/proizvodi', changeFrequency: 'weekly', priority: 0.95 },
  { path: '/usluge', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/o-nama', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/kontakt', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/politika-privatnosti', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/uslovi-koriscenja', changeFrequency: 'yearly', priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  return [
    ...STATIC_PATHS.map(({ path, changeFrequency, priority }) => ({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    })),
    ...products.map((p) => ({
      url: `${base}/proizvodi/${p.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
    ...bundles.map((b) => ({
      url: `${base}/paketi/${b.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    })),
  ];
}
