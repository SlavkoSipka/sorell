import type { Metadata } from 'next';
import ScrollRevealInit from '@/components/ScrollRevealInit';
import ProductsGrid from '@/components/sections/ProductsGrid';
import BundlesSection from '@/components/sections/BundlesSection';

export const metadata: Metadata = {
  title: 'Gel za nokte, builder gel i top gel',
  description:
    'Sorelle proizvodi za manikir: builder gel, rubber base, top gel i završni sjaj, uz opremu i materijal za manikir. HEMA Free formule, plaćanje pouzećem.',
  openGraph: {
    title: 'Gel za nokte, builder gel i top gel | Sorelle',
    description:
      'Builder gel, rubber base, top gel i završni sjaj — profesionalni materijal za manikir. HEMA Free formule.',
    url: '/proizvodi',
  },
  alternates: { canonical: '/proizvodi' },
};

export default function ProizvodiPage() {
  return (
    <main>
      <ScrollRevealInit />
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1200px] px-5 py-10 md:px-8 md:py-16">
          <h1 className="font-display text-[32px] text-ink md:text-[42px]">Proizvodi</h1>
          <p className="mt-3 max-w-[620px] font-body text-[14px] leading-relaxed text-ink-soft">
            Gradivni gelovi, rubber base i završni sjajevi za profesionalan rad. Svaki proizvod
            dolazi u više pakovanja — pakovanje i cenu biraš na stranici proizvoda.
          </p>
          <p className="mt-4 font-body text-[12px] uppercase tracking-[0.14em] text-accent">
            HEMA Free · Di-HEMA Free · TPO Free
          </p>
        </div>
      </section>
      {/* Naslov je namerno prazan — h1 iznad već kaže šta je ovo, a izbor
          kategorije stoji u samoj sekciji, odmah iznad spiska. */}
      <ProductsGrid title="" grouped />
      <BundlesSection />
    </main>
  );
}
