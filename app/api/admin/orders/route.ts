import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchOrdersForAdminList } from '@/lib/supabase/admin-orders-fetch';
import {
  ORDER_LIST_INITIAL_LIMIT,
  ORDER_LIST_LIMIT,
  ORDER_SEARCH_LIMIT,
} from '@/lib/supabase/query-limits';

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 });
  }

  const { data: adminRow } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!adminRow) {
    return NextResponse.json({ error: 'Nemate admin pristup.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const status = searchParams.get('status')?.trim() ?? 'all';
  const offset = Math.max(0, Number(searchParams.get('offset') ?? 0) || 0);
  const limitRaw = Number(searchParams.get('limit') ?? 0) || 0;
  const isSearch = q.length > 0;
  const defaultLimit = isSearch ? ORDER_SEARCH_LIMIT : ORDER_LIST_INITIAL_LIMIT;
  const maxLimit = isSearch ? ORDER_SEARCH_LIMIT : ORDER_LIST_LIMIT;
  const limit = Math.min(Math.max(1, limitRaw || defaultLimit), maxLimit);

  const { data, error, hasMore } = await fetchOrdersForAdminList(supabase, {
    search: q || undefined,
    status: status !== 'all' ? status : undefined,
    offset,
    limit,
  });

  if (error || !data) {
    const message = error?.message ?? 'Učitavanje nije uspelo.';
    const hint =
      isSearch && /search_admin_orders|Could not find the function/.test(message)
        ? ' Pokreni migraciju supabase/migrations/0001_init.sql u Supabase SQL Editoru.'
        : '';
    return NextResponse.json({ error: `${message}${hint}` }, { status: 500 });
  }

  return NextResponse.json({ orders: data, hasMore, search: isSearch });
}
