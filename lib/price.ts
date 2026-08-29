import type { CartLine } from '@/lib/cart-context';

/** Parsira prikaz tipa "1.890,00 RSD" u broj. */
export function parsePriceStringToRsd(s: string): number | null {
  const t = s.replace(/\s*RSD\s*$/i, '').trim();
  if (t === '') return null;
  const n = parseFloat(t.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Format kao na sajtu: "1.890,00 RSD". */
export function formatRsd(amount: number): string {
  const formatted = new Intl.NumberFormat('sr-RS', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} RSD`;
}

/** Iznos bez oznake valute — za tabele u adminu. */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('sr-RS', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Tekst umesto cene dok je klijent nije uneo u admin panelu. */
export const PRICE_PENDING_LABEL = 'Cena uskoro';

/**
 * Jedinična cena varijante iz baze. Katalog u kodu nema cene — dok cena
 * nije uneta u adminu, vraća se 0 i stavka se ne može poručiti.
 */
export function unitPriceRsdForLine(line: CartLine, dbPrices?: Map<string, number>): number {
  const dbp = dbPrices?.get(line.slug);
  if (dbp !== undefined) return dbp;
  return parsePriceStringToRsd(line.price) ?? 0;
}

export function lineSubtotalRsd(line: CartLine, dbPrices?: Map<string, number>): number {
  return unitPriceRsdForLine(line, dbPrices) * line.quantity;
}

/** Jedinična cena posle popusta (%). */
export function discountedUnitPriceRsd(base: number, percent: number): number {
  if (percent <= 0) return base;
  return Math.round(base * (1 - percent / 100) * 100) / 100;
}

// ── Tipovi iz baze ───────────────────────────────────────────────

export type DbProduct = {
  slug: string;
  name: string;
  /** IZVEDENO: najniža cena među varijantama. Naplata ide po `DbVariant.price_rsd`. */
  base_price_rsd: number;
  image_path: string;
  volume: string;
  /** Popust po proizvodu u %. NULL = koristi site_settings.site_discount_percent. */
  discount_percent?: number | null;
};

export type DbVariant = {
  product_slug: string;
  /** `<slug proizvoda>--<oznaka pakovanja>` — ključ stavke u korpi i porudžbini. */
  variant_slug: string;
  package_label: string;
  /** NULL = cena još nije uneta u adminu. */
  price_rsd: number | null;
  sort_order?: number;
  is_active?: boolean;
};

export type DbSiteSettings = {
  site_discount_percent: number;
  bundle_discount_percent?: number;
};
