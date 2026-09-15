-- ═══════════════════════════════════════════════════════════════════
-- Baner na početnoj umesto spiska proizvoda
--
-- Zašto: ispod slajdova je stajao spisak „Izdvojeno iz ponude". Umesto
-- njega sada ide jedna široka fotografija sa malim naslovom, opisom i
-- dugmetom, i sve to se menja iz admina (Početna strana → Baner).
--
-- Podrazumevane vrednosti popune postojeći red jednom, pri dodavanju
-- kolone; ponovno pokretanje ih ne vraća preko onoga što je uneto.
--
-- `banner_button_url` ide pravo u `href`, zato CHECK dozvoljava samo
-- internu putanju (`/nesto`) ili http(s) adresu.
--
-- Bezbedno je pokrenuti više puta.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS banner_is_active    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS banner_image_path   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS banner_title        TEXT NOT NULL DEFAULT 'Izdvojeno iz ponude',
  ADD COLUMN IF NOT EXISTS banner_text         TEXT NOT NULL
    DEFAULT 'Gradivni gelovi, rubber base i završni sjajevi. HEMA Free, Di-HEMA Free i TPO Free.',
  ADD COLUMN IF NOT EXISTS banner_button_label TEXT NOT NULL DEFAULT 'Proizvodi',
  ADD COLUMN IF NOT EXISTS banner_button_url   TEXT NOT NULL DEFAULT '/proizvodi';

ALTER TABLE public.site_settings
  DROP CONSTRAINT IF EXISTS site_settings_banner_button_url_check;

ALTER TABLE public.site_settings
  ADD CONSTRAINT site_settings_banner_button_url_check
  CHECK (
    banner_button_url = ''
    OR banner_button_url ~ '^(/|https?://)[^\s]*$'
  );

COMMENT ON COLUMN public.site_settings.banner_is_active IS
  'false = baner se ne prikazuje na početnoj.';
COMMENT ON COLUMN public.site_settings.banner_image_path IS
  'Široka fotografija (16:9) ispod slajdova. Prazno = okvir sa preporučenom dimenzijom.';
COMMENT ON COLUMN public.site_settings.banner_button_url IS
  'Gde vode dugme i fotografija. Prazno = baner nema dugme.';

COMMIT;
