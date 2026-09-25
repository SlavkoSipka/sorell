import 'server-only';

import { SITE } from '@/lib/site-config';
import { formatRsd } from '@/lib/price';
import { FREE_SHIPPING_THRESHOLD_RSD, SHIPPING_RSD } from '@/lib/shipping';
import { getSalonData } from '@/lib/salon-server';
import { DEFAULT_LEGAL } from '@/lib/legal-defaults';
import type { LegalKind, LegalValues } from '@/lib/legal';

export type LegalDoc = {
  /** Tekst sa već ubačenim podacima salona. */
  text: string;
  /** Datum poslednje izmene iz admina; null = podrazumevani tekst. */
  updatedAt: string | null;
  /** true = tekst je pisan u adminu, false = podrazumevani iz koda. */
  custom: boolean;
};

async function restGet<T>(path: string): Promise<T[] | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

/** Vrednosti za oznake {telefon}, {adresa}… — iz istog mesta kao Kontakt i footer. */
export async function getLegalValues(): Promise<LegalValues> {
  const salon = await getSalonData();
  return {
    naziv: salon.title,
    adresa: salon.address,
    grad: salon.city,
    telefon: salon.phone,
    email: SITE.salon.email,
    brend: SITE.brandName,
    postarina: formatRsd(SHIPPING_RSD),
    besplatno_od: formatRsd(FREE_SHIPPING_THRESHOLD_RSD),
  };
}

export async function getLegalDoc(kind: LegalKind): Promise<LegalDoc> {
  const kolona = kind === 'privatnost' ? 'privacy' : 'terms';
  const rows = await restGet<Record<string, string | null>>(
    `site_settings?select=${kolona}_text,${kolona}_updated_at&id=eq.1`,
  );
  const row = rows?.[0];
  const izAdmina = (row?.[`${kolona}_text`] ?? '').trim();

  return {
    text: izAdmina || DEFAULT_LEGAL[kind],
    updatedAt: izAdmina ? (row?.[`${kolona}_updated_at`] ?? null) : null,
    custom: izAdmina !== '',
  };
}
