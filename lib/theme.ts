/**
 * Boje zaglavlja — traka sa obaveštenjima i navigacija.
 * Vrednosti se čuvaju u `site_settings` i menjaju iz admin panela
 * (Podešavanja → Boje zaglavlja). Podrazumevane su iste kao u globals.css.
 */

export type HeaderTheme = {
  tickerBg: string;
  tickerText: string;
  navBg: string;
  navText: string;
  navBorder: string;
};

export const DEFAULT_HEADER_THEME: HeaderTheme = {
  tickerBg: '#FAF9F7',
  tickerText: '#4B4843',
  navBg: '#FFFFFF',
  navText: '#171614',
  navBorder: '#E7E4DF',
};

/** Polje teme → kolona u tabeli `site_settings`. */
export const HEADER_THEME_COLUMNS = {
  tickerBg: 'ticker_bg_color',
  tickerText: 'ticker_text_color',
  navBg: 'nav_bg_color',
  navText: 'nav_text_color',
  navBorder: 'nav_border_color',
} as const satisfies Record<keyof HeaderTheme, string>;

export const HEADER_THEME_KEYS = Object.keys(HEADER_THEME_COLUMNS) as (keyof HeaderTheme)[];

/** Redosled i nazivi polja u adminu. */
export const HEADER_THEME_FIELDS: { key: keyof HeaderTheme; label: string; hint: string }[] = [
  { key: 'tickerBg', label: 'Traka — pozadina', hint: 'Uska traka sa porukama na samom vrhu.' },
  { key: 'tickerText', label: 'Traka — tekst', hint: 'Slova u toj traci.' },
  { key: 'navBg', label: 'Navigacija — pozadina', hint: 'Red sa logom, menijem i korpom.' },
  { key: 'navText', label: 'Navigacija — tekst', hint: 'Logo, linkovi i ikonica korpe.' },
  {
    key: 'navBorder',
    label: 'Linija ispod navigacije',
    hint: 'Tanka linija koja deli zaglavlje od sadržaja.',
  },
];

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isHexColor(raw: string): boolean {
  return HEX.test(raw.trim());
}

/** Vraća `#RRGGBB` velikim slovima; ako vrednost nije HEX, vraća `fallback`. */
export function normalizeHex(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const v = raw.trim();
  if (!HEX.test(v)) return fallback;
  const full = v.length === 4 ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v;
  return full.toUpperCase();
}

/** Red iz baze → tema, uz fallback na podrazumevane boje. */
export function themeFromRow(row: Record<string, unknown> | null | undefined): HeaderTheme {
  const out = { ...DEFAULT_HEADER_THEME };
  if (!row) return out;
  for (const key of HEADER_THEME_KEYS) {
    out[key] = normalizeHex(row[HEADER_THEME_COLUMNS[key]], DEFAULT_HEADER_THEME[key]);
  }
  return out;
}

/** Tema → objekat za `update()` nad `site_settings`. */
export function themeToRow(theme: HeaderTheme): Record<string, string> {
  const row: Record<string, string> = {};
  for (const key of HEADER_THEME_KEYS) {
    row[HEADER_THEME_COLUMNS[key]] = normalizeHex(theme[key], DEFAULT_HEADER_THEME[key]);
  }
  return row;
}

/** Nepoznat ulaz (npr. JSON iz zahteva) → validna tema. */
export function sanitizeTheme(input: unknown): HeaderTheme {
  const obj = (input ?? {}) as Record<string, unknown>;
  const out = { ...DEFAULT_HEADER_THEME };
  for (const key of HEADER_THEME_KEYS) {
    out[key] = normalizeHex(obj[key], DEFAULT_HEADER_THEME[key]);
  }
  return out;
}

/**
 * CSS koji se ubacuje u stranicu. Prepisuje podrazumevane vrednosti iz
 * globals.css; izvedene boje (--nav-text-soft, --ticker-border) se same
 * preračunaju, zato se šalje samo pet vrednosti.
 */
export function headerThemeCss(theme: HeaderTheme): string {
  const t = sanitizeTheme(theme);
  return [
    ':root{',
    `--ticker-bg:${t.tickerBg};`,
    `--ticker-text:${t.tickerText};`,
    `--nav-bg:${t.navBg};`,
    `--nav-text:${t.navText};`,
    `--nav-border:${t.navBorder};`,
    '}',
  ].join('');
}

/** Gotove kombinacije u adminu — jedan klik popuni sva polja. */
export const HEADER_THEME_PRESETS: { name: string; theme: HeaderTheme }[] = [
  { name: 'Bela', theme: DEFAULT_HEADER_THEME },
  {
    name: 'Bež',
    theme: {
      tickerBg: '#EDE4D8',
      tickerText: '#4A3F33',
      navBg: '#F8F3EC',
      navText: '#2B241D',
      navBorder: '#E0D5C6',
    },
  },
  {
    name: 'Puder roze',
    theme: {
      tickerBg: '#F3E3E0',
      tickerText: '#6B4B49',
      navBg: '#FDF7F6',
      navText: '#2E2320',
      navBorder: '#EBD9D6',
    },
  },
  {
    name: 'Traka u akcentu',
    theme: {
      tickerBg: '#B08E6A',
      tickerText: '#FFFFFF',
      navBg: '#FFFFFF',
      navText: '#171614',
      navBorder: '#E7E4DF',
    },
  },
  {
    name: 'Žalfija',
    theme: {
      tickerBg: '#DDE5DC',
      tickerText: '#3C4A3C',
      navBg: '#F7FAF6',
      navText: '#1E2A1E',
      navBorder: '#DCE5DA',
    },
  },
  {
    name: 'Tamna',
    theme: {
      tickerBg: '#0F0E0D',
      tickerText: '#C9C4BC',
      navBg: '#171614',
      navText: '#F5F2ED',
      navBorder: '#2C2A26',
    },
  },
];

/** Relativna svetlina (WCAG) — za upozorenje o kontrastu u adminu. */
function luminance(hex: string): number {
  const v = normalizeHex(hex, '#000000').slice(1);
  const channels = [0, 2, 4].map((i) => {
    const c = parseInt(v.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** Odnos kontrasta dve boje (1 = isto, 21 = crno/belo). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
