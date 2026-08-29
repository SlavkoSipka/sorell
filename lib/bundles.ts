import type { CartLine } from '@/lib/cart-context';
import { bundles } from '@/lib/data/products';
import { BUNDLE_DEFINITIONS, computePricing, type PricingLine } from '@/lib/pricing-engine';

export type BundleMeta = {
  id: string;
  name: string;
  image: string;
  path: string;
  componentSlugs: readonly string[];
};

const BUNDLE_META: Record<string, BundleMeta> = Object.fromEntries(
  bundles.map((b) => {
    const def = BUNDLE_DEFINITIONS.find((d) => d.id === b.slug);
    return [
      b.slug,
      {
        id: b.slug,
        name: b.name,
        image: b.image,
        path: `/paketi/${b.slug}`,
        componentSlugs: def?.slugs ?? [],
      },
    ];
  }),
);

export function isBundleSlug(slug: string): boolean {
  return slug in BUNDLE_META;
}

export function getBundleMeta(bundleId: string): BundleMeta | null {
  return BUNDLE_META[bundleId] ?? null;
}

export function getBundleComponentSlugs(bundleId: string): readonly string[] {
  const def = BUNDLE_DEFINITIONS.find((d) => d.id === bundleId);
  return def?.slugs ?? getBundleMeta(bundleId)?.componentSlugs ?? [];
}

/**
 * Fallback cena paketa dok se cene ne učitaju iz baze. Katalog u kodu nema cene
 * (unose se u adminu), pa je fallback 0 — paket dobija cenu tek posle učitavanja.
 */
export function getBundleFallbackPriceRsd(): number {
  return 0;
}

type ExpandOpts = {
  getBasePrice: (slug: string) => number;
  getDiscountPercent: (slug: string) => number | null | undefined;
};

/**
 * Korpa (paketi + pojedinačne stavke) → linije za pricing engine.
 * Komponente paketa nose `bundleId`, pojedinačne stavke ostaju netaknute.
 * Koristi se uz `computePricing({ autoDetectBundles: false })`.
 */
export function expandCartToPricingLines(
  items: Pick<CartLine, 'slug' | 'quantity'>[],
  opts: ExpandOpts,
): PricingLine[] {
  const out: PricingLine[] = [];

  for (const item of items) {
    if (item.quantity <= 0) continue;
    if (isBundleSlug(item.slug)) {
      for (const componentSlug of getBundleComponentSlugs(item.slug)) {
        out.push({
          slug: componentSlug,
          quantity: item.quantity,
          basePriceRsd: opts.getBasePrice(componentSlug),
          discountPercent: opts.getDiscountPercent(componentSlug) ?? null,
          bundleId: item.slug,
        });
      }
    } else {
      out.push({
        slug: item.slug,
        quantity: item.quantity,
        basePriceRsd: opts.getBasePrice(item.slug),
        discountPercent: opts.getDiscountPercent(item.slug) ?? null,
      });
    }
  }

  return out;
}

export type BundleLinePrice = {
  subtotalRsd: number;
  afterDiscountRsd: number;
  unitPriceRsd: number;
  discountPercent: number;
};

/** Cena jedne paket-stavke u korpi. */
export function getBundleLinePrice(
  bundleId: string,
  quantity: number,
  opts: ExpandOpts & { siteDiscountPercent: number; bundleDiscountPercent: number },
): BundleLinePrice | null {
  if (quantity <= 0 || !isBundleSlug(bundleId)) return null;
  const componentSlugs = getBundleComponentSlugs(bundleId);
  if (componentSlugs.length === 0) return null;

  const pricing = computePricing({
    lines: componentSlugs.map((slug) => ({
      slug,
      quantity,
      basePriceRsd: opts.getBasePrice(slug),
      discountPercent: opts.getDiscountPercent(slug) ?? null,
    })),
    siteDiscountPercent: opts.siteDiscountPercent,
    bundleDiscountPercent: opts.bundleDiscountPercent,
  });

  return {
    subtotalRsd: pricing.subtotalRsd,
    afterDiscountRsd: pricing.afterProductDiscountRsd,
    unitPriceRsd: pricing.afterProductDiscountRsd / quantity,
    discountPercent: pricing.discountPercent,
  };
}

export type ExpandableOrderLine = {
  slug: string;
  name: string;
  quantity: number;
  basePriceRsd: number;
  image: string;
  discountPercent: number | null;
  isBundle?: boolean;
  bundleId?: string;
};

type OrderProductLookup = (slug: string) => {
  name: string;
  basePriceRsd: number;
  image: string;
  discountPercent: number | null;
} | null;

/** Paket-stavke → zasebne tagovane komponente za server pricing. */
export function expandOrderLinesForPricing(
  lines: ExpandableOrderLine[],
  getProduct: OrderProductLookup,
): ExpandableOrderLine[] {
  const out: ExpandableOrderLine[] = [];

  for (const line of lines) {
    if (line.quantity <= 0) continue;
    if (line.isBundle || isBundleSlug(line.slug)) {
      for (const componentSlug of getBundleComponentSlugs(line.slug)) {
        const product = getProduct(componentSlug);
        if (!product) continue;
        out.push({
          slug: componentSlug,
          name: product.name,
          quantity: line.quantity,
          basePriceRsd: product.basePriceRsd,
          image: product.image,
          discountPercent: product.discountPercent,
          bundleId: line.slug,
        });
      }
    } else {
      const product = getProduct(line.slug);
      if (!product) continue;
      out.push({
        slug: line.slug,
        name: product.name,
        quantity: line.quantity,
        basePriceRsd: product.basePriceRsd,
        image: product.image,
        discountPercent: product.discountPercent,
      });
    }
  }
  return out;
}

/** Spaja expandovane linije po slug-u za `line_items` (pakovanje). */
export function mergeOrderLinesForPacking(lines: ExpandableOrderLine[]): ExpandableOrderLine[] {
  const qtyMap = new Map<string, number>();
  const meta = new Map<string, ExpandableOrderLine>();

  for (const line of lines) {
    if (line.quantity <= 0) continue;
    qtyMap.set(line.slug, (qtyMap.get(line.slug) ?? 0) + line.quantity);
    if (!meta.has(line.slug)) meta.set(line.slug, line);
  }

  return [...qtyMap.entries()].map(([slug, quantity]) => {
    const m = meta.get(slug)!;
    return {
      slug,
      name: m.name,
      quantity,
      basePriceRsd: m.basePriceRsd,
      image: m.image,
      discountPercent: m.discountPercent,
    };
  });
}
