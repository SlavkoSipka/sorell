import Link from 'next/link';
import Media from '@/components/ui/Media';
import { SITE } from '@/lib/site-config';

export default function Hero() {
  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 py-14 md:grid-cols-2 md:gap-16 md:px-8 md:py-20">
        <div data-reveal="true">
          <p className="font-body text-[10px] uppercase tracking-[0.2em] text-muted">
            {SITE.tagline}
          </p>
          <h1 className="mt-4 font-display text-[38px] leading-[1.08] text-ink md:text-[54px]">
            Gradivni gelovi
            <br />
            bez kompromisa
          </h1>
          <p className="mt-5 max-w-[440px] font-body text-[15px] leading-relaxed text-ink-soft">
            Builder gelovi, rubber base i završni sjajevi — formule pogodne i za početnike i za
            iskusne tehničare. HEMA Free, Di-HEMA Free i TPO Free, usklađeno sa važećim propisima EU
            za kozmetičke proizvode.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/proizvodi"
              className="rounded-card border border-ink bg-ink px-7 py-3.5 font-body text-[11px] uppercase tracking-[0.14em] text-canvas transition-colors hover:bg-canvas hover:text-ink"
            >
              Pogledaj proizvode
            </Link>
            <Link
              href="/usluge"
              className="rounded-card border border-line-strong px-7 py-3.5 font-body text-[11px] uppercase tracking-[0.14em] text-ink transition-colors hover:border-ink"
            >
              Usluge salona
            </Link>
          </div>
        </div>

        <div data-reveal="true" data-reveal-delay="120">
          <Media
            src=""
            alt="Glavna fotografija"
            ratio="4 / 5"
            label="Hero slika · preporuka 1200×1500"
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      </div>
    </section>
  );
}
