import Link from 'next/link';
import ProductCard from '@/components/ui/ProductCard';
import { products, productsByCategory } from '@/lib/data/products';
import { getProductOverrides, resolveImage } from '@/lib/products-server';

export default async function ProductsGrid({
  title = 'Proizvodi',
  intro,
  limit,
  showAllLink = false,
  /** true = proizvodi se dele po linijama (Builder Gel, Rubber Base, …). */
  grouped = false,
  /**
   * true = samo proizvodi izdvojeni u adminu („Na početnoj").
   * Dok nijedan nije izdvojen, prikazuje se početak kataloga da sekcija ne bude prazna.
   */
  featuredOnly = false,
}: {
  title?: string;
  intro?: string;
  limit?: number;
  showAllLink?: boolean;
  grouped?: boolean;
  featuredOnly?: boolean;
}) {
  // Proizvodi isključeni u adminu se ne prikazuju.
  const overrides = await getProductOverrides();
  const active = products.filter((p) => !overrides.inactiveSlugs.has(p.slug));

  const featured = active.filter((p) => overrides.featuredSlugs.has(p.slug));
  const source = featuredOnly && featured.length > 0 ? featured : active;
  const list = limit ? source.slice(0, limit) : source;

  if (list.length === 0) return null;

  const groups = grouped ? productsByCategory(list) : [{ slug: '', label: '', items: list }];

  return (
    <section id="proizvodi" className="border-b border-line">
      <div className="mx-auto max-w-[1200px] px-5 py-14 md:px-8 md:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-12">
          <div>
            <h2 className="font-display text-[28px] text-ink md:text-[34px]">{title}</h2>
            {intro ? (
              <p className="mt-2 max-w-[520px] font-body text-[14px] leading-relaxed text-ink-soft">
                {intro}
              </p>
            ) : null}
          </div>
          {showAllLink ? (
            <Link
              href="/proizvodi"
              className="link-underline font-body text-[11px] uppercase tracking-[0.14em] text-ink-soft hover:text-ink"
            >
              Svi proizvodi
            </Link>
          ) : null}
        </div>

        {groups.map((group, i) => (
          <div key={group.slug || 'all'} id={group.slug || undefined} className={i > 0 ? 'mt-16 md:mt-24' : ''}>
            {group.label ? (
              <div className="mb-8 border-b border-line pb-4 md:mb-10">
                <h3 className="font-display text-[22px] text-ink md:text-[26px]">{group.label}</h3>
                <p className="mt-1 font-body text-[12px] text-muted">
                  <span className="uppercase tracking-[0.14em]">
                    {group.items.length} {group.items.length === 1 ? 'proizvod' : 'proizvoda'}
                  </span>
                  <span className="px-2">·</span>
                  <span>Pakovanja: {group.items[0].packagesLabel}</span>
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-4 md:gap-x-8">
              {group.items.map((product) => (
                <ProductCard
                  key={product.slug}
                  product={product}
                  image={resolveImage(product.slug, overrides)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
