'use client';

import {
  discountedUnitPriceRsd,
  formatRsd,
  PRICE_PENDING_LABEL,
} from '@/lib/price';
import { getProductBySlug, variantKey } from '@/lib/data/products';
import { effectiveDiscountPercent, usePricingData } from '@/lib/use-pricing-data';

const SIZES = {
  sm: 'text-[14px]',
  md: 'text-[15px]',
  lg: 'text-[20px]',
} as const;

export type PriceSize = keyof typeof SIZES;

function PriceBody({
  base,
  percent,
  size,
  prefix,
}: {
  base: number;
  percent: number;
  size: PriceSize;
  prefix?: string;
}) {
  if (base <= 0) {
    return (
      <span className={`font-body ${SIZES[size]} text-muted`}>{PRICE_PENDING_LABEL}</span>
    );
  }

  const final = discountedUnitPriceRsd(base, percent);

  return (
    <span className="inline-flex flex-wrap items-baseline gap-2">
      {prefix ? (
        <span className="font-body text-[12px] uppercase tracking-[0.12em] text-muted">{prefix}</span>
      ) : null}
      <span className={`font-body ${SIZES[size]} tabular-nums text-ink`}>{formatRsd(final)}</span>
      {percent > 0 ? (
        <>
          <span className="font-body text-[13px] tabular-nums text-muted line-through">
            {formatRsd(base)}
          </span>
          <span className="rounded-card bg-accent-soft px-1.5 py-0.5 font-body text-[11px] uppercase tracking-[0.1em] text-accent">
            −{Math.round(percent)}%
          </span>
        </>
      ) : null}
    </span>
  );
}

/**
 * Cena jednog pakovanja. `priceKey` je ključ varijante (`slug--pakovanje`).
 * Dok cena nije uneta u adminu, prikazuje se „Cena uskoro".
 */
export default function ProductPrice({
  priceKey,
  size = 'md',
}: {
  priceKey: string;
  size?: PriceSize;
}) {
  const { priceMap, productDiscountMap, siteDiscountPercent, loaded } = usePricingData();
  const base = loaded ? (priceMap.get(priceKey) ?? 0) : 0;
  const percent = loaded
    ? effectiveDiscountPercent(priceKey, productDiscountMap, siteDiscountPercent)
    : 0;

  return <PriceBody base={base} percent={percent} size={size} />;
}

/**
 * Najniža cena proizvoda — „od 1.890,00 RSD" na karticama, jer se pakovanje
 * bira tek na stranici proizvoda.
 */
export function ProductFromPrice({
  slug,
  size = 'md',
}: {
  slug: string;
  size?: PriceSize;
}) {
  const { fromPriceMap, productDiscountMap, siteDiscountPercent, loaded } = usePricingData();

  const product = getProductBySlug(slug);
  const base = loaded ? (fromPriceMap.get(slug) ?? 0) : 0;
  const firstKey = product ? variantKey(slug, product.variants[0]?.code ?? '') : slug;
  const percent = loaded
    ? effectiveDiscountPercent(firstKey, productDiscountMap, siteDiscountPercent)
    : 0;

  const showPrefix = base > 0 && (product?.variants.length ?? 0) > 1;

  return <PriceBody base={base} percent={percent} size={size} prefix={showPrefix ? 'od' : undefined} />;
}
