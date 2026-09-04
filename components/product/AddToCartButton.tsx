'use client';

import { useCart } from '@/lib/cart-context';

type Props = {
  /** Ključ varijante (`slug--pakovanje`), ili slug paketa kad je `isBundle`. */
  slug: string;
  /** Slug proizvoda — za link iz korpe. Podrazumevano isto što i `slug`. */
  productSlug?: string;
  /** Pakovanje, npr. „30 g". */
  packageLabel?: string;
  name: string;
  price: string;
  image: string;
  /** true = stavka je paket (dodaje se kao jedna linija). */
  isBundle?: boolean;
  label?: string;
  variant?: 'filled' | 'outline';
  fullWidth?: boolean;
  className?: string;
};

export default function AddToCartButton({
  slug,
  productSlug,
  packageLabel = '',
  name,
  price,
  image,
  isBundle = false,
  label = 'Dodaj u korpu',
  variant = 'filled',
  fullWidth = true,
  className = '',
}: Props) {
  const { addItem, addBundle } = useCart();

  const styles =
    variant === 'filled'
      ? 'border-ink bg-ink text-canvas hover:bg-canvas hover:text-ink'
      : 'border-line-strong bg-canvas text-ink hover:border-ink';

  return (
    <button
      type="button"
      onClick={() =>
        isBundle
          ? addBundle(slug)
          : addItem({ slug, productSlug: productSlug ?? slug, packageLabel, name, price, image })
      }
      className={`rounded-card border px-6 py-3 font-body text-[12px] uppercase tracking-[0.14em] transition-colors duration-200 ${styles} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
    >
      {label}
    </button>
  );
}
