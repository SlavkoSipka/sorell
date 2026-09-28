/**
 * Kupac (fizičko lice / firma), način plaćanja i uplata na račun.
 *
 * Deli se između forme, API-ja, PDF-a i zahvalnice, pa ne sme da uvozi
 * ništa serversko. Podaci primaoca (naziv, račun, banka) se menjaju u adminu
 * (kartica Plaćanje); ovde su podrazumevane vrednosti dok se tamo ne sačuvaju.
 */

import { formatRsd } from '@/lib/price';

export type CustomerType = 'fizicko' | 'firma';
export type PaymentMethod = 'pouzece' | 'uplata';

export const CUSTOMER_TYPES: readonly CustomerType[] = ['fizicko', 'firma'];
export const PAYMENT_METHODS: readonly PaymentMethod[] = ['pouzece', 'uplata'];

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pouzece: 'Pouzećem',
  uplata: 'Uplata na račun',
};

export type Payee = {
  /** Naziv primaoca kako stoji u banci. */
  name: string;
  /** Ulica i broj sedišta. */
  address: string;
  /** Poštanski broj i mesto sedišta. */
  city: string;
  /** Tekući račun, 18 cifara bez crtica. */
  account: string;
  bank: string;
  /** PIB prodavca; prazno = ne prikazuje se. */
  pib: string;
  /** Matični broj prodavca; prazno = ne prikazuje se. */
  mb: string;
  /** Da li kupci mogu da biraju uplatu na račun. */
  transferEnabled: boolean;
  /** Prodavac je u sistemu PDV-a: potvrde prikazuju osnovicu i PDV. */
  vatEnabled: boolean;
  /** Stopa PDV-a u procentima (opšta 20, posebna 10). */
  vatRate: number;
};

export const DEFAULT_PAYEE: Payee = {
  name: 'Miloš Marjanović PR Sorelle Gel System',
  address: 'Bogoljuba Uroševića Crnog 37',
  city: '11500 Urovci, Obrenovac',
  account: '325950070022754649',
  bank: 'OTP banka',
  pib: '',
  mb: '',
  transferEnabled: true,
  vatEnabled: true,
  vatRate: 20,
};

// ── PDV ─────────────────────────────────────────────────────────────

/** Stopa koja se upisuje uz porudžbinu: 0 = prodavac nije u sistemu PDV-a. */
export function orderVatRate(p: Payee): number {
  return p.vatEnabled && p.vatRate > 0 ? p.vatRate : 0;
}

export type VatSplit = { rate: number; base: number; vat: number };

/**
 * Cene na sajtu su sa PDV-om, pa se PDV izdvaja iz ukupnog iznosa
 * (poštarina ulazi u osnovicu jer je naplaćuje prodavac):
 * PDV = iznos × stopa / (100 + stopa), osnovica = iznos − PDV.
 */
export function splitVat(total: number, rate: number): VatSplit {
  const vat = Math.round(((total * rate) / (100 + rate)) * 100) / 100;
  return { rate, base: Math.round((total - vat) * 100) / 100, vat };
}

/** „20" ili „10,5" za prikaz stope. */
export function formatVatRate(rate: number): string {
  return String(Math.round(rate * 100) / 100).replace('.', ',');
}

// ── Račun ───────────────────────────────────────────────────────────

/**
 * Račun u punom obliku od 18 cifara. Prihvata i skraćeni zapis sa crticama
 * („325-95007002275-49"): srednji deo se dopunjuje nulama sleva.
 * Vraća '' ako zapis nije prepoznat.
 */
export function normalizeAccount(input: string): string {
  const t = input.trim();
  const delovi = t.split(/[\s-]+/).filter(Boolean);
  if (delovi.length === 3 && delovi.every((d) => /^\d+$/.test(d))) {
    const [banka, sredina, kontrola] = delovi;
    if (banka.length !== 3 || kontrola.length !== 2 || sredina.length > 13) return '';
    return `${banka}${sredina.padStart(13, '0')}${kontrola}`;
  }
  const cifre = t.replace(/\D/g, '');
  return cifre.length === 18 ? cifre : '';
}

/** Kontrolni broj računa (ISO 7064, MOD 97-10): ceo broj po modulu 97 mora biti 1. */
export function isValidAccount(account18: string): boolean {
  if (!/^\d{18}$/.test(account18)) return false;
  let ostatak = 0;
  for (const c of account18) ostatak = (ostatak * 10 + Number(c)) % 97;
  return ostatak === 1;
}

/** 325950070022754649 → 325-9500700227546-49 */
export function formatAccount(account18: string): string {
  if (!/^\d{18}$/.test(account18)) return account18;
  return `${account18.slice(0, 3)}-${account18.slice(3, 16)}-${account18.slice(16)}`;
}

/** Uplata se nudi samo kad je uključena i račun ispravan. */
export function isTransferAvailable(p: Payee): boolean {
  return p.transferEnabled && isValidAccount(p.account) && p.name.trim().length > 0;
}

// ── PIB i matični broj kupca ────────────────────────────────────────

/** PIB: 9 cifara, poslednja je kontrolna (ISO 7064, MOD 11-10). */
export function isValidPib(pib: string): boolean {
  if (!/^\d{9}$/.test(pib)) return false;
  let s = 10;
  for (let i = 0; i < 8; i++) {
    s = (s + Number(pib[i])) % 10;
    if (s === 0) s = 10;
    s = (s * 2) % 11;
  }
  return (11 - s) % 10 === Number(pib[8]);
}

/**
 * Matični broj: 8 cifara. Kontrolna cifra se namerno ne proverava: pravila
 * se razlikuju za preduzetnike i stara rešenja, a lažno odbijen MB znači
 * izgubljenu porudžbinu.
 */
export function isValidMb(mb: string): boolean {
  return /^\d{8}$/.test(mb);
}

// ── Podaci za uplatu i NBS IPS QR ───────────────────────────────────

/** Šifra plaćanja: 289 građani, 221 promet robe i usluga (firme). */
export function paymentCode(type: CustomerType): string {
  return type === 'firma' ? '221' : '289';
}

/** Poziv na broj: model 97 sa kontrolnim brojem, pa broj porudžbine (npr. 97 26 1004). */
export function paymentReference(orderNumber: string | number): { model: string; number: string } {
  const broj = String(orderNumber).replace(/\D/g, '') || '0';
  // Kontrola za model 97: 98 − (broj·100 mod 97), uvek dve cifre.
  let ostatak = 0;
  for (const c of `${broj}00`) ostatak = (ostatak * 10 + Number(c)) % 97;
  const kontrola = String(98 - ostatak).padStart(2, '0');
  return { model: '97', number: `${kontrola}${broj}` };
}

export function paymentPurpose(orderNumber: string | number): string {
  return `Porudžbina br. ${orderNumber}`;
}

/** Iznos za QR: bez razdvajanja hiljada, decimalni zarez (1490,00). */
function qrAmount(amount: number): string {
  return (Math.round(amount * 100) / 100).toFixed(2).replace('.', ',');
}

/** Spaja redove dok staju u dozvoljenu dužinu polja (NBS: CR LF između redova). */
function lines(parts: string[], max: number): string {
  let out = '';
  for (const raw of parts) {
    const p = raw.replace(/[|\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!p) continue;
    const next = out ? `${out}\r\n${p}` : p;
    if (next.length > max) {
      if (!out) out = p.slice(0, max);
      break;
    }
    out = next;
  }
  return out;
}

export type TransferDetails = {
  payee: Payee;
  amount: number;
  orderNumber: string | number;
  customerType: CustomerType;
};

/**
 * Sadržaj IPS QR koda po standardu NBS („PR" = nalog za prenos).
 * Aplikacije banaka posle skeniranja popune ceo nalog; kupac samo potvrdi.
 * Platilac (P) se namerno izostavlja: banka ga zna, a kraći sadržaj daje
 * ređi kod koji se lakše skenira sa ekrana i screenshot-a.
 */
export function ipsQrPayload(d: TransferDetails): string {
  const ref = paymentReference(d.orderNumber);
  const polja = [
    'K:PR',
    'V:01',
    'C:1',
    `R:${d.payee.account}`,
    `N:${lines([d.payee.name, d.payee.address, d.payee.city], 70)}`,
    `I:RSD${qrAmount(d.amount)}`,
  ];
  polja.push(`SF:${paymentCode(d.customerType)}`);
  polja.push(`S:${paymentPurpose(d.orderNumber).slice(0, 35)}`);
  polja.push(`RO:${ref.model}${ref.number}`);
  return polja.join('|');
}

/** Redovi „naziv: vrednost" za prikaz na zahvalnici, u PDF-u i u mejlu. */
export function transferRows(d: TransferDetails): { label: string; value: string; copy?: string }[] {
  const ref = paymentReference(d.orderNumber);
  const iznos = (Math.round(d.amount * 100) / 100).toFixed(2);
  return [
    { label: 'Primalac', value: [d.payee.name, d.payee.address, d.payee.city].filter(Boolean).join(', ') },
    { label: 'Račun primaoca', value: formatAccount(d.payee.account), copy: formatAccount(d.payee.account) },
    ...(d.payee.bank ? [{ label: 'Banka', value: d.payee.bank }] : []),
    { label: 'Iznos', value: formatRsd(d.amount), copy: iznos.replace('.', ',') },
    { label: 'Šifra plaćanja', value: paymentCode(d.customerType) },
    { label: 'Model', value: ref.model },
    { label: 'Poziv na broj', value: ref.number, copy: ref.number },
    { label: 'Svrha uplate', value: paymentPurpose(d.orderNumber), copy: paymentPurpose(d.orderNumber) },
  ];
}
