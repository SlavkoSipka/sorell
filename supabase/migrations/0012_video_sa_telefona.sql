-- ═══════════════════════════════════════════════════════════════════
-- Video sa telefona ide direktno
--
-- Zašto: obrada u browseru (ffmpeg.wasm) radi na računaru, ali na
-- telefonu nema dovoljno memorije — Safari na iPhone-u ili sruši
-- karticu ili napredak stane zauvek, pa se admin panel ponaša kao da
-- se zamrzao. Zato telefon sada šalje snimak kakav jeste, bez obrade.
--
-- Posledica po bucket: fajl je veći (do 200 MB umesto 25 MB) i nije
-- uvek MP4 — iPhone šalje `video/quicktime`, Samsung ume i `video/webm`
-- ili `video/3gpp`. Ovde se ta dva ograničenja otvaraju.
--
-- Bezbedno je pokrenuti više puta.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-videos',
  'product-videos',
  true,
  209715200,                                -- 200 MB po klipu
  ARRAY[
    -- Video kontejneri koje telefoni stvarno šalju.
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-matroska',
    'video/3gpp',
    'video/3gpp2',
    'video/x-m4v',
    'video/mpeg',
    'video/x-msvideo',
    'video/avi',
    'video/ogg',
    -- Sličica klipa (poster). WebP je pravilo, JPEG rezerva za
    -- starije Safari verzije koje ne peku WebP iz canvas-a.
    'image/webp',
    'image/jpeg',
    'image/png'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMIT;
