import Image from 'next/image';

type Props = {
  /** Putanja do slike u /public. Prazno = prikazuje se placeholder okvir. */
  src?: string;
  alt: string;
  /** Odnos stranica, npr. '4 / 5' ili '16 / 9'. */
  ratio?: string;
  /** Tekst u placeholderu — npr. „Slika proizvoda 1000×1250". */
  label?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** `contain` za pakovanja na beloj podlozi, `cover` za fotografije. */
  fit?: 'cover' | 'contain';
};

/**
 * Slika sa placeholderom. Dok nema prave slike, prikazuje se okvir sa dimenzijom —
 * tako sajt izgleda kompletno i pre nego što se doda foto materijal.
 */
export default function Media({
  src,
  alt,
  ratio = '4 / 5',
  label,
  className = '',
  sizes = '(max-width: 768px) 100vw, 33vw',
  priority = false,
  fit = 'cover',
}: Props) {
  return (
    <div
      className={`relative w-full overflow-hidden bg-surface-2 ${className}`}
      style={{ aspectRatio: ratio }}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={fit === 'contain' ? 'object-contain p-4' : 'object-cover'}
        />
      ) : (
        <div className="image-placeholder absolute inset-0 flex items-center justify-center">
          <span className="px-3 text-center font-body text-[11px] uppercase tracking-[0.18em] text-muted">
            {label ?? alt}
          </span>
        </div>
      )}
    </div>
  );
}
