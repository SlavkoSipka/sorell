import Link from 'next/link';
import { SorelleMark, SorelleWordmark } from '@/components/layout/SorelleLogo';
import { SITE } from '@/lib/site-config';

/**
 * Logo u zaglavlju: znak sa sestrama + natpis SORELLE. Znak je vektor iz
 * logotipa sa podebljanim linijama (vidi SorelleMark), pa ostaje čitak i na
 * 32 px. Boja prati tekst navigacije, koji se menja iz admina (Boje zaglavlja).
 */
export default function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 text-[color:var(--nav-text)] md:gap-2.5 ${className}`}
      aria-label={SITE.brandName}
    >
      <SorelleMark className="h-[32px] w-[32px] shrink-0 md:h-[38px] md:w-[38px]" title="" />
      <SorelleWordmark className="h-[14px] w-auto md:h-[17px]" title={SITE.brandName} />
    </Link>
  );
}
