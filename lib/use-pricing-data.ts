'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { DbProduct, DbSiteSettings, DbVariant } from '@/lib/price';

export type PricingData = {
  products: DbProduct[];
  /** Cena po ključu varijante (`slug--pakovanje`). Nema ključa = cena nije uneta. */
  priceMap: Map<string, number>;
  /** Najniža uneta cena po proizvodu — za „od X RSD". */
  fromPriceMap: Map<string, number>;
  /** Ključevi aktivnih pakovanja po slug-u proizvoda, iz baze. */
  variantKeysByProduct: Map<string, string[]>;
  /** Slika uneta iz admina, po slug-u proizvoda. */
  imageMap: Map<string, string>;
  /** Popust po ključu varijante: sa pakovanja, inače sa proizvoda. NULL → siteDiscountPercent. */
  productDiscountMap: Map<string, number | null>;
  /** Varijante isključene u adminu — ne mogu da se izaberu. */
  inactiveVariants: Set<string>;
  siteDiscountPercent: number;
  bundleDiscountPercent: number;
  loaded: boolean;
};

const EMPTY: PricingData = {
  products: [],
  priceMap: new Map(),
  fromPriceMap: new Map(),
  variantKeysByProduct: new Map(),
  imageMap: new Map(),
  productDiscountMap: new Map(),
  inactiveVariants: new Set(),
  siteDiscountPercent: 0,
  bundleDiscountPercent: 10,
  loaded: false,
};

let cached: PricingData | null = null;

export function usePricingData(): PricingData {
  const [data, setData] = useState<PricingData>(cached ?? EMPTY);

  // Cene se čitaju iz baze jednom po učitavanju stranice i drže u modul-kešu.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (cached) {
      setData(cached);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      // Bez Supabase-a nema cena — sajt radi kao katalog bez poručivanja.
      setData({ ...EMPTY, loaded: true });
      return;
    }

    let cancelled = false;

    void Promise.all([
      supabase
        .from('products')
        .select('slug, name, base_price_rsd, image_path, volume, discount_percent'),
      supabase
        .from('product_variants')
        .select('product_slug, variant_slug, package_label, price_rsd, sort_order, is_active'),
      supabase
        .from('site_settings')
        .select('site_discount_percent, bundle_discount_percent')
        .eq('id', 1)
        .maybeSingle(),
      // Odvojen upit: bez migracije 0015 padne, a cene i dalje stižu.
      supabase.from('product_variants').select('variant_slug, discount_percent'),
    ]).then(([prodRes, varRes, settRes, variantDiscRes]) => {
      if (cancelled) return;

      const dbProducts = (prodRes.data ?? []) as DbProduct[];
      const dbVariants = (varRes.data ?? []) as DbVariant[];

      const priceMap = new Map<string, number>();
      const inactiveVariants = new Set<string>();
      for (const v of dbVariants) {
        if (v.is_active === false) {
          inactiveVariants.add(v.variant_slug);
          continue;
        }
        if (v.price_rsd == null) continue;
        const price = Number(v.price_rsd);
        if (Number.isFinite(price) && price > 0) priceMap.set(v.variant_slug, price);
      }

      const imageMap = new Map<string, string>();
      const discountByProduct = new Map<string, number | null>();
      for (const p of dbProducts) {
        if (p.image_path) imageMap.set(p.slug, p.image_path);
        discountByProduct.set(p.slug, p.discount_percent == null ? null : Number(p.discount_percent));
      }

      const discountByVariant = new Map<string, number>();
      const variantDiscountRows = (variantDiscRes.data ?? []) as {
        variant_slug: string;
        discount_percent: number | string | null;
      }[];
      for (const row of variantDiscountRows) {
        if (row.discount_percent != null) {
          discountByVariant.set(row.variant_slug, Number(row.discount_percent));
        }
      }

      // Pricing engine radi po ključu linije u korpi, a to je varijanta. Popust
      // upisan na pakovanje ima prednost; inače važi popust sa proizvoda.
      // Sve ide iz baze, pa rade i proizvodi napravljeni u adminu.
      const productDiscountMap = new Map<string, number | null>();
      const fromPriceMap = new Map<string, number>();
      const variantKeysByProduct = new Map<string, string[]>();
      for (const v of dbVariants) {
        productDiscountMap.set(
          v.variant_slug,
          discountByVariant.get(v.variant_slug) ?? discountByProduct.get(v.product_slug) ?? null,
        );
        if (v.is_active === false) continue;
        const keys = variantKeysByProduct.get(v.product_slug) ?? [];
        keys.push(v.variant_slug);
        variantKeysByProduct.set(v.product_slug, keys);
        const price = priceMap.get(v.variant_slug);
        if (price !== undefined) {
          fromPriceMap.set(v.product_slug, Math.min(fromPriceMap.get(v.product_slug) ?? price, price));
        }
      }

      const sett = settRes.data as DbSiteSettings | null;
      const bundleDiscountPercent = Number(sett?.bundle_discount_percent ?? 10);

      const result: PricingData = {
        products: dbProducts,
        priceMap,
        fromPriceMap,
        variantKeysByProduct,
        imageMap,
        productDiscountMap,
        inactiveVariants,
        siteDiscountPercent: Number(sett?.site_discount_percent ?? 0),
        bundleDiscountPercent: Number.isFinite(bundleDiscountPercent) ? bundleDiscountPercent : 10,
        loaded: true,
      };
      cached = result;
      setData(result);
    });

    return () => {
      cancelled = true;
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  return data;
}

/** Efektivni % popusta za varijantu (sa pakovanja, sa proizvoda ili globalni). */
export function effectiveDiscountPercent(
  key: string,
  productDiscountMap: Map<string, number | null>,
  siteDiscountPercent: number,
): number {
  const override = productDiscountMap.get(key);
  if (override != null) return Number(override) || 0;
  return Number(siteDiscountPercent) || 0;
}

/** Poništava keš (npr. posle izmene cena u adminu). */
export function invalidatePricingCache() {
  cached = null;
}
