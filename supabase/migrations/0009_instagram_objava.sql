-- ═══════════════════════════════════════════════════════════════════
-- Link ka Instagram objavi proizvoda
--
-- Zašto: klijentkinja radove objavljuje na Instagramu, pa uz proizvod
-- treba diskretna veza ka toj objavi. Unosi se iz admin panela
-- (Proizvodi → uredi proizvod), prazno = ikonica se ne prikazuje.
--
-- CHECK dozvoljava samo instagram.com adrese preko https — polje ide
-- pravo u `href`, pa ovde stoji brana protiv slučajnog `javascript:`
-- ili tuđeg domena.
--
-- Bezbedno je pokrenuti više puta.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS instagram_url TEXT NOT NULL DEFAULT '';

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_instagram_url_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_instagram_url_check
  CHECK (
    instagram_url = ''
    OR instagram_url ~* '^https://([a-z0-9-]+\.)?instagram\.com/[^\s]*$'
  );

COMMENT ON COLUMN public.products.instagram_url IS
  'Link ka Instagram objavi ili profilu. Prazno = ikonica se ne prikazuje uz proizvod.';

COMMIT;
