'use client';

import Link from 'next/link';
import { formatAmount } from '@/lib/price';
import { ORDER_STATUSES, ORDER_STATUS_LABELS, formatOrderStatusLabel, type OrderStatus } from '@/lib/order-status';

type Props = {
  ukupnoPorudzbina: number;
  poslednjih30: number;
  prometPlaceno: number;
  prometSve: number;
  statusCounts: Record<OrderStatus, number>;
  poslednje: Array<{ name: string; status: string; createdAt: string; productsRsd: number }>;
  katalog: {
    ukupno: number;
    bezCene: number;
    bezSlike: number;
    naPocetnoj: number;
    iskljuceno: number;
  };
};

export default function AdminOverviewClient({
  ukupnoPorudzbina,
  poslednjih30,
  prometPlaceno,
  prometSve,
  statusCounts,
  poslednje,
  katalog,
}: Props) {
  return (
    <div>
      <h2 className="mb-6 font-display text-[22px] text-ink md:mb-8 md:text-[26px]">Pregled poslovanja</h2>

      <div className="mb-8 grid grid-cols-2 gap-3 md:mb-12 md:grid-cols-4 md:gap-5">
        <Stat label="Porudžbine" value={String(ukupnoPorudzbina)} hint="Svi statusi" />
        <Stat label="Poslednjih 30 dana" value={String(poslednjih30)} hint="Nove porudžbine" />
        <Stat label="Promet (plaćeno)" value={`${formatAmount(prometPlaceno)} RSD`} hint="Bez poštarine" />
        <Stat label="Promet (sve)" value={`${formatAmount(prometSve)} RSD`} hint="Uključuje neplaćene" />
      </div>

      <section className="mb-5 border border-line bg-canvas p-5 md:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="font-display text-[18px] text-ink">Katalog</h3>
          <Link
            href="/admin/proizvodi"
            prefetch
            className="font-body text-[12px] text-muted underline underline-offset-4 hover:text-ink"
          >
            Uredi proizvode
          </Link>
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-x-6 md:grid-cols-4">
          <CatalogRow label="Proizvoda" value={katalog.ukupno} />
          <CatalogRow label="Čeka cenu" value={katalog.bezCene} warn />
          <CatalogRow label="Čeka sliku" value={katalog.bezSlike} warn />
          <CatalogRow label="Na početnoj" value={katalog.naPocetnoj} />
        </ul>
        {katalog.naPocetnoj === 0 ? (
          <p className="mt-4 font-body text-[12px] leading-relaxed text-muted">
            Nijedan proizvod nije izdvojen za početnu stranu — tamo se za sada prikazuje početak
            kataloga. Označi {'„Na početnoj"'} kod proizvoda koje želiš da izdvojiš.
          </p>
        ) : null}
        {katalog.iskljuceno > 0 ? (
          <p className="mt-2 font-body text-[12px] text-muted">
            {katalog.iskljuceno} proizvod(a) je skinuto sa sajta.
          </p>
        ) : null}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="border border-line bg-canvas p-5 md:p-6">
          <h3 className="font-display text-[18px] text-ink">Po statusu</h3>
          <ul className="mt-4">
            {ORDER_STATUSES.map((s) => (
              <li key={s} className="flex items-center justify-between border-b border-line py-2.5">
                <Link
                  href={`/admin/porudzbine?status=${s}`}
                  className="font-body text-[13px] text-ink-soft hover:text-ink"
                >
                  {ORDER_STATUS_LABELS[s]}
                </Link>
                <span className="font-body text-[14px] tabular-nums text-ink">{statusCounts[s]}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border border-line bg-canvas p-5 md:p-6">
          <h3 className="font-display text-[18px] text-ink">Poslednje porudžbine</h3>
          {poslednje.length === 0 ? (
            <p className="mt-4 font-body text-[13px] text-muted">Još nema porudžbina.</p>
          ) : (
            <ul className="mt-4">
              {poslednje.map((o, i) => (
                <li key={i} className="flex items-center justify-between gap-3 border-b border-line py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-body text-[13px] text-ink">{o.name}</p>
                    <p className="font-body text-[11px] tabular-nums text-muted">
                      {new Date(o.createdAt).toLocaleString('sr-RS', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}{' '}
                      · {formatOrderStatusLabel(o.status)}
                    </p>
                  </div>
                  <span className="shrink-0 font-body text-[13px] tabular-nums text-ink">
                    {formatAmount(o.productsRsd)} RSD
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/admin/porudzbine"
            prefetch
            className="mt-5 inline-flex rounded-card border border-ink bg-ink px-5 py-2.5 font-body text-[11px] uppercase tracking-[0.12em] text-canvas transition-colors hover:bg-canvas hover:text-ink"
          >
            Sve porudžbine
          </Link>
        </section>
      </div>
    </div>
  );
}

function CatalogRow({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
  return (
    <li className="border-b border-line py-2.5">
      <p className="font-body text-[11px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <p
        className={`mt-0.5 font-body text-[18px] tabular-nums ${warn && value > 0 ? 'text-accent' : 'text-ink'}`}
      >
        {value}
      </p>
    </li>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-line bg-canvas p-4 md:p-5">
      <p className="font-body text-[9px] uppercase tracking-[0.14em] text-muted md:text-[10px]">{label}</p>
      <p className="mt-2 font-display text-[20px] tabular-nums text-ink md:text-[26px]">{value}</p>
      {hint ? <p className="mt-1 font-body text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}
