-- ═══════════════════════════════════════════════════════════════════
-- Video klipovi proizvoda
--
-- Zašto: uz fotografije pakovanja klijentkinja hoće i kratke snimke rada
-- na noktima. Snimak sa telefona je 50–200 MB, a Supabase free plan daje
-- 1 GB prostora i 5 GB protoka mesečno — zato admin panel svaki klip pre
-- slanja prebaci u H.264 MP4, skrati stranicu na najviše 1280 px, baci
-- zvuk i ograniči trajanje. Ovde je samo gornja brana: bucket odbija sve
-- preko 25 MB i sve što nije MP4 (ili poster slika uz njega).
--
-- Bezbedno je pokrenuti više puta.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Tabela klipova ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.product_videos (
  id SERIAL PRIMARY KEY,
  product_slug TEXT NOT NULL
    REFERENCES public.products (slug) ON DELETE CASCADE ON UPDATE CASCADE,
  -- Javni URL MP4 fajla iz bucket-a `product-videos`.
  url TEXT NOT NULL CHECK (length(btrim(url)) > 0),
  -- Prvi kadar, u WebP-u. Prikazuje se dok kupac ne klikne „pusti",
  -- pa se sam video ne skida bez potrebe (štedi protok).
  poster_url TEXT NOT NULL DEFAULT '',
  -- Trajanje posle obrade, u sekundama — panel ga prikazuje uz klip.
  duration_seconds NUMERIC(6, 2),
  -- Veličina gotovog fajla u bajtovima; služi za procenu potrošnje.
  size_bytes BIGINT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_slug, url)
);

COMMENT ON TABLE public.product_videos IS
  'Kratki klipovi proizvoda. Idu iza fotografija u galeriji; obrada je u browseru (lib/admin/videos.ts).';
COMMENT ON COLUMN public.product_videos.poster_url IS
  'Prvi kadar klipa. Prazno = galerija prikazuje sivi okvir dok se video ne pusti.';

CREATE INDEX IF NOT EXISTS idx_product_videos_product
  ON public.product_videos (product_slug, sort_order, id);

ALTER TABLE public.product_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read product_videos" ON public.product_videos;
CREATE POLICY "Public read product_videos"
  ON public.product_videos FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage product_videos" ON public.product_videos;
CREATE POLICY "Admins manage product_videos"
  ON public.product_videos FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- ── 2. Storage bucket ────────────────────────────────────────────
-- Odvojen od `product-images` da bi imao svoj limit i da se potrošnja
-- prostora na video zapisima vidi na prvi pogled u Supabase panelu.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-videos',
  'product-videos',
  true,
  26214400,                                 -- 25 MB po klipu
  ARRAY['video/mp4', 'image/webp', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read product videos" ON storage.objects;
CREATE POLICY "Public read product videos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-videos');

DROP POLICY IF EXISTS "Admins write product videos" ON storage.objects;
CREATE POLICY "Admins write product videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-videos'
    AND EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins update product videos" ON storage.objects;
CREATE POLICY "Admins update product videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-videos'
    AND EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins delete product videos" ON storage.objects;
CREATE POLICY "Admins delete product videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-videos'
    AND EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid())
  );

COMMIT;
