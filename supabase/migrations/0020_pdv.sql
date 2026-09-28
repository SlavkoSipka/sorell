-- ═══════════════════════════════════════════════════════════════════
-- PDV na potvrdi porudžbine
--
-- Zašto: za knjiženje (posebno kod porudžbina na firmu) potvrda treba da
-- pokaže koliko je PDV-a uračunato u cenu. Cene na sajtu su sa PDV-om.
-- Stopa se čuva i uz svaku porudžbinu, da stare potvrde ostanu iste i kad
-- se podešavanje kasnije promeni.
--
-- Bezbedno je pokrenuti više puta.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS vat_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS vat_rate    NUMERIC(5, 2) NOT NULL DEFAULT 20;

ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS site_settings_vat_rate_check;
ALTER TABLE public.site_settings
  ADD CONSTRAINT site_settings_vat_rate_check CHECK (vat_rate >= 0 AND vat_rate <= 100);

COMMENT ON COLUMN public.site_settings.vat_enabled IS
  'Prodavac je u sistemu PDV-a: potvrde prikazuju osnovicu i PDV uračunat u cenu.';
COMMENT ON COLUMN public.site_settings.vat_rate IS 'Stopa PDV-a u procentima (opšta 20).';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5, 2);

COMMENT ON COLUMN public.orders.vat_rate IS
  'Stopa PDV-a u trenutku porudžbine. NULL = pre ove izmene, 0 = prodavac nije u sistemu PDV-a.';

COMMIT;
