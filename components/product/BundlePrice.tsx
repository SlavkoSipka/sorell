'use client';

import { getBundleFallbackPriceRsd, getBundleLinePrice } from '@/lib/bundles';
import { formatRsd } from '@/lib/price';
import { usePricingData } from '@/lib/use-pricing-data';

/** Cena paketa: zbir komponenti posle paketnog popusta. */
export default function BundlePrice({
  bundleId,
  size = 'md',
}: {
  bundleId: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { priceMap, productDiscountMap, siteDiscountPercent, bundleDiscountPercent, loaded } =
    usePricingData();

  const price = loaded
    ? getBundleLinePrice(bundleId, 1, {
        getBasePrice: (slug) => priceMap.get(slug) ?? 0,
        getDiscountPercent: (slug) => productDiscountMap.get(slug) ?? null,
        siteDiscountPercent,
        bundleDiscountPercent,
      })
    : null;

  const fallback = getBundleFallbackPriceRsd();
  const final = price?.afterDiscountRsd ?? fallback;
  const base = price?.subtotalRsd ?? fallback;
  const saved = Math.max(0, base - final);

  const sizes = { sm: 'text-[14px]', md: 'text-[15px]', lg: 'text-[20px]' } as const;

  return (
    <span className="inline-flex flex-wrap items-baseline gap-2">
      <span className={`font-body ${sizes[size]} tabular-nums text-ink`}>{formatRsd(final)}</span>
      {saved > 0.5 ? (
        <>
          <span className="font-body text-[13px] tabular-nums text-muted line-through">
            {formatRsd(base)}
          </span>
          <span className="rounded-card bg-accent-soft px-1.5 py-0.5 font-body text-[11px] uppercase tracking-[0.1em] text-accent">
            ušteda {formatRsd(saved)}
          </span>
        </>
      ) : null}
    </span>
  );
}
