import type { Metadata } from 'next';
import Link from 'next/link';
import ScrollRevealInit from '@/components/ScrollRevealInit';
import Media from '@/components/ui/Media';
import { SITE } from '@/lib/site-config';
import { getSalonData } from '@/lib/salon-server';

export const metadata: Metadata = {
  title: 'O nama',
  description: `${SITE.brandName} na italijanskom znači sestre. Tamara i Aleksandra, profesionalke sa dugogodišnjim iskustvom, stvorile su liniju gelova i materijala za manikir vrhunskog kvaliteta.`,
  alternates: { canonical: '/o-nama' },
  openGraph: {
    title: `O nama | ${SITE.brandName}`,
    url: '/o-nama',
    images: [{ url: '/images/o-nama-sestre.jpg', width: 1126, height: 1600, alt: 'Sestre iza brenda Sorelle' }],
  },
};

/** Iskustvo osnivačica: broj godina je istaknut, ostatak je tekst klijentkinje. */
const SESTRE = [
  {
    ime: 'Tamara',
    godina: 16,
    oblast: 'nokti',
    tekst: 'Tamara već 16 godina pomiče granice u svetu estetike i oblikovanja noktiju, unoseći preciznost, inovaciju i beskompromisan kvalitet u svaki rad.',
  },
  {
    ime: 'Aleksandra',
    godina: 9,
    oblast: 'trepavice',
    tekst: 'Aleksandra već 9 godina uspešno gradi svoju karijeru u svetu trepavica, postavljajući visoke standarde u radu i edukacijama.',
  },
];

export default async function ONamaPage() {
  const salon = await getSalonData();

  return (
    <main>
      <ScrollRevealInit />

      {/* ── Uvod ── */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-[760px] px-5 py-14 text-center md:px-8 md:py-20">
          <p className="font-body text-[11px] uppercase tracking-[0.2em] text-muted">O nama</p>
          <h1 className="mt-4 font-display text-[34px] leading-tight text-ink md:text-[48px]">
            Sorelle znači <em className="italic">sestre</em>
          </h1>
          <p className="mx-auto mt-5 max-w-[580px] font-body text-[15px] leading-relaxed text-ink-soft md:text-[16px]">
            Dobro došli u svet brenda Sorelle, mesta gde se strast prema lepoti, dugogodišnje
            iskustvo i porodična povezanost spajaju.
          </p>
        </div>
      </section>

      {/* ── Fotografija i priča ── */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 py-14 md:grid-cols-[5fr_6fr] md:gap-16 md:px-8 md:py-20">
          <Media
            src="/images/o-nama-sestre.jpg"
            alt="Tamara i Aleksandra, sestre iza brenda Sorelle, sa najavom lansiranja brenda"
            ratio="1126 / 1600"
            sizes="(max-width: 768px) 100vw, 45vw"
            priority
          />

          <div data-reveal="true">
            <p className="font-body text-[15px] leading-relaxed text-ink-soft">
              Iza imena Sorelle, koje na italijanskom jeziku u prevodu znači{' '}
              <span className="text-ink">sestre</span>, stoji neraskidiva veza i zajednički san dve
              sestre. Naše putovanje u svetu lepote počelo je pre mnogo godina i izraslo u profesiju
              kojoj smo u potpunosti posvećene:
            </p>

            <ul className="mt-8 space-y-4">
              {SESTRE.map((s) => (
                <li key={s.ime} className="flex gap-5 border border-line bg-surface p-5">
                  <div className="w-[72px] shrink-0 text-center">
                    <p className="font-display text-[44px] leading-none text-ink">{s.godina}</p>
                    <p className="mt-1.5 font-body text-[10px] uppercase tracking-[0.16em] text-muted">
                      godina
                    </p>
                  </div>
                  <div className="min-w-0 border-l border-line pl-5">
                    <p className="font-display text-[20px] text-ink">
                      {s.ime}{' '}
                      <span className="font-body text-[11px] uppercase tracking-[0.16em] text-muted">
                        · {s.oblast}
                      </span>
                    </p>
                    <p className="mt-2 font-body text-[14px] leading-relaxed text-ink-soft">{s.tekst}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Linija proizvoda ── */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-[760px] px-5 py-14 text-center md:px-8 md:py-20" data-reveal="true">
          <p className="font-body text-[11px] uppercase tracking-[0.2em] text-muted">Sorelle Gel System</p>
          <h2 className="mt-4 font-display text-[26px] leading-tight text-ink md:text-[34px]">
            Iskustvo pretočeno u sopstvenu liniju proizvoda
          </h2>
          <p className="mx-auto mt-6 max-w-[620px] font-body text-[15px] leading-relaxed text-ink-soft">
            Sve što smo naučile kroz višegodišnji rad sa klijentima pretočile smo u stvaranje
            sopstvene linije proizvoda.
          </p>
          <p className="mx-auto mt-4 max-w-[620px] font-body text-[15px] leading-relaxed text-ink-soft">
            Brend Sorelle nastao je iz želje da profesionalcima ponudimo materijale vrhunskog
            kvaliteta koji olakšavaju svakodnevni rad, štede vreme i pružaju šire mogućnosti u
            kreiranju savršenih noktiju, dajući vam pouzdan oslonac, slobodu za kreativnost i priliku
            da podignete svoj rad na viši nivo.
          </p>

          <p className="mx-auto mt-10 max-w-[560px] font-display text-[22px] italic leading-snug text-ink md:text-[26px]">
            Budite deo profesionalne zajednice koja postavlja nova pravila u industriji lepote.
          </p>

          <Link
            href="/proizvodi"
            className="mt-8 inline-flex rounded-card border border-ink bg-ink px-7 py-3.5 font-body text-[12px] uppercase tracking-[0.14em] text-canvas transition-colors hover:bg-canvas hover:text-ink"
          >
            Pogledaj proizvode
          </Link>
        </div>
      </section>

      {/* ── Salon ── */}
      <section>
        <div className="mx-auto max-w-[760px] px-5 py-14 text-center md:px-8 md:py-20">
          <h2 className="font-display text-[24px] text-ink">Svrati u salon</h2>
          <p className="mx-auto mt-3 max-w-[480px] font-body text-[14px] leading-relaxed text-ink-soft">
            {salon.address}, {salon.city}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/usluge"
              className="rounded-card border border-ink bg-ink px-6 py-3 font-body text-[12px] uppercase tracking-[0.14em] text-canvas transition-colors hover:bg-canvas hover:text-ink"
            >
              Usluge
            </Link>
            <Link
              href="/kontakt"
              className="rounded-card border border-line-strong px-6 py-3 font-body text-[12px] uppercase tracking-[0.14em] text-ink transition-colors hover:border-ink"
            >
              Kontakt
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
