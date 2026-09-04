import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/lib/site-config';
import { formatRsd } from '@/lib/price';
import {
  FREE_SHIPPING_THRESHOLD_RSD,
  SHIPPING_CARRIER,
  SHIPPING_RSD,
} from '@/lib/shipping';
import { getSalonData } from '@/lib/salon-server';

export const metadata: Metadata = {
  title: 'Uslovi korišćenja i prodaje',
  description: 'Poručivanje, plaćanje, dostava, pravo na odustanak i reklamacije.',
  alternates: { canonical: '/uslovi-koriscenja' },
  robots: { index: true, follow: true },
};

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

export default async function UsloviKoriscenjaPage() {
  const { phone, address, city, title } = await getSalonData();

  return (
    <main>
      <div className="mx-auto max-w-[760px] px-5 py-12 md:px-8 md:py-16">
        <h1 className="font-display text-[30px] leading-tight text-ink md:text-[38px]">
          Uslovi korišćenja i prodaje
        </h1>
        <p className="mt-3 font-body text-[13px] text-muted">Poslednja izmena: {AZURIRANO}</p>

        <p className="mt-6 font-body text-[15px] leading-relaxed text-ink-soft">
          Ovi uslovi važe za kupovinu preko sajta {SITE.brandName} i za korišćenje sajta uopšte.
          Slanjem porudžbine potvrđuješ da si ih pročitao(la) i da ih prihvataš.
        </p>

        <Odeljak naslov="1. Prodavac">
          <p>
            {title}, {address}, {city}. Kontakt: {SITE.salon.email}, telefon {phone}.
          </p>
          <p className="text-muted">
            [Dopuniti: pun poslovni naziv, matični broj, PIB i podatak da li je prodavac u sistemu
            PDV-a.]
          </p>
        </Odeljak>

        <Odeljak naslov="2. Cene">
          <p>
            Sve cene su iskazane u dinarima (RSD) i važe u trenutku slanja porudžbine. Cena
            prikazana uz proizvod ne uključuje troškove dostave — oni se prikazuju posebno pre
            potvrde porudžbine.
          </p>
          <p className="text-muted">
            [Dopuniti: {'„Cene su iskazane sa uračunatim PDV-om"'} ili{' '}
            {'„Prodavac nije u sistemu PDV-a"'}, zavisno od statusa.]
          </p>
        </Odeljak>

        <Odeljak naslov="3. Poručivanje">
          <p>
            Proizvod se dodaje u korpu, a porudžbina se šalje popunjavanjem podataka za dostavu.
            Registracija nije potrebna. Ugovor je zaključen kada primiš potvrdu porudžbine.
            Zadržavamo pravo da porudžbinu ne prihvatimo ako proizvod nije na stanju ili ako podaci
            za dostavu nisu potpuni, o čemu ćemo te obavestiti.
          </p>
        </Odeljak>

        <Odeljak naslov="4. Plaćanje">
          <p>
            Plaćanje je isključivo <span className="text-ink">pouzećem</span> — gotovinom kuriru
            prilikom preuzimanja pošiljke. Sajt ne prima podatke o platnim karticama i ne vrši
            onlajn naplatu.
          </p>
        </Odeljak>

        <Odeljak naslov="5. Dostava">
          <p>
            Isporuku vrši {SHIPPING_CARRIER} na teritoriji Republike Srbije. Troškovi dostave iznose{' '}
            {formatRsd(SHIPPING_RSD)}, a za porudžbine preko{' '}
            {formatRsd(FREE_SHIPPING_THRESHOLD_RSD)} dostava je besplatna. Moguće je i lično
            preuzimanje u salonu, po dogovoru.
          </p>
          <p className="text-muted">[Dopuniti: uobičajen rok isporuke, npr. 2–5 radnih dana.]</p>
        </Odeljak>

        <Odeljak naslov="6. Pravo na odustanak">
          <p>
            Kao potrošač imaš pravo da u roku od 14 dana od dana preuzimanja odustaneš od kupovine
            bez navođenja razloga i bez dodatnih troškova, osim troškova vraćanja robe. Odustanak
            javljaš na {SITE.salon.email} ili telefonom, a robu vraćaš u roku od 14 dana od
            odustanka.
          </p>
          <p>
            Novac vraćamo najkasnije u roku od 14 dana od prijema robe ili dokaza da je poslata.
            Roba mora biti neoštećena i u originalnom pakovanju.
          </p>
          <p>
            <span className="text-ink">Izuzetak:</span> u skladu sa Zakonom o zaštiti potrošača,
            pravo na odustanak ne važi za zapečaćene proizvode koji se ne mogu vratiti zbog zaštite
            zdravlja ili higijene, ako su otvoreni nakon isporuke. To se odnosi na gelove, baze i
            završne sjajeve kojima je pečat skinut.
          </p>
        </Odeljak>

        <Odeljak naslov="7. Saobraznost i reklamacije">
          <p>
            Odgovaramo za saobraznost robe ugovoru u zakonskom roku od dve godine od preuzimanja.
            Reklamaciju šalješ na {SITE.salon.email} ili telefonom na {phone}, uz račun ili drugi
            dokaz o kupovini.
          </p>
          <p>
            Na primljenu reklamaciju odgovaramo pisanim ili elektronskim putem u roku od 8 dana, a
            ako je reklamacija osnovana, rešavamo je u roku od 15 dana od podnošenja.
          </p>
        </Odeljak>

        <Odeljak naslov="8. Rešavanje sporova">
          <p>
            Trudimo se da svaki prigovor rešimo dogovorom. Ako do dogovora ne dođe, spor se može
            rešiti vansudskim putem, pred telom sa liste posrednika koju vodi ministarstvo nadležno
            za zaštitu potrošača, ili pred stvarno nadležnim sudom.
          </p>
        </Odeljak>

        <Odeljak naslov="9. Usluge salona">
          <p>
            Termini za tretmane u salonu zakazuju se telefonom ili porukom. Cene usluga objavljene na
            stranici <Link href="/usluge" className="text-ink underline underline-offset-4">Usluge</Link>{' '}
            su informativne i važe do promene.
          </p>
          <p className="text-muted">[Dopuniti: rok za otkazivanje termina, ako postoji.]</p>
        </Odeljak>

        <Odeljak naslov="10. Sadržaj sajta">
          <p>
            Tekstovi, fotografije i video zapisi na sajtu vlasništvo su prodavca i ne smeju se
            koristiti bez dozvole. Trudimo se da svi podaci budu tačni; greške u prikazu cene ili
            opisa zadržavamo pravo da ispravimo i pre isporuke o tome obavestimo kupca.
          </p>
        </Odeljak>

        <Odeljak naslov="11. Izmene uslova">
          <p>
            Uslove možemo menjati; na porudžbinu se primenjuju uslovi koji su važili u trenutku
            njenog slanja. Važeća verzija je uvek na ovoj stranici.
          </p>
        </Odeljak>

        <p className="mt-10 border-t border-line pt-6 font-body text-[14px] leading-relaxed text-muted">
          Vidi i{' '}
          <Link href="/politika-privatnosti" className="text-ink underline underline-offset-4">
            Politiku privatnosti
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
