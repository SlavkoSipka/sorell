import {
  expandOrderLinesForPricing,
  getBundleMeta,
  mergeOrderLinesForPacking,
  type ExpandableOrderLine,
} from '@/lib/bundles';
import { getVariantByKey, variantDisplayName } from '@/lib/data/products';
import type { DbProduct, DbVariant } from '@/lib/price';

export type ParsedOrderLine = {
  /** Ključ varijante (`<slug proizvoda>--<pakovanje>`) ili slug paketa. */
  slug: string;
  name: string;
  quantity: number;
  basePriceRsd: number;
  image: string;
  /** Popust po proizvodu u %. NULL = koristi se globalni popust. */
  discountPercent: number | null;
  isBundle?: boolean;
  bundleId?: string;
};

/** Zašto stavka nije prihvaćena — poruka ide kupcu. */
export type CartParseError =
  | { kind: 'empty' }
  | { kind: 'unknown'; slug: string }
  | { kind: 'no-price'; slug: string };

export type CartParseResult =
  | { ok: true; lines: ParsedOrderLine[] }
  | { ok: false; error: CartParseError };

/** Izvor istine za cene: varijante iz baze, spojene sa proizvodom kom pripadaju. */
export type VariantLookup = (key: string) => {
  name: string;
  basePriceRsd: number;
  image: string;
  discountPercent: number | null;
  /** true = varijanta postoji, ali joj cena još nije uneta u adminu. */
  priceMissing: boolean;
} | null;

export function buildVariantLookup(
  dbProducts: DbProduct[],
  dbVariants: DbVariant[],
): VariantLookup {
  const productBySlug = new Map(dbProducts.map((p) => [p.slug, p]));
  const variantBySlug = new Map(
    dbVariants.filter((v) => v.is_active !== false).map((v) => [v.variant_slug, v]),
  );

  return (key) => {
    const variant = variantBySlug.get(key);
    if (!variant) return null;

    const product = productBySlug.get(variant.product_slug);
    if (!product) return null;

    const price = variant.price_rsd == null ? NaN : Number(variant.price_rsd);
    const priceMissing = !Number.isFinite(price) || price <= 0;

    // Naziv se sklapa iz kataloga (nijansa + pakovanje); ako proizvoda nema u
    // kodu, pada se na naziv iz baze da porudžbina i dalje bude čitljiva.
    const ref = getVariantByKey(key);
    const name = ref
      ? variantDisplayName(ref.product, ref.variant)
      : `${product.name} (${variant.package_label})`;

    return {
      name,
      basePriceRsd: priceMissing ? 0 : price,
      image: product.image_path ?? '',
      discountPercent: product.discount_percent == null ? null : Number(product.discount_percent),
      priceMissing,
    };
  };
}

/**
 * Parsira i proverava stavke iz tela zahteva.
 * Izvor istine su varijante iz baze; paket slug-ovi su validni i bez varijante.
 */
export function parseCartLinesFromBody(raw: unknown, lookup: VariantLookup): CartParseResult {
  if (!Array.isArray(raw) || raw.length === 0) return { ok: false, error: { kind: 'empty' } };

  const out: ParsedOrderLine[] = [];

  for (const row of raw) {
    if (!row || typeof row !== 'object') return { ok: false, error: { kind: 'empty' } };
    const slug = (row as { slug?: unknown }).slug;
    const quantity = (row as { quantity?: unknown }).quantity;
    if (typeof slug !== 'string') return { ok: false, error: { kind: 'empty' } };

    const q = typeof quantity === 'number' ? quantity : Number(quantity);
    if (!Number.isInteger(q) || q < 1 || q > 99) return { ok: false, error: { kind: 'empty' } };

    const bundleMeta = getBundleMeta(slug);
    if (bundleMeta) {
      out.push({
        slug,
        name: bundleMeta.name,
        quantity: q,
        basePriceRsd: 0,
        image: bundleMeta.image,
        discountPercent: null,
        isBundle: true,
      });
      continue;
    }

    const variant = lookup(slug);
    if (!variant) return { ok: false, error: { kind: 'unknown', slug } };
    if (variant.priceMissing) return { ok: false, error: { kind: 'no-price', slug } };

    out.push({
      slug,
      name: variant.name,
      quantity: q,
      basePriceRsd: variant.basePriceRsd,
      image: variant.image,
      discountPercent: variant.discountPercent,
    });
  }

  return { ok: true, lines: out };
}

/** Paket-stavke → zasebne tagovane komponente (uz `autoDetectBundles: false`). */
export function expandParsedOrderLines(
  lines: ParsedOrderLine[],
  lookup: VariantLookup,
): ExpandableOrderLine[] {
  return expandOrderLinesForPricing(lines, (key) => {
    const v = lookup(key);
    if (!v || v.priceMissing) return null;
    return {
      name: v.name,
      basePriceRsd: v.basePriceRsd,
      image: v.image,
      discountPercent: v.discountPercent,
    };
  });
}

/** Expandovane linije spojene po ključu varijante za `line_items`. */
export function packingLinesFromExpanded(expanded: ExpandableOrderLine[]): ExpandableOrderLine[] {
  return mergeOrderLinesForPacking(expanded);
}

/** Normalizacija promo koda: trim, uppercase, bez razmaka. */
export function normalizePromoCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim().toUpperCase().replace(/\s+/g, '');
  return t.length === 0 ? null : t;
}
