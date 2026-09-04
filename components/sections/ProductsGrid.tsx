import Link from 'next/link';
import ProductCard from '@/components/ui/ProductCard';
import ProductCarousel from '@/components/sections/ProductCarousel';
import ProductsBrowser from '@/components/sections/ProductsBrowser';
import { products, type Product } from '@/lib/data/products';
import {
  getProductOverrides,
  groupByCategory,
  mergeProduct,
  resolveImage,
} from '@/lib/products-server';

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
  /** Prazno = sekcija ide bez naslova (stranica iznad već ima svoj). */
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

  const groups = grouped ? groupByCategory(list, overrides) : [{ slug: '', label: '', items: list }];

  const row = (group: { slug: string; label: string; items: Product[] }) => (
    <div id={group.slug || undefined} data-reveal="true">
      {group.label ? (
        <div className="mb-6 border-b border-line pb-3 md:mb-10 md:pb-4">
          <h3 className="font-display text-[22px] text-ink md:text-[26px]">{group.label}</h3>
          {/* Pakovanja se biraju na stranici proizvoda — u spisku su samo šum. */}
          <p className="mt-1 font-body text-[13px] uppercase tracking-[0.14em] text-muted">
            {group.items.length} {group.items.length === 1 ? 'proizvod' : 'proizvoda'}
          </p>
        </div>
      ) : null}

      <ProductCarousel>
        {group.items.map((product) => (
          <ProductCard
            key={product.slug}
            product={mergeProduct(product, overrides)}
            image={resolveImage(product.slug, overrides)}
            reveal={false}
          />
        ))}
      </ProductCarousel>
    </div>
  );

  const hasHeader = Boolean(title) || Boolean(intro) || showAllLink;

  return (
    <section id="proizvodi" className="border-b border-line">
      <div className="mx-auto max-w-[1200px] px-5 py-14 md:px-8 md:py-20">
        {hasHeader ? (
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-12">
            <div>
              {title ? (
                <h2 className="font-display text-[28px] text-ink md:text-[34px]">{title}</h2>
              ) : null}
              {intro ? (
                <p className="mt-2 max-w-[520px] font-body text-[14px] leading-relaxed text-ink-soft">
                  {intro}
                </p>
              ) : null}
            </div>
            {showAllLink ? (
              <Link
                href="/proizvodi"
                className="link-underline font-body text-[12px] uppercase tracking-[0.14em] text-ink-soft hover:text-ink"
              >
                Svi proizvodi
              </Link>
            ) : null}
          </div>
        ) : null}

        {grouped ? (
          <ProductsBrowser
            groups={groups.map((g) => ({ slug: g.slug, label: g.label, count: g.items.length }))}
          >
            {groups.map((group) => (
              <div key={group.slug}>{row(group)}</div>
            ))}
          </ProductsBrowser>
        ) : (
          row(groups[0])
        )}
      </div>
    </section>
  );
}
