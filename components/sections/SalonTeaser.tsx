import Link from 'next/link';
import Media from '@/components/ui/Media';
import { SITE } from '@/lib/site-config';
import { telHref } from '@/lib/order-status';
import { getSalonData } from '@/lib/salon-server';

/**
 * Sekcija salona na početnoj. Fotografija, naslov, tekst i telefon dolaze
 * iz istog mesta kao stranica „Usluge" (Podešavanja → Salon u adminu).
 */
export default async function SalonTeaser() {
  const salon = await getSalonData();

  return (
    <section className="border-b border-line bg-surface">
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 py-14 md:grid-cols-2 md:gap-16 md:px-8 md:py-20">
        <div data-reveal="true">
          <Media
            src={salon.image}
            alt={salon.title}
            ratio="3 / 2"
            label="Fotografija salona · 1350×900"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>

        <div data-reveal="true" data-reveal-delay="120">
          <p className="font-body text-[12px] uppercase tracking-[0.2em] text-muted">Salon</p>
          <h2 className="mt-4 font-display text-[28px] leading-tight text-ink md:text-[34px]">
            {salon.title}
          </h2>
          {salon.intro ? (
            <p className="mt-4 max-w-[440px] font-body text-[15px] leading-relaxed text-ink-soft">
              {salon.intro}
            </p>
          ) : null}

          <dl className="mt-6 space-y-1.5">
            {SITE.salon.hours.map((h) => (
              <div key={h.day} className="flex justify-between gap-6 border-b border-line py-1.5">
                <dt className="font-body text-[15px] text-ink-soft">{h.day}</dt>
                <dd className="font-body text-[15px] tabular-nums text-ink">{h.time}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/usluge"
              className="rounded-card border border-ink bg-ink px-6 py-3 font-body text-[13px] uppercase tracking-[0.14em] text-canvas transition-colors hover:bg-canvas hover:text-ink"
            >
              Cenovnik usluga
            </Link>
            <a
              href={telHref(salon.phone)}
              className="rounded-card border border-line-strong px-6 py-3 font-body text-[13px] uppercase tracking-[0.14em] text-ink transition-colors hover:border-ink"
            >
              Pozovi {salon.phone}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
