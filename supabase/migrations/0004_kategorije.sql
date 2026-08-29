-- ═══════════════════════════════════════════════════════════════════
-- Kategorije (linije) proizvoda kao podatak iz admin panela
--
-- Zašto: do sada je linija bila zakucana u `lib/data/products.ts`, pa se
-- proizvod nije mogao premestiti iz jedne linije u drugu bez izmene koda.
-- Sada je kategorija red u bazi, a `products.category_slug` kaže kojoj
-- proizvod pripada. Admin panel dodaje, preimenuje i briše kategorije i
-- prevlači proizvode između njih.
--
-- Bezbedno je pokrenuti više puta: postojeće kategorije se osvežavaju po
-- nazivu i redosledu, a RASPORED proizvoda se postavlja samo onima koji
-- još nemaju kategoriju — tako izmene iz admina ostaju netaknute.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Tabela kategorija ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.categories (
  id SERIAL PRIMARY KEY,
  -- Ide u URL i u sidro na /proizvodi (#builder-gel-pro-fiber-line).
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Naziv kako piše na sajtu i u adminu.
  name TEXT NOT NULL CHECK (length(btrim(name)) > 0),
  sort_order INT NOT NULL DEFAULT 0,
  -- false = kategorija i njeni proizvodi se ne prikazuju na sajtu.
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.categories IS
  'Linije proizvoda. Uređuju se iz admin panela (/admin/proizvodi).';

CREATE INDEX IF NOT EXISTS idx_categories_sort ON public.categories (sort_order, id);

-- ── 2. products.category_slug ────────────────────────────────────

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_slug TEXT NULL
    REFERENCES public.categories (slug) ON UPDATE CASCADE ON DELETE SET NULL;

COMMENT ON COLUMN public.products.category_slug IS
  'Kategorija kojoj proizvod pripada. NULL = nerazvrstano; na sajtu ide u „Ostalo".';

CREATE INDEX IF NOT EXISTS idx_products_category
  ON public.products (category_slug, sort_order);

-- ── 3. RLS: svi čitaju, samo admin menja ─────────────────────────

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories"
  ON public.categories FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage categories" ON public.categories;
CREATE POLICY "Admins manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- ── 4. Početne kategorije — iste kao dosadašnje linije iz koda ───

INSERT INTO public.categories (slug, name, sort_order)
VALUES
  ('builder-gel-pro-fiber-line',    'Builder Gel – Pro Fiber Line',    1),
  ('builder-gel-fluid-perfect',     'Builder Gel – Fluid Perfect',     2),
  ('rubber-base-camouflage',        'Rubber Base – Camouflage',        3),
  ('pro-base-clear',                'Pro Base – Clear',                4),
  ('super-shine-top-coat',          'Super Shine Top Coat',            5),
  ('effect-top-coat-milky',         'Effect Top Coat – Milky',         6),
  ('effect-top-coat-shimmer-vibe',  'Effect Top Coat – Shimmer Vibe',  7)
ON CONFLICT (slug) DO UPDATE SET
  name       = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order;

-- ── 5. Raspored proizvoda — samo za one bez kategorije ───────────
-- `category_slug IS NULL` čuva svako premeštanje urađeno iz admina.

UPDATE public.products SET category_slug = 'builder-gel-pro-fiber-line'
  WHERE category_slug IS NULL AND slug LIKE 'pro-fiber-%';

UPDATE public.products SET category_slug = 'builder-gel-fluid-perfect'
  WHERE category_slug IS NULL AND slug LIKE 'fluid-perfect-%';

UPDATE public.products SET category_slug = 'rubber-base-camouflage'
  WHERE category_slug IS NULL AND slug LIKE 'rubber-base-%';

UPDATE public.products SET category_slug = 'pro-base-clear'
  WHERE category_slug IS NULL AND slug = 'pro-base-clear';

UPDATE public.products SET category_slug = 'super-shine-top-coat'
  WHERE category_slug IS NULL AND slug = 'super-shine-top-coat';

UPDATE public.products SET category_slug = 'effect-top-coat-milky'
  WHERE category_slug IS NULL AND slug = 'effect-top-coat-milky';

UPDATE public.products SET category_slug = 'effect-top-coat-shimmer-vibe'
  WHERE category_slug IS NULL AND slug = 'effect-top-coat-shimmer-vibe';

-- ── 6. Cenovnik gelova — samo pakovanja bez unete cene ───────────
-- Predložene maloprodajne cene, RSD sa PDV-om. Cene unete iz admina
-- (price_rsd NOT NULL) se NE diraju.

UPDATE public.product_variants v SET price_rsd = c.price
FROM (VALUES
  ('builder-gel-pro-fiber-line',   '10 g',  1490),
  ('builder-gel-pro-fiber-line',   '30 g',  2990),
  ('builder-gel-pro-fiber-line',   '50 g',  4290),
  ('builder-gel-fluid-perfect',    '10 g',  1390),
  ('builder-gel-fluid-perfect',    '30 g',  2790),
  ('builder-gel-fluid-perfect',    '50 g',  3990),
  ('rubber-base-camouflage',       '10 ml', 1390),
  ('rubber-base-camouflage',       '15 ml', 1690),
  ('pro-base-clear',               '10 ml', 1290),
  ('pro-base-clear',               '15 ml', 1590),
  ('super-shine-top-coat',         '10 ml', 1290),
  ('super-shine-top-coat',         '15 ml', 1590),
  ('effect-top-coat-milky',        '10 ml', 1390),
  ('effect-top-coat-milky',        '15 ml', 1690),
  ('effect-top-coat-shimmer-vibe', '10 ml', 1390),
  ('effect-top-coat-shimmer-vibe', '15 ml', 1690)
) AS c (category_slug, package_label, price)
JOIN public.products p ON p.category_slug = c.category_slug
WHERE v.product_slug = p.slug
  AND v.package_label = c.package_label
  AND v.price_rsd IS NULL;

COMMIT;
