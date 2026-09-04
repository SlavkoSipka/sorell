-- ═══════════════════════════════════════════════════════════════════
-- Salon: cenovnik, fotografija i telefon
--
-- Zašto: stranica „Usluge" i sekcija salona na početnoj do sada su čitale
-- `lib/data/services.ts` i `lib/site-config.ts` — svaka izmena je tražila
-- novi deploy. Sada oboje čitaju iz baze, a klijentkinja menja naslove,
-- cene, sliku i broj telefona iz admin panela (Podešavanja → Salon).
--
-- Bezbedno je pokrenuti više puta.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Grupe usluga ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.service_groups (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  intro TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.service_groups IS
  'Grupe u cenovniku salona (npr. „Nega lica"). Redosled prikaza ide po sort_order.';

ALTER TABLE public.service_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read service_groups" ON public.service_groups;
CREATE POLICY "Public read service_groups"
  ON public.service_groups FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage service_groups" ON public.service_groups;
CREATE POLICY "Admins manage service_groups"
  ON public.service_groups FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- ── 2. Stavke cenovnika ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.services (
  id SERIAL PRIMARY KEY,
  group_slug TEXT NOT NULL
    REFERENCES public.service_groups (slug) ON DELETE CASCADE ON UPDATE CASCADE,
  name TEXT NOT NULL CHECK (length(btrim(name)) > 0),
  description TEXT NOT NULL DEFAULT '',
  -- NULL = trajanje se ne prikazuje uz uslugu.
  duration_minutes INT CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  -- NULL = „Cena na upit".
  price_rsd NUMERIC(12, 2) CHECK (price_rsd IS NULL OR price_rsd >= 0),
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.services.price_rsd IS
  'Cena u dinarima. NULL = na sajtu piše „Cena na upit".';

CREATE INDEX IF NOT EXISTS idx_services_group
  ON public.services (group_slug, sort_order, id);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read services" ON public.services;
CREATE POLICY "Public read services"
  ON public.services FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage services" ON public.services;
CREATE POLICY "Admins manage services"
  ON public.services FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- ── 3. Fotografija salona, telefon i uvodni tekstovi ─────────────

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS salon_image_path TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS salon_phone      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS salon_title      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS salon_intro      TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.site_settings.salon_image_path IS
  'Fotografija salona; ista se koristi na „Uslugama" i u sekciji salona na početnoj.';
COMMENT ON COLUMN public.site_settings.salon_phone IS
  'Broj za zakazivanje. Prazno = koristi se broj iz lib/site-config.ts.';

UPDATE public.site_settings
SET salon_phone = '0692510146'
WHERE id = 1 AND btrim(salon_phone) = '';

-- ── 4. Početni cenovnik ──────────────────────────────────────────
-- Prepisan iz `lib/data/services.ts` da stranica ne ostane prazna;
-- sve se menja iz admin panela.

INSERT INTO public.service_groups (slug, title, intro, sort_order)
VALUES
  ('nega-lica', 'Nega lica', 'Placeholder tekst o tretmanima lica koje radite u salonu.', 1),
  ('tretmani-tela', 'Tretmani tela', 'Placeholder tekst o tretmanima tela.', 2),
  ('depilacija', 'Depilacija', 'Placeholder tekst o depilaciji.', 3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.services (group_slug, name, description, duration_minutes, price_rsd, sort_order)
SELECT v.group_slug, v.name, v.description, v.duration_minutes, v.price_rsd, v.sort_order
FROM (VALUES
  ('nega-lica', 'Osnovni tretman lica', 'Kratak opis tretmana.', 45, 2500, 1),
  ('nega-lica', 'Dubinsko čišćenje', 'Kratak opis tretmana.', 60, 3500, 2),
  ('nega-lica', 'Hidratantni tretman', '', 60, 3800, 3),
  ('nega-lica', 'Anti-age tretman', '', 75, 4500, 4),
  ('tretmani-tela', 'Relax masaža (30 min)', '', 30, 2200, 1),
  ('tretmani-tela', 'Relax masaža (60 min)', '', 60, 3600, 2),
  ('tretmani-tela', 'Piling tela', '', 45, 2800, 3),
  ('depilacija', 'Potkolenice', '', 20, 1200, 1),
  ('depilacija', 'Cele noge', '', 40, 2000, 2),
  ('depilacija', 'Pazuh', '', 15, 800, 3)
) AS v(group_slug, name, description, duration_minutes, price_rsd, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.services);

COMMIT;
