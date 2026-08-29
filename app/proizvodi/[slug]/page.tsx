import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ScrollRevealInit from '@/components/ScrollRevealInit';
import Media from '@/components/ui/Media';
import { ProductFromPrice } from '@/components/product/ProductPrice';
import VariantPicker from '@/components/product/VariantPicker';
import { getProductBySlug, products } from '@/lib/data/products';
import { getProductOverrides, resolveImage } from '@/lib/products-server';
import {
  FREE_SHIPPING_THRESHOLD_LABEL,
  PICKUP_LABEL,
  SHIPPING_CARRIER,
  SHIPPING_RSD,
} from '@/lib/shipping';
import { formatRsd } from '@/lib/price';

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: 'Proizvod nije pronađen' };

  const title = product.shade ? `${product.name} — ${product.shade}` : product.name;
  const description = product.features[0];

  return {
    title,
    description,
    alternates: { canonical: `/proizvodi/${product.slug}` },
    openGraph: { title, description, url: `/proizvodi/${product.slug}` },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const overrides = await getProductOverrides();
  const isAvailable = !overrides.inactiveSlugs.has(product.slug);
  const image = resolveImage(product.slug, overrides);

  // Ostale nijanse iste linije — najkorisniji „dalje" izbor u okviru kataloga.
  const sameLine = products.filter(
    (p) =>
      p.categorySlug === product.categorySlug &&
      p.slug !== product.slug &&
      !overrides.inactiveSlugs.has(p.slug),
  );
  const others = (sameLine.length > 0
    ? sameLine
    : products.filter((p) => p.slug !== product.slug && !overrides.inactiveSlugs.has(p.slug))
  ).slice(0, 4);

  return (
    <main>
      <ScrollRevealInit />

      <div className="mx-auto max-w-[1200px] px-5 py-8 md:px-8 md:py-12">
        <nav className="mb-8 font-body text-[11px] uppercase tracking-[0.14em] text-muted">
          <Link href="/proizvodi" className="hover:text-ink">
            Proizvodi
          </Link>
          <span className="px-2">/</span>
          <Link href={`/proizvodi#${product.categorySlug}`} className="hover:text-ink">
            {product.category}
          </Link>
        </nav>

        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          {/* 1 · Fotografija proizvoda / nijanse */}
          <div>
            <Media
              src={image}
              alt={product.shade ? `${product.name} — ${product.shade}` : product.name}
              ratio="4 / 5"
              label="Slika proizvoda · 1000×1250"
              priority
              fit="contain"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>

          <div>
            {/* 2 · Naziv proizvoda i naziv nijanse */}
            <p className="font-body text-[10px] uppercase tracking-[0.18em] text-muted">
              {product.category}
            </p>
            <h1 className="mt-3 font-display text-[30px] leading-tight text-ink md:text-[38px]">
              {product.name}
            </h1>
            {product.shade ? (
              <p className="mt-2 font-body text-[14px] uppercase tracking-[0.16em] text-accent">
                {product.shade}
              </p>
            ) : null}

            {/* 3 · Izbor pakovanja + cena — pre opisa proizvoda */}
            <div className="mt-7 border-t border-line pt-7">
              <VariantPicker product={product} image={image} isAvailable={isAvailable} />
            </div>

            <div className="mt-6 space-y-1 border-t border-line pt-5 font-body text-[12px] leading-relaxed text-muted">
              <p>Plaćanje pouzećem pri preuzimanju.</p>
              <p>
                Dostava {SHIPPING_CARRIER} — {formatRsd(SHIPPING_RSD)}. {FREE_SHIPPING_THRESHOLD_LABEL}.
              </p>
              <p>{PICKUP_LABEL}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4 · Opis proizvoda u tačkama  ·  5 · Način primene */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 md:grid-cols-2 md:gap-16 md:px-8 md:py-20">
          <div data-reveal="true">
            <h2 className="font-display text-[24px] text-ink">Opis proizvoda</h2>
            <ul className="mt-5 space-y-3">
              {product.features.map((f) => (
                <li key={f} className="flex gap-3 font-body text-[14px] leading-relaxed text-ink-soft">
                  <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div data-reveal="true" data-reveal-delay="100">
            <h2 className="font-display text-[24px] text-ink">Način primene</h2>
            <p className="mt-5 font-body text-[14px] leading-relaxed text-ink-soft">
              {product.howToUse}
            </p>
          </div>
        </div>
      </section>

      {/* 6 · Kvalitet i usklađenost  ·  7 · EU usklađenost */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1200px] px-5 py-12 md:px-8 md:py-16">
          <h2 className="font-display text-[24px] text-ink">Kvalitet i usklađenost</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {product.formulation.split('•').map((part) => {
              const label = part.trim();
              if (!label) return null;
              return (
                <span
                  key={label}
                  className="rounded-card border border-line-strong bg-canvas px-4 py-2 font-body text-[12px] uppercase tracking-[0.12em] text-ink"
                >
                  {label}
                </span>
              );
            })}
          </div>
          <p className="mt-5 font-body text-[13px] leading-relaxed text-ink-soft">
            {product.euCompliance}
          </p>
        </div>
      </section>

      {/* Ostale nijanse iz iste linije */}
      {others.length > 0 ? (
        <section>
          <div className="mx-auto max-w-[1200px] px-5 py-14 md:px-8 md:py-16">
            <h2 className="font-display text-[24px] text-ink">
              {others[0].categorySlug === product.categorySlug
                ? 'Ostale nijanse iz linije'
                : 'Možda će ti se dopasti'}
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4 md:gap-x-8">
              {others.map((p) => {
                const title = p.shade ? `${p.name} — ${p.shade}` : p.name;
                return (
                  <Link key={p.slug} href={`/proizvodi/${p.slug}`} className="group block">
                    <Media
                      src={resolveImage(p.slug, overrides)}
                      alt={title}
                      ratio="4 / 5"
                      label={`Slika · ${title}`}
                      fit="contain"
                    />
                    <p className="mt-3 font-display text-[16px] leading-tight text-ink group-hover:underline underline-offset-4">
                      {p.shade || p.name}
                    </p>
                    <div className="mt-1">
                      <ProductFromPrice slug={p.slug} size="sm" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
