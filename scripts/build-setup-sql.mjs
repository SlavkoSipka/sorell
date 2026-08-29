// Spaja sve migracije u jedan `supabase/setup.sql` — fajl koji se nalepi
// u Supabase SQL Editor i pokrene jednom, umesto tri odvojena.
//
//   npm run sql:build
//
// Pokreni posle svake izmene u supabase/migrations/.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = 'supabase/migrations';
const OUT = 'supabase/setup.sql';

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const header = `-- ═══════════════════════════════════════════════════════════════════
-- SORELLE — kompletna šema baze u jednom fajlu
--
-- GENERISANO: ne menjaj ovaj fajl ručno. Izvor su migracije u
-- supabase/migrations/; posle izmene pokreni \`npm run sql:build\`.
--
-- Kako se koristi: Supabase → SQL Editor → nalepi ceo sadržaj → Run.
-- Bezbedno je pokrenuti više puta: šema se dopunjuje, a cene, popusti,
-- slike i izbor „na sajtu"/„na početnoj" ostaju netaknuti.
--
-- Spojeni fajlovi:
${files.map((f) => `--   ${f}`).join('\n')}
-- ═══════════════════════════════════════════════════════════════════

`;

const body = files
  .map((f) => {
    const sql = readFileSync(join(MIGRATIONS_DIR, f), 'utf8').trim();
    return `-- ───────────────────────────────────────────────────────────────────\n-- ${f}\n-- ───────────────────────────────────────────────────────────────────\n\n${sql}\n`;
  })
  .join('\n');

writeFileSync(OUT, `${header}${body}`);
console.log(`${OUT} — spojeno ${files.length} migracija.`);
