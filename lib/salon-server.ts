import 'server-only';

import { SITE } from '@/lib/site-config';

/**
 * Cenovnik salona, fotografija i telefon — iz baze, sa keširanjem od 30 s
 * (isto kao katalog proizvoda). Stranica „Usluge" i sekcija salona na
 * početnoj čitaju odavde, pa se izmena iz admina vidi na oba mesta.
 *
 * Ako baza nije podešena ili migracija 0010 nije puštena, vraćaju se
 * podaci iz `lib/site-config.ts` i prazan cenovnik — sajt tada radi kao pre.
 */

export type SalonService = {
  name: string;
  description: string;
  /** Trajanje u minutima; null = ne prikazuje se. */
  durationMinutes: number | null;
  /** null = „Cena na upit". */
  priceRsd: number | null;
};

export type SalonGroup = {
  slug: string;
  title: string;
  intro: string;
  services: SalonService[];
};

export type SalonData = {
  groups: SalonGroup[];
  image: string;
  phone: string;
  title: string;
  intro: string;
  /** Ulica i broj. */
  address: string;
  /** Poštanski broj i grad. */
  city: string;
};

const REVALIDATE_SECONDS = 30;

async function restGet<T>(path: string): Promise<T[] | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

export async function getSalonData(): Promise<SalonData> {
  const [groupRows, serviceRows, settingsRows] = await Promise.all([
    restGet<{ slug: string; title: string; intro: string; is_active: boolean }>(
      'service_groups?select=slug,title,intro,is_active&order=sort_order.asc&order=slug.asc',
    ),
    restGet<{
      group_slug: string;
      name: string;
      description: string;
      duration_minutes: number | null;
      price_rsd: number | string | null;
      is_active: boolean;
    }>(
      'services?select=group_slug,name,description,duration_minutes,price_rsd,is_active&order=sort_order.asc&order=id.asc',
    ),
    restGet<{
      salon_image_path: string | null;
      salon_phone: string | null;
      salon_title: string | null;
      salon_intro: string | null;
      salon_address: string | null;
      salon_city: string | null;
    }>(
      'site_settings?select=salon_image_path,salon_phone,salon_title,salon_intro,salon_address,salon_city&id=eq.1',
    ),
  ]);

  const byGroup = new Map<string, SalonService[]>();
  for (const row of serviceRows ?? []) {
    if (row.is_active === false) continue;
    const list = byGroup.get(row.group_slug) ?? [];
    const price = row.price_rsd == null ? null : Number(row.price_rsd);
    list.push({
      name: row.name,
      description: row.description ?? '',
      durationMinutes: row.duration_minutes ?? null,
      priceRsd: price != null && Number.isFinite(price) ? price : null,
    });
    byGroup.set(row.group_slug, list);
  }

  const groups: SalonGroup[] = (groupRows ?? [])
    .filter((g) => g.is_active !== false)
    .map((g) => ({
      slug: g.slug,
      title: g.title,
      intro: g.intro ?? '',
      services: byGroup.get(g.slug) ?? [],
    }))
    // Grupa bez ijedne usluge se ne prikazuje — prazan naslov nikome ne koristi.
    .filter((g) => g.services.length > 0);

  const settings = settingsRows?.[0];

  return {
    groups,
    image: settings?.salon_image_path?.trim() || '',
    phone: settings?.salon_phone?.trim() || SITE.salon.phone,
    title: settings?.salon_title?.trim() || SITE.salon.name,
    intro: settings?.salon_intro?.trim() || '',
    address: settings?.salon_address?.trim() || SITE.salon.addressLine,
    city: settings?.salon_city?.trim() || SITE.salon.city,
  };
}
