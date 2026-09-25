/**
 * SEO — ključne reči, podrazumevani opisi i strukturisani podaci (JSON-LD).
 *
 * Ovde su samo tekstovi koji žive u kodu (naslovi i opisi za pretraživače).
 * Tekstovi koje klijentkinja menja iz admina se ne diraju.
 */

/** Pojmovi za koje vlasnica želi da se sajt nalazi. */
export const SEO_KEYWORDS = [
  'manikir',
  'gel za nokte',
  'top gel',
  'završni sjaj',
  'builder gel',
  'oprema za manikir',
  'materijal za manikir',
  'gradivni gel',
  'rubber base',
  'HEMA free gel',
];

export const SEO_DEFAULT_TITLE = 'Sorelle — gel za nokte, builder gel i materijal za manikir';

export const SEO_DEFAULT_DESCRIPTION =
  'Sorelle — profesionalni gel za nokte: builder gel, rubber base, top gel i završni sjaj, uz opremu i materijal za manikir. HEMA Free formule, dostava širom Srbije, plaćanje pouzećem.';

/** Opis skraćen na dužinu koju Google prikazuje (~155 znakova), na granici reči. */
export function metaDescription(text: string, max = 155): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 60)).replace(/[\s,.;:—-]+$/, '')}…`;
}

/** JSON-LD kao string za <script type="application/ld+json">; `<` se escapuje da ne zatvori skriptu. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
