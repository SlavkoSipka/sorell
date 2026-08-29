import 'server-only';

import { CATEGORIES, products, variantKey, type Product } from '@/lib/data/products';
import { placeholderImage } from '@/lib/data/product-images';

/**
 * Podaci iz admina koji utiču na prikaz proizvoda na sajtu — čitaju se preko
 * javnog REST endpointa sa anon ključem (obe tabele su javne za čitanje), uz keš
 * od 30 sekundi. Toliko najviše prođe dok se izmena iz admina ne vidi na sajtu.
 *
 * Ako baza nije podešena ili upit padne, vraća prazne mape — sajt tada prikazuje
 * ceo katalog sa privremenim slikama i bez cena, umesto da pukne.
 */
/** Linija proizvoda kako je definisana u adminu. */
export type Category = {
  slug: string;
  label: string;
  isActive: boolean;
};

/** Tekstualna polja proizvoda koja admin menja iz panela. */
export type ProductContent = {
  name: string;
  shade: string;
  features: string[];
  howToUse: string;
  formulation: string;
  euCompliance: string;
  packagesLabel: string;
};

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
  /** Tekstovi uneti iz admina; prazna polja ne prekrivaju katalog iz koda. */
  contentBySlug: Map<string, ProductContent>;
  /** Sve slike proizvoda iz galerije, redom; prva je glavna. */
  imagesBySlug: Map<string, string[]>;
  /** Velika slika na početnoj strani. Prazno = placeholder okvir. */
  heroImage: string;
  /** Linije iz admina, u redosledu prikaza. Prazno = baza još nema kategorije. */
  categories: Category[];
  /** Kojoj liniji proizvod pripada po adminu; bez ključa = nerazvrstan. */
  categoryByProduct: Map<string, string>;
};

const EMPTY: ProductOverrides = {
  inactiveSlugs: new Set(),
  featuredSlugs: new Set(),
  imageBySlug: new Map(),
  fromPriceBySlug: new Map(),
  priceByVariant: new Map(),
  contentBySlug: new Map(),
  imagesBySlug: new Map(),
  heroImage: '',
  categories: [],
  categoryByProduct: new Map(),
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
  const [productRows, variantRows, categoryRows, imageRows, settingsRows] = await Promise.all([
    restGet<{
      slug: string;
      image_path: string | null;
      is_active: boolean;
      is_featured: boolean;
      category_slug: string | null;
      name: string | null;
      shade: string | null;
      features: string[] | null;
      how_to_use: string | null;
      formulation: string | null;
      eu_compliance: string | null;
      volume: string | null;
    }>(
      'products?select=slug,image_path,is_active,is_featured,category_slug,name,shade,features,how_to_use,formulation,eu_compliance,volume',
    ),
    restGet<{ variant_slug: string; price_rsd: number | string | null; is_active: boolean }>(
      'product_variants?select=variant_slug,price_rsd,is_active',
    ),
    restGet<{ slug: string; name: string; is_active: boolean }>(
      'categories?select=slug,name,is_active&order=sort_order.asc&order=id.asc',
    ),
    restGet<{ product_slug: string; url: string }>(
      'product_images?select=product_slug,url&order=sort_order.asc&order=id.asc',
    ),
    restGet<{ hero_image_path: string | null }>('site_settings?select=hero_image_path&id=eq.1'),
  ]);

  if (!productRows && !variantRows) return EMPTY;

  const inactiveSlugs = new Set<string>();
  const featuredSlugs = new Set<string>();
  const imageBySlug = new Map<string, string>();
  const categoryByProduct = new Map<string, string>();
  const contentBySlug = new Map<string, ProductContent>();
  for (const row of productRows ?? []) {
    if (row.is_active === false) inactiveSlugs.add(row.slug);
    if (row.is_featured === true) featuredSlugs.add(row.slug);
    if (row.image_path) imageBySlug.set(row.slug, row.image_path);
    if (row.category_slug) categoryByProduct.set(row.slug, row.category_slug);
    contentBySlug.set(row.slug, {
      name: row.name ?? '',
      shade: row.shade ?? '',
      features: row.features ?? [],
      howToUse: row.how_to_use ?? '',
      formulation: row.formulation ?? '',
      euCompliance: row.eu_compliance ?? '',
      packagesLabel: row.volume ?? '',
    });
  }

  const imagesBySlug = new Map<string, string[]>();
  for (const row of imageRows ?? []) {
    if (!row.url) continue;
    const list = imagesBySlug.get(row.product_slug) ?? [];
    list.push(row.url);
    imagesBySlug.set(row.product_slug, list);
  }

  const heroImage = settingsRows?.[0]?.hero_image_path ?? '';

  const categories: Category[] = (categoryRows ?? []).map((c) => ({
    slug: c.slug,
    label: c.name,
    isActive: c.is_active !== false,
  }));

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

  return {
    inactiveSlugs,
    featuredSlugs,
    imageBySlug,
    fromPriceBySlug,
    priceByVariant,
    contentBySlug,
    imagesBySlug,
    heroImage,
    categories,
    categoryByProduct,
  };
}

/**
 * Proizvod sa tekstovima iz admina. Prazno polje u bazi znači „nije menjano",
 * pa se uzima vrednost iz kataloga — sajt tako radi i pre nego što migracija
 * tekstova bude puštena.
 */
export function mergeProduct(product: Product, overrides: ProductOverrides): Product {
  const c = overrides.contentBySlug.get(product.slug);
  if (!c) return product;
  return {
    ...product,
    name: c.name.trim() || product.name,
    shade: c.shade.trim() || product.shade,
    features: c.features.length > 0 ? c.features : product.features,
    howToUse: c.howToUse.trim() || product.howToUse,
    formulation: c.formulation.trim() || product.formulation,
    euCompliance: c.euCompliance.trim() || product.euCompliance,
    packagesLabel: c.packagesLabel.trim() || product.packagesLabel,
  };
}

/** Sve slike proizvoda za galeriju; bar jedna, i to ona koju prikazuje kartica. */
export function resolveImages(slug: string, overrides: ProductOverrides): string[] {
  const gallery = overrides.imagesBySlug.get(slug) ?? [];
  if (gallery.length > 0) return gallery;
  const single = resolveImage(slug, overrides);
  return single ? [single] : [];
}

/**
 * Linija kojoj proizvod pripada. Admin ima poslednju reč; dok migracija
 * kategorija nije puštena (ili je proizvod nerazvrstan) vraća se linija iz
 * kataloga u kodu, pa sajt izgleda isto kao pre.
 */
export function categorySlugOf(slug: string, overrides: ProductOverrides): string {
  const fromAdmin = overrides.categoryByProduct.get(slug);
  if (fromAdmin) return fromAdmin;
  return products.find((p) => p.slug === slug)?.categorySlug ?? '';
}

export type CategoryGroup = { slug: string; label: string; items: Product[] };

/**
 * Proizvodi grupisani po linijama, u redosledu iz admina. Prazne linije i one
 * isključene u adminu se izostavljaju, a proizvodi bez linije idu na kraj pod
 * „Ostalo" — da nijedan ne nestane sa sajta.
 */
export function groupByCategory(list: Product[], overrides: ProductOverrides): CategoryGroup[] {
  const order: { slug: string; label: string }[] =
    overrides.categories.length > 0
      ? overrides.categories.filter((c) => c.isActive)
      : CATEGORIES;

  const known = new Set(order.map((c) => c.slug));
  const groups = order
    .map((c) => ({
      slug: c.slug,
      label: c.label,
      items: list.filter((p) => categorySlugOf(p.slug, overrides) === c.slug),
    }))
    .filter((g) => g.items.length > 0);

  const rest = list.filter((p) => !known.has(categorySlugOf(p.slug, overrides)));
  if (rest.length > 0) groups.push({ slug: 'ostalo', label: 'Ostalo', items: rest });

  return groups;
}

/** Slika za prikaz: okačena iz admina ako postoji, inače privremena iz koda. */
export function resolveImage(slug: string, overrides: ProductOverrides): string {
  return overrides.imageBySlug.get(slug) || placeholderImage(slug);
}
