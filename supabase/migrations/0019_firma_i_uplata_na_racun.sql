-- ═══════════════════════════════════════════════════════════════════
-- Porudžbina na firmu i uplata na račun
--
-- Zašto:
--  1) Salonima i firmama treba porudžbina sa nazivom, PIB-om i matičnim
--     brojem, da bi dobili račun na firmu.
--  2) Pored pouzeća, kupac može da plati uplatom na tekući račun (nalog ili
--     IPS QR kod iz aplikacije banke). Podaci primaoca se menjaju u adminu.
--
-- Bezbedno je pokrenuti više puta.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_type   TEXT NOT NULL DEFAULT 'fizicko',
  ADD COLUMN IF NOT EXISTS company_name    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_pib     TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_mb      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_address TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_method  TEXT NOT NULL DEFAULT 'pouzece';

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_customer_type_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_customer_type_check CHECK (customer_type IN ('fizicko', 'firma'));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('pouzece', 'uplata'));

COMMENT ON COLUMN public.orders.customer_type IS 'fizicko | firma';
COMMENT ON COLUMN public.orders.company_name IS 'Naziv firme (samo kad je customer_type = firma).';
COMMENT ON COLUMN public.orders.company_pib IS 'PIB firme, 9 cifara.';
COMMENT ON COLUMN public.orders.company_mb IS 'Matični broj firme, 8 cifara.';
COMMENT ON COLUMN public.orders.company_address IS 'Sedište firme (ulica, broj, mesto).';
COMMENT ON COLUMN public.orders.payment_method IS 'pouzece | uplata (uplata na tekući račun, nalog ili IPS QR).';

-- Podaci primaoca uplate (prazno = podrazumevane vrednosti iz lib/payment.ts).
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS payee_name       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payee_address    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payee_city       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payee_account    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payee_bank       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payee_pib        TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payee_mb         TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS transfer_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.site_settings.payee_account IS
  'Tekući račun za uplate, 18 cifara bez crtica. Prazno = račun iz koda.';
COMMENT ON COLUMN public.site_settings.transfer_enabled IS
  'Da li kupci na sajtu mogu da biraju uplatu na račun.';

-- Pretraga u adminu nalazi i po nazivu firme i PIB-u.
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
        coalesce(o.order_number::text, '') || ' ' ||
        coalesce(o.customer_first_name, '') || ' ' ||
        coalesce(o.customer_last_name, '') || ' ' ||
        coalesce(o.customer_email, '') || ' ' ||
        coalesce(o.customer_phone, '') || ' ' ||
        o.total_rsd::text || ' ' ||
        coalesce(o.address_line, '') || ' ' ||
        coalesce(o.address_extra, '') || ' ' ||
        coalesce(o.city, '') || ' ' ||
        coalesce(o.municipality, '') || ' ' ||
        coalesce(o.postal_code, '') || ' ' ||
        coalesce(o.company_name, '') || ' ' ||
        coalesce(o.company_pib, '') || ' ' ||
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

GRANT EXECUTE ON FUNCTION public.search_admin_orders(text, text, integer, integer)
  TO authenticated, service_role;

COMMIT;
