import AdminPorudzbineClient from '@/components/admin/AdminPorudzbineClient';
import { ORDER_LIST_INITIAL_LIMIT } from '@/lib/supabase/query-limits';
import { fetchOrdersForAdminList } from '@/lib/supabase/admin-orders-fetch';
import { requireAdminServer } from '@/lib/supabase/panel-server';
import { ORDER_STATUSES, type OrderStatus } from '@/lib/order-status';

export const dynamic = 'force-dynamic';

export default async function AdminPorudzbinePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await requireAdminServer();
  const { status: statusParam } = await searchParams;

  const status = (ORDER_STATUSES as readonly string[]).includes(statusParam ?? '')
    ? (statusParam as OrderStatus)
    : 'all';

  const { data, error, hasMore } = await fetchOrdersForAdminList(supabase, {
    limit: ORDER_LIST_INITIAL_LIMIT,
    offset: 0,
    status: status !== 'all' ? status : undefined,
  });

  if (error || !data) {
    return (
      <p className="font-body text-[14px] text-danger">
        Učitavanje porudžbina nije uspelo.
        {error?.message ? (
          <span className="mt-2 block font-mono text-[12px] text-muted">{error.message}</span>
        ) : null}
      </p>
    );
  }

  return (
    <AdminPorudzbineClient initialOrders={data} initialHasMore={hasMore} initialStatus={status} />
  );
}
