import Link from 'next/link';
import Media from '@/components/ui/Media';
import { SITE } from '@/lib/site-config';

export default function SalonTeaser() {
  return (
    <section className="border-b border-line bg-surface">
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 py-14 md:grid-cols-2 md:gap-16 md:px-8 md:py-20">
        <div data-reveal="true">
          <Media src="" alt="Salon" ratio="3 / 2" label="Fotografija salona · 1200×800" sizes="(max-width: 768px) 100vw, 50vw" />
        </div>

        <div data-reveal="true" data-reveal-delay="120">
          <p className="font-body text-[10px] uppercase tracking-[0.2em] text-muted">Salon</p>
          <h2 className="mt-4 font-display text-[28px] leading-tight text-ink md:text-[34px]">
            {SITE.salon.name}
          </h2>
          <p className="mt-4 max-w-[440px] font-body text-[14px] leading-relaxed text-ink-soft">
            Placeholder tekst o salonu — koje tretmane radite, koliko traju i šta klijent može da
            očekuje. Zameni svojim tekstom.
          </p>

          <dl className="mt-6 space-y-1.5">
            {SITE.salon.hours.map((h) => (
              <div key={h.day} className="flex justify-between gap-6 border-b border-line py-1.5">
                <dt className="font-body text-[13px] text-ink-soft">{h.day}</dt>
                <dd className="font-body text-[13px] tabular-nums text-ink">{h.time}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/usluge"
              className="rounded-card border border-ink bg-ink px-6 py-3 font-body text-[11px] uppercase tracking-[0.14em] text-canvas transition-colors hover:bg-canvas hover:text-ink"
            >
              Cenovnik usluga
            </Link>
            <Link
              href="/kontakt"
              className="rounded-card border border-line-strong px-6 py-3 font-body text-[11px] uppercase tracking-[0.14em] text-ink transition-colors hover:border-ink"
            >
              Kontakt
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
