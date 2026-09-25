/**
 * Pravni tekstovi (Politika privatnosti, Uslovi) — format i zamena podataka.
 *
 * Klijentkinja piše običan tekst u adminu, bez HTML-a. Pravila su namerno
 * malobrojna da ne može da „polomi" stranicu:
 *
 *   ## Naslov odeljka      → naslov
 *   - stavka               → tačka u spisku
 *   **podebljano**         → podebljan deo reda
 *   prazan red             → novi pasus
 *
 * Podaci o salonu se ne prepisuju ručno nego se ubacuju kroz oznake u
 * vitičastim zagradama, pa promena adrese ili telefona u adminu odmah
 * menja i ove tekstove: {naziv}, {adresa}, {grad}, {telefon}, {email},
 * {brend}, {postarina}, {besplatno_od}.
 */

export type LegalKind = 'privatnost' | 'uslovi';

export type LegalBlock =
  | { type: 'naslov'; text: string }
  | { type: 'pasus'; text: string }
  | { type: 'spisak'; items: string[] };

export type LegalValues = Record<string, string>;

/** Oznake koje admin sme da koristi — prikazuju se i kao pomoć ispod polja. */
export const LEGAL_PLACEHOLDERS: { key: string; opis: string }[] = [
  { key: 'naziv', opis: 'naziv salona' },
  { key: 'adresa', opis: 'ulica i broj' },
  { key: 'grad', opis: 'poštanski broj i grad' },
  { key: 'telefon', opis: 'telefon' },
  { key: 'email', opis: 'email' },
  { key: 'brend', opis: 'naziv sajta' },
  { key: 'postarina', opis: 'cena poštarine' },
  { key: 'besplatno_od', opis: 'prag za besplatnu dostavu' },
];

/** {telefon} → 069…; nepoznata oznaka ostaje kako je napisana, da se vidi greška. */
export function fillPlaceholders(text: string, values: LegalValues): string {
  return text.replace(/\{([a-z_]+)\}/g, (whole, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : whole,
  );
}

export function parseLegal(raw: string): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  let pasus: string[] = [];
  let spisak: string[] = [];

  const zatvoriPasus = () => {
    if (pasus.length > 0) blocks.push({ type: 'pasus', text: pasus.join(' ') });
    pasus = [];
  };
  const zatvoriSpisak = () => {
    if (spisak.length > 0) blocks.push({ type: 'spisak', items: spisak });
    spisak = [];
  };

  for (const lineRaw of raw.replace(/\r\n/g, '\n').split('\n')) {
    const line = lineRaw.trim();

    if (line === '') {
      zatvoriPasus();
      zatvoriSpisak();
      continue;
    }
    if (line.startsWith('## ')) {
      zatvoriPasus();
      zatvoriSpisak();
      blocks.push({ type: 'naslov', text: line.slice(3).trim() });
      continue;
    }
    if (/^[-•*]\s+/.test(line)) {
      zatvoriPasus();
      spisak.push(line.replace(/^[-•*]\s+/, ''));
      continue;
    }
    zatvoriSpisak();
    pasus.push(line);
  }
  zatvoriPasus();
  zatvoriSpisak();

  return blocks;
}

/** „**reč**" → delovi za podebljavanje; ostalo je običan tekst (nikad HTML). */
export function splitBold(text: string): { text: string; bold: boolean }[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('**') && part.endsWith('**') && part.length > 4
        ? { text: part.slice(2, -2), bold: true }
        : { text: part, bold: false },
    );
}
