import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { formatRsd } from '@/lib/price';

/**
 * PDF potvrda porudžbine.
 *
 * Gradi se na serveru iz reda u tabeli `orders` — iz istih podataka koji su
 * sačuvani pri poručivanju, pa se potvrda ne menja ako se kasnije promeni
 * cena u adminu. Font je Manrope (isti kao na sajtu), ugrađen u PDF jer
 * standardni PDF fontovi nemaju č, ć i đ.
 *
 * Namerno je „potvrda porudžbine", a ne „račun": zakon za prodaju fizičkim
 * licima traži fiskalni račun, koji ovaj dokument ne može da zameni.
 */

export type OrderForPdf = {
  order_number: number | string | null;
  created_at: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  address_line: string;
  address_extra: string | null;
  city: string;
  municipality: string | null;
  postal_code: string;
  note: string | null;
  line_items: unknown;
  subtotal_rsd: number | string | null;
  shipping_rsd: number | string | null;
  promo_code: string | null;
  promo_discount_rsd: number | string | null;
  total_rsd: number | string;
};

export type SellerForPdf = {
  brand: string;
  title: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website: string;
};

export type OrderLine = { name: string; quantity: number; unit: number; total: number };

// ── Izgled ──────────────────────────────────────────────────────────

const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 48;
const INK = rgb(0.09, 0.086, 0.078);
const SOFT = rgb(0.29, 0.28, 0.26);
const MUTED = rgb(0.43, 0.42, 0.39);
const LINE = rgb(0.86, 0.84, 0.8);
const SURFACE = rgb(0.98, 0.976, 0.969);

let fontCache: { medium: Uint8Array; bold: Uint8Array } | null = null;

async function loadFonts() {
  if (fontCache) return fontCache;
  const dir = path.join(process.cwd(), 'assets', 'fonts');
  const [medium, bold] = await Promise.all([
    readFile(path.join(dir, 'Manrope-Medium.ttf')),
    readFile(path.join(dir, 'Manrope-Bold.ttf')),
  ]);
  fontCache = { medium: new Uint8Array(medium), bold: new Uint8Array(bold) };
  return fontCache;
}

function num(v: number | string | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function parseLines(raw: unknown): OrderLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((li) => {
    const r = li as Record<string, unknown>;
    const quantity = Math.max(1, Math.round(num(r.quantity as number)));
    const unit = num(r.unit_price_rsd as number);
    const total = r.line_total_rsd != null ? num(r.line_total_rsd as number) : unit * quantity;
    return { name: String(r.name ?? r.slug ?? 'Proizvod'), quantity, unit, total };
  });
}

export type OrderTotals = {
  subtotal: number;
  /** Popust na proizvode (sajt/paket) — ne čuva se posebno, izvodi se. */
  popust: number;
  promo: number;
  shipping: number;
  total: number;
};

/** Iznosi porudžbine iz sačuvanih kolona — isti brojevi na PDF-u i na stranici. */
export function orderTotals(order: OrderForPdf): OrderTotals {
  const subtotal = num(order.subtotal_rsd);
  const shipping = num(order.shipping_rsd);
  const total = num(order.total_rsd);
  const promo = num(order.promo_discount_rsd);
  const popust = Math.max(0, Math.round((subtotal - promo - (total - shipping)) * 100) / 100);
  return { subtotal, popust, promo, shipping, total };
}

/** Datum porudžbine po beogradskom vremenu. */
export function orderDate(iso: string): string {
  return datum(iso);
}

/** Deli tekst u redove koji staju u zadatu širinu. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text
    .replace(/\s+/g, ' ')
    .trim()
    // „50 g", „15 ml" ne smeju da se razdvoje u dva reda.
    .replace(/(\d) (g|kg|ml|l|kom)\b/gi, '$1 $2')
    .split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

function datum(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('sr-RS', {
    timeZone: 'Europe/Belgrade',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function orderNumberLabel(n: number | string | null | undefined): string {
  return n == null || n === '' ? '—' : String(n);
}

// ── Crtanje ─────────────────────────────────────────────────────────

export async function buildOrderPdf(order: OrderForPdf, seller: SellerForPdf): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fonts = await loadFonts();
  const regular = await pdf.embedFont(fonts.medium, { subset: true });
  const bold = await pdf.embedFont(fonts.bold, { subset: true });

  const broj = orderNumberLabel(order.order_number);
  pdf.setTitle(`Potvrda porudžbine br. ${broj} — ${seller.brand}`);
  pdf.setAuthor(seller.brand);
  pdf.setSubject('Potvrda porudžbine');
  pdf.setCreator(seller.brand);

  let page: PDFPage = pdf.addPage([A4.w, A4.h]);
  let y = A4.h - MARGIN;
  const right = A4.w - MARGIN;
  const width = right - MARGIN;

  const text = (
    s: string,
    x: number,
    yy: number,
    opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb> } = {},
  ) => {
    page.drawText(s, {
      x,
      y: yy,
      font: opts.font ?? regular,
      size: opts.size ?? 10,
      color: opts.color ?? INK,
    });
  };

  const textRight = (
    s: string,
    xRight: number,
    yy: number,
    opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb> } = {},
  ) => {
    const f = opts.font ?? regular;
    const size = opts.size ?? 10;
    text(s, xRight - f.widthOfTextAtSize(s, size), yy, { ...opts, font: f, size });
  };

  const hr = (yy: number, color = LINE) =>
    page.drawLine({ start: { x: MARGIN, y: yy }, end: { x: right, y: yy }, thickness: 0.75, color });

  /** Nova strana kad ponestane mesta — dugačke porudžbine ne smeju da se odseku. */
  const ensure = (needed: number) => {
    if (y - needed >= MARGIN + 40) return;
    page = pdf.addPage([A4.w, A4.h]);
    y = A4.h - MARGIN;
    text(`Potvrda porudžbine br. ${broj} — nastavak`, MARGIN, y, { size: 9, color: MUTED });
    y -= 24;
  };

  // ── Zaglavlje ──
  text(seller.brand.toUpperCase(), MARGIN, y - 6, { font: bold, size: 20 });
  textRight('POTVRDA PORUDŽBINE', right, y, { font: bold, size: 9, color: MUTED });
  textRight(`Br. ${broj}`, right, y - 22, { font: bold, size: 18 });
  textRight(datum(order.created_at), right, y - 38, { size: 9, color: MUTED });
  y -= 58;
  hr(y);
  y -= 26;

  // ── Prodavac i kupac ──
  const colW = (width - 24) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + colW + 24;

  const kupacAdresa = [
    `${order.customer_first_name} ${order.customer_last_name}`.trim(),
    order.address_line,
    order.address_extra?.trim() || '',
    `${order.postal_code} ${order.city}`.trim(),
    order.municipality?.trim() ? `Opština ${order.municipality.trim()}` : '',
    order.customer_phone,
    order.customer_email,
  ].filter(Boolean);

  const prodavac = [
    seller.title,
    seller.address,
    seller.city,
    seller.phone ? `Tel. ${seller.phone}` : '',
    seller.email,
  ].filter(Boolean);

  text('PRODAVAC', leftX, y, { font: bold, size: 8, color: MUTED });
  text('ADRESA ZA DOSTAVU', rightX, y, { font: bold, size: 8, color: MUTED });
  y -= 16;

  let yL = y;
  prodavac.forEach((line, i) => {
    for (const w of wrap(line, i === 0 ? bold : regular, 10, colW)) {
      text(w, leftX, yL, { font: i === 0 ? bold : regular, size: 10, color: i === 0 ? INK : SOFT });
      yL -= 14;
    }
  });

  let yR = y;
  kupacAdresa.forEach((line, i) => {
    for (const w of wrap(line, i === 0 ? bold : regular, 10, colW)) {
      text(w, rightX, yR, { font: i === 0 ? bold : regular, size: 10, color: i === 0 ? INK : SOFT });
      yR -= 14;
    }
  });

  y = Math.min(yL, yR) - 18;

  // ── Stavke ──
  // Desne ivice kolona. Iznos „12.345,00 RSD" je ~75pt širok, pa između
  // cene i iznosa mora da stane toliko plus vazduh — inače se preklapaju.
  const xIznos = right - 8;
  const xCena = right - 100;
  const xKol = right - 190;
  const nameMax = xKol - 30 - (MARGIN + 8);

  page.drawRectangle({ x: MARGIN, y: y - 8, width, height: 24, color: SURFACE });
  text('PROIZVOD', MARGIN + 8, y, { font: bold, size: 8, color: MUTED });
  textRight('KOL.', xKol, y, { font: bold, size: 8, color: MUTED });
  textRight('CENA', xCena, y, { font: bold, size: 8, color: MUTED });
  textRight('IZNOS', xIznos, y, { font: bold, size: 8, color: MUTED });
  y -= 26;

  for (const li of parseLines(order.line_items)) {
    const redovi = wrap(li.name, regular, 10, nameMax);
    ensure(redovi.length * 14 + 12);
    const top = y;
    redovi.forEach((r, i) => text(r, MARGIN + 8, top - i * 14, { size: 10 }));
    textRight(String(li.quantity), xKol, top, { size: 10 });
    textRight(formatRsd(li.unit), xCena, top, { size: 10, color: SOFT });
    textRight(formatRsd(li.total), xIznos, top, { size: 10 });
    y = top - redovi.length * 14 - 6;
    hr(y + 2);
    y -= 12;
  }

  // ── Iznosi ──
  const { subtotal, shipping, total, promo, popust } = orderTotals(order);

  const redoviIznosa: { label: string; value: string }[] = [
    { label: 'Međuzbir', value: formatRsd(subtotal) },
  ];
  if (popust > 0.004) redoviIznosa.push({ label: 'Popust', value: `−${formatRsd(popust)}` });
  if (promo > 0.004) {
    redoviIznosa.push({
      label: order.promo_code ? `Promo kod ${order.promo_code}` : 'Promo kod',
      value: `−${formatRsd(promo)}`,
    });
  }
  redoviIznosa.push({ label: 'Poštarina', value: shipping > 0 ? formatRsd(shipping) : 'Besplatno' });

  ensure(redoviIznosa.length * 16 + 60);
  y -= 4;
  const labelX = right - 220;
  for (const r of redoviIznosa) {
    text(r.label, labelX, y, { size: 10, color: SOFT });
    textRight(r.value, right - 8, y, { size: 10 });
    y -= 16;
  }
  y -= 4;
  page.drawLine({
    start: { x: labelX, y: y + 8 },
    end: { x: right, y: y + 8 },
    thickness: 1,
    color: INK,
  });
  y -= 8;
  text('ZA PLAĆANJE', labelX, y, { font: bold, size: 11 });
  textRight(formatRsd(total), right - 8, y - 2, { font: bold, size: 15 });
  y -= 34;

  // ── Plaćanje ──
  ensure(70);
  page.drawRectangle({
    x: MARGIN,
    y: y - 30,
    width,
    height: 46,
    borderColor: LINE,
    borderWidth: 0.75,
    color: SURFACE,
  });
  text('NAČIN PLAĆANJA', MARGIN + 12, y, { font: bold, size: 8, color: MUTED });
  text('Pouzećem — gotovinom kuriru pri preuzimanju pošiljke.', MARGIN + 12, y - 18, {
    size: 10,
  });
  y -= 56;

  // ── Napomena kupca ──
  if (order.note && order.note.trim()) {
    const redovi = wrap(order.note.trim(), regular, 10, width);
    ensure(redovi.length * 14 + 24);
    text('NAPOMENA KUPCA', MARGIN, y, { font: bold, size: 8, color: MUTED });
    y -= 16;
    for (const r of redovi) {
      text(r, MARGIN, y, { size: 10, color: SOFT });
      y -= 14;
    }
    y -= 10;
  }

  // ── Podnožje na svakoj strani ──
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawLine({
      start: { x: MARGIN, y: MARGIN + 22 },
      end: { x: right, y: MARGIN + 22 },
      thickness: 0.5,
      color: LINE,
    });
    p.drawText('Ovaj dokument je potvrda porudžbine i nije fiskalni račun.', {
      x: MARGIN,
      y: MARGIN + 8,
      font: regular,
      size: 8,
      color: MUTED,
    });
    const desno = `${seller.website} · strana ${i + 1}/${pages.length}`;
    p.drawText(desno, {
      x: right - regular.widthOfTextAtSize(desno, 8),
      y: MARGIN + 8,
      font: regular,
      size: 8,
      color: MUTED,
    });
  });

  return pdf.save();
}
