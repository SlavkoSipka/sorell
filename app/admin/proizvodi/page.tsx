import AdminProizvodiClient, {
  type AdminProductRow,
  type AdminVariantRow,
} from '@/components/admin/AdminProizvodiClient';
import { requireAdminServer } from '@/lib/supabase/panel-server';

export const dynamic = 'force-dynamic';

export default async function AdminProizvodiPage() {
  const supabase = await requireAdminServer();

  const [{ data: products, error }, { data: variants, error: variantsError }, { data: settings }] =
    await Promise.all([
      supabase
        .from('products')
        .select('slug, name, image_path, volume, discount_percent, is_active, is_featured')
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true }),
      supabase
        .from('product_variants')
        .select('product_slug, variant_slug, package_label, price_rsd, sort_order, is_active')
        .order('sort_order', { ascending: true }),
      supabase.from('site_settings').select('site_discount_percent').eq('id', 1).maybeSingle(),
    ]);

  const failure = error ?? variantsError;
  if (failure) {
    return (
      <p className="font-body text-[14px] text-danger">
        Učitavanje proizvoda nije uspelo.
        <span className="mt-2 block font-mono text-[12px] text-muted">{failure.message}</span>
      </p>
    );
  }

  const siteDiscount = Number(
    (settings as { site_discount_percent?: number | string } | null)?.site_discount_percent ?? 0,
  );

  return (
    <AdminProizvodiClient
      initialProducts={(products ?? []) as AdminProductRow[]}
      initialVariants={(variants ?? []) as AdminVariantRow[]}
      siteDiscountPercent={siteDiscount}
    />
  );
}
