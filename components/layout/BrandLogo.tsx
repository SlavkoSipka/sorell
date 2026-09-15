import Link from 'next/link';
import { SorelleWordmark } from '@/components/layout/SorelleLogo';
import { SITE } from '@/lib/site-config';

/**
 * Logo u zaglavlju: natpis SORELLE iz logotipa. Ceo znak sa sestrama je
 * pretanak za red visok 64 px, pa stoji u footeru. Boja prati tekst
 * navigacije, koji se menja iz admina (kartica Boje zaglavlja).
 */
export default function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center text-[color:var(--nav-text)] ${className}`}
      aria-label={SITE.brandName}
    >
      <SorelleWordmark className="h-[15px] w-auto md:h-[17px]" title={SITE.brandName} />
    </Link>
  );
}
