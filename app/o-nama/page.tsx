import type { Metadata } from 'next';
import Link from 'next/link';
import ScrollRevealInit from '@/components/ScrollRevealInit';
import Media from '@/components/ui/Media';
import { SITE } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'O nama',
  description: `Priča brenda ${SITE.brandName}.`,
  alternates: { canonical: '/o-nama' },
};

export default function ONamaPage() {
  return (
    <main>
      <ScrollRevealInit />

      <section className="border-b border-line">
        <div className="mx-auto max-w-[760px] px-5 py-14 text-center md:px-8 md:py-20">
          <p className="font-body text-[11px] uppercase tracking-[0.2em] text-muted">O nama</p>
          <h1 className="mt-4 font-display text-[32px] leading-tight text-ink md:text-[44px]">
            Naslov priče o brendu
          </h1>
          <p className="mx-auto mt-5 max-w-[560px] font-body text-[15px] leading-relaxed text-ink-soft">
            Placeholder uvodni pasus. Ovde ide kratka priča — kako je sve počelo i šta vas izdvaja.
          </p>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 md:grid-cols-2 md:gap-16 md:px-8 md:py-20">
          <Media src="" alt="Fotografija" ratio="4 / 5" label="Fotografija · 1000×1250" sizes="(max-width: 768px) 100vw, 50vw" />
          <div data-reveal="true">
            <h2 className="font-display text-[26px] text-ink">Podnaslov sekcije</h2>
            <p className="mt-4 font-body text-[14px] leading-relaxed text-ink-soft">
              Placeholder pasus. Zameni ga tekstom o proizvodima, sastojcima ili pristupu nezi.
            </p>
            <p className="mt-4 font-body text-[14px] leading-relaxed text-ink-soft">
              Drugi placeholder pasus. Može da govori o salonu i tretmanima koje radite.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-[760px] px-5 py-14 text-center md:px-8 md:py-20">
          <h2 className="font-display text-[24px] text-ink">Svrati u salon</h2>
          <p className="mx-auto mt-3 max-w-[480px] font-body text-[14px] leading-relaxed text-ink-soft">
            {SITE.salon.addressLine}, {SITE.salon.city}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/usluge"
              className="rounded-card border border-ink bg-ink px-6 py-3 font-body text-[12px] uppercase tracking-[0.14em] text-canvas transition-colors hover:bg-canvas hover:text-ink"
            >
              Usluge
            </Link>
            <Link
              href="/kontakt"
              className="rounded-card border border-line-strong px-6 py-3 font-body text-[12px] uppercase tracking-[0.14em] text-ink transition-colors hover:border-ink"
            >
              Kontakt
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
