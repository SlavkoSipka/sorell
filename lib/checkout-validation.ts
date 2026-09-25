/**
 * Pravila za podatke o dostavi — jedno mesto za formu i za server.
 *
 * Forma ih koristi da kupcu odmah pokaže grešku pored polja; API ih ponavlja
 * jer pregledaču ne sme da se veruje. Pošto je plaćanje isključivo pouzećem,
 * netačna adresa ili telefon znače vraćenu pošiljku i plaćenu poštarinu u
 * oba smera — zato su pravila stroža od „samo da nije prazno".
 */

export type CheckoutFields = {
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
};

export type CheckoutErrors = Partial<Record<keyof CheckoutFields, string>>;

const MAX: Record<keyof CheckoutFields, number> = {
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

export function validateCheckout(f: CheckoutFields): CheckoutErrors {
  const e: CheckoutErrors = {};
  const t = (v: string) => v.trim();

  if (!t(f.firstName)) e.firstName = 'Upiši ime.';
  if (!t(f.lastName)) e.lastName = 'Upiši prezime.';

  const cifre = f.phone.replace(/\D/g, '');
  if (!t(f.phone)) e.phone = 'Upiši broj telefona — kurir zove pre dostave.';
  else if (cifre.length < 9 || cifre.length > 13 || !/^[+\d][\d\s()/.-]*$/.test(t(f.phone))) {
    e.phone = 'Broj nije ispravan — npr. 064 123 4567.';
  }

  if (!t(f.email)) e.email = 'Upiši email — na njega stiže potvrda porudžbine.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t(f.email))) e.email = 'Email adresa nije ispravna.';

  if (!t(f.address)) e.address = 'Upiši ulicu i kućni broj.';
  // Kurir mora da nađe kuću: ulica bez broja se ne prihvata.
  else if (!/\d/.test(f.address)) e.address = 'Dodaj i kućni broj — npr. Knez Mihailova 12.';

  if (!t(f.city)) e.city = 'Upiši mesto.';
  if (!t(f.municipality)) e.municipality = 'Upiši opštinu.';

  if (!t(f.postal)) e.postal = 'Upiši poštanski broj.';
  else if (!/^\d{5}$/.test(t(f.postal))) e.postal = 'Poštanski broj ima 5 cifara — npr. 11000.';

  for (const key of Object.keys(MAX) as (keyof CheckoutFields)[]) {
    if (!e[key] && t(f[key]).length > MAX[key]) e[key] = `Najviše ${MAX[key]} znakova.`;
  }

  return e;
}

/** Prva greška kao jedna poruka — za odgovor API-ja. */
export function firstCheckoutError(e: CheckoutErrors): string | null {
  const order: (keyof CheckoutFields)[] = [
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
  ];
  for (const k of order) if (e[k]) return e[k] ?? null;
  return null;
}
