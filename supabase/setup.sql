-- ═══════════════════════════════════════════════════════════════════
-- SORELLE — kompletna šema baze u jednom fajlu
--
-- GENERISANO: ne menjaj ovaj fajl ručno. Izvor su migracije u
-- supabase/migrations/; posle izmene pokreni `npm run sql:build`.
--
-- Kako se koristi: Supabase → SQL Editor → nalepi ceo sadržaj → Run.
-- Bezbedno je pokrenuti više puta: šema se dopunjuje, a cene, popusti,
-- slike i izbor „na sajtu"/„na početnoj" ostaju netaknuti.
--
-- Spojeni fajlovi:
--   0001_init.sql
--   0002_varijante_i_slike.sql
--   0003_sorelle_katalog.sql
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 0001_init.sql
-- ───────────────────────────────────────────────────────────────────

-- ════════════════════════════════════════════════════════════════
-- Kozmetika sajt — inicijalna šema.
-- Pokreni CEO fajl jednom u Supabase → SQL Editor.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Admini (1:1 sa auth.users) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read self" ON public.admins;
CREATE POLICY "Admins read self"
  ON public.admins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ── 2. Proizvodi ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  base_price_rsd NUMERIC(12, 2) NOT NULL CHECK (base_price_rsd >= 0),
  image_path TEXT NOT NULL DEFAULT '',
  volume TEXT NOT NULL DEFAULT '',
  -- NULL = koristi se globalni site_settings.site_discount_percent
  discount_percent NUMERIC(11, 8) NULL
    CHECK (discount_percent IS NULL OR (discount_percent >= 0 AND discount_percent <= 100)),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.products.discount_percent IS
  'Popust za ovaj proizvod u %. NULL = koristi site_settings.site_discount_percent.';

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read products" ON public.products;
CREATE POLICY "Public read products"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins update products" ON public.products;
CREATE POLICY "Admins update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins insert products" ON public.products;
CREATE POLICY "Admins insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- Katalog se ne puni ovde — proizvodi dolaze iz 0003_sorelle_katalog.sql,
-- koji je generisan iz klijentove tabele.

-- ── 3. Podešavanja sajta (jedan red) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0
    CHECK (site_discount_percent >= 0 AND site_discount_percent <= 100),
  bundle_discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 10
    CHECK (bundle_discount_percent >= 0 AND bundle_discount_percent <= 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read site_settings" ON public.site_settings;
CREATE POLICY "Public read site_settings"
  ON public.site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins update site_settings" ON public.site_settings;
CREATE POLICY "Admins update site_settings"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

INSERT INTO public.site_settings (id, site_discount_percent, bundle_discount_percent)
VALUES (1, 0, 10)
ON CONFLICT (id) DO NOTHING;

-- ── 4. Promo kodovi ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_percent NUMERIC(5, 2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON public.discount_codes (code);

COMMENT ON TABLE public.discount_codes IS 'Promo kodovi; `code` je uvek UPPERCASE. Validacija ide preko API-ja (service role).';

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- anon nema SELECT — kod se proverava isključivo preko /api/discount-code/validate
DROP POLICY IF EXISTS "Admins manage discount_codes" ON public.discount_codes;
CREATE POLICY "Admins manage discount_codes"
  ON public.discount_codes FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- ── 5. Porudžbine ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_first_name TEXT NOT NULL,
  customer_last_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  address_line TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  note TEXT,
  admin_notes TEXT,
  line_items JSONB NOT NULL,
  subtotal_rsd NUMERIC(12, 2),
  shipping_rsd NUMERIC(12, 2),
  discount_type TEXT,
  discount_percent NUMERIC(5, 2),
  promo_code TEXT,
  promo_discount_percent NUMERIC(5, 2),
  promo_discount_rsd NUMERIC(12, 2),
  total_rsd NUMERIC(12, 2) NOT NULL CHECK (total_rsd >= 0),
  status TEXT NOT NULL DEFAULT 'poruceno',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.orders.status IS
  'poruceno | kontaktiran | poslato | placeno | odbijeno — prati porudžbinu i pouzeće.';
COMMENT ON COLUMN public.orders.discount_type IS 'site | bundle | NULL';
COMMENT ON COLUMN public.orders.admin_notes IS 'Interne beleške admina; kupac ne vidi.';

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- INSERT ide isključivo preko API-ja sa service role ključem (nema anon INSERT politike).
DROP POLICY IF EXISTS "Admins read all orders" ON public.orders;
CREATE POLICY "Admins read all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins update orders" ON public.orders;
CREATE POLICY "Admins update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- ── 6. Pretraga porudžbina (cela baza, bez obzira na č/ć/š/đ i velika slova) ──
CREATE OR REPLACE FUNCTION public.normalize_search_text(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT translate(lower(coalesce(input, '')), 'čćžšđ', 'cczsd');
$$;

CREATE OR REPLACE FUNCTION public.search_admin_orders(
  p_query text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 200,
  p_offset integer DEFAULT 0
)
RETURNS SETOF public.orders
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text := trim(coalesce(p_query, ''));
  tokens text[];
BEGIN
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF q = '' THEN
    RETURN QUERY
    SELECT o.*
    FROM public.orders o
    WHERE (
      p_status IS NULL
      OR trim(p_status) = ''
      OR lower(trim(p_status)) = 'all'
      OR o.status = p_status
    )
    ORDER BY o.created_at DESC
    LIMIT greatest(1, least(p_limit, 500))
    OFFSET greatest(0, p_offset);
    RETURN;
  END IF;

  tokens := array_remove(
    regexp_split_to_array(public.normalize_search_text(q), '\s+'),
    ''
  );

  RETURN QUERY
  SELECT o.*
  FROM public.orders o
  WHERE (
    p_status IS NULL
    OR trim(p_status) = ''
    OR lower(trim(p_status)) = 'all'
    OR o.status = p_status
  )
  AND (
    SELECT bool_and(
      public.normalize_search_text(
        coalesce(o.customer_first_name, '') || ' ' ||
        coalesce(o.customer_last_name, '') || ' ' ||
        coalesce(o.customer_email, '') || ' ' ||
        coalesce(o.customer_phone, '') || ' ' ||
        o.total_rsd::text || ' ' ||
        coalesce(o.address_line, '') || ' ' ||
        coalesce(o.city, '') || ' ' ||
        coalesce(o.postal_code, '') || ' ' ||
        coalesce(o.promo_code, '') || ' ' ||
        coalesce(o.line_items::text, '')
      ) LIKE '%' || public.normalize_search_text(t) || '%'
    )
    FROM unnest(tokens) AS t
  )
  ORDER BY o.created_at DESC
  LIMIT greatest(1, least(p_limit, 500))
  OFFSET greatest(0, p_offset);
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_search_text(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_admin_orders(text, text, integer, integer) TO authenticated, service_role;

COMMENT ON FUNCTION public.search_admin_orders IS
  'Pretraga po imenu, prezimenu, mejlu, telefonu, iznosu, adresi, gradu, poštanskom broju, promo kodu i stavkama.';

-- ── 7. Prvi admin ────────────────────────────────────────────────
-- 1) Authentication → Users → Add user (email + lozinka)
-- 2) Kopiraj UUID korisnika i pokreni:
-- INSERT INTO public.admins (user_id) VALUES ('UUID_ADMINA'::uuid);

-- ───────────────────────────────────────────────────────────────────
-- 0002_varijante_i_slike.sql
-- ───────────────────────────────────────────────────────────────────

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

-- ───────────────────────────────────────────────────────────────────
-- 0003_sorelle_katalog.sql
-- ───────────────────────────────────────────────────────────────────

-- SORELLE katalog — 46 proizvoda i 117 varijanti pakovanja.
-- Generisano iz tabele „SORELLE_proizvodi_za_sajt_NOVA_TABELA" (list „Proizvodi za sajt").
--
-- Bezbedno je pokrenuti više puta: naziv, pakovanje i redosled se osvežavaju,
-- a CENE, POPUSTI, SLIKE i „na sajtu" se NE diraju — to su podaci iz admin panela.

BEGIN;

-- Placeholder katalog iz demo verzije sajta više ne postoji.
DELETE FROM public.products
WHERE slug IN ('hidratantna-krema', 'nocna-krema', 'serum-za-lice', 'micelarna-voda');

INSERT INTO public.products (slug, name, base_price_rsd, image_path, volume, sort_order, is_active)
VALUES
  ('pro-fiber-naked-skin', 'Pro Fiber Builder Gel — Naked Skin', 0, '', '10 g / 30 g / 50 g', 1, true),
  ('pro-fiber-silky-blush', 'Pro Fiber Builder Gel — Silky Blush', 0, '', '10 g / 30 g / 50 g', 2, true),
  ('pro-fiber-natural-harmony', 'Pro Fiber Builder Gel — Natural Harmony', 0, '', '10 g / 30 g / 50 g', 3, true),
  ('pro-fiber-cosmopolitan-pink', 'Pro Fiber Builder Gel — Cosmopolitan Pink', 0, '', '10 g / 30 g / 50 g', 4, true),
  ('pro-fiber-perfect-milky-white', 'Pro Fiber Builder Gel — Perfect Milky White', 0, '', '10 g / 30 g / 50 g', 5, true),
  ('pro-fiber-creamy-latte', 'Pro Fiber Builder Gel — Creamy Latte', 0, '', '10 g / 30 g / 50 g', 6, true),
  ('pro-fiber-angel-pink', 'Pro Fiber Builder Gel — Angel Pink', 0, '', '10 g / 30 g / 50 g', 7, true),
  ('pro-fiber-soft-milky-white', 'Pro Fiber Builder Gel — Soft Milky White', 0, '', '10 g / 30 g / 50 g', 8, true),
  ('fluid-perfect-cool-milky-white', 'Fluid Perfect Builder Gel — Cool Milky White', 0, '', '10 g / 30 g / 50 g', 9, true),
  ('fluid-perfect-crystal-ice-pink', 'Fluid Perfect Builder Gel — Crystal Ice Pink', 0, '', '10 g / 30 g / 50 g', 10, true),
  ('fluid-perfect-pink-sensational', 'Fluid Perfect Builder Gel — Pink Sensational', 0, '', '10 g / 30 g / 50 g', 11, true),
  ('fluid-perfect-cashmere-rose', 'Fluid Perfect Builder Gel — Cashmere Rose', 0, '', '10 g / 30 g / 50 g', 12, true),
  ('fluid-perfect-rich-worm-nude', 'Fluid Perfect Builder Gel — Rich Worm Nude', 0, '', '10 g / 30 g / 50 g', 13, true),
  ('fluid-perfect-rich-deep-nude', 'Fluid Perfect Builder Gel — Rich Deep Nude', 0, '', '10 g / 30 g / 50 g', 14, true),
  ('fluid-perfect-rich-cold-nude', 'Fluid Perfect Builder Gel — Rich Cold Nude', 0, '', '10 g / 30 g / 50 g', 15, true),
  ('fluid-perfect-clear', 'Fluid Perfect Builder Gel — Clear', 0, '', '10 g / 30 g / 50 g', 16, true),
  ('fluid-perfect-jogurt-banana', 'Fluid Perfect Builder Gel — Jogurt Banana', 0, '', '10 g / 30 g / 50 g', 17, true),
  ('fluid-perfect-jogurt-lavander-milk', 'Fluid Perfect Builder Gel — Jogurt Lavander Milk', 0, '', '10 g / 30 g / 50 g', 18, true),
  ('fluid-perfect-jogurt-blue-raspberry', 'Fluid Perfect Builder Gel — Jogurt Blue Raspberry', 0, '', '10 g / 30 g / 50 g', 19, true),
  ('fluid-perfect-jogurt-fresh-mint', 'Fluid Perfect Builder Gel — Jogurt Fresh Mint', 0, '', '10 g / 30 g / 50 g', 20, true),
  ('fluid-perfect-natural-perfection', 'Fluid Perfect Builder Gel — Natural Perfection', 0, '', '10 g / 30 g / 50 g', 21, true),
  ('fluid-perfect-royal-beige', 'Fluid Perfect Builder Gel — Royal Beige', 0, '', '10 g / 30 g / 50 g', 22, true),
  ('fluid-perfect-jogurt-melon-cream', 'Fluid Perfect Builder Gel — Jogurt Melon Cream', 0, '', '10 g / 30 g / 50 g', 23, true),
  ('fluid-perfect-jogurt-ice-berry-milk', 'Fluid Perfect Builder Gel — Jogurt Ice Berry Milk', 0, '', '10 g / 30 g / 50 g', 24, true),
  ('fluid-perfect-jogurt-sweet-strawberry', 'Fluid Perfect Builder Gel — Jogurt Sweet Strawberry', 0, '', '10 g / 30 g / 50 g', 25, true),
  ('rubber-base-cool-milky-white', 'Rubber Base Camouflage — Cool Milky White', 0, '', '10 ml / 15 ml', 26, true),
  ('rubber-base-crystal-ice-pink', 'Rubber Base Camouflage — Crystal Ice Pink', 0, '', '10 ml / 15 ml', 27, true),
  ('rubber-base-pink-sensational', 'Rubber Base Camouflage — Pink Sensational', 0, '', '10 ml / 15 ml', 28, true),
  ('rubber-base-cashmere-rose', 'Rubber Base Camouflage — Cashmere Rose', 0, '', '10 ml / 15 ml', 29, true),
  ('rubber-base-rich-worm-nude', 'Rubber Base Camouflage — Rich Worm Nude', 0, '', '10 ml / 15 ml', 30, true),
  ('rubber-base-rich-deep-nude', 'Rubber Base Camouflage — Rich Deep Nude', 0, '', '10 ml / 15 ml', 31, true),
  ('rubber-base-rich-cold-nude', 'Rubber Base Camouflage — Rich Cold Nude', 0, '', '10 ml / 15 ml', 32, true),
  ('rubber-base-clear', 'Rubber Base Camouflage — Clear', 0, '', '10 ml / 15 ml', 33, true),
  ('rubber-base-jogurt-banana', 'Rubber Base Camouflage — Jogurt Banana', 0, '', '10 ml / 15 ml', 34, true),
  ('rubber-base-jogurt-lavander-milk', 'Rubber Base Camouflage — Jogurt Lavander Milk', 0, '', '10 ml / 15 ml', 35, true),
  ('rubber-base-jogurt-blue-raspberry', 'Rubber Base Camouflage — Jogurt Blue Raspberry', 0, '', '10 ml / 15 ml', 36, true),
  ('rubber-base-jogurt-fresh-mint', 'Rubber Base Camouflage — Jogurt Fresh Mint', 0, '', '10 ml / 15 ml', 37, true),
  ('rubber-base-natural-perfection', 'Rubber Base Camouflage — Natural Perfection', 0, '', '10 ml / 15 ml', 38, true),
  ('rubber-base-royal-beige', 'Rubber Base Camouflage — Royal Beige', 0, '', '10 ml / 15 ml', 39, true),
  ('rubber-base-jogurt-melon-cream', 'Rubber Base Camouflage — Jogurt Melon Cream', 0, '', '10 ml / 15 ml', 40, true),
  ('rubber-base-jogurt-ice-berry-milk', 'Rubber Base Camouflage — Jogurt Ice Berry Milk', 0, '', '10 ml / 15 ml', 41, true),
  ('rubber-base-jogurt-sweet-strawberry', 'Rubber Base Camouflage — Jogurt Sweet Strawberry', 0, '', '10 ml / 15 ml', 42, true),
  ('pro-base-clear', 'Pro Base Clear', 0, '', '10 ml / 15 ml', 43, true),
  ('super-shine-top-coat', 'Super Shine Top Coat', 0, '', '10 ml / 15 ml', 44, true),
  ('effect-top-coat-milky', 'Effect Top Coat Milky', 0, '', '10 ml / 15 ml', 45, true),
  ('effect-top-coat-shimmer-vibe', 'Effect Top Coat Shimmer Vibe', 0, '', '10 ml / 15 ml', 46, true)
ON CONFLICT (slug) DO UPDATE SET
  name       = EXCLUDED.name,
  volume     = EXCLUDED.volume,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.product_variants (product_slug, variant_slug, package_label, sort_order)
VALUES
  ('pro-fiber-naked-skin', 'pro-fiber-naked-skin--10g', '10 g', 1),
  ('pro-fiber-naked-skin', 'pro-fiber-naked-skin--30g', '30 g', 2),
  ('pro-fiber-naked-skin', 'pro-fiber-naked-skin--50g', '50 g', 3),
  ('pro-fiber-silky-blush', 'pro-fiber-silky-blush--10g', '10 g', 1),
  ('pro-fiber-silky-blush', 'pro-fiber-silky-blush--30g', '30 g', 2),
  ('pro-fiber-silky-blush', 'pro-fiber-silky-blush--50g', '50 g', 3),
  ('pro-fiber-natural-harmony', 'pro-fiber-natural-harmony--10g', '10 g', 1),
  ('pro-fiber-natural-harmony', 'pro-fiber-natural-harmony--30g', '30 g', 2),
  ('pro-fiber-natural-harmony', 'pro-fiber-natural-harmony--50g', '50 g', 3),
  ('pro-fiber-cosmopolitan-pink', 'pro-fiber-cosmopolitan-pink--10g', '10 g', 1),
  ('pro-fiber-cosmopolitan-pink', 'pro-fiber-cosmopolitan-pink--30g', '30 g', 2),
  ('pro-fiber-cosmopolitan-pink', 'pro-fiber-cosmopolitan-pink--50g', '50 g', 3),
  ('pro-fiber-perfect-milky-white', 'pro-fiber-perfect-milky-white--10g', '10 g', 1),
  ('pro-fiber-perfect-milky-white', 'pro-fiber-perfect-milky-white--30g', '30 g', 2),
  ('pro-fiber-perfect-milky-white', 'pro-fiber-perfect-milky-white--50g', '50 g', 3),
  ('pro-fiber-creamy-latte', 'pro-fiber-creamy-latte--10g', '10 g', 1),
  ('pro-fiber-creamy-latte', 'pro-fiber-creamy-latte--30g', '30 g', 2),
  ('pro-fiber-creamy-latte', 'pro-fiber-creamy-latte--50g', '50 g', 3),
  ('pro-fiber-angel-pink', 'pro-fiber-angel-pink--10g', '10 g', 1),
  ('pro-fiber-angel-pink', 'pro-fiber-angel-pink--30g', '30 g', 2),
  ('pro-fiber-angel-pink', 'pro-fiber-angel-pink--50g', '50 g', 3),
  ('pro-fiber-soft-milky-white', 'pro-fiber-soft-milky-white--10g', '10 g', 1),
  ('pro-fiber-soft-milky-white', 'pro-fiber-soft-milky-white--30g', '30 g', 2),
  ('pro-fiber-soft-milky-white', 'pro-fiber-soft-milky-white--50g', '50 g', 3),
  ('fluid-perfect-cool-milky-white', 'fluid-perfect-cool-milky-white--10g', '10 g', 1),
  ('fluid-perfect-cool-milky-white', 'fluid-perfect-cool-milky-white--30g', '30 g', 2),
  ('fluid-perfect-cool-milky-white', 'fluid-perfect-cool-milky-white--50g', '50 g', 3),
  ('fluid-perfect-crystal-ice-pink', 'fluid-perfect-crystal-ice-pink--10g', '10 g', 1),
  ('fluid-perfect-crystal-ice-pink', 'fluid-perfect-crystal-ice-pink--30g', '30 g', 2),
  ('fluid-perfect-crystal-ice-pink', 'fluid-perfect-crystal-ice-pink--50g', '50 g', 3),
  ('fluid-perfect-pink-sensational', 'fluid-perfect-pink-sensational--10g', '10 g', 1),
  ('fluid-perfect-pink-sensational', 'fluid-perfect-pink-sensational--30g', '30 g', 2),
  ('fluid-perfect-pink-sensational', 'fluid-perfect-pink-sensational--50g', '50 g', 3),
  ('fluid-perfect-cashmere-rose', 'fluid-perfect-cashmere-rose--10g', '10 g', 1),
  ('fluid-perfect-cashmere-rose', 'fluid-perfect-cashmere-rose--30g', '30 g', 2),
  ('fluid-perfect-cashmere-rose', 'fluid-perfect-cashmere-rose--50g', '50 g', 3),
  ('fluid-perfect-rich-worm-nude', 'fluid-perfect-rich-worm-nude--10g', '10 g', 1),
  ('fluid-perfect-rich-worm-nude', 'fluid-perfect-rich-worm-nude--30g', '30 g', 2),
  ('fluid-perfect-rich-worm-nude', 'fluid-perfect-rich-worm-nude--50g', '50 g', 3),
  ('fluid-perfect-rich-deep-nude', 'fluid-perfect-rich-deep-nude--10g', '10 g', 1),
  ('fluid-perfect-rich-deep-nude', 'fluid-perfect-rich-deep-nude--30g', '30 g', 2),
  ('fluid-perfect-rich-deep-nude', 'fluid-perfect-rich-deep-nude--50g', '50 g', 3),
  ('fluid-perfect-rich-cold-nude', 'fluid-perfect-rich-cold-nude--10g', '10 g', 1),
  ('fluid-perfect-rich-cold-nude', 'fluid-perfect-rich-cold-nude--30g', '30 g', 2),
  ('fluid-perfect-rich-cold-nude', 'fluid-perfect-rich-cold-nude--50g', '50 g', 3),
  ('fluid-perfect-clear', 'fluid-perfect-clear--10g', '10 g', 1),
  ('fluid-perfect-clear', 'fluid-perfect-clear--30g', '30 g', 2),
  ('fluid-perfect-clear', 'fluid-perfect-clear--50g', '50 g', 3),
  ('fluid-perfect-jogurt-banana', 'fluid-perfect-jogurt-banana--10g', '10 g', 1),
  ('fluid-perfect-jogurt-banana', 'fluid-perfect-jogurt-banana--30g', '30 g', 2),
  ('fluid-perfect-jogurt-banana', 'fluid-perfect-jogurt-banana--50g', '50 g', 3),
  ('fluid-perfect-jogurt-lavander-milk', 'fluid-perfect-jogurt-lavander-milk--10g', '10 g', 1),
  ('fluid-perfect-jogurt-lavander-milk', 'fluid-perfect-jogurt-lavander-milk--30g', '30 g', 2),
  ('fluid-perfect-jogurt-lavander-milk', 'fluid-perfect-jogurt-lavander-milk--50g', '50 g', 3),
  ('fluid-perfect-jogurt-blue-raspberry', 'fluid-perfect-jogurt-blue-raspberry--10g', '10 g', 1),
  ('fluid-perfect-jogurt-blue-raspberry', 'fluid-perfect-jogurt-blue-raspberry--30g', '30 g', 2),
  ('fluid-perfect-jogurt-blue-raspberry', 'fluid-perfect-jogurt-blue-raspberry--50g', '50 g', 3),
  ('fluid-perfect-jogurt-fresh-mint', 'fluid-perfect-jogurt-fresh-mint--10g', '10 g', 1),
  ('fluid-perfect-jogurt-fresh-mint', 'fluid-perfect-jogurt-fresh-mint--30g', '30 g', 2),
  ('fluid-perfect-jogurt-fresh-mint', 'fluid-perfect-jogurt-fresh-mint--50g', '50 g', 3),
  ('fluid-perfect-natural-perfection', 'fluid-perfect-natural-perfection--10g', '10 g', 1),
  ('fluid-perfect-natural-perfection', 'fluid-perfect-natural-perfection--30g', '30 g', 2),
  ('fluid-perfect-natural-perfection', 'fluid-perfect-natural-perfection--50g', '50 g', 3),
  ('fluid-perfect-royal-beige', 'fluid-perfect-royal-beige--10g', '10 g', 1),
  ('fluid-perfect-royal-beige', 'fluid-perfect-royal-beige--30g', '30 g', 2),
  ('fluid-perfect-royal-beige', 'fluid-perfect-royal-beige--50g', '50 g', 3),
  ('fluid-perfect-jogurt-melon-cream', 'fluid-perfect-jogurt-melon-cream--10g', '10 g', 1),
  ('fluid-perfect-jogurt-melon-cream', 'fluid-perfect-jogurt-melon-cream--30g', '30 g', 2),
  ('fluid-perfect-jogurt-melon-cream', 'fluid-perfect-jogurt-melon-cream--50g', '50 g', 3),
  ('fluid-perfect-jogurt-ice-berry-milk', 'fluid-perfect-jogurt-ice-berry-milk--10g', '10 g', 1),
  ('fluid-perfect-jogurt-ice-berry-milk', 'fluid-perfect-jogurt-ice-berry-milk--30g', '30 g', 2),
  ('fluid-perfect-jogurt-ice-berry-milk', 'fluid-perfect-jogurt-ice-berry-milk--50g', '50 g', 3),
  ('fluid-perfect-jogurt-sweet-strawberry', 'fluid-perfect-jogurt-sweet-strawberry--10g', '10 g', 1),
  ('fluid-perfect-jogurt-sweet-strawberry', 'fluid-perfect-jogurt-sweet-strawberry--30g', '30 g', 2),
  ('fluid-perfect-jogurt-sweet-strawberry', 'fluid-perfect-jogurt-sweet-strawberry--50g', '50 g', 3),
  ('rubber-base-cool-milky-white', 'rubber-base-cool-milky-white--10ml', '10 ml', 1),
  ('rubber-base-cool-milky-white', 'rubber-base-cool-milky-white--15ml', '15 ml', 2),
  ('rubber-base-crystal-ice-pink', 'rubber-base-crystal-ice-pink--10ml', '10 ml', 1),
  ('rubber-base-crystal-ice-pink', 'rubber-base-crystal-ice-pink--15ml', '15 ml', 2),
  ('rubber-base-pink-sensational', 'rubber-base-pink-sensational--10ml', '10 ml', 1),
  ('rubber-base-pink-sensational', 'rubber-base-pink-sensational--15ml', '15 ml', 2),
  ('rubber-base-cashmere-rose', 'rubber-base-cashmere-rose--10ml', '10 ml', 1),
  ('rubber-base-cashmere-rose', 'rubber-base-cashmere-rose--15ml', '15 ml', 2),
  ('rubber-base-rich-worm-nude', 'rubber-base-rich-worm-nude--10ml', '10 ml', 1),
  ('rubber-base-rich-worm-nude', 'rubber-base-rich-worm-nude--15ml', '15 ml', 2),
  ('rubber-base-rich-deep-nude', 'rubber-base-rich-deep-nude--10ml', '10 ml', 1),
  ('rubber-base-rich-deep-nude', 'rubber-base-rich-deep-nude--15ml', '15 ml', 2),
  ('rubber-base-rich-cold-nude', 'rubber-base-rich-cold-nude--10ml', '10 ml', 1),
  ('rubber-base-rich-cold-nude', 'rubber-base-rich-cold-nude--15ml', '15 ml', 2),
  ('rubber-base-clear', 'rubber-base-clear--10ml', '10 ml', 1),
  ('rubber-base-clear', 'rubber-base-clear--15ml', '15 ml', 2),
  ('rubber-base-jogurt-banana', 'rubber-base-jogurt-banana--10ml', '10 ml', 1),
  ('rubber-base-jogurt-banana', 'rubber-base-jogurt-banana--15ml', '15 ml', 2),
  ('rubber-base-jogurt-lavander-milk', 'rubber-base-jogurt-lavander-milk--10ml', '10 ml', 1),
  ('rubber-base-jogurt-lavander-milk', 'rubber-base-jogurt-lavander-milk--15ml', '15 ml', 2),
  ('rubber-base-jogurt-blue-raspberry', 'rubber-base-jogurt-blue-raspberry--10ml', '10 ml', 1),
  ('rubber-base-jogurt-blue-raspberry', 'rubber-base-jogurt-blue-raspberry--15ml', '15 ml', 2),
  ('rubber-base-jogurt-fresh-mint', 'rubber-base-jogurt-fresh-mint--10ml', '10 ml', 1),
  ('rubber-base-jogurt-fresh-mint', 'rubber-base-jogurt-fresh-mint--15ml', '15 ml', 2),
  ('rubber-base-natural-perfection', 'rubber-base-natural-perfection--10ml', '10 ml', 1),
  ('rubber-base-natural-perfection', 'rubber-base-natural-perfection--15ml', '15 ml', 2),
  ('rubber-base-royal-beige', 'rubber-base-royal-beige--10ml', '10 ml', 1),
  ('rubber-base-royal-beige', 'rubber-base-royal-beige--15ml', '15 ml', 2),
  ('rubber-base-jogurt-melon-cream', 'rubber-base-jogurt-melon-cream--10ml', '10 ml', 1),
  ('rubber-base-jogurt-melon-cream', 'rubber-base-jogurt-melon-cream--15ml', '15 ml', 2),
  ('rubber-base-jogurt-ice-berry-milk', 'rubber-base-jogurt-ice-berry-milk--10ml', '10 ml', 1),
  ('rubber-base-jogurt-ice-berry-milk', 'rubber-base-jogurt-ice-berry-milk--15ml', '15 ml', 2),
  ('rubber-base-jogurt-sweet-strawberry', 'rubber-base-jogurt-sweet-strawberry--10ml', '10 ml', 1),
  ('rubber-base-jogurt-sweet-strawberry', 'rubber-base-jogurt-sweet-strawberry--15ml', '15 ml', 2),
  ('pro-base-clear', 'pro-base-clear--10ml', '10 ml', 1),
  ('pro-base-clear', 'pro-base-clear--15ml', '15 ml', 2),
  ('super-shine-top-coat', 'super-shine-top-coat--10ml', '10 ml', 1),
  ('super-shine-top-coat', 'super-shine-top-coat--15ml', '15 ml', 2),
  ('effect-top-coat-milky', 'effect-top-coat-milky--10ml', '10 ml', 1),
  ('effect-top-coat-milky', 'effect-top-coat-milky--15ml', '15 ml', 2),
  ('effect-top-coat-shimmer-vibe', 'effect-top-coat-shimmer-vibe--10ml', '10 ml', 1),
  ('effect-top-coat-shimmer-vibe', 'effect-top-coat-shimmer-vibe--15ml', '15 ml', 2)
ON CONFLICT (variant_slug) DO UPDATE SET
  product_slug  = EXCLUDED.product_slug,
  package_label = EXCLUDED.package_label,
  sort_order    = EXCLUDED.sort_order;

-- Varijante koje su nekad postojale a više nisu u tabeli.
DELETE FROM public.product_variants v
WHERE v.variant_slug NOT IN (
  'pro-fiber-naked-skin--10g',
  'pro-fiber-naked-skin--30g',
  'pro-fiber-naked-skin--50g',
  'pro-fiber-silky-blush--10g',
  'pro-fiber-silky-blush--30g',
  'pro-fiber-silky-blush--50g',
  'pro-fiber-natural-harmony--10g',
  'pro-fiber-natural-harmony--30g',
  'pro-fiber-natural-harmony--50g',
  'pro-fiber-cosmopolitan-pink--10g',
  'pro-fiber-cosmopolitan-pink--30g',
  'pro-fiber-cosmopolitan-pink--50g',
  'pro-fiber-perfect-milky-white--10g',
  'pro-fiber-perfect-milky-white--30g',
  'pro-fiber-perfect-milky-white--50g',
  'pro-fiber-creamy-latte--10g',
  'pro-fiber-creamy-latte--30g',
  'pro-fiber-creamy-latte--50g',
  'pro-fiber-angel-pink--10g',
  'pro-fiber-angel-pink--30g',
  'pro-fiber-angel-pink--50g',
  'pro-fiber-soft-milky-white--10g',
  'pro-fiber-soft-milky-white--30g',
  'pro-fiber-soft-milky-white--50g',
  'fluid-perfect-cool-milky-white--10g',
  'fluid-perfect-cool-milky-white--30g',
  'fluid-perfect-cool-milky-white--50g',
  'fluid-perfect-crystal-ice-pink--10g',
  'fluid-perfect-crystal-ice-pink--30g',
  'fluid-perfect-crystal-ice-pink--50g',
  'fluid-perfect-pink-sensational--10g',
  'fluid-perfect-pink-sensational--30g',
  'fluid-perfect-pink-sensational--50g',
  'fluid-perfect-cashmere-rose--10g',
  'fluid-perfect-cashmere-rose--30g',
  'fluid-perfect-cashmere-rose--50g',
  'fluid-perfect-rich-worm-nude--10g',
  'fluid-perfect-rich-worm-nude--30g',
  'fluid-perfect-rich-worm-nude--50g',
  'fluid-perfect-rich-deep-nude--10g',
  'fluid-perfect-rich-deep-nude--30g',
  'fluid-perfect-rich-deep-nude--50g',
  'fluid-perfect-rich-cold-nude--10g',
  'fluid-perfect-rich-cold-nude--30g',
  'fluid-perfect-rich-cold-nude--50g',
  'fluid-perfect-clear--10g',
  'fluid-perfect-clear--30g',
  'fluid-perfect-clear--50g',
  'fluid-perfect-jogurt-banana--10g',
  'fluid-perfect-jogurt-banana--30g',
  'fluid-perfect-jogurt-banana--50g',
  'fluid-perfect-jogurt-lavander-milk--10g',
  'fluid-perfect-jogurt-lavander-milk--30g',
  'fluid-perfect-jogurt-lavander-milk--50g',
  'fluid-perfect-jogurt-blue-raspberry--10g',
  'fluid-perfect-jogurt-blue-raspberry--30g',
  'fluid-perfect-jogurt-blue-raspberry--50g',
  'fluid-perfect-jogurt-fresh-mint--10g',
  'fluid-perfect-jogurt-fresh-mint--30g',
  'fluid-perfect-jogurt-fresh-mint--50g',
  'fluid-perfect-natural-perfection--10g',
  'fluid-perfect-natural-perfection--30g',
  'fluid-perfect-natural-perfection--50g',
  'fluid-perfect-royal-beige--10g',
  'fluid-perfect-royal-beige--30g',
  'fluid-perfect-royal-beige--50g',
  'fluid-perfect-jogurt-melon-cream--10g',
  'fluid-perfect-jogurt-melon-cream--30g',
  'fluid-perfect-jogurt-melon-cream--50g',
  'fluid-perfect-jogurt-ice-berry-milk--10g',
  'fluid-perfect-jogurt-ice-berry-milk--30g',
  'fluid-perfect-jogurt-ice-berry-milk--50g',
  'fluid-perfect-jogurt-sweet-strawberry--10g',
  'fluid-perfect-jogurt-sweet-strawberry--30g',
  'fluid-perfect-jogurt-sweet-strawberry--50g',
  'rubber-base-cool-milky-white--10ml',
  'rubber-base-cool-milky-white--15ml',
  'rubber-base-crystal-ice-pink--10ml',
  'rubber-base-crystal-ice-pink--15ml',
  'rubber-base-pink-sensational--10ml',
  'rubber-base-pink-sensational--15ml',
  'rubber-base-cashmere-rose--10ml',
  'rubber-base-cashmere-rose--15ml',
  'rubber-base-rich-worm-nude--10ml',
  'rubber-base-rich-worm-nude--15ml',
  'rubber-base-rich-deep-nude--10ml',
  'rubber-base-rich-deep-nude--15ml',
  'rubber-base-rich-cold-nude--10ml',
  'rubber-base-rich-cold-nude--15ml',
  'rubber-base-clear--10ml',
  'rubber-base-clear--15ml',
  'rubber-base-jogurt-banana--10ml',
  'rubber-base-jogurt-banana--15ml',
  'rubber-base-jogurt-lavander-milk--10ml',
  'rubber-base-jogurt-lavander-milk--15ml',
  'rubber-base-jogurt-blue-raspberry--10ml',
  'rubber-base-jogurt-blue-raspberry--15ml',
  'rubber-base-jogurt-fresh-mint--10ml',
  'rubber-base-jogurt-fresh-mint--15ml',
  'rubber-base-natural-perfection--10ml',
  'rubber-base-natural-perfection--15ml',
  'rubber-base-royal-beige--10ml',
  'rubber-base-royal-beige--15ml',
  'rubber-base-jogurt-melon-cream--10ml',
  'rubber-base-jogurt-melon-cream--15ml',
  'rubber-base-jogurt-ice-berry-milk--10ml',
  'rubber-base-jogurt-ice-berry-milk--15ml',
  'rubber-base-jogurt-sweet-strawberry--10ml',
  'rubber-base-jogurt-sweet-strawberry--15ml',
  'pro-base-clear--10ml',
  'pro-base-clear--15ml',
  'super-shine-top-coat--10ml',
  'super-shine-top-coat--15ml',
  'effect-top-coat-milky--10ml',
  'effect-top-coat-milky--15ml',
  'effect-top-coat-shimmer-vibe--10ml',
  'effect-top-coat-shimmer-vibe--15ml'
);

COMMIT;
