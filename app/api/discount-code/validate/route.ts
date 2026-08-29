import { NextResponse } from 'next/server';
import { createAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { normalizePromoCode } from '@/lib/order-validation';

type Body = { code?: unknown };

export async function POST(request: Request) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { valid: false as const, error: 'Servis trenutno nije dostupan.' },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ valid: false as const, error: 'Neispravan zahtev.' }, { status: 400 });
  }

  const normalized = normalizePromoCode(body.code);
  if (!normalized) {
    return NextResponse.json({ valid: false as const, error: 'Unesite kod.' });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('discount_codes')
    .select('code, discount_percent')
    .eq('code', normalized)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { valid: false as const, error: 'Greška pri proveri koda.' },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ valid: false as const, error: 'Kod nije pronađen ili nije aktivan.' });
  }

  const discountPercent = Number((data as { discount_percent?: number | string }).discount_percent);
  if (!Number.isFinite(discountPercent) || discountPercent <= 0) {
    return NextResponse.json({ valid: false as const, error: 'Kod nije važeći.' });
  }

  return NextResponse.json({
    valid: true as const,
    code: (data as { code: string }).code,
    discountPercent,
  });
}
