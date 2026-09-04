'use client';

import Link from 'next/link';
import Media from '@/components/ui/Media';
import { isBundleSlug } from '@/lib/bundles';
import { useCart, type CartLine } from '@/lib/cart-context';
import { formatRsd, PRICE_PENDING_LABEL } from '@/lib/price';
import type { CartPricing } from '@/lib/use-cart-pricing';

function QuantityStepper({ line }: { line: CartLine }) {
  const { setQuantity } = useCart();
  return (
    <div className="inline-flex items-center rounded-card border border-line">
      <button
        type="button"
        onClick={() => setQuantity(line.slug, line.quantity - 1)}
        className="flex h-7 w-7 items-center justify-center text-ink-soft hover:text-ink"
        aria-label="Smanji količinu"
      >
        −
      </button>
      <span className="min-w-[24px] text-center font-body text-[13px] tabular-nums text-ink">
        {line.quantity}
      </span>
      <button
        type="button"
        onClick={() => setQuantity(line.slug, line.quantity + 1)}
        className="flex h-7 w-7 items-center justify-center text-ink-soft hover:text-ink"
        aria-label="Povećaj količinu"
      >
        +
      </button>
    </div>
  );
}

/** Lista stavki u korpi — deli je drawer i stranica /korpa. */
export default function CartLines({
  pricing,
  onNavigate,
}: {
  pricing: CartPricing;
  onNavigate?: () => void;
}) {
  const { items, removeLine } = useCart();

  return (
    <ul className="flex flex-col divide-y divide-line">
      {items.map((line) => {
        const href = isBundleSlug(line.slug)
          ? `/paketi/${line.slug}`
          : `/proizvodi/${line.productSlug || line.slug}`;
        const known = pricing.priceKnown(line);
        return (
          <li key={line.slug} className="flex gap-4 py-4">
            <Link href={href} onClick={onNavigate} className="w-[68px] shrink-0">
              <Media src={line.image} alt={line.name} ratio="4 / 5" label="Slika" sizes="68px" fit="contain" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={href}
                onClick={onNavigate}
                className="font-body text-[14px] leading-snug text-ink hover:underline"
              >
                {line.name}
              </Link>
              {line.packageLabel ? (
                <p className="mt-1 font-body text-[13px] text-muted">
                  <span className="text-[11px] uppercase tracking-[0.12em]">Pakovanje</span>
                  <span className="px-1.5">·</span>
                  {line.packageLabel}
                </p>
              ) : null}
              <p className="mt-1 font-body text-[13px] text-muted tabular-nums">
                {known ? `${formatRsd(pricing.unitPriceRsd(line))} / kom` : PRICE_PENDING_LABEL}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <QuantityStepper line={line} />
                <button
                  type="button"
                  onClick={() => removeLine(line.slug)}
                  className="font-body text-[12px] text-muted underline underline-offset-2 hover:text-ink"
                >
                  Ukloni
                </button>
              </div>
            </div>
            <p className="shrink-0 font-body text-[14px] tabular-nums text-ink">
              {known ? formatRsd(pricing.lineTotalRsd(line)) : '—'}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
