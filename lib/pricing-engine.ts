/**
 * Centralno računanje cena.
 *
 * Redosled:
 *   1. Međuzbir = SUM(bazna cena × količina)
 *   2. Popust na proizvode (po liniji se primenjuje SAMO jedan):
 *      - paketni popust za svaki kompletan paket u korpi (BUNDLE_DEFINITIONS),
 *      - inače popust po liniji (line.discountPercent ?? siteDiscountPercent).
 *   3. Promo kod (discount_codes) — procenat na iznos posle popusta iz koraka 2.
 *   4. Poštarina se dodaje van ovog modula (lib/shipping.ts).
 */

export type BundleDefinition = {
  id: string;
  slugs: readonly string[];
  /**
   * 'percent' — koristi bundleDiscountPercent iz site_settings (podesivo u adminu).
   * 'fixed'   — fiksna cena jednog kompletnog paketa (fixedTotalRsd).
   */
  kind: 'percent' | 'fixed';
  fixedTotalRsd?: number;
};

/**
 * Definicije paketa. Poredak je bitan: veći/specifičniji paketi idu PRVI —
 * kad paket zauzme svoje linije, ostali paketi koji dele te slug-ove se preskaču.
 *
 * `slugs` su KLJUČEVI VARIJANTI (`<slug proizvoda>--<pakovanje>`), jer se cena
 * vodi po pakovanju. Prazno: klijent još nije definisao pakete za SORELLE
 * asortiman — dodaj ih ovde zajedno sa `bundles` u lib/data/products.ts.
 */
export const BUNDLE_DEFINITIONS: readonly BundleDefinition[] = [] as const;

export type PricingLine = {
  slug: string;
  quantity: number;
  basePriceRsd: number;
  /** Override popusta za taj proizvod (%). NULL = koristi siteDiscountPercent. */
  discountPercent?: number | null;
  /** Paket kom linija pripada — koristi se kada je autoDetectBundles=false. */
  bundleId?: string;
};

export type PricingInput = {
  lines: PricingLine[];
  siteDiscountPercent: number;
  bundleDiscountPercent: number;
  /** Promo kod iz discount_codes (0 = nema). */
  promoDiscountPercent?: number;
  /**
   * Automatsko prepoznavanje paketa iz pojedinačnih linija (default true).
   * Kada je false, paketni popust dobijaju SAMO linije sa `bundleId`.
   */
  autoDetectBundles?: boolean;
};

export type LineDiscount = {
  slug: string;
  percent: number;
  amountRsd: number;
  source: 'bundle' | 'site';
  bundleId?: string;
};

export type BundleBreakdown = {
  id: string;
  slugs: string[];
  amountRsd: number;
  percent: number;
};

export type PricingResult = {
  subtotalRsd: number;
  isBundle: boolean;
  discountType: 'site' | 'bundle' | null;
  /** Reprezentativni % za prikaz; tačan popust po proizvodu je u `lineDiscounts`. */
  discountPercent: number;
  discountAmountRsd: number;
  lineDiscounts: LineDiscount[];
  bundleBreakdown: BundleBreakdown[];
  afterProductDiscountRsd: number;
  promoDiscountPercent: number;
  promoDiscountRsd: number;
  totalRsd: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

export function computePricing(input: PricingInput): PricingResult {
  const { lines, siteDiscountPercent, bundleDiscountPercent } = input;
  const sitePct = clampPct(Number(siteDiscountPercent) || 0);
  const bundlePct = clampPct(Number(bundleDiscountPercent) || 0);
  const promoDiscountPercent =
    input.promoDiscountPercent != null && input.promoDiscountPercent > 0
      ? input.promoDiscountPercent
      : 0;

  const subtotalRsd = round2(lines.reduce((sum, l) => sum + l.basePriceRsd * l.quantity, 0));

  const lineBySlug = new Map(lines.map((l) => [l.slug, l]));
  const qtyOf = (slug: string) => {
    const l = lineBySlug.get(slug);
    return l && l.quantity > 0 ? l.quantity : 0;
  };

  const lineDiscounts: LineDiscount[] = [];
  const bundleBreakdown: BundleBreakdown[] = [];
  const autoDetect = input.autoDetectBundles !== false;
  /** Linije koje je zauzeo paket — izuzete su iz popusta po liniji. */
  const excludedFromSite = new Set<PricingLine>();

  const applyBundle = (def: BundleDefinition, defLines: PricingLine[]) => {
    const scopedSubtotal = round2(defLines.reduce((sum, l) => sum + l.basePriceRsd * l.quantity, 0));

    let bundleAmount = 0;
    const perLine: { slug: string; amount: number; gross: number }[] = [];

    if (def.kind === 'fixed' && def.fixedTotalRsd != null) {
      // n kompletnih paketa; višak komada ostaje na punoj ceni.
      const n = Math.min(...defLines.map((l) => (l.quantity > 0 ? l.quantity : 0)));
      const setBase = round2(defLines.reduce((sum, l) => sum + l.basePriceRsd, 0));
      const totalSetDiscount = round2(Math.max(0, n * (setBase - def.fixedTotalRsd)));
      bundleAmount = totalSetDiscount;
      // Popust se deli po liniji proporcionalno baznoj ceni komada.
      for (const l of defLines) {
        const gross = l.basePriceRsd * l.quantity;
        const share = setBase > 0 ? round2((totalSetDiscount * l.basePriceRsd) / setBase) : 0;
        perLine.push({ slug: l.slug, amount: share, gross });
      }
      // Korekcija zaokruživanja.
      const sumShares = round2(perLine.reduce((s, p) => s + p.amount, 0));
      const drift = round2(bundleAmount - sumShares);
      if (drift !== 0 && perLine.length > 0) perLine[0].amount = round2(perLine[0].amount + drift);
    } else {
      for (const l of defLines) {
        const gross = l.basePriceRsd * l.quantity;
        perLine.push({ slug: l.slug, amount: round2((gross * bundlePct) / 100), gross });
      }
      bundleAmount = round2(perLine.reduce((s, p) => s + p.amount, 0));
    }

    if (bundleAmount > 0.005) {
      for (const p of perLine) {
        lineDiscounts.push({
          slug: p.slug,
          percent: p.gross > 0 ? round2((p.amount / p.gross) * 100) : 0,
          amountRsd: p.amount,
          source: 'bundle',
          bundleId: def.id,
        });
      }
      bundleBreakdown.push({
        id: def.id,
        slugs: [...def.slugs],
        amountRsd: bundleAmount,
        percent: scopedSubtotal > 0 ? round2((bundleAmount / scopedSubtotal) * 100) : 0,
      });
    }
  };

  // ── 1) Paketni popusti ──
  if (autoDetect) {
    const bundledSlugs = new Set<string>();
    for (const def of BUNDLE_DEFINITIONS) {
      const complete = def.slugs.every((s) => qtyOf(s) > 0);
      if (!complete) continue;
      if (def.slugs.some((s) => bundledSlugs.has(s))) continue;
      applyBundle(def, def.slugs.map((s) => lineBySlug.get(s)!));
      def.slugs.forEach((s) => bundledSlugs.add(s));
    }
    for (const l of lines) {
      if (bundledSlugs.has(l.slug)) excludedFromSite.add(l);
    }
  } else {
    const groups = new Map<string, PricingLine[]>();
    for (const l of lines) {
      if (l.quantity <= 0 || !l.bundleId) continue;
      const g = groups.get(l.bundleId) ?? [];
      g.push(l);
      groups.set(l.bundleId, g);
      excludedFromSite.add(l);
    }
    for (const [bundleId, groupLines] of groups) {
      const def = BUNDLE_DEFINITIONS.find((d) => d.id === bundleId);
      if (!def) continue;
      const defLines = def.slugs
        .map((s) => groupLines.find((l) => l.slug === s))
        .filter((l): l is PricingLine => Boolean(l));
      if (defLines.length !== def.slugs.length) continue;
      applyBundle(def, defLines);
    }
  }

  // ── 2) Popust po liniji za sve van paketa ──
  let siteMaxPct = 0;
  for (const l of lines) {
    if (l.quantity <= 0) continue;
    if (excludedFromSite.has(l)) continue;
    const override = l.discountPercent;
    const pct = clampPct(override != null ? Number(override) : sitePct);
    if (pct <= 0) continue;
    const gross = l.basePriceRsd * l.quantity;
    const amount = round2((gross * pct) / 100);
    if (amount > 0.005) {
      lineDiscounts.push({ slug: l.slug, percent: pct, amountRsd: amount, source: 'site' });
      if (pct > siteMaxPct) siteMaxPct = pct;
    }
  }

  const hasBundle = bundleBreakdown.length > 0;
  const hasSite = lineDiscounts.some((d) => d.source === 'site');
  const discountAmountRsd = round2(lineDiscounts.reduce((s, d) => s + d.amountRsd, 0));

  let discountType: PricingResult['discountType'] = null;
  let discountPercent = 0;
  if (hasBundle) {
    discountType = 'bundle';
    discountPercent = Math.max(...bundleBreakdown.map((b) => b.percent), 0);
  } else if (hasSite) {
    discountType = 'site';
    discountPercent = siteMaxPct;
  }

  const afterProductDiscountRsd = round2(subtotalRsd - discountAmountRsd);

  const appliedPromo =
    promoDiscountPercent > 0 && promoDiscountPercent <= 100 ? promoDiscountPercent : 0;
  const promoDiscountRsd = round2((afterProductDiscountRsd * appliedPromo) / 100);
  const totalRsd = round2(afterProductDiscountRsd - promoDiscountRsd);

  return {
    subtotalRsd,
    isBundle: hasBundle,
    discountType,
    discountPercent,
    discountAmountRsd,
    lineDiscounts,
    bundleBreakdown,
    afterProductDiscountRsd,
    promoDiscountPercent: appliedPromo,
    promoDiscountRsd,
    totalRsd,
  };
}
