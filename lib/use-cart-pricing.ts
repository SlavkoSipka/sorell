'use client';

import { useMemo } from 'react';
import { useCart, type CartLine } from '@/lib/cart-context';
import {
  expandCartToPricingLines,
  getBundleComponentSlugs,
  getBundleFallbackPriceRsd,
  getBundleLinePrice,
  isBundleSlug,
} from '@/lib/bundles';
import {
  discountedUnitPriceRsd,
  parsePriceStringToRsd,
  unitPriceRsdForLine,
} from '@/lib/price';
import { computePricing, type PricingResult } from '@/lib/pricing-engine';
import { shippingForProductsTotalRsd } from '@/lib/shipping';
import { usePricingData } from '@/lib/use-pricing-data';

export type CartPricing = {
  loaded: boolean;
  pricing: PricingResult | null;
  /** Iznos proizvoda posle svih popusta. */
  productsTotalRsd: number;
  shippingRsd: number;
  freeShipping: boolean;
  /** Proizvodi + poštarina — iznos koji ide na /api/orders. */
  totalRsd: number;
  /** Cena jednog komada linije (posle popusta), formatirana kroz `formatRsd`. */
  unitPriceRsd: (line: CartLine) => number;
  /** Cena cele linije (posle popusta). */
  lineTotalRsd: (line: CartLine) => number;
  /** false = cena za tu varijantu još nije uneta u adminu. */
  priceKnown: (line: CartLine) => boolean;
  /** true = bar jedna stavka nema cenu, pa se porudžbina ne može poslati. */
  hasUnpricedItems: boolean;
};

/**
 * Jedinstven izvor cena za korpu — drawer, /korpa i /porudzbina računaju isto.
 * Server ponovo računa sve u /api/orders; ovo je samo prikaz.
 */
export function useCartPricing(): CartPricing {
  const { items, promoDiscountPercent } = useCart();
  const { priceMap, productDiscountMap, siteDiscountPercent, bundleDiscountPercent, loaded } =
    usePricingData();

  const pricingOpts = useMemo(
    () => ({
      getBasePrice: (slug: string) => priceMap.get(slug) ?? 0,
      getDiscountPercent: (slug: string) => productDiscountMap.get(slug) ?? null,
    }),
    [priceMap, productDiscountMap],
  );

  const pricing = useMemo(() => {
    if (!loaded || items.length === 0) return null;
    return computePricing({
      lines: expandCartToPricingLines(items, pricingOpts),
      siteDiscountPercent,
      bundleDiscountPercent,
      promoDiscountPercent: promoDiscountPercent ?? 0,
      autoDetectBundles: false,
    });
  }, [items, pricingOpts, siteDiscountPercent, bundleDiscountPercent, loaded, promoDiscountPercent]);

  const productsTotalRsd = pricing?.totalRsd ?? 0;
  const shippingRsd = shippingForProductsTotalRsd(productsTotalRsd);

  const priceKnown = (line: CartLine): boolean => {
    if (!loaded) return true;
    if (isBundleSlug(line.slug)) {
      return getBundleComponentSlugs(line.slug).every((s) => (priceMap.get(s) ?? 0) > 0);
    }
    return (priceMap.get(line.slug) ?? 0) > 0;
  };

  const hasUnpricedItems = loaded && items.some((line) => !priceKnown(line));

  const unitPriceRsd = (line: CartLine): number => {
    if (isBundleSlug(line.slug)) {
      if (loaded) {
        const bundlePrice = getBundleLinePrice(line.slug, 1, {
          ...pricingOpts,
          siteDiscountPercent,
          bundleDiscountPercent,
        });
        if (bundlePrice) return bundlePrice.unitPriceRsd;
      }
      return parsePriceStringToRsd(line.price) ?? getBundleFallbackPriceRsd();
    }
    const base = unitPriceRsdForLine(line, loaded ? priceMap : undefined);
    const lineDiscount = pricing?.lineDiscounts.find((d) => d.slug === line.slug);
    if (loaded && lineDiscount && lineDiscount.percent > 0) {
      return discountedUnitPriceRsd(base, lineDiscount.percent);
    }
    return base;
  };

  const lineTotalRsd = (line: CartLine): number => {
    if (isBundleSlug(line.slug) && loaded) {
      const bundlePrice = getBundleLinePrice(line.slug, line.quantity, {
        ...pricingOpts,
        siteDiscountPercent,
        bundleDiscountPercent,
      });
      if (bundlePrice) return bundlePrice.afterDiscountRsd;
    }
    return unitPriceRsd(line) * line.quantity;
  };

  return {
    loaded,
    pricing,
    productsTotalRsd,
    shippingRsd,
    freeShipping: shippingRsd === 0,
    totalRsd: productsTotalRsd + shippingRsd,
    unitPriceRsd,
    lineTotalRsd,
    priceKnown,
    hasUnpricedItems,
  };
}
