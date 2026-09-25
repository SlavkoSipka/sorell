-- ═══════════════════════════════════════════════════════════════════
-- Politika privatnosti i Uslovi korišćenja iz admina
--
-- Zašto: tekstovi su do sada bili u kodu, pa je svaka izmena tražila
-- programera. Sada ih klijentkinja piše u Podešavanjima; prazno polje
-- znači da sajt prikazuje podrazumevani tekst iz lib/legal-defaults.ts.
--
-- Bezbedno je pokrenuti više puta.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS privacy_text       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS privacy_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_text         TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS terms_updated_at   TIMESTAMPTZ;

COMMENT ON COLUMN public.site_settings.privacy_text IS
  'Politika privatnosti. Prazno = podrazumevani tekst iz koda. Format: ## naslov, - stavka, **podebljano**.';
COMMENT ON COLUMN public.site_settings.terms_text IS
  'Uslovi korišćenja i prodaje. Prazno = podrazumevani tekst iz koda. Isti format kao privacy_text.';

COMMIT;
