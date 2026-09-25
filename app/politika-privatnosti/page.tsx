import type { Metadata } from 'next';
import Link from 'next/link';
import LegalDocument from '@/components/LegalDocument';
import { getLegalDoc, getLegalValues } from '@/lib/legal-server';

export const metadata: Metadata = {
  title: 'Politika privatnosti',
  description: 'Koje podatke prikupljamo, zašto, kome ih prosleđujemo i koja su tvoja prava.',
  alternates: { canonical: '/politika-privatnosti' },
  robots: { index: true, follow: true },
};

/** Datum podrazumevanog teksta — važi dok se tekst ne izmeni iz admina. */
const PODRAZUMEVANO_AZURIRANO = '4. septembar 2026.';

function datum(iso: string | null): string {
  if (!iso) return PODRAZUMEVANO_AZURIRANO;
  return new Date(iso).toLocaleDateString('sr-RS', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Belgrade',
  });
}

export default async function PolitikaPrivatnostiPage() {
  // Tekst se piše u adminu (Podešavanja → Pravni tekstovi); prazno = podrazumevani.
  const [doc, values] = await Promise.all([getLegalDoc('privatnost'), getLegalValues()]);

  return (
    <main>
      <div className="mx-auto max-w-[760px] px-5 py-12 md:px-8 md:py-16">
        <h1 className="font-display text-[30px] leading-tight text-ink md:text-[38px]">
          Politika privatnosti
        </h1>
        <p className="mb-8 mt-3 font-body text-[13px] text-muted">
          Poslednja izmena: {datum(doc.updatedAt)}
        </p>

        <LegalDocument text={doc.text} values={values} />

        <p className="mt-10 border-t border-line pt-6 font-body text-[14px] leading-relaxed text-muted">
          Vidi i{' '}
          <Link href="/uslovi-koriscenja" className="text-ink underline underline-offset-4">
            Uslove korišćenja i prodaje
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
