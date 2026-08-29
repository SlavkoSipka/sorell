import type { Metadata } from 'next';
import Link from 'next/link';
import ScrollRevealInit from '@/components/ScrollRevealInit';
import ProductsGrid from '@/components/sections/ProductsGrid';
import BundlesSection from '@/components/sections/BundlesSection';
import { CATEGORIES, products } from '@/lib/data/products';
import { getProductOverrides } from '@/lib/products-server';

export const metadata: Metadata = {
  title: 'Proizvodi',
  description:
    'Profesionalni gradivni gelovi, rubber base i završni sjajevi. HEMA Free • Di-HEMA Free • TPO Free.',
  alternates: { canonical: '/proizvodi' },
};

export default async function ProizvodiPage() {
  const { inactiveSlugs } = await getProductOverrides();
  const active = products.filter((p) => !inactiveSlugs.has(p.slug));
  const categories = CATEGORIES.filter((c) => active.some((p) => p.categorySlug === c.slug));

  return (
    <main>
      <ScrollRevealInit />
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1200px] px-5 py-12 md:px-8 md:py-16">
          <h1 className="font-display text-[32px] text-ink md:text-[42px]">Proizvodi</h1>
          <p className="mt-3 max-w-[620px] font-body text-[14px] leading-relaxed text-ink-soft">
            Gradivni gelovi, rubber base i završni sjajevi za profesionalan rad. Svaki proizvod
            dolazi u više pakovanja — pakovanje i cenu biraš na stranici proizvoda.
          </p>
          <p className="mt-4 font-body text-[11px] uppercase tracking-[0.14em] text-accent">
            HEMA Free · Di-HEMA Free · TPO Free
          </p>

          {categories.length > 1 ? (
            <nav className="mt-8 flex flex-wrap gap-2" aria-label="Linije proizvoda">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`#${c.slug}`}
                  className="rounded-card border border-line-strong px-4 py-2 font-body text-[11px] uppercase tracking-[0.12em] text-ink transition-colors hover:border-ink"
                >
                  {c.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      </section>
      <ProductsGrid title="Svi proizvodi" grouped />
      <BundlesSection />
    </main>
  );
}
