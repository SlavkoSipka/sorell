/**
 * Pravila za podatke o dostavi — jedno mesto za formu i za server.
 *
 * Forma ih koristi da kupcu odmah pokaže grešku pored polja; API ih ponavlja
 * jer pregledaču ne sme da se veruje. Netačna adresa ili telefon znače
 * vraćenu pošiljku i plaćenu poštarinu u oba smera, a pogrešan PIB račun
 * koji firma ne može da proknjiži — zato su pravila stroža od „samo da nije prazno".
 */

import {
  CUSTOMER_TYPES,
  PAYMENT_METHODS,
  isValidMb,
  isValidPib,
  type CustomerType,
  type PaymentMethod,
} from '@/lib/payment';

export type CheckoutFields = {
  customerType: CustomerType;
  companyName: string;
  pib: string;
  mb: string;
  /** Sedište firme; prazno + companySameAddress = adresa za dostavu. */
  companyAddress: string;
  companySameAddress: boolean;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  addressExtra: string;
  city: string;
  municipality: string;
  postal: string;
  note: string;
  paymentMethod: PaymentMethod;
};

type TextKey = Exclude<keyof CheckoutFields, 'customerType' | 'paymentMethod' | 'companySameAddress'>;

export type CheckoutErrors = Partial<Record<keyof CheckoutFields, string>>;

const MAX: Record<TextKey, number> = {
  companyName: 120,
  pib: 9,
  mb: 8,
  companyAddress: 160,
  firstName: 60,
  lastName: 60,
  phone: 30,
  email: 120,
  address: 120,
  addressExtra: 80,
  city: 60,
  municipality: 60,
  postal: 5,
  note: 600,
};

/** Redosled polja u formi: prva greška po ovom redu dobija fokus i ide u odgovor API-ja. */
export const CHECKOUT_FIELD_ORDER: (keyof CheckoutFields)[] = [
  'customerType',
  'companyName',
  'pib',
  'mb',
  'companyAddress',
  'firstName',
  'lastName',
  'phone',
  'email',
  'address',
  'addressExtra',
  'city',
  'municipality',
  'postal',
  'note',
  'paymentMethod',
];

/** Sedište firme kako se čuva: upisano ili sklopljeno iz adrese za dostavu. */
export function resolvedCompanyAddress(f: CheckoutFields): string {
  if (f.customerType !== 'firma') return '';
  if (!f.companySameAddress) return f.companyAddress.trim();
  return [f.address.trim(), `${f.postal.trim()} ${f.city.trim()}`.trim()].filter(Boolean).join(', ');
}

export function validateCheckout(
  f: CheckoutFields,
  opts: { transferAvailable: boolean } = { transferAvailable: true },
): CheckoutErrors {
  const e: CheckoutErrors = {};
  const t = (v: string) => v.trim();

  if (!CUSTOMER_TYPES.includes(f.customerType)) e.customerType = 'Izaberi fizičko lice ili firmu.';

  if (f.customerType === 'firma') {
    if (!t(f.companyName)) e.companyName = 'Upiši naziv firme.';
    if (!t(f.pib)) e.pib = 'Upiši PIB firme.';
    else if (!/^\d{9}$/.test(t(f.pib))) e.pib = 'PIB ima tačno 9 cifara.';
    else if (!isValidPib(t(f.pib))) e.pib = 'PIB nije ispravan. Proveri cifre.';
    if (!t(f.mb)) e.mb = 'Upiši matični broj firme.';
    else if (!isValidMb(t(f.mb))) e.mb = 'Matični broj ima tačno 8 cifara.';
    if (!f.companySameAddress && !t(f.companyAddress)) {
      e.companyAddress = 'Upiši adresu sedišta firme.';
    }
  }

  if (!t(f.firstName)) e.firstName = 'Upiši ime.';
  if (!t(f.lastName)) e.lastName = 'Upiši prezime.';

  const cifre = f.phone.replace(/\D/g, '');
  if (!t(f.phone)) e.phone = 'Upiši broj telefona, kurir zove pre dostave.';
  else if (cifre.length < 9 || cifre.length > 13 || !/^[+\d][\d\s()/.-]*$/.test(t(f.phone))) {
    e.phone = 'Broj nije ispravan, npr. 064 123 4567.';
  }

  if (!t(f.email)) e.email = 'Upiši email, na njega stiže potvrda porudžbine.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t(f.email))) e.email = 'Email adresa nije ispravna.';

  if (!t(f.address)) e.address = 'Upiši ulicu i kućni broj.';
  // Kurir mora da nađe kuću: ulica bez broja se ne prihvata.
  else if (!/\d/.test(f.address)) e.address = 'Dodaj i kućni broj, npr. Knez Mihailova 12.';

  if (!t(f.city)) e.city = 'Upiši mesto.';
  if (!t(f.municipality)) e.municipality = 'Upiši opštinu.';

  if (!t(f.postal)) e.postal = 'Upiši poštanski broj.';
  else if (!/^\d{5}$/.test(t(f.postal))) e.postal = 'Poštanski broj ima 5 cifara, npr. 11000.';

  if (!PAYMENT_METHODS.includes(f.paymentMethod)) e.paymentMethod = 'Izaberi način plaćanja.';
  else if (f.paymentMethod === 'uplata' && !opts.transferAvailable) {
    e.paymentMethod = 'Uplata na račun trenutno nije dostupna. Izaberi plaćanje pouzećem.';
  }

  for (const key of Object.keys(MAX) as TextKey[]) {
    if (!e[key] && t(f[key]).length > MAX[key]) e[key] = `Najviše ${MAX[key]} znakova.`;
  }

  return e;
}

/** Prva greška kao jedna poruka — za odgovor API-ja. */
export function firstCheckoutError(e: CheckoutErrors): string | null {
  for (const k of CHECKOUT_FIELD_ORDER) if (e[k]) return e[k] ?? null;
  return null;
}
