-- ═══════════════════════════════════════════════════════════════════
-- Više slajdova u zaglavlju početne strane
--
-- Zašto: hero je imao samo jednu sliku (`site_settings.hero_image_path`).
-- Klijentkinja želi da ga koristi kao „novosti" — nekoliko fotografija
-- koje se smenjuju, i svaka vodi na svoju liniju, gel ili boju.
--
-- Postojeća hero slika (sa linkom) postaje prvi slajd, a stare kolone se
-- prazne da ponovno pokretanje ne bi vratilo obrisan slajd. Kolone ostaju
-- u šemi: sajt ih čita samo dok ova tabela ne postoji.
--
-- `link_url` ide pravo u `href`, zato CHECK dozvoljava samo internu
-- putanju (`/nesto`) ili http(s) adresu — nikad `javascript:`.
--
-- Bezbedno je pokrenuti više puta.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS public.hero_slides (
  id SERIAL PRIMARY KEY,
  -- Javni URL iz bucket-a `product-images` (folder `_hero/`).
  image_url TEXT NOT NULL CHECK (length(btrim(image_url)) > 0),
  -- Gde vodi klik. Prazno = slajd nije link.
  link_url TEXT NOT NULL DEFAULT ''
    CHECK (link_url = '' OR link_url ~ '^(/|https?://)[^\s]*$'),
  -- Opis slike za čitače ekrana.
  alt TEXT NOT NULL DEFAULT '',
  -- Najmanji broj ide prvi.
  sort_order INT NOT NULL DEFAULT 0,
  -- false = slajd je sačuvan, ali se ne prikazuje na sajtu.
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.hero_slides IS
  'Slajdovi u zaglavlju početne strane, redom po sort_order. Svaki može da vodi na proizvod, liniju ili stranicu.';

CREATE INDEX IF NOT EXISTS idx_hero_slides_order
  ON public.hero_slides (sort_order, id);

ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read hero_slides" ON public.hero_slides;
CREATE POLICY "Public read hero_slides"
  ON public.hero_slides FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage hero_slides" ON public.hero_slides;
CREATE POLICY "Admins manage hero_slides"
  ON public.hero_slides FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- ── Postojeća hero slika postaje prvi slajd ──────────────────────

INSERT INTO public.hero_slides (image_url, link_url, sort_order)
SELECT s.hero_image_path, COALESCE(s.hero_link_url, ''), 1
FROM public.site_settings s
WHERE s.id = 1
  AND btrim(s.hero_image_path) <> ''
  AND NOT EXISTS (SELECT 1 FROM public.hero_slides);

UPDATE public.site_settings s
SET hero_image_path = '', hero_link_url = ''
WHERE s.id = 1
  AND btrim(s.hero_image_path) <> ''
  AND EXISTS (SELECT 1 FROM public.hero_slides h WHERE h.image_url = s.hero_image_path);

COMMIT;
