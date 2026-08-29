import AdminOverviewClient from '@/components/admin/AdminOverviewClient';
import { requireAdminServer } from '@/lib/supabase/panel-server';
import { ORDER_STATUSES, type OrderStatus } from '@/lib/order-status';

export const dynamic = 'force-dynamic';

type Row = {
  total_rsd: number | string;
  shipping_rsd: number | string | null;
  status: string;
  created_at: string;
  customer_first_name: string;
  customer_last_name: string;
};

export default async function AdminPregledPage() {
  const supabase = await requireAdminServer();

  const [{ data, error }, { data: productRows }, { data: variantRows }] = await Promise.all([
    supabase
      .from('orders')
      .select('total_rsd, shipping_rsd, status, created_at, customer_first_name, customer_last_name')
      .order('created_at', { ascending: false }),
    supabase.from('products').select('slug, image_path, is_active, is_featured'),
    supabase.from('product_variants').select('product_slug, price_rsd'),
  ]);

  if (error) {
    return (
      <p className="font-body text-[14px] text-danger">
        Učitavanje nije uspelo.
        <span className="mt-2 block font-mono text-[12px] text-muted">{error.message}</span>
      </p>
    );
  }

  const rows = (data ?? []) as Row[];

  const statusCounts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<
    OrderStatus,
    number
  >;

  let prometPlaceno = 0;
  let prometSve = 0;
  // Server komponenta se renderuje po zahtevu (force-dynamic) — trenutno vreme je ovde u redu.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  let poslednjih30 = 0;

  for (const o of rows) {
    const total = Number(o.total_rsd) || 0;
    const shipping = o.shipping_rsd != null ? Number(o.shipping_rsd) : 0;
    const products = total - shipping;

    if ((ORDER_STATUSES as readonly string[]).includes(o.status)) {
      statusCounts[o.status as OrderStatus] += 1;
    }
    prometSve += products;
    if (o.status === 'placeno') prometPlaceno += products;
    if (now - new Date(o.created_at).getTime() <= THIRTY_DAYS) poslednjih30 += 1;
  }

  // Stanje kataloga — šta još čeka unos pre nego što sajt može da prodaje.
  const katalogProizvodi = (productRows ?? []) as {
    slug: string;
    image_path: string | null;
    is_active: boolean;
    is_featured: boolean;
  }[];
  const bezCene = new Set(
    ((variantRows ?? []) as { product_slug: string; price_rsd: number | string | null }[])
      .filter((v) => v.price_rsd == null)
      .map((v) => v.product_slug),
  );
  const katalog = {
    ukupno: katalogProizvodi.length,
    bezCene: katalogProizvodi.filter((p) => bezCene.has(p.slug)).length,
    bezSlike: katalogProizvodi.filter((p) => !p.image_path).length,
    naPocetnoj: katalogProizvodi.filter((p) => p.is_featured).length,
    iskljuceno: katalogProizvodi.filter((p) => !p.is_active).length,
  };

  const poslednje = rows.slice(0, 5).map((o) => ({
    name: `${o.customer_first_name} ${o.customer_last_name}`.trim(),
    status: o.status,
    createdAt: o.created_at,
    productsRsd: (Number(o.total_rsd) || 0) - (o.shipping_rsd != null ? Number(o.shipping_rsd) : 0),
  }));

  return (
    <AdminOverviewClient
      ukupnoPorudzbina={rows.length}
      poslednjih30={poslednjih30}
      prometPlaceno={prometPlaceno}
      prometSve={prometSve}
      statusCounts={statusCounts}
      poslednje={poslednje}
      katalog={katalog}
    />
  );
}
