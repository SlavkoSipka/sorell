import 'server-only';

import {
  CATEGORIES,
  getProductBySlug,
  products,
  variantKey,
  type Product,
  type ProductVariant,
} from '@/lib/data/products';
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

/** Klip iz galerije proizvoda. `poster` je prvi kadar; prazno = sivi okvir. */
export type ProductVideo = {
  url: string;
  poster: string;
};

/** Slajd u zaglavlju početne. `link` prazno = slajd nije link. */
export type HeroSlide = {
  image: string;
  link: string;
  alt: string;
};

export type ProductOverrides = {
  /**
   * Proizvodi sa pakovanjima, redom iz admina. Spisak dolazi iz baze (tu se
   * prave i novi proizvodi); bez baze je to katalog iz koda.
   */
  catalog: Product[];
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
  /** Video klipovi proizvoda, redom kojim su složeni u adminu. */
  videosBySlug: Map<string, ProductVideo[]>;
  /** Link ka Instagram objavi po proizvodu; bez ključa = nije unet. */
  instagramBySlug: Map<string, string>;
  /** Velika slika na početnoj strani. Prazno = placeholder okvir. */
  heroImage: string;
  /** Gde vodi klik na hero sliku. Prazno = slika nije link. */
  heroLink: string;
  /** Slajdovi na početnoj, redom. null = tabela još ne postoji (koristi se `heroImage`). */
  heroSlides: HeroSlide[] | null;
  /** Linije iz admina, u redosledu prikaza. Prazno = baza još nema kategorije. */
  categories: Category[];
  /** Kojoj liniji proizvod pripada po adminu; bez ključa = nerazvrstan. */
  categoryByProduct: Map<string, string>;
};

const EMPTY: ProductOverrides = {
  catalog: products,
  inactiveSlugs: new Set(),
  featuredSlugs: new Set(),
  imageBySlug: new Map(),
  fromPriceBySlug: new Map(),
  priceByVariant: new Map(),
  contentBySlug: new Map(),
  imagesBySlug: new Map(),
  videosBySlug: new Map(),
  instagramBySlug: new Map(),
  heroImage: '',
  heroLink: '',
  heroSlides: null,
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
  const [productRows, variantRows, categoryRows, imageRows, videoRows, settingsRows, slideRows] =
    await Promise.all([
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
      instagram_url: string | null;
    }>(
      'products?select=slug,image_path,is_active,is_featured,category_slug,name,shade,features,how_to_use,formulation,eu_compliance,volume,instagram_url&order=sort_order.asc&order=id.asc',
    ),
    restGet<{
      product_slug: string;
      variant_slug: string;
      package_label: string | null;
      price_rsd: number | string | null;
      is_active: boolean;
    }>(
      'product_variants?select=product_slug,variant_slug,package_label,price_rsd,is_active&order=sort_order.asc&order=id.asc',
    ),
    restGet<{ slug: string; name: string; is_active: boolean }>(
      'categories?select=slug,name,is_active&order=sort_order.asc&order=id.asc',
    ),
    restGet<{ product_slug: string; url: string }>(
      'product_images?select=product_slug,url&order=sort_order.asc&order=id.asc',
    ),
    restGet<{ product_slug: string; url: string; poster_url: string | null }>(
      'product_videos?select=product_slug,url,poster_url&order=sort_order.asc&order=id.asc',
    ),
    restGet<{ hero_image_path: string | null; hero_link_url: string | null }>(
      'site_settings?select=hero_image_path,hero_link_url&id=eq.1',
    ),
    restGet<{ image_url: string; link_url: string | null; alt: string | null }>(
      'hero_slides?select=image_url,link_url,alt&is_active=eq.true&order=sort_order.asc&order=id.asc',
    ),
  ]);

  if (!productRows && !variantRows) return EMPTY;

  const inactiveSlugs = new Set<string>();
  const featuredSlugs = new Set<string>();
  const imageBySlug = new Map<string, string>();
  const categoryByProduct = new Map<string, string>();
  const contentBySlug = new Map<string, ProductContent>();
  const instagramBySlug = new Map<string, string>();
  for (const row of productRows ?? []) {
    if (row.is_active === false) inactiveSlugs.add(row.slug);
    if (row.is_featured === true) featuredSlugs.add(row.slug);
    if (row.image_path) imageBySlug.set(row.slug, row.image_path);
    if (row.category_slug) categoryByProduct.set(row.slug, row.category_slug);
    if (row.instagram_url) instagramBySlug.set(row.slug, row.instagram_url);
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

  // Bez migracije 0008 `videoRows` je null — galerija tada prikazuje samo slike.
  const videosBySlug = new Map<string, ProductVideo[]>();
  for (const row of videoRows ?? []) {
    if (!row.url) continue;
    const list = videosBySlug.get(row.product_slug) ?? [];
    list.push({ url: row.url, poster: row.poster_url ?? '' });
    videosBySlug.set(row.product_slug, list);
  }

  const heroImage = settingsRows?.[0]?.hero_image_path ?? '';
  // Vrednost ide u href, pa se propušta samo interna putanja ili http(s).
  const heroLinkRaw = (settingsRows?.[0]?.hero_link_url ?? '').trim();
  const heroLink = safeHref(heroLinkRaw);
  // Bez migracije 0013 `slideRows` je null — Hero tada prikazuje staru jednu sliku.
  const heroSlides: HeroSlide[] | null = slideRows
    ? slideRows
        .filter((row) => row.image_url)
        .map((row) => ({
          image: row.image_url,
          link: safeHref(row.link_url ?? ''),
          alt: row.alt ?? '',
        }))
    : null;

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

  // Pakovanja iz baze, redom iz admina. Ključ je uvek `slug--kod`, pa se kod
  // čita iz ključa; pakovanje bez naziva = proizvod sa jednom cenom.
  const variantsByProduct = new Map<string, ProductVariant[]>();
  for (const row of variantRows ?? []) {
    const prefix = `${row.product_slug}--`;
    if (!row.variant_slug.startsWith(prefix)) continue;
    const list = variantsByProduct.get(row.product_slug) ?? [];
    list.push({ code: row.variant_slug.slice(prefix.length), label: row.package_label ?? '' });
    variantsByProduct.set(row.product_slug, list);
  }

  // Spisak proizvoda je iz baze, pa se vide i oni napravljeni u adminu, a
  // obrisani nestaju. Katalog iz koda popunjava ono što u bazi fali.
  const categoryLabels = new Map(categories.map((c) => [c.slug, c.label]));
  const catalog: Product[] = productRows
    ? productRows.map((row) => {
        const base: Product = getProductBySlug(row.slug) ?? {
          slug: row.slug,
          category: '',
          categorySlug: '',
          lineLabel: '',
          name: row.name?.trim() || row.slug,
          shade: '',
          features: [],
          howToUse: '',
          formulation: '',
          euCompliance: '',
          packagesLabel: '',
          variants: [],
        };
        const categorySlug = row.category_slug ?? base.categorySlug;
        return {
          ...base,
          categorySlug,
          category: categoryLabels.get(categorySlug) ?? base.category,
          variants: variantsByProduct.get(row.slug) ?? (variantRows ? [] : base.variants),
        };
      })
    : products;

  const fromPriceBySlug = new Map<string, number>();
  for (const p of catalog) {
    const prices = p.variants
      .map((v) => priceByVariant.get(variantKey(p.slug, v.code)))
      .filter((n): n is number => n !== undefined);
    if (prices.length > 0) fromPriceBySlug.set(p.slug, Math.min(...prices));
  }

  return {
    catalog,
    inactiveSlugs,
    featuredSlugs,
    imageBySlug,
    fromPriceBySlug,
    priceByVariant,
    contentBySlug,
    imagesBySlug,
    videosBySlug,
    instagramBySlug,
    heroImage,
    heroLink,
    heroSlides,
    categories,
    categoryByProduct,
  };
}

/** Vrednost ide u href, pa se propušta samo interna putanja ili http(s). */
function safeHref(raw: string): string {
  const v = raw.trim();
  return /^(\/|https?:\/\/)\S*$/.test(v) ? v : '';
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

/**
 * Link ka Instagram objavi. Vraća prazno ako nije unet ili ako adresa nije
 * sa instagram.com — vrednost ide u `href`, pa se ne veruje samo bazi.
 */
export function resolveInstagram(slug: string, overrides: ProductOverrides): string {
  const url = (overrides.instagramBySlug.get(slug) ?? '').trim();
  return /^https:\/\/([a-z0-9-]+\.)?instagram\.com\//i.test(url) ? url : '';
}

/** Klipovi proizvoda za galeriju; prazno kad ih nema ili migracija nije puštena. */
export function resolveVideos(slug: string, overrides: ProductOverrides): ProductVideo[] {
  return overrides.videosBySlug.get(slug) ?? [];
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
