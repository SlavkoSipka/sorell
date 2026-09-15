-- ═══════════════════════════════════════════════════════════════════
-- Popust po pakovanju (gramaži)
--
-- Zašto: popust je do sada mogao da se zada samo za ceo proizvod. Sada
-- može i za jedno pakovanje, npr. samo 30 g na −20%, dok 10 g i 50 g
-- ostaju po ceni proizvoda.
--
-- Redosled: popust na pakovanju → popust na proizvodu → globalni popust.
-- NULL = pakovanje nema svoj popust. 0 = to pakovanje namerno bez popusta.
--
-- Bezbedno je pokrenuti više puta.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) NULL
    CHECK (discount_percent IS NULL OR (discount_percent >= 0 AND discount_percent <= 100));

COMMENT ON COLUMN public.product_variants.discount_percent IS
  'Popust samo za ovo pakovanje u %. NULL = važi popust proizvoda, pa globalni. /api/orders ga računa isto kao sajt.';

COMMIT;
