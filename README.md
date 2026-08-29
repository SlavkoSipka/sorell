# Sorelle — webshop + salon

Next.js 16 (App Router) + Supabase + Tailwind 4.

Katalog (46 proizvoda, 117 pakovanja) je prenet iz klijentove tabele
`SORELLE_proizvodi_za_sajt_NOVA_TABELA`. **Cene i fotografije unosi klijent iz admin panela** —
u tabeli su bile označene sa „DODATI".

## Pokretanje

```bash
npm install
```

Kopiraj `.env.local.example` u `.env.local` i popuni ključeve, pa:

```bash
npm run dev
```

Sajt radi i bez Supabase-a, ali tada nema cena — svaki proizvod stoji kao „Cena uskoro" i ne može
da se poruči. Cene, poručivanje i admin panel zahtevaju bazu.

## Supabase (jednom po projektu)

1. **Napravi projekat** na [supabase.com](https://supabase.com) → New project. Zapamti lozinku
   baze, izaberi region u Evropi (npr. Frankfurt).
2. **Prepiši ključeve.** Project Settings → API → kopiraj u `.env.local`:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (samo server, nikad u browseru)
3. **Pokreni jedan SQL.** SQL Editor → New query → nalepi ceo `supabase/setup.sql` → Run.
   To je cela šema + katalog od 46 proizvoda i 117 pakovanja, u jednom fajlu.

   Bezbedno je pokrenuti više puta: šema se dopunjuje, a cene, popusti, slike i izbor
   „na sajtu" / „na početnoj" ostaju netaknuti.

   > `supabase/setup.sql` je **generisan** spajanjem `supabase/migrations/*`.
   > Posle izmene neke migracije pokreni `npm run sql:build`.
4. **Napravi nalog za klijenta.** Authentication → Users → Add user → „Auto Confirm User"
   uključeno, unesi email i lozinku.
5. **Daj mu admin prava.** Kopiraj UUID korisnika iz iste tabele, pa u SQL Editor-u:
   ```sql
   INSERT INTO public.admins (user_id) VALUES ('UUID_KORISNIKA'::uuid);
   ```
6. **Prijava:** link „Prijava" stoji u footeru sajta (namerno nije u glavnom meniju) —
   ili direktno `/prijava`. Posle prijave otvara se `/admin`.

### Ne otvara se admin panel?

Postoje **dva** uslova: nalog u `auth.users` **i** red u `public.admins`. Nalog napravljen u
Authentication → Users sam po sebi nije dovoljan.

Nalepi `supabase/dodaj-admina.sql` u SQL Editor — prvi upit odmah pokaže ko postoji, da li mu je
email potvrđen i da li ima pristup panelu, a drugi mu daje pristup po email adresi (bez prepisivanja
UUID-a).

Ostalo što najčešće zapne:

| Simptom | Uzrok |
| --- | --- |
| „Sajt nije povezan sa bazom…" | Nema `.env.local` ili server nije restartovan posle izmene. Env se čita pri pokretanju. |
| „Nalog postoji, ali nema pristup panelu." | Fali red u `public.admins` → `dodaj-admina.sql`. |
| „Email naloga nije potvrđen." | Korisnik je napravljen bez „Auto Confirm User" → Authentication → Users → Confirm email. |
| Prijava prođe, pa te vrati na početnu | Isto kao gore: nema reda u `admins` (to radi `proxy.ts`). |
| Porudžbina vraća 503 | Fali `SUPABASE_SERVICE_ROLE_KEY` u `.env.local`. Admin panel radi i bez njega. |

> Napomena: `.env.local` se čita **samo pri pokretanju** servera. Posle svake izmene tog fajla
> ugasi `npm run dev` i pokreni ponovo.

## Šta klijent radi u admin panelu

| Stranica | Šta se tamo radi |
| --- | --- |
| **Pregled** | Promet, porudžbine po statusu i stanje kataloga (koliko proizvoda čeka cenu ili sliku, koliko je na početnoj). |
| **Porudžbine** | Lista, pretraga i promena statusa (poručeno → kontaktiran → poslato → plaćeno / odbijeno). |
| **Proizvodi** | Cena po pakovanju, popust, slika, „Na sajtu", „Na početnoj". |
| **Podešavanja** | Globalni popust, paketni popust, promo kodovi. |

Na stranici **Proizvodi**: pretraga po nazivu/nijansi, filteri „Bez cene / Bez slike / Na početnoj",
lista je grupisana po linijama. Dugme **„Sačuvaj i prenesi ove cene na svih N nijansi u liniji"**
prepisuje cene na celu liniju — jednom uneseš cene za Pro Fiber i svih 8 nijansi ih dobije.

### Izdvojeno iz ponude (početna strana)

Kvačica **„Na početnoj"** kod proizvoda ga stavlja u sekciju „Izdvojeno iz ponude" na naslovnoj.
Prikazuje se najviše 8, redosledom iz kataloga. Dok nijedan nije označen, tamo stoji početak
kataloga da sekcija ne bi bila prazna.

## Šta se gde menja

| Šta | Gde |
| --- | --- |
| Naziv brenda, logo, adresa, telefon, radno vreme, traka sa obaveštenjima | `lib/site-config.ts` |
| Proizvodi (naziv, nijansa, opis u tačkama, način primene, pakovanja) | `lib/data/products.ts` |
| **Cena po pakovanju** (10 g / 30 g / 50 g, 10 ml / 15 ml) | Admin → Proizvodi (tabela `product_variants`) |
| **Fotografija proizvoda** (upload i zamena) | Admin → Proizvodi (bucket `product-images`) |
| Popust po proizvodu | Admin → Proizvodi (tabela `products`) |
| **Izdvojeno iz ponude na početnoj** | Admin → Proizvodi → kvačica „Na početnoj" (`products.is_featured`) |
| Privremene slike dok ne stignu prave | `lib/data/product-images.ts` |
| Paketi (koji proizvodi, fiksna cena ili %) | `lib/pricing-engine.ts` + `lib/data/products.ts` |
| Cenovnik usluga salona | `lib/data/services.ts` |
| Poštarina i prag besplatne dostave | `lib/shipping.ts` |
| Boje, fontovi, razmaci | `app/globals.css` (`@theme inline`) |
| Globalni popust, paketni popust, promo kodovi | Admin → Podešavanja |

### Slike proizvoda

Redosled je: slika okačena iz admina → privremena slika iz `lib/data/product-images.ts` → sivi okvir.

- **Klijent** menja sliku u Admin → Proizvodi → „Dodaj / Zameni sliku". Fajl ide u Supabase Storage
  (bucket `product-images`, do 5 MB, JPG/PNG/WEBP/AVIF), a javni URL se upisuje u
  `products.image_path`. Stara slika se briše. „Vrati privremenu" poništava izbor.
- **Privremene slike** iz koda: ubaci fajlove u `public/proizvodi/` i dopiši red po proizvodu u
  `lib/data/product-images.ts` (`'pro-fiber-naked-skin': '/proizvodi/naked-skin.webp'`).

Logo: stavi `public/logo.svg` i upiši `logoSrc: '/logo.svg'` u `lib/site-config.ts`.

### Novi proizvod ili pakovanje

1. Dodaj objekat u `lib/data/products.ts` (nov `slug`, `variants` sa `code` i `label`).
2. Dodaj redove u bazu — bez njih server odbija porudžbinu:
   ```sql
   INSERT INTO public.products (slug, name, volume, sort_order)
   VALUES ('novi-slug', 'Naziv — Nijansa', '10 ml / 15 ml', 47);

   INSERT INTO public.product_variants (product_slug, variant_slug, package_label, sort_order)
   VALUES ('novi-slug', 'novi-slug--10ml', '10 ml', 1),
          ('novi-slug', 'novi-slug--15ml', '15 ml', 2);
   ```
3. Cenu unesi iz admina.

## Kako rade cene

Cena se vodi **po pakovanju**, u `product_variants.price_rsd`. Ključ stavke kroz ceo tok (korpa →
porudžbina → `orders.line_items`) je `<slug proizvoda>--<oznaka pakovanja>`, npr.
`pro-fiber-naked-skin--30g`. Pakovanja nisu posebni proizvodi — u adminu i dalje stoji 46 proizvoda,
svaki sa 2–3 polja za cenu.

Cene su **autoritativne sa servera**. Klijent šalje samo ključ varijante i količinu;
`app/api/orders/route.ts` učitava cene iz baze, ponovo izračuna sve popuste i odbija porudžbinu ako
se iznos ne poklapa. Popust se vodi po proizvodu i nasleđuju ga sva njegova pakovanja.

`price_rsd = NULL` znači „cena još nije uneta": na sajtu stoji **„Cena uskoro"**, dugme za korpu je
neaktivno, a porudžbina sa takvom stavkom se odbija. `products.base_price_rsd` je izvedena kolona
(trigger je drži na najnižoj ceni među pakovanjima) i služi samo za prikaz „od X RSD".

Redosled: međuzbir → popust po proizvodu ili paketni popust → promo kod → poštarina.

## Struktura

```
app/
  page.tsx                početna
  proizvodi/[slug]        stranica proizvoda
  paketi/[slug]           stranica paketa
  usluge, kontakt, o-nama salon i info stranice
  korpa, porudzbina, zahvalnica
  prijava                 prijava na panel
  admin/                  Pregled · Porudžbine · Proizvodi · Podešavanja
  api/orders              prijem porudžbine (service role)
  api/discount-code       provera promo koda
  api/admin/orders        lista/pretraga za panel
components/               layout, sekcije, korpa, proizvod, admin
lib/                      cene, korpa, Supabase, podaci
  data/products.ts        katalog iz klijentove tabele (46 proizvoda)
  data/product-images.ts  privremene slike dok ne stignu prave
scripts/build-setup-sql.mjs  spaja migracije u supabase/setup.sql
supabase/
  setup.sql               GENERISANO — jedan fajl za Supabase SQL Editor
  migrations/             izvor: 0001 osnova, 0002 pakovanja+slike, 0003 katalog
proxy.ts                  zaštita /admin (u Next 16 zamenjuje middleware.ts)
```

## Deploy

Postavi iste env varijable na hostingu (Vercel/Netlify) i `NEXT_PUBLIC_SITE_URL` na pravi domen.
`SUPABASE_SERVICE_ROLE_KEY` i `EMAILJS_*` idu isključivo kao server varijable.
