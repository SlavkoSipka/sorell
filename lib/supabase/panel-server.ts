import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/** Server-only: ulogovan admin (RLS + provera reda u `admins`). */
export async function requireAdminServer(): Promise<SupabaseClient> {
  // Bez Supabase env-a panel ne postoji — vodi na prijavu umesto da baci grešku.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect('/prijava?next=/admin');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/prijava?next=/admin');

  const { data: adminRow } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!adminRow) redirect('/');
  return supabase;
}
