-- ═══════════════════════════════════════════════════════════════════
-- Boje zaglavlja (traka sa obaveštenjima + navigacija)
--
-- Zašto: boje su do sada živele u `app/globals.css`, pa je svaka promena
-- tražila novi deploy. Sada stoje u `site_settings` i menjaju se iz
-- admin panela → Podešavanja → Boje zaglavlja.
--
-- Vrednosti idu direktno u CSS, zato CHECK dozvoljava isključivo HEX.
-- Bezbedno je pokrenuti više puta.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS ticker_bg_color   TEXT NOT NULL DEFAULT '#FAF9F7',
  ADD COLUMN IF NOT EXISTS ticker_text_color TEXT NOT NULL DEFAULT '#4B4843',
  ADD COLUMN IF NOT EXISTS nav_bg_color      TEXT NOT NULL DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS nav_text_color    TEXT NOT NULL DEFAULT '#171614',
  ADD COLUMN IF NOT EXISTS nav_border_color  TEXT NOT NULL DEFAULT '#E7E4DF';

DO $$
DECLARE
  col TEXT;
BEGIN
  FOREACH col IN ARRAY ARRAY[
    'ticker_bg_color', 'ticker_text_color',
    'nav_bg_color', 'nav_text_color', 'nav_border_color'
  ] LOOP
    EXECUTE format(
      'ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS site_settings_%s_hex',
      col
    );
    EXECUTE format(
      'ALTER TABLE public.site_settings ADD CONSTRAINT site_settings_%s_hex CHECK (%I ~* ''^#([0-9a-f]{3}|[0-9a-f]{6})$'')',
      col, col
    );
  END LOOP;
END $$;

COMMENT ON COLUMN public.site_settings.ticker_bg_color IS
  'HEX pozadine trake sa obaveštenjima na vrhu sajta.';
COMMENT ON COLUMN public.site_settings.ticker_text_color IS
  'HEX teksta u traci sa obaveštenjima.';
COMMENT ON COLUMN public.site_settings.nav_bg_color IS
  'HEX pozadine navigacije (logo, meni, korpa).';
COMMENT ON COLUMN public.site_settings.nav_text_color IS
  'HEX logotipa, linkova i ikonice korpe.';
COMMENT ON COLUMN public.site_settings.nav_border_color IS
  'HEX linije koja deli zaglavlje od sadržaja.';

COMMIT;
