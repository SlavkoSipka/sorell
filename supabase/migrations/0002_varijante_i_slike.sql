-- ═══════════════════════════════════════════════════════════════════
-- Varijante pakovanja + slike proizvoda iz admin panela
--
-- Zašto: jedan proizvod (npr. „Pro Fiber Builder Gel — Naked Skin") prodaje se
-- u više pakovanja (10 g / 30 g / 50 g), i svako pakovanje ima svoju cenu.
-- Tabela `products` ima samo jednu cenu, pa cene selimo u `product_variants`.
-- Pakovanja se NE računaju kao posebni proizvodi — u adminu i dalje vidiš 46
-- proizvoda, svaki sa svojim poljima za cenu po pakovanju.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. products: redosled, izdvajanje na početnu i slika ─────────

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

-- „Izdvojeno iz ponude" na početnoj strani — bira se iz admin panela.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.products.is_featured IS
  'true = proizvod se prikazuje u sekciji „Izdvojeno iz ponude" na početnoj strani.';

CREATE INDEX IF NOT EXISTS idx_products_sort_order ON public.products (sort_order);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products (is_featured) WHERE is_featured;

-- `base_price_rsd` više nije izvor istine za naplatu — održava ga trigger
-- ispod kao najnižu cenu među varijantama („od X RSD"). Ostaje da stari
-- kod i eventualni izveštaji ne pucaju.
ALTER TABLE public.products ALTER COLUMN base_price_rsd SET DEFAULT 0;

COMMENT ON COLUMN public.products.base_price_rsd IS
  'IZVEDENO: najniža cena među aktivnim varijantama (trigger). Naplata ide po product_variants.price_rsd.';

COMMENT ON COLUMN public.products.image_path IS
  'Slika proizvoda. Puni URL iz Supabase Storage-a (bucket product-images) ili putanja u /public. Prazno = privremena slika iz koda.';

COMMENT ON COLUMN public.products.volume IS
  'Sva pakovanja u jednom stringu za prikaz, npr. „10 g / 30 g / 50 g".';

-- ── 2. product_variants ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.product_variants (
  id SERIAL PRIMARY KEY,
  product_slug TEXT NOT NULL
    REFERENCES public.products (slug) ON DELETE CASCADE ON UPDATE CASCADE,
  -- Ključ koji ide u korpu i u `orders.line_items`: `<slug proizvoda>--<oznaka pakovanja>`.
  variant_slug TEXT UNIQUE NOT NULL,
  -- Kako pakovanje piše na sajtu: „10 g", „30 g", „15 ml".
  package_label TEXT NOT NULL,
  -- NULL = cena još nije uneta; proizvod se tada ne može poručiti.
  price_rsd NUMERIC(12, 2) NULL CHECK (price_rsd IS NULL OR price_rsd >= 0),
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_slug, package_label)
);

COMMENT ON TABLE public.product_variants IS
  'Pakovanja proizvoda sa cenom po pakovanju. Izvor istine za naplatu.';
COMMENT ON COLUMN public.product_variants.price_rsd IS
  'NULL = cena nije uneta. Sajt tada prikazuje „Cena uskoro", a /api/orders odbija tu stavku.';

CREATE INDEX IF NOT EXISTS idx_product_variants_product
  ON public.product_variants (product_slug, sort_order);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read product_variants" ON public.product_variants;
CREATE POLICY "Public read product_variants"
  ON public.product_variants FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage product_variants" ON public.product_variants;
CREATE POLICY "Admins manage product_variants"
  ON public.product_variants FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- ── 3. products.base_price_rsd = MIN(cena varijante) ─────────────

CREATE OR REPLACE FUNCTION public.sync_product_base_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target TEXT := COALESCE(NEW.product_slug, OLD.product_slug);
BEGIN
  UPDATE public.products p
  SET base_price_rsd = COALESCE((
    SELECT MIN(v.price_rsd)
    FROM public.product_variants v
    WHERE v.product_slug = target AND v.is_active AND v.price_rsd IS NOT NULL
  ), 0)
  WHERE p.slug = target;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_base_price ON public.product_variants;
CREATE TRIGGER trg_sync_product_base_price
  AFTER INSERT OR UPDATE OR DELETE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_base_price();

-- Dozvola da admin menja cene varijanti bez direktnog UPDATE-a nad `products`
-- (trigger radi kao SECURITY DEFINER, pa mu RLS nad `products` ne smeta).

-- ── 4. Slike proizvoda: Storage bucket ───────────────────────────
-- Admin panel diže sliku u ovaj bucket i upisuje javni URL u products.image_path.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,                                  -- 5 MB po slici
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admins write product images" ON storage.objects;
CREATE POLICY "Admins write product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins update product images" ON storage.objects;
CREATE POLICY "Admins update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins delete product images" ON storage.objects;
CREATE POLICY "Admins delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid())
  );
