import 'server-only';

/**
 * Baner na početnoj, ispod slajdova: široka fotografija, mali naslov, opis
 * i dugme. Menja se iz admina (Početna strana → Baner), uz keš od 30 s.
 *
 * Dok migracija 0014 nije puštena, vraćaju se isti podrazumevani tekstovi
 * koje dobija i baza, pa početna izgleda kompletno i bez nje.
 */

export type HomeBanner = {
  isActive: boolean;
  image: string;
  title: string;
  text: string;
  buttonLabel: string;
  /** Interna putanja ili http(s) adresa. Prazno = baner nema dugme ni link. */
  buttonUrl: string;
};

const DEFAULT_BANNER: HomeBanner = {
  isActive: true,
  image: '',
  title: 'Izdvojeno iz ponude',
  text: 'Gradivni gelovi, rubber base i završni sjajevi. HEMA Free, Di-HEMA Free i TPO Free.',
  buttonLabel: 'Proizvodi',
  buttonUrl: '/proizvodi',
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

/** Vrednost ide u href, pa se propušta samo interna putanja ili http(s). */
function safeHref(raw: string): string {
  const v = raw.trim();
  return /^(\/|https?:\/\/)\S*$/.test(v) ? v : '';
}

export async function getHomeBanner(): Promise<HomeBanner> {
  const rows = await restGet<{
    banner_is_active: boolean | null;
    banner_image_path: string | null;
    banner_title: string | null;
    banner_text: string | null;
    banner_button_label: string | null;
    banner_button_url: string | null;
  }>(
    'site_settings?select=banner_is_active,banner_image_path,banner_title,banner_text,banner_button_label,banner_button_url&id=eq.1',
  );

  const row = rows?.[0];
  if (!row) return DEFAULT_BANNER;

  return {
    isActive: row.banner_is_active !== false,
    image: row.banner_image_path?.trim() ?? '',
    title: row.banner_title?.trim() ?? '',
    text: row.banner_text?.trim() ?? '',
    buttonLabel: row.banner_button_label?.trim() ?? '',
    buttonUrl: safeHref(row.banner_button_url ?? ''),
  };
}
