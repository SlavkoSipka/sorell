import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/lib/site-config';
import { getSalonData } from '@/lib/salon-server';

export const metadata: Metadata = {
  title: 'Politika privatnosti',
  description: 'Koje podatke prikupljamo, zašto, kome ih prosleđujemo i koja su tvoja prava.',
  alternates: { canonical: '/politika-privatnosti' },
  robots: { index: true, follow: true },
};

/** Datum poslednje izmene teksta — menja se kad se menja sadržaj politike. */
const AZURIRANO = '4. septembar 2026.';

function Odeljak({ naslov, children }: { naslov: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="font-display text-[20px] text-ink md:text-[22px]">{naslov}</h2>
      <div className="mt-3 space-y-3 font-body text-[15px] leading-relaxed text-ink-soft">
        {children}
      </div>
    </section>
  );
}

export default async function PolitikaPrivatnostiPage() {
  const { phone, address, city, title } = await getSalonData();

  return (
    <main>
      <div className="mx-auto max-w-[760px] px-5 py-12 md:px-8 md:py-16">
        <h1 className="font-display text-[30px] leading-tight text-ink md:text-[38px]">
          Politika privatnosti
        </h1>
        <p className="mt-3 font-body text-[13px] text-muted">Poslednja izmena: {AZURIRANO}</p>

        <p className="mt-6 font-body text-[15px] leading-relaxed text-ink-soft">
          Ova politika objašnjava koje podatke o ličnosti prikupljamo kada koristiš sajt{' '}
          {SITE.brandName}, zašto ih prikupljamo, kome ih prosleđujemo i koja prava imaš. Obrada se
          vrši u skladu sa Zakonom o zaštiti podataka o ličnosti Republike Srbije.
        </p>

        <Odeljak naslov="1. Ko obrađuje tvoje podatke">
          <p>
            Rukovalac podacima je {title}, {address}, {city}.
          </p>
          <p>
            Kontakt za sva pitanja o podacima: <span className="text-ink">{SITE.salon.email}</span>,
            telefon <span className="text-ink">{phone}</span>.
          </p>
          <p className="text-muted">
            [Dopuniti: pun poslovni naziv, matični broj i PIB privrednog subjekta.]
          </p>
        </Odeljak>

        <Odeljak naslov="2. Koje podatke prikupljamo i po kom osnovu">
          <p>
            <span className="text-ink">Podaci iz porudžbine.</span> Kada poručiš proizvod, tražimo
            ime, prezime, e-mail adresu, broj telefona, adresu, grad i poštanski broj, uz napomenu
            koju sam(a) upišeš. Uz to čuvamo i sadržaj porudžbine i iznos. Ove podatke obrađujemo da
            bismo izvršili ugovor o prodaji — bez njih porudžbina ne može da se isporuči.
          </p>
          <p>
            <span className="text-ink">Podaci o poseti sajtu.</span> Koristimo Google Analytics da
            bismo videli koliko ljudi poseti sajt i koje stranice gledaju. Ti podaci su statistički i
            ne koristimo ih da bismo te lično prepoznali. Osnov je naš legitimni interes da znamo
            kako sajt radi.
          </p>
          <p>
            <span className="text-ink">Korpa.</span> Sadržaj korpe se čuva isključivo u memoriji
            tvog pregledača (localStorage) i ne šalje se nama dok ne pošalješ porudžbinu.
          </p>
          <p>
            Ne tražimo i ne čuvamo brojeve platnih kartica — plaćanje ide isključivo pouzećem, gotovinom
            kuriru pri preuzimanju.
          </p>
        </Odeljak>

        <Odeljak naslov="3. Kome prosleđujemo podatke">
          <p>Podatke ne prodajemo i ne ustupamo trećim licima u marketinške svrhe. Prosleđujemo ih samo:</p>
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <span className="text-ink">kurirskoj službi</span> — ime, adresa i telefon, isključivo
              radi isporuke pošiljke;
            </li>
            <li>
              <span className="text-ink">Supabase</span> — usluga baze podataka na kojoj se čuvaju
              porudžbine;
            </li>
            <li>
              <span className="text-ink">EmailJS</span> — servis preko kog nam stiže obaveštenje o
              novoj porudžbini na e-mail;
            </li>
            <li>
              <span className="text-ink">Vercel</span> — hosting na kom sajt radi;
            </li>
            <li>
              <span className="text-ink">Google</span> — statistika poseta (Google Analytics).
            </li>
          </ul>
          <p>
            Ovi pružaoci usluga imaju servere izvan Republike Srbije, pretežno u Evropskoj uniji i
            Sjedinjenim Državama, i podatke obrađuju po našem nalogu i uz odgovarajuće mere zaštite.
          </p>
        </Odeljak>

        <Odeljak naslov="4. Koliko dugo čuvamo podatke">
          <p>
            Podatke o porudžbinama čuvamo onoliko koliko je potrebno za izvršenje porudžbine i za
            eventualnu reklamaciju, a najduže u rokovima koje propisuju poreski i računovodstveni
            propisi. Statistički podaci o poseti čuvaju se u skladu sa podešavanjima Google
            Analytics-a. Kada rok istekne, podaci se brišu.
          </p>
        </Odeljak>

        <Odeljak naslov="5. Tvoja prava">
          <p>U svakom trenutku imaš pravo da:</p>
          <ul className="ml-5 list-disc space-y-2">
            <li>tražiš uvid u podatke koje imamo o tebi i kopiju tih podataka;</li>
            <li>tražiš ispravku netačnih ili dopunu nepotpunih podataka;</li>
            <li>tražiš brisanje podataka kada za njihovu obradu više nema osnova;</li>
            <li>tražiš ograničenje obrade ili uložiš prigovor na obradu;</li>
            <li>tražiš prenosivost podataka drugom rukovaocu;</li>
            <li>opozoveš pristanak, kada se obrada zasniva na pristanku.</li>
          </ul>
          <p>
            Zahtev pošalji na <span className="text-ink">{SITE.salon.email}</span> — odgovaramo u
            zakonskom roku. Ako smatraš da su ti prava povređena, možeš da podneseš pritužbu
            Povereniku za informacije od javnog značaja i zaštitu podataka o ličnosti, Bulevar
            kralja Aleksandra 15, Beograd.
          </p>
        </Odeljak>

        <Odeljak naslov="6. Kolačići">
          <p>
            Sajt koristi kolačiće koji su neophodni za njegov rad i kolačiće Google Analytics-a za
            statistiku poseta. Kolačiće možeš da obrišeš ili blokiraš u podešavanjima svog
            pregledača; sajt će raditi i bez njih, uz mogućnost da neke pogodnosti ne budu dostupne.
          </p>
        </Odeljak>

        <Odeljak naslov="7. Bezbednost">
          <p>
            Sajt radi preko šifrovane HTTPS veze. Pristup porudžbinama u administraciji ima samo
            ovlašćeno lice, uz prijavu lozinkom.
          </p>
        </Odeljak>

        <Odeljak naslov="8. Izmene ove politike">
          <p>
            Politiku možemo da dopunimo ako se promeni način rada sajta. Važeća verzija je uvek
            objavljena na ovoj stranici, sa datumom poslednje izmene na vrhu.
          </p>
        </Odeljak>

        <p className="mt-10 border-t border-line pt-6 font-body text-[14px] leading-relaxed text-muted">
          Vidi i <Link href="/uslovi-koriscenja" className="text-ink underline underline-offset-4">Uslove korišćenja i prodaje</Link>.
        </p>
      </div>
    </main>
  );
}
