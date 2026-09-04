import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ScrollRevealInit from '@/components/ScrollRevealInit';
import Media from '@/components/ui/Media';
import BundlePrice from '@/components/product/BundlePrice';
import AddToCartButton from '@/components/product/AddToCartButton';
import ProductPrice from '@/components/product/ProductPrice';
import { bundles, getBundleBySlug, getVariantByKey } from '@/lib/data/products';
import { getBundleComponentSlugs } from '@/lib/bundles';
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
  return bundles.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const bundle = getBundleBySlug(slug);
  if (!bundle) return { title: 'Paket nije pronađen' };
  return {
    title: bundle.name,
    description: bundle.tagline,
    alternates: { canonical: `/paketi/${bundle.slug}` },
    openGraph: { title: bundle.name, description: bundle.tagline, url: `/paketi/${bundle.slug}` },
  };
}

export default async function BundlePage({ params }: Params) {
  const { slug } = await params;
  const bundle = getBundleBySlug(slug);
  if (!bundle) notFound();

  // Komponente paketa su ključevi varijanti (`slug--pakovanje`).
  const components = getBundleComponentSlugs(bundle.slug)
    .map((key) => getVariantByKey(key))
    .filter((v): v is NonNullable<typeof v> => Boolean(v));

  // Paket se ne može poručiti ako je bilo koji proizvod iz njega isključen u adminu.
  const overrides = await getProductOverrides();
  const isAvailable = components.every((c) => !overrides.inactiveSlugs.has(c.product.slug));

  return (
    <main>
      <ScrollRevealInit />

      <div className="mx-auto max-w-[1200px] px-5 py-8 md:px-8 md:py-12">
        <nav className="mb-8 font-body text-[12px] uppercase tracking-[0.14em] text-muted">
          <Link href="/proizvodi" className="hover:text-ink">
            Proizvodi
          </Link>
          <span className="px-2">/</span>
          <span className="text-ink-soft">{bundle.name}</span>
        </nav>

        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          <Media
            src={bundle.image}
            alt={bundle.name}
            ratio="4 / 5"
            label="Slika paketa · 1000×1250"
            priority
            fit="contain"
            sizes="(max-width: 768px) 100vw, 50vw"
          />

          <div>
            <p className="font-body text-[11px] uppercase tracking-[0.18em] text-muted">Paket</p>
            <h1 className="mt-3 font-display text-[32px] leading-tight text-ink md:text-[40px]">
              {bundle.name}
            </h1>
            <p className="mt-2 font-body text-[14px] text-ink-soft">{bundle.tagline}</p>

            <div className="mt-6">
              <BundlePrice bundleId={bundle.slug} size="lg" />
            </div>

            <div className="mt-6">
              {isAvailable ? (
                <AddToCartButton
                  slug={bundle.slug}
                  name={bundle.name}
                  price=""
                  image={bundle.image}
                  isBundle
                  label="Dodaj paket u korpu"
                />
              ) : (
                <p className="rounded-card border border-line bg-surface px-5 py-3.5 text-center font-body text-[13px] uppercase tracking-[0.12em] text-muted">
                  Paket trenutno nije dostupan
                </p>
              )}
            </div>

            <div className="mt-5 space-y-1 border-t border-line pt-5 font-body text-[13px] leading-relaxed text-muted">
              <p>Plaćanje pouzećem pri preuzimanju.</p>
              <p>
                Dostava {SHIPPING_CARRIER} — {formatRsd(SHIPPING_RSD)}. {FREE_SHIPPING_THRESHOLD_LABEL}.
              </p>
              <p>{PICKUP_LABEL}</p>
            </div>

            <p className="mt-7 font-body text-[14px] leading-relaxed text-ink-soft">
              {bundle.fullDescription}
            </p>

            {bundle.howToUse ? (
              <>
                <h2 className="mt-8 font-display text-[20px] text-ink">Upotreba</h2>
                <p className="mt-2 font-body text-[14px] leading-relaxed text-ink-soft">
                  {bundle.howToUse}
                </p>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1200px] px-5 py-14 md:px-8 md:py-16">
          <h2 className="font-display text-[24px] text-ink">Šta paket sadrži</h2>
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4 md:gap-x-8">
            {components.map((c) => {
              const title = c.product.shade
                ? `${c.product.name} — ${c.product.shade}`
                : c.product.name;
              return (
                <Link key={c.key} href={`/proizvodi/${c.product.slug}`} className="group block">
                  <Media
                    src={resolveImage(c.product.slug, overrides)}
                    alt={title}
                    ratio="4 / 5"
                    label={`Slika · ${title}`}
                    fit="contain"
                  />
                  <p className="mt-3 font-display text-[17px] text-ink group-hover:underline underline-offset-4">
                    {title}
                  </p>
                  <p className="mt-0.5 font-body text-[13px] text-muted">{c.variant.label}</p>
                  <div className="mt-1">
                    <ProductPrice priceKey={c.key} size="sm" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
