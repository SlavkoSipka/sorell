'use client';

import Link from 'next/link';
import CartLines from '@/components/cart/CartLines';
import CartSummary from '@/components/cart/CartSummary';
import { useCart } from '@/lib/cart-context';
import { useCartPricing } from '@/lib/use-cart-pricing';
import { FREE_SHIPPING_THRESHOLD_LABEL } from '@/lib/shipping';

export default function KorpaClient() {
  const { items } = useCart();
  const pricing = useCartPricing();

  return (
    <main>
      <div className="mx-auto max-w-[1000px] px-5 py-12 md:px-8 md:py-16">
        <h1 className="font-display text-[30px] text-ink md:text-[38px]">Korpa</h1>

        {items.length === 0 ? (
          <div className="mt-10 border border-line px-6 py-16 text-center">
            <p className="font-body text-[14px] text-muted">Korpa je prazna.</p>
            <Link
              href="/proizvodi"
              className="mt-6 inline-flex rounded-card border border-ink bg-ink px-6 py-3 font-body text-[12px] uppercase tracking-[0.14em] text-canvas transition-colors hover:bg-canvas hover:text-ink"
            >
              Pogledaj proizvode
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px] lg:items-start">
            <div>
              <CartLines pricing={pricing} />
            </div>

            <aside className="border border-line bg-surface p-5 lg:sticky lg:top-28">
              <h2 className="font-display text-[19px] text-ink">Ukupno</h2>
              <div className="mt-4">
                <CartSummary pricing={pricing} />
              </div>
              <p className="mt-4 font-body text-[13px] leading-relaxed text-muted">
                {FREE_SHIPPING_THRESHOLD_LABEL}. Promo kod se unosi u sledećem koraku.
              </p>
              {pricing.hasUnpricedItems ? (
                <p className="mt-5 block rounded-card border border-line bg-canvas py-3 text-center font-body text-[12px] uppercase tracking-[0.14em] text-muted">
                  Nastavi na porudžbinu
                </p>
              ) : (
                <Link
                  href="/porudzbina"
                  className="mt-5 block rounded-card border border-ink bg-ink py-3 text-center font-body text-[12px] uppercase tracking-[0.14em] text-canvas transition-colors hover:bg-canvas hover:text-ink"
                >
                  Nastavi na porudžbinu
                </Link>
              )}
              <Link
                href="/proizvodi"
                className="mt-2 block py-2 text-center font-body text-[13px] text-muted underline underline-offset-4 hover:text-ink"
              >
                Nastavi kupovinu
              </Link>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
