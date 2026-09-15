# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Napomene specifične za ovaj projekat:

- Next.js 16: `middleware.ts` je preimenovan u **`proxy.ts`** (isti API, drugi naziv fajla i export).
- `params` i `searchParams` su `Promise` — uvek `await`.
- Cene su **autoritativne sa servera** (`app/api/orders/route.ts` čita `products`, `product_variants` i `site_settings` iz Supabase-a). Klijent šalje samo ključ varijante + `quantity`; iznos se proverava.
- Cena se vodi **po pakovanju**, ne po proizvodu. Ključ stavke svuda (korpa, `orders.line_items`) je `<slug>--<pakovanje>`, npr. `pro-fiber-naked-skin--30g`. `product_variants.price_rsd = NULL` = pakovanje se ne nudi na stranici proizvoda, a porudžbina sa njim se odbija.
- Popust važi najuži: `product_variants.discount_percent` → `products.discount_percent` → `site_settings.site_discount_percent`. Sajt (`lib/use-pricing-data.ts`) i `/api/orders` čitaju popust pakovanja posebnim upitom, da oba rade i bez migracije 0015.
- Katalog u `lib/data/products.ts` je **generisan iz klijentove tabele** (`SORELLE_proizvodi_za_sajt_NOVA_TABELA`) — tekstovi su doslovni. Ne prepisuj ih bez nove tabele od klijenta.
- Spisak proizvoda i pakovanja na sajtu dolazi iz baze (`products`, `product_variants`; vidi `catalog` u `lib/products-server.ts`). Katalog iz koda je rezerva za prazna polja i za rad bez baze. Admin pravi nove proizvode, dodaje i briše pakovanja i briše proizvode; pakovanje sa praznim `package_label` = proizvod bez gramaže, sa jednom cenom. Seed kataloga i predloženih cena (0003, 0004) radi samo na praznoj bazi, da ponovno pokretanje `setup.sql` ne vrati obrisano.
- Cene i fotografije unosi klijent iz admin panela; slike idu u Supabase Storage bucket `product-images` i imaju prednost nad privremenim iz `lib/data/product-images.ts`.
- Početna strana se uređuje iz admina (kartica „Početna strana"): slajdovi na vrhu su u tabeli `hero_slides`, a baner ispod njih u `site_settings.banner_*`. Proizvodi se više ne prikazuju na početnoj, pa `products.is_featured` nema efekta.
- Admin panel ima kartice po celinama (`components/admin/AdminShell.tsx`): Pregled, Porudžbine, Proizvodi, Popusti, Početna strana, Salon, Boje zaglavlja. Stara adresa `/admin/podesavanja` vodi na Popuste.
- Baza se postavlja jednim fajlom `supabase/setup.sql`, koji je **generisan** iz `supabase/migrations/*` — posle izmene migracije pokreni `npm run sql:build`.
- Link „Prijava" stoji samo u footeru, namerno ne u glavnoj navigaciji.
- I dalje je placeholder: `lib/data/services.ts` (usluge salona) i podaci o salonu u `lib/site-config.ts`.
