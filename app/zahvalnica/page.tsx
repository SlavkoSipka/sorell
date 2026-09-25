import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/lib/site-config';
import { telHref } from '@/lib/order-status';
import { formatRsd } from '@/lib/price';
import { getSalonData } from '@/lib/salon-server';
import { getOrderForReceipt } from '@/lib/order-receipt-server';
import { orderDate, orderNumberLabel, orderTotals, parseLines } from '@/lib/order-pdf';

export const metadata: Metadata = {
  title: 'Hvala na porudžbini',
  description: 'Porudžbina je primljena.',
  robots: { index: false, follow: false },
};

// Potvrda sadrži lične podatke — stranica se nikad ne kešira.
export const dynamic = 'force-dynamic';

function Red({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-0.5">
      <span className={strong ? 'font-semibold text-ink' : 'text-ink-soft'}>{label}</span>
      <span className={`tabular-nums ${strong ? 'text-[19px] font-semibold text-ink' : 'text-ink'}`}>
        {value}
      </span>
    </div>
  );
}

export default async function ZahvalnicaPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; br?: string }>;
}) {
  const { id } = await searchParams;
  const [{ phone }, order] = await Promise.all([
    getSalonData(),
    id ? getOrderForReceipt(id) : Promise.resolve(null),
  ]);

  const pdf = order && id ? `/api/porudzbine/${id}/potvrda` : null;
  const broj = order ? orderNumberLabel(order.order_number) : null;
  const stavke = order ? parseLines(order.line_items) : [];
  const iznosi = order ? orderTotals(order) : null;

  return (
    <main>
      <div className="mx-auto max-w-[560px] px-4 py-10 md:px-8 md:py-16">
        <div className="text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-ink">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <h1 className="mt-4 font-display text-[28px] leading-tight text-ink md:text-[36px]">
            Hvala na porudžbini
          </h1>
          <p className="mx-auto mt-2 max-w-[420px] font-body text-[14px] leading-relaxed text-ink-soft">
            Kontaktiramo te pre slanja. Plaćanje je pouzećem, kuriru pri preuzimanju.
          </p>
        </div>

        {order && iznosi ? (
          <>
            {/* Potvrda — složena da stane u jedan screenshot na telefonu. */}
            <section
              aria-label={`Potvrda porudžbine broj ${broj}`}
              className="mt-7 border border-ink bg-canvas px-4 py-5 font-body text-[14px] md:px-6 md:py-6"
            >
              <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
                <div>
                  <p className="font-display text-[20px] leading-none tracking-[0.04em] text-ink">
                    {SITE.brandName.toUpperCase()}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-muted">
                    Potvrda porudžbine
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[20px] font-semibold leading-none tabular-nums text-ink">
                    Br. {broj}
                  </p>
                  <p className="mt-2 text-[12px] tabular-nums text-muted">{orderDate(order.created_at)}</p>
                </div>
              </div>

              <div className="border-b border-line py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Adresa za dostavu
                </p>
                <p className="mt-1.5 leading-relaxed text-ink">
                  <span className="font-semibold">
                    {order.customer_first_name} {order.customer_last_name}
                  </span>
                  <br />
                  {order.address_line}
                  {order.address_extra ? `, ${order.address_extra}` : ''}
                  <br />
                  {order.postal_code} {order.city}
                  {order.municipality ? ` · opština ${order.municipality}` : ''}
                  <br />
                  <span className="tabular-nums text-ink-soft">{order.customer_phone}</span>
                </p>
              </div>

              <ul className="border-b border-line py-3">
                {stavke.map((s, i) => (
                  <li key={i} className="flex items-start justify-between gap-4 py-1.5">
                    <span className="min-w-0">
                      <span className="block leading-snug text-ink">{s.name}</span>
                      <span className="block text-[12px] tabular-nums text-muted">
                        {s.quantity} × {formatRsd(s.unit)}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-ink">{formatRsd(s.total)}</span>
                  </li>
                ))}
              </ul>

              <div className="py-3">
                <Red label="Međuzbir" value={formatRsd(iznosi.subtotal)} />
                {iznosi.popust > 0.004 ? <Red label="Popust" value={`−${formatRsd(iznosi.popust)}`} /> : null}
                {iznosi.promo > 0.004 ? (
                  <Red
                    label={order.promo_code ? `Promo kod ${order.promo_code}` : 'Promo kod'}
                    value={`−${formatRsd(iznosi.promo)}`}
                  />
                ) : null}
                <Red
                  label="Poštarina"
                  value={iznosi.shipping > 0 ? formatRsd(iznosi.shipping) : 'Besplatno'}
                />
                <div className="mt-2 border-t border-ink pt-2">
                  <Red label="Za plaćanje" value={formatRsd(iznosi.total)} strong />
                </div>
              </div>

              <p className="bg-surface px-3 py-2.5 text-[13px] text-ink">
                <span className="font-semibold">Plaćanje pouzećem</span> — gotovinom kuriru pri
                preuzimanju paketa.
              </p>

              {order.note ? (
                <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
                  <span className="font-semibold text-ink">Napomena:</span> {order.note}
                </p>
              ) : null}
            </section>

            {pdf ? (
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="font-body text-[12px] text-muted">Sačuvaj screenshot ili preuzmi PDF.</p>
                <a
                  href={`${pdf}?preuzmi=1`}
                  className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-card border border-line-strong px-3 font-body text-[12px] uppercase tracking-[0.1em] text-ink transition-colors hover:border-ink"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14" />
                  </svg>
                  PDF
                </a>
              </div>
            ) : null}
          </>
        ) : null}

        <div className="mt-8 border border-line px-5 py-4 text-left">
          <p className="font-body text-[12px] uppercase tracking-[0.16em] text-muted">Pitanja?</p>
          <p className="mt-2 font-body text-[14px] text-ink-soft">
            Pozovi{' '}
            <a href={telHref(phone)} className="text-ink underline underline-offset-4">
              {phone}
            </a>{' '}
            ili piši na{' '}
            <a href={`mailto:${SITE.salon.email}`} className="text-ink underline underline-offset-4">
              {SITE.salon.email}
            </a>
            {broj ? ` i navedi broj porudžbine ${broj}` : ''}.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
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
