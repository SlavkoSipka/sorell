import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/lib/site-config';
import { telHref } from '@/lib/order-status';

export const metadata: Metadata = {
  title: 'Hvala na porudžbini',
  description: 'Porudžbina je primljena.',
  robots: { index: false, follow: false },
};

export default function ZahvalnicaPage() {
  return (
    <main>
      <div className="mx-auto max-w-[640px] px-5 py-20 text-center md:px-8 md:py-28">
        <p className="font-body text-[11px] uppercase tracking-[0.2em] text-muted">Porudžbina primljena</p>
        <h1 className="mt-4 font-display text-[32px] leading-tight text-ink md:text-[42px]">
          Hvala na porudžbini
        </h1>
        <p className="mx-auto mt-5 max-w-[460px] font-body text-[15px] leading-relaxed text-ink-soft">
          Kontaktiramo te radi potvrde pre slanja. Plaćanje je pouzećem — iznos se plaća kuriru pri
          preuzimanju.
        </p>

        <div className="mt-10 border border-line bg-surface px-6 py-6 text-left">
          <p className="font-body text-[11px] uppercase tracking-[0.16em] text-muted">Pitanja?</p>
          <p className="mt-2 font-body text-[14px] text-ink-soft">
            Pozovi{' '}
            <a href={telHref(SITE.salon.phone)} className="text-ink underline underline-offset-4">
              {SITE.salon.phone}
            </a>{' '}
            ili piši na{' '}
            <a href={`mailto:${SITE.salon.email}`} className="text-ink underline underline-offset-4">
              {SITE.salon.email}
            </a>
            .
          </p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/proizvodi"
            className="rounded-card border border-ink bg-ink px-6 py-3 font-body text-[12px] uppercase tracking-[0.14em] text-canvas transition-colors hover:bg-canvas hover:text-ink"
          >
            Nastavi kupovinu
          </Link>
          <Link
            href="/"
            className="rounded-card border border-line-strong px-6 py-3 font-body text-[12px] uppercase tracking-[0.14em] text-ink transition-colors hover:border-ink"
          >
            Početna
          </Link>
        </div>
      </div>
    </main>
  );
}
