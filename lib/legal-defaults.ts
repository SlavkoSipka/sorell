/**
 * Podrazumevani pravni tekstovi — prikazuju se dok klijentkinja u adminu
 * ne sačuva svoje, i služe kao polazna tačka u polju za izmenu.
 * Format i oznake u vitičastim zagradama: vidi lib/legal.ts.
 */

export const DEFAULT_PRIVACY = `Ova politika objašnjava koje podatke o ličnosti prikupljamo kada koristiš sajt {brend}, zašto ih prikupljamo, kome ih prosleđujemo i koja prava imaš. Obrada se vrši u skladu sa Zakonom o zaštiti podataka o ličnosti Republike Srbije.

## 1. Ko obrađuje tvoje podatke

Rukovalac podacima je {naziv}, {adresa}, {grad}.

Kontakt za sva pitanja o podacima: **{email}**, telefon **{telefon}**.

[Dopuniti: pun poslovni naziv, matični broj i PIB privrednog subjekta.]

## 2. Koje podatke prikupljamo i po kom osnovu

**Podaci iz porudžbine.** Kada poručiš proizvod, tražimo ime, prezime, e-mail adresu, broj telefona, adresu, opštinu, mesto i poštanski broj, uz napomenu koju sam(a) upišeš. Uz to čuvamo i sadržaj porudžbine i iznos. Ove podatke obrađujemo da bismo izvršili ugovor o prodaji — bez njih porudžbina ne može da se isporuči.

**Podaci o poseti sajtu.** Koristimo Google Analytics da bismo videli koliko ljudi poseti sajt i koje stranice gledaju. Ti podaci su statistički i ne koristimo ih da bismo te lično prepoznali. Osnov je naš legitimni interes da znamo kako sajt radi.

**Korpa.** Sadržaj korpe se čuva isključivo u memoriji tvog pregledača i ne šalje se nama dok ne pošalješ porudžbinu.

Ne tražimo i ne čuvamo brojeve platnih kartica — plaćanje ide isključivo pouzećem, gotovinom kuriru pri preuzimanju.

## 3. Kome prosleđujemo podatke

Podatke ne prodajemo i ne ustupamo trećim licima u marketinške svrhe. Prosleđujemo ih samo:

- **kurirskoj službi** — ime, adresa i telefon, isključivo radi isporuke pošiljke;
- **Supabase** — usluga baze podataka na kojoj se čuvaju porudžbine;
- **EmailJS** — servis preko kog nam stiže obaveštenje o novoj porudžbini;
- **Vercel** — hosting na kom sajt radi;
- **Google** — statistika poseta (Google Analytics).

Ovi pružaoci usluga imaju servere izvan Republike Srbije, pretežno u Evropskoj uniji i Sjedinjenim Državama, i podatke obrađuju po našem nalogu i uz odgovarajuće mere zaštite.

## 4. Koliko dugo čuvamo podatke

Podatke o porudžbinama čuvamo onoliko koliko je potrebno za izvršenje porudžbine i za eventualnu reklamaciju, a najduže u rokovima koje propisuju poreski i računovodstveni propisi. Statistički podaci o poseti čuvaju se u skladu sa podešavanjima Google Analytics-a. Kada rok istekne, podaci se brišu.

## 5. Tvoja prava

U svakom trenutku imaš pravo da:

- tražiš uvid u podatke koje imamo o tebi i kopiju tih podataka;
- tražiš ispravku netačnih ili dopunu nepotpunih podataka;
- tražiš brisanje podataka kada za njihovu obradu više nema osnova;
- tražiš ograničenje obrade ili uložiš prigovor na obradu;
- tražiš prenosivost podataka drugom rukovaocu;
- opozoveš pristanak, kada se obrada zasniva na pristanku.

Zahtev pošalji na **{email}** — odgovaramo u zakonskom roku. Ako smatraš da su ti prava povređena, možeš da podneseš pritužbu Povereniku za informacije od javnog značaja i zaštitu podataka o ličnosti, Bulevar kralja Aleksandra 15, Beograd.

## 6. Kolačići

Sajt koristi kolačiće koji su neophodni za njegov rad i kolačiće Google Analytics-a za statistiku poseta. Kolačiće možeš da obrišeš ili blokiraš u podešavanjima svog pregledača; sajt će raditi i bez njih, uz mogućnost da neke pogodnosti ne budu dostupne.

## 7. Bezbednost

Sajt radi preko šifrovane HTTPS veze. Pristup porudžbinama u administraciji ima samo ovlašćeno lice, uz prijavu lozinkom.

## 8. Izmene ove politike

Politiku možemo da dopunimo ako se promeni način rada sajta. Važeća verzija je uvek objavljena na ovoj stranici, sa datumom poslednje izmene na vrhu.`;

export const DEFAULT_TERMS = `Ovi uslovi važe za kupovinu preko sajta {brend} i za korišćenje sajta uopšte. Slanjem porudžbine potvrđuješ da si ih pročitao(la) i da ih prihvataš.

## 1. Prodavac

{naziv}, {adresa}, {grad}. Kontakt: {email}, telefon {telefon}.

[Dopuniti: pun poslovni naziv, matični broj, PIB i podatak da li je prodavac u sistemu PDV-a.]

## 2. Cene

Sve cene su iskazane u dinarima (RSD) i važe u trenutku slanja porudžbine. Cena prikazana uz proizvod ne uključuje troškove dostave — oni se prikazuju posebno pre potvrde porudžbine.

[Dopuniti: „Cene su iskazane sa uračunatim PDV-om" ili „Prodavac nije u sistemu PDV-a", zavisno od statusa.]

## 3. Poručivanje

Proizvod se dodaje u korpu, a porudžbina se šalje popunjavanjem podataka za dostavu. Registracija nije potrebna. Ugovor je zaključen kada primiš potvrdu porudžbine. Zadržavamo pravo da porudžbinu ne prihvatimo ako proizvod nije na stanju ili ako podaci za dostavu nisu potpuni, o čemu ćemo te obavestiti.

## 4. Plaćanje

Plaćanje je isključivo **pouzećem** — gotovinom kuriru prilikom preuzimanja pošiljke. Sajt ne prima podatke o platnim karticama i ne vrši onlajn naplatu.

## 5. Dostava

Isporuku vrši kurirska služba na teritoriji Republike Srbije. Troškovi dostave iznose {postarina}, a za porudžbine preko {besplatno_od} dostava je besplatna. Moguće je i lično preuzimanje u salonu, po dogovoru.

[Dopuniti: uobičajen rok isporuke, npr. 2–5 radnih dana.]

## 6. Pravo na odustanak

Kao potrošač imaš pravo da u roku od 14 dana od dana preuzimanja odustaneš od kupovine bez navođenja razloga i bez dodatnih troškova, osim troškova vraćanja robe. Odustanak javljaš na {email} ili telefonom, a robu vraćaš u roku od 14 dana od odustanka.

Novac vraćamo najkasnije u roku od 14 dana od prijema robe ili dokaza da je poslata. Roba mora biti neoštećena i u originalnom pakovanju.

**Izuzetak:** u skladu sa Zakonom o zaštiti potrošača, pravo na odustanak ne važi za zapečaćene proizvode koji se ne mogu vratiti zbog zaštite zdravlja ili higijene, ako su otvoreni nakon isporuke. To se odnosi na gelove, baze i završne sjajeve kojima je pečat skinut.

## 7. Saobraznost i reklamacije

Odgovaramo za saobraznost robe ugovoru u zakonskom roku od dve godine od preuzimanja. Reklamaciju šalješ na {email} ili telefonom na {telefon}, uz račun ili drugi dokaz o kupovini.

Na primljenu reklamaciju odgovaramo pisanim ili elektronskim putem u roku od 8 dana, a ako je reklamacija osnovana, rešavamo je u roku od 15 dana od podnošenja.

## 8. Rešavanje sporova

Trudimo se da svaki prigovor rešimo dogovorom. Ako do dogovora ne dođe, spor se može rešiti vansudskim putem, pred telom sa liste posrednika koju vodi ministarstvo nadležno za zaštitu potrošača, ili pred stvarno nadležnim sudom.

## 9. Usluge salona

Termini za tretmane u salonu zakazuju se telefonom ili porukom. Cene usluga objavljene na stranici Usluge su informativne i važe do promene.

[Dopuniti: rok za otkazivanje termina, ako postoji.]

## 10. Sadržaj sajta

Tekstovi, fotografije i video zapisi na sajtu vlasništvo su prodavca i ne smeju se koristiti bez dozvole. Trudimo se da svi podaci budu tačni; greške u prikazu cene ili opisa zadržavamo pravo da ispravimo i pre isporuke o tome obavestimo kupca.

## 11. Izmene uslova

Uslove možemo menjati; na porudžbinu se primenjuju uslovi koji su važili u trenutku njenog slanja. Važeća verzija je uvek na ovoj stranici.`;

export const DEFAULT_LEGAL = {
  privatnost: DEFAULT_PRIVACY,
  uslovi: DEFAULT_TERMS,
} as const;
