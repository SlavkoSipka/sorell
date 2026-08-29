import Link from 'next/link';
import Media from '@/components/ui/Media';
import { ProductFromPrice } from '@/components/product/ProductPrice';
import type { Product } from '@/lib/data/products';

/**
 * Kartica proizvoda. Pakovanje se bira na stranici proizvoda (cena zavisi od
 * pakovanja), pa kartica vodi na proizvod umesto da dodaje direktno u korpu.
 */
export default function ProductCard({
  product,
  image = '',
  reveal = true,
}: {
  product: Product;
  image?: string;
  /** false unutar vodoravne trake — tamo se otkriva ceo red odjednom. */
  reveal?: boolean;
}) {
  const href = `/proizvodi/${product.slug}`;
  const title = product.shade ? `${product.name} — ${product.shade}` : product.name;

  return (
    <article className="group flex h-full flex-col" data-reveal={reveal ? 'true' : undefined}>
      <Link href={href} className="block">
        <Media
          src={image}
          alt={title}
          ratio="4 / 5"
          label={`Slika · ${title}`}
          fit="contain"
          className="transition-opacity duration-300 group-hover:opacity-90"
        />
      </Link>

      <div className="flex flex-1 flex-col pt-4">
        <p className="font-body text-[11px] text-muted">{product.packagesLabel}</p>
        <h3 className="mt-1.5 font-display text-[17px] leading-tight text-ink">
          <Link href={href} className="hover:underline underline-offset-4">
            {product.name}
          </Link>
        </h3>
        {product.shade ? (
          <p className="mt-1 font-body text-[12px] uppercase tracking-[0.12em] text-accent">
            {product.shade}
          </p>
        ) : null}

        <p className="mt-2 line-clamp-2 font-body text-[13px] leading-relaxed text-ink-soft">
          {product.features[0]}
        </p>

        <div className="mt-3">
          <ProductFromPrice slug={product.slug} size="sm" />
        </div>

        <div className="mt-4 flex-1" />

        <Link
          href={href}
          className="rounded-card border border-line-strong bg-canvas px-6 py-3 text-center font-body text-[11px] uppercase tracking-[0.14em] text-ink transition-colors duration-200 hover:border-ink"
        >
          Izaberi pakovanje
        </Link>
      </div>
    </article>
  );
}
