import Link from 'next/link';
import Media from '@/components/ui/Media';
import { ProductFromPrice } from '@/components/product/ProductPrice';
import type { Product } from '@/lib/data/products';

/**
 * Kartica proizvoda: slika, naziv i cena — ništa više. Pakovanja, opis i
 * način primene stoje na stranici proizvoda; u spisku od 46 nijansi svaka
 * dodatna linija samo pravi buku. Cela kartica je link.
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
    <article className="group h-full" data-reveal={reveal ? 'true' : undefined}>
      <Link href={href} className="flex h-full flex-col">
        <Media
          src={image}
          alt={title}
          ratio="4 / 5"
          label={`Slika · ${title}`}
          className="transition-opacity duration-300 group-hover:opacity-90"
        />

        <div className="pt-3">
          <h3 className="font-display text-[15px] leading-snug text-ink group-hover:underline underline-offset-4 md:text-[17px]">
            {product.name}
          </h3>
          {/* Nijansa je ono po čemu se proizvodi u istoj liniji razlikuju —
              bez nje bi se 17 kartica čitalo isto. */}
          {product.shade ? (
            <p className="mt-1 font-body text-[11px] uppercase tracking-[0.12em] text-accent">
              {product.shade}
            </p>
          ) : null}

          <div className="mt-2">
            <ProductFromPrice slug={product.slug} size="sm" />
          </div>
        </div>
      </Link>
    </article>
  );
}
