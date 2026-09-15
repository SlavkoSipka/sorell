-- ═══════════════════════════════════════════════════════════════════
-- Novi proizvodi i pakovanja iz admin panela
--
-- Zašto: spisak proizvoda je do sada dolazio iz kataloga u kodu, pa je u
-- novu kategoriju moglo da se prebaci samo nešto što već postoji. Sada sajt
-- čita proizvode i pakovanja iz baze, a admin pravi nove, dodaje i briše
-- gramaže i briše proizvode. Pravljenje i izmena su već bili dozvoljeni;
-- nedostajala je dozvola za brisanje.
--
-- Brisanje proizvoda briše i njegova pakovanja, slike i klipove (kaskadno).
-- Stare porudžbine ostaju, jer čuvaju naziv i cenu u `line_items`.
--
-- Bezbedno je pokrenuti više puta.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

DROP POLICY IF EXISTS "Admins delete products" ON public.products;
CREATE POLICY "Admins delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

COMMENT ON COLUMN public.product_variants.package_label IS
  'Kako pakovanje piše na sajtu: „10 g", „30 g". Prazno = proizvod bez gramaže, sa jednom cenom.';

COMMIT;
