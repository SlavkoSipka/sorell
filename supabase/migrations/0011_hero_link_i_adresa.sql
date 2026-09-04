-- ═══════════════════════════════════════════════════════════════════
-- Link na hero slici + adresa salona iz admina
--
-- Zašto:
--  1) Velika slika na početnoj treba da bude klikabilna — vodi tamo gde
--     klijentkinja odredi (npr. na liniju proizvoda ili na Instagram).
--  2) Adresa je do sada živela u `lib/site-config.ts`, pa se menjala samo
--     deployom. Sada stoji uz telefon, a „Kontakt" i footer čitaju isto.
--
-- `hero_link_url` ide pravo u `href`, zato CHECK dozvoljava samo internu
-- putanju (`/nesto`) ili http(s) adresu — nikad `javascript:`.
--
-- Bezbedno je pokrenuti više puta.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS hero_link_url  TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS salon_address  TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS salon_city     TEXT NOT NULL DEFAULT '';

ALTER TABLE public.site_settings
  DROP CONSTRAINT IF EXISTS site_settings_hero_link_url_check;

ALTER TABLE public.site_settings
  ADD CONSTRAINT site_settings_hero_link_url_check
  CHECK (
    hero_link_url = ''
    OR hero_link_url ~ '^(/|https?://)[^\s]*$'
  );

COMMENT ON COLUMN public.site_settings.hero_link_url IS
  'Gde vodi klik na hero sliku. Interna putanja (/proizvodi) ili puna adresa. Prazno = slika nije link.';
COMMENT ON COLUMN public.site_settings.salon_address IS
  'Ulica i broj. Prazno = koristi se vrednost iz lib/site-config.ts.';
COMMENT ON COLUMN public.site_settings.salon_city IS
  'Poštanski broj i grad. Prazno = koristi se vrednost iz lib/site-config.ts.';

COMMIT;
