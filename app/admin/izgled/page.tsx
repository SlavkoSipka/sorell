import AdminPageHeader from '@/components/admin/AdminPageHeader';
import HeaderThemeEditor from '@/components/admin/HeaderThemeEditor';
import { requireAdminServer } from '@/lib/supabase/panel-server';
import { DEFAULT_HEADER_THEME, HEADER_THEME_COLUMNS, themeFromRow } from '@/lib/theme';

export const dynamic = 'force-dynamic';

export default async function AdminIzgledPage() {
  const supabase = await requireAdminServer();

  // Bez migracije 0007 upit padne, pa se prikazuju podrazumevane boje.
  const { data: themeRow } = await supabase
    .from('site_settings')
    .select(Object.values(HEADER_THEME_COLUMNS).join(', '))
    .eq('id', 1)
    .maybeSingle();

  return (
    <div>
      <AdminPageHeader
        title="Boje zaglavlja"
        description="Boje trake sa porukama i menija na vrhu svake stranice sajta."
        siteHref="/"
      />
      <HeaderThemeEditor
        initialTheme={
          themeRow ? themeFromRow(themeRow as unknown as Record<string, unknown>) : DEFAULT_HEADER_THEME
        }
      />
    </div>
  );
}
