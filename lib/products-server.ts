import 'server-only';

import { products, variantKey } from '@/lib/data/products';
import { placeholderImage } from '@/lib/data/product-images';

/**
 * Podaci iz admina koji utiču na prikaz proizvoda na sajtu — čitaju se preko
 * javnog REST endpointa sa anon ključem (obe tabele su javne za čitanje), uz keš
 * od 30 sekundi. Toliko najviše prođe dok se izmena iz admina ne vidi na sajtu.
 *
 * Ako baza nije podešena ili upit padne, vraća prazne mape — sajt tada prikazuje
 * ceo katalog sa privremenim slikama i bez cena, umesto da pukne.
 */
export type ProductOverrides = {
  /** Proizvodi isključeni u adminu (`products.is_active = false`). */
  inactiveSlugs: Set<string>;
  /** Proizvodi izdvojeni za početnu stranu (`products.is_featured = true`). */
  featuredSlugs: Set<string>;
  /** Slika uneta iz admina; ima prednost nad privremenom slikom iz koda. */
  imageBySlug: Map<string, string>;
  /** Najniža uneta cena po proizvodu — za „od X RSD" na karticama. */
  fromPriceBySlug: Map<string, number>;
  /** Cena po ključu varijante (`slug--pakovanje`). Bez ključa = cena nije uneta. */
  priceByVariant: Map<string, number>;
};

const EMPTY: ProductOverrides = {
  inactiveSlugs: new Set(),
  featuredSlugs: new Set(),
  imageBySlug: new Map(),
  fromPriceBySlug: new Map(),
  priceByVariant: new Map(),
};

const REVALIDATE_SECONDS = 30;

async function restGet<T>(path: string): Promise<T[] | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

export async function getProductOverrides(): Promise<ProductOverrides> {
  const [productRows, variantRows] = await Promise.all([
    restGet<{
      slug: string;
      image_path: string | null;
      is_active: boolean;
      is_featured: boolean;
    }>('products?select=slug,image_path,is_active,is_featured'),
    restGet<{ variant_slug: string; price_rsd: number | string | null; is_active: boolean }>(
      'product_variants?select=variant_slug,price_rsd,is_active',
    ),
  ]);

  if (!productRows && !variantRows) return EMPTY;

  const inactiveSlugs = new Set<string>();
  const featuredSlugs = new Set<string>();
  const imageBySlug = new Map<string, string>();
  for (const row of productRows ?? []) {
    if (row.is_active === false) inactiveSlugs.add(row.slug);
    if (row.is_featured === true) featuredSlugs.add(row.slug);
    if (row.image_path) imageBySlug.set(row.slug, row.image_path);
  }

  const priceByVariant = new Map<string, number>();
  for (const row of variantRows ?? []) {
    if (row.is_active === false || row.price_rsd == null) continue;
    const price = Number(row.price_rsd);
    if (Number.isFinite(price) && price > 0) priceByVariant.set(row.variant_slug, price);
  }

  const fromPriceBySlug = new Map<string, number>();
  for (const p of products) {
    const prices = p.variants
      .map((v) => priceByVariant.get(variantKey(p.slug, v.code)))
      .filter((n): n is number => n !== undefined);
    if (prices.length > 0) fromPriceBySlug.set(p.slug, Math.min(...prices));
  }

  return { inactiveSlugs, featuredSlugs, imageBySlug, fromPriceBySlug, priceByVariant };
}

/** Slika za prikaz: okačena iz admina ako postoji, inače privremena iz koda. */
export function resolveImage(slug: string, overrides: ProductOverrides): string {
  return overrides.imageBySlug.get(slug) || placeholderImage(slug);
}
