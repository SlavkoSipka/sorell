import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { sanitizeTheme, themeToRow } from '@/lib/theme';
import { HEADER_THEME_TAG } from '@/lib/theme-server';

/** Čuva boje zaglavlja i poništava keš, da se izmena odmah vidi na sajtu. */
export async function POST(request: Request) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Neispravan zahtev.' }, { status: 400 });
  }

  const theme = sanitizeTheme(body);

  const { error } = await supabase
    .from('site_settings')
    .update({ ...themeToRow(theme), updated_at: new Date().toISOString() })
    .eq('id', 1);

  if (error) {
    const missingColumn = /column .* does not exist|schema cache/i.test(error.message);
    return NextResponse.json(
      {
        error: missingColumn
          ? 'Pokreni supabase/migrations/0007_boje_zaglavlja.sql u Supabase SQL Editoru.'
          : 'Čuvanje nije uspelo.',
      },
      { status: 500 },
    );
  }

  // Next 16 traži profil: expire 0 = keš odmah ističe, pa sledeći posetilac
  // dobija nove boje bez čekanja (umesto stale-while-revalidate).
  revalidateTag(HEADER_THEME_TAG, { expire: 0 });
  return NextResponse.json({ theme });
}
