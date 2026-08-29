import { after } from 'next/server';
import { NextResponse } from 'next/server';
import { sendOrderNotificationEmail } from '@/lib/emailjs-order';
import { createAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import {
  buildVariantLookup,
  expandParsedOrderLines,
  normalizePromoCode,
  packingLinesFromExpanded,
  parseCartLinesFromBody,
} from '@/lib/order-validation';
import { computePricing } from '@/lib/pricing-engine';
import { shippingForProductsTotalRsd } from '@/lib/shipping';
import type { DbProduct, DbVariant } from '@/lib/price';

type OrderBody = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal?: string;
  note?: string;
  promoCode?: string | null;
  lineItems?: unknown;
  totalRsd?: number;
};

export async function POST(request: Request) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Porudžbine nisu podešene na serveru.' }, { status: 503 });
  }

  let body: OrderBody;
  try {
    body = (await request.json()) as OrderBody;
  } catch {
    return NextResponse.json({ error: 'Neispravan JSON.' }, { status: 400 });
  }

  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  const city = typeof body.city === 'string' ? body.city.trim() : '';
  const postal = typeof body.postal === 'string' ? body.postal.trim() : '';
  const note = typeof body.note === 'string' && body.note.trim().length > 0 ? body.note.trim() : null;

  if (!firstName || !lastName || !email || !phone || !address || !city || !postal) {
    return NextResponse.json({ error: 'Popunite sva obavezna polja.' }, { status: 400 });
  }

  const admin = createAdminClient();

  // ── Proizvodi, pakovanja i podešavanja iz baze (izvor istine za cene) ──
  const [{ data: dbProductRows }, { data: dbVariantRows }, { data: settingsRow }] =
    await Promise.all([
      admin
        .from('products')
        .select('slug, name, base_price_rsd, image_path, volume, discount_percent, is_active'),
      admin
        .from('product_variants')
        .select('product_slug, variant_slug, package_label, price_rsd, is_active'),
      admin
        .from('site_settings')
        .select('site_discount_percent, bundle_discount_percent')
        .eq('id', 1)
        .maybeSingle(),
    ]);

  if (!dbProductRows || dbProductRows.length === 0) {
    return NextResponse.json({ error: 'Nema proizvoda u bazi.' }, { status: 500 });
  }

  // Isključeni proizvodi (admin → Proizvodi) ne mogu da se poruče.
  const dbProducts = (dbProductRows as (DbProduct & { is_active?: boolean })[]).filter(
    (p) => p.is_active !== false,
  );
  if (dbProducts.length === 0) {
    return NextResponse.json({ error: 'Trenutno nema dostupnih proizvoda.' }, { status: 503 });
  }

  // Pakovanja isključenih proizvoda ispadaju zajedno sa proizvodom.
  const activeSlugs = new Set(dbProducts.map((p) => p.slug));
  const dbVariants = ((dbVariantRows ?? []) as DbVariant[]).filter(
    (v) => v.is_active !== false && activeSlugs.has(v.product_slug),
  );
  if (dbVariants.length === 0) {
    return NextResponse.json({ error: 'Trenutno nema dostupnih pakovanja.' }, { status: 503 });
  }

  const variantLookup = buildVariantLookup(dbProducts as DbProduct[], dbVariants);

  const settings = settingsRow as {
    site_discount_percent?: number | string;
    bundle_discount_percent?: number | string;
  } | null;
  const siteDiscountPercent = Number(settings?.site_discount_percent ?? 0);
  const bundleDiscountPercentRaw = Number(settings?.bundle_discount_percent ?? 10);
  const bundleDiscountPercent = Number.isFinite(bundleDiscountPercentRaw) ? bundleDiscountPercentRaw : 10;

  // ── Provera stavki iz korpe ──
  const parsed = parseCartLinesFromBody(body.lineItems, variantLookup);
  if (!parsed.ok) {
    // Proizvod/pakovanje isključeno ili obrisano u međuvremenu, odnosno cena
    // još nije uneta — jasna poruka umesto neslaganja iznosa.
    const message =
      parsed.error.kind === 'no-price'
        ? 'Za neke proizvode iz korpe cena još nije objavljena. Uklonite ih i pokušajte ponovo.'
        : parsed.error.kind === 'unknown'
          ? 'Neki proizvodi iz korpe više nisu dostupni. Osvežite stranicu.'
          : 'Korpa je prazna ili neispravna.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const lines = expandParsedOrderLines(parsed.lines, variantLookup);
  if (lines.length === 0) {
    return NextResponse.json({ error: 'Korpa je prazna ili neispravna.' }, { status: 400 });
  }

  // ── Promo kod (procenat se čita iz baze, ne sa klijenta) ──
  const promoNormalized = normalizePromoCode(body.promoCode);
  let promoCodeStored: string | null = null;
  let promoDiscountPercent = 0;

  if (promoNormalized) {
    const { data: promo, error: promoErr } = await admin
      .from('discount_codes')
      .select('code, discount_percent')
      .eq('code', promoNormalized)
      .eq('is_active', true)
      .maybeSingle();

    if (promoErr) {
      return NextResponse.json({ error: 'Greška pri proveri promo koda.' }, { status: 500 });
    }
    if (!promo) {
      return NextResponse.json(
        { error: 'Promo kod nije pronađen ili više ne važi. Uklonite ga i pokušajte ponovo.' },
        { status: 400 },
      );
    }

    const row = promo as { code: string; discount_percent: number | string };
    const pct = Number(row.discount_percent);
    if (Number.isFinite(pct) && pct > 0) {
      promoCodeStored = row.code;
      promoDiscountPercent = pct;
    }
  }

  // ── Cene (paketni popust samo za eksplicitne pakete) ──
  const pricing = computePricing({
    lines: lines.map((l) => ({
      slug: l.slug,
      quantity: l.quantity,
      basePriceRsd: l.basePriceRsd,
      discountPercent: l.discountPercent,
      bundleId: l.bundleId,
    })),
    siteDiscountPercent,
    bundleDiscountPercent,
    promoDiscountPercent,
    autoDetectBundles: false,
  });

  const shippingRsd = shippingForProductsTotalRsd(pricing.totalRsd);
  const orderTotalRsd = pricing.totalRsd + shippingRsd;

  // ── Provera iznosa sa klijenta (tolerancija 1 RSD zbog zaokruživanja) ──
  const claimedTotal = typeof body.totalRsd === 'number' ? body.totalRsd : NaN;
  if (!Number.isFinite(claimedTotal) || Math.abs(claimedTotal - orderTotalRsd) > 1) {
    return NextResponse.json(
      { error: 'Ukupan iznos se ne slaže. Osvežite stranicu.' },
      { status: 400 },
    );
  }

  // ── line_items (spojeno po slug-u, za pakovanje) ──
  const lineItemsJson = packingLinesFromExpanded(lines).map((line) => ({
    slug: line.slug,
    name: line.name,
    quantity: line.quantity,
    unit_price_rsd: line.basePriceRsd,
    line_total_rsd: line.basePriceRsd * line.quantity,
  }));

  const { data: inserted, error: insertErr } = await admin
    .from('orders')
    .insert({
      customer_first_name: firstName,
      customer_last_name: lastName,
      customer_email: email,
      customer_phone: phone,
      address_line: address,
      city,
      postal_code: postal,
      note,
      line_items: lineItemsJson,
      subtotal_rsd: pricing.subtotalRsd,
      shipping_rsd: shippingRsd,
      discount_type: pricing.discountType,
      discount_percent: pricing.discountPercent > 0 ? pricing.discountPercent : null,
      promo_code: promoCodeStored,
      promo_discount_percent: pricing.promoDiscountPercent > 0 ? pricing.promoDiscountPercent : null,
      promo_discount_rsd: pricing.promoDiscountRsd > 0 ? pricing.promoDiscountRsd : null,
      total_rsd: orderTotalRsd,
      status: 'poruceno',
    })
    .select('id')
    .single();

  if (insertErr) {
    console.error('[api/orders] Insert nije uspeo:', insertErr.message);
    return NextResponse.json({ error: 'Čuvanje porudžbine nije uspelo.' }, { status: 500 });
  }

  const orderIdStr = String(inserted?.id ?? '');

  // Mejl ide posle odgovora — porudžbina je već sačuvana.
  after(async () => {
    try {
      await sendOrderNotificationEmail({
        orderId: orderIdStr,
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        postal,
        note,
        promoCode: promoCodeStored,
        lineItems: lineItemsJson.map((li) => ({
          name: li.name,
          quantity: li.quantity,
          lineTotalRsd: Number(li.line_total_rsd),
        })),
        subtotalRsd: pricing.subtotalRsd,
        shippingRsd,
        totalRsd: orderTotalRsd,
        discountType: pricing.discountType,
        discountPercent: pricing.discountPercent,
        discountAmountRsd: pricing.discountAmountRsd,
        promoDiscountPercent: pricing.promoDiscountPercent,
        promoDiscountRsd: pricing.promoDiscountRsd,
      });
    } catch (err) {
      console.error('[api/orders] Mejl nije poslat (porudžbina je sačuvana):', err);
    }
  });

  return NextResponse.json({ ok: true, orderId: inserted?.id });
}
