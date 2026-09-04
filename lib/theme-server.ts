import 'server-only';
import {
  DEFAULT_HEADER_THEME,
  HEADER_THEME_COLUMNS,
  themeFromRow,
  type HeaderTheme,
} from '@/lib/theme';

/** Keš tag — poništava se posle čuvanja u adminu (app/api/admin/theme/route.ts). */
export const HEADER_THEME_TAG = 'site-header-theme';

/**
 * Boje zaglavlja iz baze. Čita se javnim REST endpointom sa anon ključem
 * (tabela je javna za čitanje), rezultat se kešira dok admin ne sačuva izmenu.
 *
 * Ako baza nije podešena, upit padne ili kolone ne postoje, vraćaju se
 * podrazumevane boje — zaglavlje tada izgleda kao i pre ove opcije.
 */
export async function getHeaderTheme(): Promise<HeaderTheme> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return DEFAULT_HEADER_THEME;

  const select = Object.values(HEADER_THEME_COLUMNS).join(',');

  try {
    const res = await fetch(`${url}/rest/v1/site_settings?select=${select}&id=eq.1&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 3600, tags: [HEADER_THEME_TAG] },
    });
    if (!res.ok) return DEFAULT_HEADER_THEME;
    const rows = (await res.json()) as Record<string, unknown>[];
    return themeFromRow(Array.isArray(rows) ? rows[0] : null);
  } catch {
    return DEFAULT_HEADER_THEME;
  }
}
