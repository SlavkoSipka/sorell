import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ScrollRevealInit from '@/components/ScrollRevealInit';
import Media from '@/components/ui/Media';
import { ProductFromPrice } from '@/components/product/ProductPrice';
import VariantPicker from '@/components/product/VariantPicker';
import { getProductBySlug, products } from '@/lib/data/products';
import ProductGallery from '@/components/product/ProductGallery';
import {
  categorySlugOf,
  getProductOverrides,
  mergeProduct,
  resolveImage,
  resolveImages,
  resolveInstagram,
  resolveVideos,
} from '@/lib/products-server';

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
  const catalogProduct = getProductBySlug(slug);
  if (!catalogProduct) notFound();

  const overrides = await getProductOverrides();
  // Naziv, nijansa i opisi dolaze iz admina kad su tamo uneti.
  const product = mergeProduct(catalogProduct, overrides);
  const isAvailable = !overrides.inactiveSlugs.has(product.slug);
  const images = resolveImages(product.slug, overrides);
  const videos = resolveVideos(product.slug, overrides);
  const instagramUrl = resolveInstagram(product.slug, overrides);
  // Korpa nosi jednu sličicu — uvek glavnu (prvu) iz galerije.
  const mainImage = images[0] ?? '';

  // Linija se čita iz admina — proizvod je možda premešten u drugu.
  const categorySlug = categorySlugOf(product.slug, overrides);
  const categoryLabel =
    overrides.categories.find((c) => c.slug === categorySlug)?.label ?? product.category;

  // Ostale nijanse iste linije — najkorisniji „dalje" izbor u okviru kataloga.
  const sameLine = products.filter(
    (p) =>
      categorySlugOf(p.slug, overrides) === categorySlug &&
      p.slug !== product.slug &&
      !overrides.inactiveSlugs.has(p.slug),
  );
  // Iz iste linije idu sve nijanse — na kompu se prelome u redove po četiri,
  // na telefonu se prevlače. Rezervni izbor (kad linija nema drugih) se skraćuje.
  const others =
    sameLine.length > 0
      ? sameLine
      : products
          .filter((p) => p.slug !== product.slug && !overrides.inactiveSlugs.has(p.slug))
          .slice(0, 8);

  return (
    <main>
      <ScrollRevealInit />

      <div className="mx-auto max-w-[1200px] px-5 py-8 md:px-8 md:py-12">
        <nav className="mb-8 font-body text-[12px] uppercase tracking-[0.14em] text-muted">
          <Link href="/proizvodi" className="hover:text-ink">
            Proizvodi
          </Link>
          <span className="px-2">/</span>
          <Link href={`/proizvodi#${categorySlug}`} className="hover:text-ink">
            {categoryLabel}
          </Link>
        </nav>

        <div className="grid gap-10 md:grid-cols-2 md:items-start md:gap-16">
          {/* 1 · Fotografija proizvoda / nijanse */}
          <div>
            <ProductGallery
              images={images}
              videos={videos}
              alt={product.shade ? `${product.name} — ${product.shade}` : product.name}
            />
          </div>

          {/*
            Kupovina i opis stoje zajedno i na kompu prate skrol dok galerija
            klizi pored njih. `items-start` na mreži je uslov da sticky uopšte
            radi — bez njega kolona se rasteže na visinu galerije.
          */}
          <div className="md:sticky md:top-[100px]">
            {/* 2 · Naziv proizvoda i naziv nijanse */}
            <p className="font-body text-[11px] uppercase tracking-[0.18em] text-muted">
              {categoryLabel}
            </p>
            <h1 className="mt-3 font-display text-[30px] leading-tight text-ink md:text-[38px]">
              {product.name}
            </h1>
            {product.shade ? (
              <p className="mt-2 font-body text-[14px] uppercase tracking-[0.16em] text-accent">
                {product.shade}
              </p>
            ) : null}

            {instagramUrl ? (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 font-body text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ink"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="3" y="3" width="18" height="18" rx="5.5" />
                  <circle cx="12" cy="12" r="4.2" />
                  <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
                </svg>
                Pogledaj na Instagramu
              </a>
            ) : null}

            {/* 3 · Izbor pakovanja + cena — pre opisa proizvoda */}
            <div className="mt-7 border-t border-line pt-7">
              <VariantPicker product={product} image={mainImage} isAvailable={isAvailable} />
            </div>

            {/* 4 · Opis proizvoda — odmah ispod dugmeta, uz cenu */}
            {product.features.length > 0 ? (
              <div className="mt-6 border-t border-line pt-5">
                <h2 className="font-display text-[18px] text-ink">Opis proizvoda</h2>
                <ul className="mt-4 space-y-2.5">
                  {product.features.map((f) => (
                    <li
                      key={f}
                      className="flex gap-3 font-body text-[14px] font-semibold leading-relaxed text-ink"
                    >
                      <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 5 · Način primene */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-[1200px] px-5 py-14 md:px-8 md:py-20">
          <div data-reveal="true" className="max-w-[760px]">
            <h2 className="font-display text-[24px] text-ink">Način primene</h2>
            <p className="mt-5 font-body text-[15px] font-semibold leading-relaxed text-ink-soft">
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
                  className="rounded-card border border-line-strong bg-canvas px-4 py-2 font-body text-[13px] uppercase tracking-[0.12em] text-ink"
                >
                  {label}
                </span>
              );
            })}
          </div>
          <p className="mt-5 font-body text-[15px] font-semibold leading-relaxed text-ink-soft">
            {product.euCompliance}
          </p>
        </div>
      </section>

      {/* Ostale nijanse iz iste linije */}
      {others.length > 0 ? (
        <section>
          <div className="mx-auto max-w-[1200px] px-5 py-14 md:px-8 md:py-16">
            <h2 className="font-display text-[24px] text-ink">
              {categorySlugOf(others[0].slug, overrides) === categorySlug
                ? 'Ostale nijanse iz linije'
                : 'Možda će ti se dopasti'}
            </h2>
            {/*
              Telefon: traka koja se prevlači, sa kadrom širine 60% da se vidi
              da ima još. Komp: obična mreža po četiri u redu.
            */}
            <div className="no-scrollbar -mx-5 mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-4 md:gap-x-8 md:gap-y-10 md:overflow-x-visible md:px-0">
              {others.map((p) => {
                const title = p.shade ? `${p.name} — ${p.shade}` : p.name;
                return (
                  <Link
                    key={p.slug}
                    href={`/proizvodi/${p.slug}`}
                    className="group block w-[60%] shrink-0 snap-start sm:w-[38%] md:w-auto"
                  >
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
