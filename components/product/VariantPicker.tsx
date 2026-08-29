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
 * Izbor pakovanja i cena — stoji odmah ispod fotografije, pre opisa proizvoda
 * (raspored sa lista „Raspored na sajtu", tačka 3).
 *
 * Cena zavisi od pakovanja i čita se iz `product_variants`. Dok cena nije uneta
 * u adminu, pakovanje se prikazuje kao „Cena uskoro" i ne može da se doda u korpu.
 */
export default function VariantPicker({
  product,
  image,
  isAvailable,
}: {
  product: Product;
  image: string;
  isAvailable: boolean;
}) {
  const { addItem } = useCart();
  const { priceMap, productDiscountMap, siteDiscountPercent, inactiveVariants, loaded } =
    usePricingData();

  const [selectedCode, setSelectedCode] = useState(product.variants[0]?.code ?? '');
  const selected: ProductVariant | undefined =
    product.variants.find((v) => v.code === selectedCode) ?? product.variants[0];

  const keyOf = (v: ProductVariant) => variantKey(product.slug, v.code);
  const priceOf = (v: ProductVariant) => (loaded ? (priceMap.get(keyOf(v)) ?? 0) : 0);
  const isVariantAvailable = (v: ProductVariant) => !inactiveVariants.has(keyOf(v));

  const selectedKey = selected ? keyOf(selected) : '';
  const basePrice = selected ? priceOf(selected) : 0;
  const percent = loaded
    ? effectiveDiscountPercent(selectedKey, productDiscountMap, siteDiscountPercent)
    : 0;
  const finalPrice = discountedUnitPriceRsd(basePrice, percent);

  const canBuy = isAvailable && selected !== undefined && basePrice > 0 && isVariantAvailable(selected);

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
      {product.variants.length > 1 ? (
        <fieldset>
          <legend className="mb-2 font-body text-[10px] uppercase tracking-[0.16em] text-muted">
            Pakovanje
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => {
              const active = v.code === selected?.code;
              const disabled = !isVariantAvailable(v);
              return (
                <button
                  key={v.code}
                  type="button"
                  onClick={() => setSelectedCode(v.code)}
                  disabled={disabled}
                  aria-pressed={active}
                  className={`rounded-card border px-4 py-2.5 font-body text-[13px] tabular-nums transition-colors ${
                    active
                      ? 'border-ink bg-ink text-canvas'
                      : 'border-line-strong bg-canvas text-ink hover:border-ink'
                  } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : (
        <p className="font-body text-[12px] text-muted">
          <span className="uppercase tracking-[0.16em] text-[10px]">Pakovanje</span>
          <span className="px-2">·</span>
          {product.variants[0]?.label}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-baseline gap-3">
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
                <span className="rounded-card bg-accent-soft px-2 py-0.5 font-body text-[10px] uppercase tracking-[0.1em] text-accent">
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
          <p className="rounded-card border border-line bg-surface px-5 py-3.5 text-center font-body text-[12px] uppercase tracking-[0.12em] text-muted">
            Trenutno nije dostupno
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={add}
              disabled={!canBuy}
              className="w-full rounded-card border border-ink bg-ink px-6 py-3.5 font-body text-[11px] uppercase tracking-[0.14em] text-canvas transition-colors duration-200 hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-muted disabled:hover:bg-surface disabled:hover:text-muted"
            >
              Dodaj u korpu
            </button>
            {loaded && !canBuy && selected && isVariantAvailable(selected) ? (
              <p className="mt-2 font-body text-[12px] leading-relaxed text-muted">
                Cena za ovo pakovanje još nije objavljena. Za upit nas kontaktirajte.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
