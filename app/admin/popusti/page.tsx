import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminPopustiClient, { type DiscountCodeRow } from '@/components/admin/AdminPopustiClient';
import { getProductBySlug } from '@/lib/data/products';
import { requireAdminServer } from '@/lib/supabase/panel-server';

export const dynamic = 'force-dynamic';

type ProductRow = {
  slug: string;
  name: string | null;
  shade: string | null;
  discount_percent: number | string | null;
};

type VariantRow = {
  product_slug: string;
  variant_slug: string;
  package_label: string;
  discount_percent: number | string | null;
};

export default async function AdminPopustiPage() {
  const supabase = await requireAdminServer();

  const [
    { data: settings },
    { data: codes, error },
    { data: productRows },
    { data: variantRows, error: variantsError },
  ] = await Promise.all([
    supabase
      .from('site_settings')
      .select('site_discount_percent, bundle_discount_percent')
      .eq('id', 1)
      .maybeSingle(),
    supabase
      .from('discount_codes')
      .select('id, code, discount_percent, is_active, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('products').select('slug, name, shade, discount_percent'),
    // Bez migracije 0015 upit padne, pa spisak prikazuje samo popuste na proizvod.
    supabase
      .from('product_variants')
      .select('product_slug, variant_slug, package_label, discount_percent')
      .not('discount_percent', 'is', null),
  ]);

  const row = settings as {
    site_discount_percent?: number | string;
    bundle_discount_percent?: number | string;
  } | null;

  // Spisak svih popusta upisanih kod proizvoda, da se na jednom mestu vidi šta je sniženo.
  const products = (productRows ?? []) as ProductRow[];
  const productBySlug = new Map(products.map((p) => [p.slug, p]));
  const displayName = (slug: string) => {
    const db = productBySlug.get(slug);
    const catalog = getProductBySlug(slug);
    const name = db?.name?.trim() || catalog?.name || slug;
    const shade = db?.shade?.trim() || catalog?.shade || '';
    return shade ? `${name} · ${shade}` : name;
  };
  const discounts = [
    ...products
      .filter((p) => p.discount_percent != null)
      .map((p) => ({
        key: p.slug,
        name: displayName(p.slug),
        scope: 'ceo proizvod',
        percent: Number(p.discount_percent),
      })),
    ...((variantRows ?? []) as VariantRow[]).map((v) => ({
      key: v.variant_slug,
      name: displayName(v.product_slug),
      scope: v.package_label,
      percent: Number(v.discount_percent),
    })),
  ].sort((a, b) => a.name.localeCompare(b.name, 'sr') || a.scope.localeCompare(b.scope, 'sr'));

  return (
    <div>
      <AdminPageHeader
        title="Popusti"
        description="Popust na ceo sajt, popust na pakete i promo kodovi za kupce. Važe odmah, a server pri poručivanju uvek ponovo računa iznos."
      />
      <AdminPopustiClient
        initialSiteDiscount={Number(row?.site_discount_percent ?? 0)}
        initialBundleDiscount={Number(row?.bundle_discount_percent ?? 10)}
        initialCodes={(codes ?? []) as DiscountCodeRow[]}
        codesError={error?.message ?? null}
      />

      <section className="mt-6 border border-line bg-canvas p-5 md:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="font-display text-[18px] text-ink">Popusti na proizvode i pakovanja</h3>
          <Link
            href="/admin/proizvodi"
            prefetch
            className="inline-flex min-h-[40px] items-center font-body text-[14px] text-muted underline underline-offset-4 hover:text-ink"
          >
            Uredi u kartici Proizvodi
          </Link>
        </div>
        <p className="mt-1.5 max-w-[680px] font-body text-[14px] leading-relaxed text-muted">
          Upisuju se kod svakog proizvoda (Proizvodi → Uredi proizvod). Važi najuži popust: popust
          na pakovanje (gramažu) ima prednost nad popustom na ceo proizvod, a on nad globalnim.
        </p>

        {discounts.length === 0 ? (
          <p className="mt-5 border border-dashed border-line py-6 text-center font-body text-[13px] text-muted">
            Nijedan proizvod ni pakovanje nema svoj popust. Svuda važi globalni popust.
          </p>
        ) : (
          <ul className="mt-4">
            {discounts.map((d) => (
              <li
                key={d.key}
                className="flex items-center justify-between gap-4 border-b border-line py-2.5"
              >
                <span className="min-w-0 font-body text-[14px] text-ink">
                  {d.name}
                  <span className="ml-2 text-[13px] text-muted">{d.scope}</span>
                </span>
                <span className="shrink-0 font-body text-[14px] tabular-nums text-ink">
                  {d.percent > 0 ? `−${d.percent}%` : 'bez popusta'}
                </span>
              </li>
            ))}
          </ul>
        )}

        {variantsError ? (
          <p className="mt-3 font-body text-[13px] text-danger">
            Popust po pakovanju još nije uključen u bazi. Pokreni{' '}
            <span className="font-mono">supabase/setup.sql</span>.
          </p>
        ) : null}
      </section>
    </div>
  );
}
