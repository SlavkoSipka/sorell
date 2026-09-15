'use client';

import { useState } from 'react';
import { useCart } from '@/lib/cart-context';
import {
  variantDisplayName,
  variantKey,
  type Product,
  type ProductVariant,
} from '@/lib/data/products';
import { discountedUnitPriceRsd, formatRsd, PRICE_PENDING_LABEL } from '@/lib/price';
import { effectiveDiscountPercent, usePricingData } from '@/lib/use-pricing-data';

/**
 * Izbor pakovanja i cena, odmah ispod fotografije, pre opisa proizvoda
 * (raspored sa lista „Raspored na sajtu", tačka 3).
 *
 * Cena zavisi od pakovanja i čita se iz `product_variants`. Pakovanje bez cene
 * ili isključeno u adminu se uopšte ne nudi. Dok se cene ne učitaju u browseru,
 * spisak ponuđenih pakovanja stiže sa servera (`pricedCodes`), pa ništa ne treperi.
 */
export default function VariantPicker({
  product,
  image,
  isAvailable,
  pricedCodes,
}: {
  product: Product;
  image: string;
  isAvailable: boolean;
  /** Pakovanja koja po serveru imaju cenu; važe dok se cene ne učitaju u browseru. */
  pricedCodes: string[];
}) {
  const { addItem } = useCart();
  const { priceMap, productDiscountMap, siteDiscountPercent, inactiveVariants, loaded } =
    usePricingData();

  const keyOf = (v: ProductVariant) => variantKey(product.slug, v.code);
  const priceOf = (v: ProductVariant) => (loaded ? (priceMap.get(keyOf(v)) ?? 0) : 0);

  const visible = product.variants.filter((v) =>
    loaded ? priceOf(v) > 0 && !inactiveVariants.has(keyOf(v)) : pricedCodes.includes(v.code),
  );

  const [selectedCode, setSelectedCode] = useState(visible[0]?.code ?? '');
  const selected: ProductVariant | undefined =
    visible.find((v) => v.code === selectedCode) ?? visible[0];

  const percentOf = (v: ProductVariant) =>
    loaded ? effectiveDiscountPercent(keyOf(v), productDiscountMap, siteDiscountPercent) : 0;
  // Svako pakovanje može imati svoj popust. Oznaka na dugmetu se prikazuje samo
  // kad se popusti razlikuju; isti popust na sva pakovanja se vidi uz cenu.
  const percents = visible.map(percentOf);
  const mixedDiscounts = percents.some((pct) => pct !== percents[0]);

  const selectedKey = selected ? keyOf(selected) : '';
  const basePrice = selected ? priceOf(selected) : 0;
  const percent = selected ? percentOf(selected) : 0;
  const finalPrice = discountedUnitPriceRsd(basePrice, percent);

  const canBuy = isAvailable && selected !== undefined && basePrice > 0;

  const add = () => {
    if (!selected || !canBuy) return;
    addItem({
      slug: selectedKey,
      productSlug: product.slug,
      packageLabel: selected.label,
      name: variantDisplayName(product, selected),
      price: String(basePrice),
      image,
    });
  };

  return (
    <div>
      {visible.length > 1 ? (
        <fieldset>
          <legend className="mb-2 font-body text-[11px] uppercase tracking-[0.16em] text-muted">
            Pakovanje
          </legend>
          <div className="flex flex-wrap gap-2">
            {visible.map((v) => {
              const active = v.code === selected?.code;
              return (
                <button
                  key={v.code}
                  type="button"
                  onClick={() => setSelectedCode(v.code)}
                  aria-pressed={active}
                  className={`rounded-card border px-4 py-2.5 font-body text-[14px] tabular-nums transition-colors ${
                    active
                      ? 'border-ink bg-ink text-canvas'
                      : 'border-line-strong bg-canvas text-ink hover:border-ink'
                  }`}
                >
                  {v.label}
                  {mixedDiscounts && percentOf(v) > 0 ? (
                    <span
                      className={`ml-2 text-[11px] ${active ? 'text-canvas/80' : 'text-accent'}`}
                    >
                      −{Math.round(percentOf(v))}%
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : visible.length === 1 && visible[0].label ? (
        <p className="font-body text-[13px] text-muted">
          <span className="uppercase tracking-[0.16em] text-[11px]">Pakovanje</span>
          <span className="px-2">·</span>
          {visible[0].label}
        </p>
      ) : null}

      <div className={`flex flex-wrap items-baseline gap-3 ${visible.length > 0 ? 'mt-5' : ''}`}>
        {basePrice > 0 ? (
          <>
            <span className="font-body text-[24px] tabular-nums text-ink md:text-[28px]">
              {formatRsd(finalPrice)}
            </span>
            {percent > 0 ? (
              <>
                <span className="font-body text-[14px] tabular-nums text-muted line-through">
                  {formatRsd(basePrice)}
                </span>
                <span className="rounded-card bg-accent-soft px-2 py-0.5 font-body text-[11px] uppercase tracking-[0.1em] text-accent">
                  −{Math.round(percent)}%
                </span>
              </>
            ) : null}
          </>
        ) : (
          <span className="font-body text-[18px] text-muted">{PRICE_PENDING_LABEL}</span>
        )}
      </div>

      <div className="mt-5">
        {!isAvailable ? (
          <p className="rounded-card border border-line bg-surface px-5 py-3.5 text-center font-body text-[13px] uppercase tracking-[0.12em] text-muted">
            Trenutno nije dostupno
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={add}
              disabled={!canBuy}
              className="w-full rounded-card border border-ink bg-ink px-6 py-3.5 font-body text-[12px] uppercase tracking-[0.14em] text-canvas transition-colors duration-200 hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-muted disabled:hover:bg-surface disabled:hover:text-muted"
            >
              Dodaj u korpu
            </button>
            {loaded && visible.length === 0 ? (
              <p className="mt-2 font-body text-[13px] leading-relaxed text-muted">
                Cena za ovaj proizvod još nije objavljena. Za upit nas kontaktirajte.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
