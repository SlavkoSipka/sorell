import AdminPodesavanjaClient, {
  type DiscountCodeRow,
} from '@/components/admin/AdminPodesavanjaClient';
import { requireAdminServer } from '@/lib/supabase/panel-server';

export const dynamic = 'force-dynamic';

export default async function AdminPodesavanjaPage() {
  const supabase = await requireAdminServer();

  const [{ data: settings }, { data: codes, error }] = await Promise.all([
    supabase
      .from('site_settings')
      .select('site_discount_percent, bundle_discount_percent, hero_image_path')
      .eq('id', 1)
      .maybeSingle(),
    supabase
      .from('discount_codes')
      .select('id, code, discount_percent, is_active, created_at')
      .order('created_at', { ascending: false }),
  ]);

  const row = settings as {
    site_discount_percent?: number | string;
    bundle_discount_percent?: number | string;
    hero_image_path?: string | null;
  } | null;

  return (
    <AdminPodesavanjaClient
      initialSiteDiscount={Number(row?.site_discount_percent ?? 0)}
      initialBundleDiscount={Number(row?.bundle_discount_percent ?? 10)}
      initialHeroImage={row?.hero_image_path ?? ''}
      initialCodes={(codes ?? []) as DiscountCodeRow[]}
      codesError={error?.message ?? null}
    />
  );
}
