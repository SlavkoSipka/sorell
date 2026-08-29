# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Napomene specifične za ovaj projekat:

- Next.js 16: `middleware.ts` je preimenovan u **`proxy.ts`** (isti API, drugi naziv fajla i export).
- `params` i `searchParams` su `Promise` — uvek `await`.
- Cene su **autoritativne sa servera** (`app/api/orders/route.ts` čita `products`, `product_variants` i `site_settings` iz Supabase-a). Klijent šalje samo ključ varijante + `quantity`; iznos se proverava.
- Cena se vodi **po pakovanju**, ne po proizvodu. Ključ stavke svuda (korpa, `orders.line_items`) je `<slug>--<pakovanje>`, npr. `pro-fiber-naked-skin--30g`. `product_variants.price_rsd = NULL` = „Cena uskoro" i porudžbina se odbija.
- Katalog u `lib/data/products.ts` je **generisan iz klijentove tabele** (`SORELLE_proizvodi_za_sajt_NOVA_TABELA`) — tekstovi su doslovni. Ne prepisuj ih bez nove tabele od klijenta.
- Cene i fotografije unosi klijent iz admin panela; slike idu u Supabase Storage bucket `product-images` i imaju prednost nad privremenim iz `lib/data/product-images.ts`.
- „Izdvojeno iz ponude" na početnoj se bira iz admina (`products.is_featured`); dok nijedan nije označen, prikazuje se početak kataloga.
- Baza se postavlja jednim fajlom `supabase/setup.sql`, koji je **generisan** iz `supabase/migrations/*` — posle izmene migracije pokreni `npm run sql:build`.
- Link „Prijava" stoji samo u footeru, namerno ne u glavnoj navigaciji.
- I dalje je placeholder: `lib/data/services.ts` (usluge salona) i podaci o salonu u `lib/site-config.ts`.
