'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart-context';
import { useCartPricing } from '@/lib/use-cart-pricing';
import { FREE_SHIPPING_THRESHOLD_RSD, FREE_SHIPPING_THRESHOLD_LABEL } from '@/lib/shipping';
import { formatRsd } from '@/lib/price';
import CartLines from '@/components/cart/CartLines';
import CartSummary from '@/components/cart/CartSummary';

export default function CartDrawer() {
  const { items, isOpen, closeCart } = useCart();
  const pricing = useCartPricing();

  const missingForFreeShipping = Math.max(
    0,
    FREE_SHIPPING_THRESHOLD_RSD - pricing.productsTotalRsd,
  );

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-ink/25 transition-opacity duration-300 ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={closeCart}
        aria-hidden
      />

      <aside
        className={`fixed right-0 top-0 z-[70] flex h-full w-full max-w-[420px] flex-col border-l border-line bg-canvas transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Korpa"
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p className="font-display text-[18px] text-ink">Korpa</p>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Zatvori korpu"
            className="flex h-8 w-8 items-center justify-center text-ink-soft hover:text-ink"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
              <line x1="1" y1="1" x2="15" y2="15" />
              <line x1="15" y1="1" x2="1" y2="15" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
            <p className="font-body text-[14px] text-muted">Korpa je prazna.</p>
            <Link
              href="/proizvodi"
              onClick={closeCart}
              className="rounded-card border border-ink bg-ink px-6 py-3 font-body text-[11px] uppercase tracking-[0.14em] text-canvas transition-colors hover:bg-canvas hover:text-ink"
            >
              Pogledaj proizvode
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5">
              <CartLines pricing={pricing} onNavigate={closeCart} />
            </div>

            <div className="space-y-4 border-t border-line px-5 py-5">
              {pricing.freeShipping ? (
                <p className="font-body text-[12px] text-accent">{FREE_SHIPPING_THRESHOLD_LABEL}</p>
              ) : (
                <p className="font-body text-[12px] text-muted">
                  Još {formatRsd(missingForFreeShipping)} do besplatne dostave.
                </p>
              )}

              <CartSummary pricing={pricing} showShipping={false} />

              <div className="flex flex-col gap-2">
                <Link
                  href="/porudzbina"
                  onClick={closeCart}
                  className="rounded-card border border-ink bg-ink py-3 text-center font-body text-[11px] uppercase tracking-[0.14em] text-canvas transition-colors hover:bg-canvas hover:text-ink"
                >
                  Nastavi na porudžbinu
                </Link>
                <Link
                  href="/korpa"
                  onClick={closeCart}
                  className="rounded-card border border-line-strong py-3 text-center font-body text-[11px] uppercase tracking-[0.14em] text-ink transition-colors hover:border-ink"
                >
                  Pregled korpe
                </Link>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
