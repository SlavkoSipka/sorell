/** Pomoćne funkcije za unos u admin panelu: brojevi sa zarezom i slug za URL. */

/** Procenat 0 do 100; prihvata i zarez („12,5"). */
export function parsePct(raw: string): number | null {
  const v = parseFloat(raw.replace(',', '.'));
  if (Number.isNaN(v) || v < 0 || v > 100) return null;
  return Math.round(v * 1e8) / 1e8;
}

/** Cena u dinarima; prihvata razmake i zarez („1 890,50"). */
export function parsePrice(raw: string): number | null {
  const v = parseFloat(raw.replace(/\s/g, '').replace(',', '.'));
  if (Number.isNaN(v) || v < 0) return null;
  return Math.round(v * 100) / 100;
}

/** Naziv → slug za URL: „Builder Gel – Pro Fiber" → „builder-gel-pro-fiber". */
export function slugify(name: string): string {
  const map: Record<string, string> = { č: 'c', ć: 'c', đ: 'dj', š: 's', ž: 'z' };
  return name
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Slug koji još nije zauzet: „jogurt", pa „jogurt-2", „jogurt-3"… */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
