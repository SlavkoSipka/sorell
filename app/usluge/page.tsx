import type { Metadata } from 'next';
import Link from 'next/link';
import ScrollRevealInit from '@/components/ScrollRevealInit';
import Media from '@/components/ui/Media';
import { SITE } from '@/lib/site-config';
import { formatRsd } from '@/lib/price';
import { telHref } from '@/lib/order-status';
import { getSalonData } from '@/lib/salon-server';

export const metadata: Metadata = {
  title: 'Usluge i cenovnik',
  description: 'Tretmani lica i tela, depilacija — cenovnik i trajanje.',
  alternates: { canonical: '/usluge' },
};

export default async function UslugePage() {
  // Cenovnik, fotografija, naslov i telefon dolaze iz admina (Podešavanja → Salon).
  const salon = await getSalonData();

  return (
    <main>
      <ScrollRevealInit />

      <section className="border-b border-line">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 py-12 md:grid-cols-2 md:gap-16 md:px-8 md:py-16">
          <div>
            <p className="font-body text-[12px] uppercase tracking-[0.2em] text-muted">Salon</p>
            <h1 className="mt-4 font-display text-[32px] leading-tight text-ink md:text-[42px]">
              Usluge i cenovnik
            </h1>
            {salon.intro ? (
              <p className="mt-4 max-w-[460px] font-body text-[15px] leading-relaxed text-ink-soft">
                {salon.intro}
              </p>
            ) : null}
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={telHref(salon.phone)}
                className="rounded-card border border-ink bg-ink px-6 py-3 font-body text-[13px] uppercase tracking-[0.14em] text-canvas transition-colors hover:bg-canvas hover:text-ink"
              >
                Pozovi {salon.phone}
              </a>
              <Link
                href="/kontakt"
                className="rounded-card border border-line-strong px-6 py-3 font-body text-[13px] uppercase tracking-[0.14em] text-ink transition-colors hover:border-ink"
              >
                Lokacija i radno vreme
              </Link>
            </div>
          </div>

          <Media
            src={salon.image}
            alt={salon.title}
            ratio="3 / 2"
            label="Fotografija salona · 1350×900"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      </section>

      {salon.groups.map((group, gi) => (
        <section
          key={group.slug}
          className={gi % 2 === 1 ? 'border-b border-line bg-surface' : 'border-b border-line'}
        >
          <div className="mx-auto max-w-[900px] px-5 py-12 md:px-8 md:py-16">
            <div data-reveal="true">
              <h2 className="font-display text-[26px] text-ink md:text-[30px]">{group.title}</h2>
              {group.intro ? (
                <p className="mt-2 max-w-[560px] font-body text-[15px] leading-relaxed text-ink-soft">
                  {group.intro}
                </p>
              ) : null}
            </div>

            <ul className="mt-8">
              {group.services.map((s) => (
                <li
                  key={s.name}
                  className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-[15px] font-semibold text-ink">{s.name}</p>
                    {s.description ? (
                      <p className="mt-1 font-body text-[14px] leading-relaxed text-muted">
                        {s.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-baseline gap-5">
                    {s.durationMinutes ? (
                      <span className="font-body text-[14px] tabular-nums text-muted">
                        {s.durationMinutes} min
                      </span>
                    ) : null}
                    <span className="font-body text-[15px] font-semibold tabular-nums text-ink">
                      {s.priceRsd == null ? 'Cena na upit' : formatRsd(s.priceRsd)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <section>
        <div className="mx-auto max-w-[900px] px-5 py-12 text-center md:px-8 md:py-16">
          <h2 className="font-display text-[24px] text-ink">Zakazivanje</h2>
          <p className="mx-auto mt-3 max-w-[520px] font-body text-[15px] leading-relaxed text-ink-soft">
            Termini se zakazuju telefonom ili porukom. Radno vreme i adresa su na stranici kontakta.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href={telHref(salon.phone)}
              className="rounded-card border border-ink bg-ink px-6 py-3 font-body text-[13px] uppercase tracking-[0.14em] text-canvas transition-colors hover:bg-canvas hover:text-ink"
            >
              {salon.phone}
            </a>
            <a
              href={`mailto:${SITE.salon.email}`}
              className="rounded-card border border-line-strong px-6 py-3 font-body text-[13px] uppercase tracking-[0.14em] text-ink transition-colors hover:border-ink"
            >
              {SITE.salon.email}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
