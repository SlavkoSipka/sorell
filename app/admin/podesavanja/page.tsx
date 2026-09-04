import AdminPodesavanjaClient, {
  type DiscountCodeRow,
} from '@/components/admin/AdminPodesavanjaClient';
import type {
  AdminServiceGroupRow,
  AdminServiceRow,
} from '@/components/admin/AdminSalonSection';
import { requireAdminServer } from '@/lib/supabase/panel-server';
import { DEFAULT_HEADER_THEME, HEADER_THEME_COLUMNS, themeFromRow } from '@/lib/theme';

export const dynamic = 'force-dynamic';

export default async function AdminPodesavanjaPage() {
  const supabase = await requireAdminServer();

  const [
    { data: settings },
    { data: themeRow },
    { data: salonRow, error: salonError },
    { data: serviceGroups, error: groupsError },
    { data: serviceRows },
    { data: codes, error },
  ] = await Promise.all([
    supabase
      .from('site_settings')
      .select('site_discount_percent, bundle_discount_percent, hero_image_path, hero_link_url')
      .eq('id', 1)
      .maybeSingle(),
    // Odvojen upit: ako migracija 0007 nije pokrenuta, ostatak se svejedno učita.
    supabase
      .from('site_settings')
      .select(Object.values(HEADER_THEME_COLUMNS).join(', '))
      .eq('id', 1)
      .maybeSingle(),
    supabase
      .from('site_settings')
      .select('salon_image_path, salon_phone, salon_title, salon_intro, salon_address, salon_city')
      .eq('id', 1)
      .maybeSingle(),
    supabase
      .from('service_groups')
      .select('slug, title, intro, sort_order')
      .order('sort_order', { ascending: true })
      .order('slug', { ascending: true }),
    supabase
      .from('services')
      .select('id, group_slug, name, description, duration_minutes, price_rsd, sort_order')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true }),
    supabase
      .from('discount_codes')
      .select('id, code, discount_percent, is_active, created_at')
      .order('created_at', { ascending: false }),
  ]);

  const salon = salonRow as {
    salon_image_path?: string | null;
    salon_phone?: string | null;
    salon_title?: string | null;
    salon_intro?: string | null;
    salon_address?: string | null;
    salon_city?: string | null;
  } | null;

  const row = settings as {
    site_discount_percent?: number | string;
    bundle_discount_percent?: number | string;
    hero_image_path?: string | null;
    hero_link_url?: string | null;
  } | null;

  return (
    <AdminPodesavanjaClient
      initialTheme={
        themeRow ? themeFromRow(themeRow as unknown as Record<string, unknown>) : DEFAULT_HEADER_THEME
      }
      initialSiteDiscount={Number(row?.site_discount_percent ?? 0)}
      initialBundleDiscount={Number(row?.bundle_discount_percent ?? 10)}
      initialHeroImage={row?.hero_image_path ?? ''}
      initialHeroLink={row?.hero_link_url ?? ''}
      initialSalonImage={salon?.salon_image_path ?? ''}
      initialSalonPhone={salon?.salon_phone ?? ''}
      initialSalonTitle={salon?.salon_title ?? ''}
      initialSalonIntro={salon?.salon_intro ?? ''}
      initialSalonAddress={salon?.salon_address ?? ''}
      initialSalonCity={salon?.salon_city ?? ''}
      initialServiceGroups={(serviceGroups ?? []) as AdminServiceGroupRow[]}
      initialServices={(serviceRows ?? []) as AdminServiceRow[]}
      // Migracija 0010 nije puštena — sekcija salona to tada kaže.
      salonMissing={Boolean(salonError || groupsError)}
      initialCodes={(codes ?? []) as DiscountCodeRow[]}
      codesError={error?.message ?? null}
    />
  );
}
