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
