import Link from 'next/link';
import Media from '@/components/ui/Media';
import BundlePrice from '@/components/product/BundlePrice';
import AddToCartButton from '@/components/product/AddToCartButton';
import { getBundleComponentSlugs } from '@/lib/bundles';
import { getProductBySlug, type BundleContent } from '@/lib/data/products';

export default function BundleCard({ bundle }: { bundle: BundleContent }) {
  const componentNames = getBundleComponentSlugs(bundle.slug)
    .map((slug) => getProductBySlug(slug)?.name ?? slug)
    .join(' + ');

  return (
    <article className="flex flex-col border border-line bg-surface p-5 md:flex-row md:items-center md:gap-8 md:p-8" data-reveal="true">
      <Link href={`/paketi/${bundle.slug}`} className="block md:w-[240px] md:shrink-0">
        <Media src={bundle.image} alt={bundle.name} ratio="4 / 3" label={`Slika · ${bundle.name}`} fit="contain" />
      </Link>

      <div className="mt-5 flex-1 md:mt-0">
        <p className="font-body text-[10px] uppercase tracking-[0.16em] text-muted">Paket</p>
        <h3 className="mt-1.5 font-display text-[22px] leading-tight text-ink">
          <Link href={`/paketi/${bundle.slug}`} className="hover:underline underline-offset-4">
            {bundle.name}
          </Link>
        </h3>
        <p className="mt-1 font-body text-[13px] text-ink-soft">{componentNames}</p>
        <p className="mt-3 max-w-[520px] font-body text-[13px] leading-relaxed text-ink-soft">
          {bundle.tagline}
        </p>

        <div className="mt-4">
          <BundlePrice bundleId={bundle.slug} size="md" />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <AddToCartButton
            slug={bundle.slug}
            name={bundle.name}
            price=""
            image={bundle.image}
            isBundle
            fullWidth={false}
            label="Dodaj paket"
          />
          <Link
            href={`/paketi/${bundle.slug}`}
            className="rounded-card border border-line-strong px-6 py-3 font-body text-[11px] uppercase tracking-[0.14em] text-ink transition-colors hover:border-ink"
          >
            Detaljnije
          </Link>
        </div>
      </div>
    </article>
  );
}
