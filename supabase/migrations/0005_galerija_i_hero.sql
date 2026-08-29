-- ═══════════════════════════════════════════════════════════════════
-- Više slika po proizvodu + hero slika početne strane
--
-- Zašto: `products.image_path` drži samo jednu sliku, a klijent za jedan
-- gel ima fotografiju pakovanja, swatch i rad na noktima. Slike sada žive
-- u `product_images`, a `image_path` ostaje kao GLAVNA slika (prva po
-- redosledu) — trigger je održava, pa stari kod i kartice rade bez izmene.
--
-- Bezbedno je pokrenuti više puta.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Galerija proizvoda ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.product_images (
  id SERIAL PRIMARY KEY,
  product_slug TEXT NOT NULL
    REFERENCES public.products (slug) ON DELETE CASCADE ON UPDATE CASCADE,
  -- Javni URL iz bucket-a `product-images`.
  url TEXT NOT NULL CHECK (length(btrim(url)) > 0),
  -- Opis slike za čitače ekrana; prazno = koristi se naziv proizvoda.
  alt TEXT NOT NULL DEFAULT '',
  -- Najmanji broj je glavna slika proizvoda.
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_slug, url)
);

COMMENT ON TABLE public.product_images IS
  'Galerija proizvoda. Prva slika po sort_order je glavna i preslikava se u products.image_path.';

CREATE INDEX IF NOT EXISTS idx_product_images_product
  ON public.product_images (product_slug, sort_order, id);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read product_images" ON public.product_images;
CREATE POLICY "Public read product_images"
  ON public.product_images FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage product_images" ON public.product_images;
CREATE POLICY "Admins manage product_images"
  ON public.product_images FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- ── 2. products.image_path = prva slika iz galerije ──────────────
-- Isti obrazac kao `sync_product_base_price` iz 0002: kartice, Open Graph
-- i stara polja i dalje čitaju jedno polje, a admin uređuje galeriju.

CREATE OR REPLACE FUNCTION public.sync_product_main_image()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target TEXT := COALESCE(NEW.product_slug, OLD.product_slug);
BEGIN
  UPDATE public.products p
  SET image_path = COALESCE((
    SELECT i.url
    FROM public.product_images i
    WHERE i.product_slug = target
    ORDER BY i.sort_order, i.id
    LIMIT 1
  ), '')
  WHERE p.slug = target;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_main_image ON public.product_images;
CREATE TRIGGER trg_sync_product_main_image
  AFTER INSERT OR UPDATE OR DELETE ON public.product_images
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_main_image();

-- ── 3. Postojeće slike ulaze u galeriju ──────────────────────────

INSERT INTO public.product_images (product_slug, url, sort_order)
SELECT p.slug, p.image_path, 1
FROM public.products p
WHERE COALESCE(btrim(p.image_path), '') <> ''
ON CONFLICT (product_slug, url) DO NOTHING;

-- ── 4. Hero slika početne strane ─────────────────────────────────

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS hero_image_path TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.site_settings.hero_image_path IS
  'Velika slika u zaglavlju početne strane. Prazno = prikazuje se okvir sa preporučenom dimenzijom.';

COMMIT;
