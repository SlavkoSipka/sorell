import Image from 'next/image';
import Link from 'next/link';
import { SITE } from '@/lib/site-config';

/**
 * Logo. Dok `SITE.logoSrc` nije postavljen, prikazuje se ime brenda kao tekst —
 * dodaj `/logo.svg` u /public i upiši putanju u lib/site-config.ts.
 */
export default function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 ${className}`} aria-label={SITE.brandName}>
      {SITE.logoSrc ? (
        <Image src={SITE.logoSrc} alt={SITE.brandName} width={132} height={28} priority />
      ) : (
        <span className="font-display text-[19px] leading-none tracking-[0.02em] text-[color:var(--nav-text)]">
          {SITE.brandName}
        </span>
      )}
    </Link>
  );
}
