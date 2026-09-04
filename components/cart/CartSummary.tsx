'use client';

import { useCart } from '@/lib/cart-context';
import { formatRsd } from '@/lib/price';
import { SHIPPING_CARRIER } from '@/lib/shipping';
import type { CartPricing } from '@/lib/use-cart-pricing';

/** Zbirni prikaz: međuzbir, popusti, poštarina, ukupno. */
export default function CartSummary({
  pricing,
  showShipping = true,
}: {
  pricing: CartPricing;
  showShipping?: boolean;
}) {
  const { items, promoCode } = useCart();
  const p = pricing.pricing;

  return (
    <div className="space-y-2">
      {p && p.discountType ? (
        <>
          <Row label="Bez popusta" value={formatRsd(p.subtotalRsd)} muted strike />
          {p.discountType === 'site' &&
          new Set(p.lineDiscounts.map((ld) => Math.round(ld.percent))).size > 1 ? (
            p.lineDiscounts.map((ld) => (
              <Row
                key={ld.slug}
                label={`${items.find((it) => it.slug === ld.slug)?.name ?? ld.slug} −${Math.round(ld.percent)}%`}
                value={`−${formatRsd(ld.amountRsd)}`}
                accent
              />
            ))
          ) : (
            <Row
              label={
                p.discountType === 'bundle'
                  ? `Paket popust −${Math.round(p.discountPercent)}%`
                  : `Popust −${Math.round(p.discountPercent)}%`
              }
              value={`−${formatRsd(p.discountAmountRsd)}`}
              accent
            />
          )}
        </>
      ) : null}

      {p && p.promoDiscountPercent > 0 ? (
        <Row
          label={`Promo kod ${promoCode ?? ''} −${Math.round(p.promoDiscountPercent)}%`}
          value={`−${formatRsd(p.promoDiscountRsd)}`}
          accent
        />
      ) : null}

      <Row label="Proizvodi" value={formatRsd(pricing.productsTotalRsd)} />

      {showShipping ? (
        <Row
          label={`Poštarina (${SHIPPING_CARRIER})`}
          value={pricing.freeShipping ? 'Besplatno' : formatRsd(pricing.shippingRsd)}
          accent={pricing.freeShipping}
        />
      ) : null}

      {pricing.hasUnpricedItems ? (
        <p className="border-t border-line pt-3 font-body text-[13px] leading-relaxed text-danger">
          Za neke stavke cena još nije objavljena — uklonite ih iz korpe da biste nastavili.
        </p>
      ) : null}

      <div className="flex items-end justify-between gap-2 border-t border-line pt-3">
        <span className="font-body text-[13px] font-semibold uppercase tracking-[0.1em] text-ink">
          Ukupno
        </span>
        <span className="font-body text-[20px] font-semibold leading-none tabular-nums text-ink">
          {pricing.loaded
            ? formatRsd(showShipping ? pricing.totalRsd : pricing.productsTotalRsd)
            : '…'}
        </span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent = false,
  muted = false,
  strike = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
  strike?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className={`font-body text-[14px] ${accent ? 'text-accent' : muted ? 'text-muted' : 'text-ink-soft'}`}>
        {label}
      </span>
      <span
        className={`font-body text-[14px] tabular-nums ${strike ? 'line-through text-muted' : accent ? 'text-accent' : 'text-ink'}`}
      >
        {value}
      </span>
    </div>
  );
}
