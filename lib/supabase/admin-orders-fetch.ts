import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdminOrderRow } from '@/components/admin/AdminPorudzbineClient';
import {
  ORDER_LIST_COLUMNS,
  ORDER_LIST_INITIAL_LIMIT,
  ORDER_SEARCH_LIMIT,
} from '@/lib/supabase/query-limits';

export type FetchAdminOrdersOptions = {
  limit?: number;
  offset?: number;
  /** Tekst pretrage — prazno = samo paginacija. */
  search?: string;
  status?: string;
};

export type FetchAdminOrdersResult = {
  data: AdminOrderRow[] | null;
  error: { message: string } | null;
  hasMore: boolean;
};

/**
 * Učitava porudžbine za admin panel.
 * Pretraga ide preko RPC `search_admin_orders` (cela tabela, ne samo učitana stranica).
 */
export async function fetchOrdersForAdminList(
  supabase: SupabaseClient,
  options: FetchAdminOrdersOptions = {},
): Promise<FetchAdminOrdersResult> {
  const search = options.search?.trim() ?? '';
  const isSearch = search.length > 0;
  const limit = options.limit ?? (isSearch ? ORDER_SEARCH_LIMIT : ORDER_LIST_INITIAL_LIMIT);
  const offset = options.offset ?? 0;
  const status = options.status?.trim();

  if (isSearch) {
    const { data, error } = await supabase.rpc('search_admin_orders', {
      p_query: search,
      p_status: status && status !== 'all' ? status : null,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      return { data: null, error: { message: error.message }, hasMore: false };
    }

    const rows = (data ?? []) as unknown as AdminOrderRow[];
    return { data: rows, error: null, hasMore: rows.length >= limit };
  }

  let query = supabase
    .from('orders')
    .select(ORDER_LIST_COLUMNS)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: { message: error.message }, hasMore: false };
  }

  const rows = (data ?? []) as unknown as AdminOrderRow[];
  return { data: rows, error: null, hasMore: rows.length >= limit };
}
