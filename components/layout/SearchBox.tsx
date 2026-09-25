'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MIN_UPIT, naslovProizvoda, pretrazi, type SearchIndex } from '@/lib/search';

/** Spisak se povlači jednom po učitavanju stranice i deli među otvaranjima. */
let kesiranIndex: SearchIndex | null = null;

type Stavka =
  | { vrsta: 'kategorija'; slug: string; label: string; count: number }
  | { vrsta: 'proizvod'; slug: string; naslov: string; linija: string; slika: string };

const PRAZNO: SearchIndex = { products: [], categories: [] };

export default function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();

  const [otvoren, setOtvoren] = useState(false);
  const [upit, setUpit] = useState('');
  const [index, setIndex] = useState<SearchIndex | null>(kesiranIndex);
  const [izabran, setIzabran] = useState(0);

  const poljeRef = useRef<HTMLInputElement>(null);
  /** Da se spisak ne traži dvaput ako kupac brzo otvori i zatvori lupu. */
  const trazenRef = useRef(false);

  // Spisak stiže tek kad kupac prvi put otvori lupu — ostale stranice ga ne nose.
  useEffect(() => {
    if (!otvoren || index || trazenRef.current) return;
    trazenRef.current = true;

    let otkazano = false;
    fetch('/api/pretraga')
      .then((r) => (r.ok ? r.json() : PRAZNO))
      .then((data: SearchIndex) => {
        if (otkazano) return;
        kesiranIndex = data;
        setIndex(data);
      })
      .catch(() => {
        if (!otkazano) setIndex(PRAZNO);
      });

    return () => {
      otkazano = true;
    };
  }, [otvoren, index]);

  // Odlazak na drugu stranicu zatvara pretragu, ma odakle klik krenuo.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOtvoren(false);
  }, [pathname]);

  useEffect(() => {
    if (otvoren) poljeRef.current?.focus();
  }, [otvoren]);

  const rezultat = useMemo(
    () => (index ? pretrazi(index, upit) : { kategorije: [], proizvodi: [], ukupnoProizvoda: 0 }),
    [index, upit],
  );

  // Kategorije i proizvodi u jednom nizu — strelice tako idu kroz ceo spisak.
  const stavke: Stavka[] = useMemo(
    () => [
      ...rezultat.kategorije.map(
        (c): Stavka => ({ vrsta: 'kategorija', slug: c.slug, label: c.label, count: c.count }),
      ),
      ...rezultat.proizvodi.map(
        (p): Stavka => ({
          vrsta: 'proizvod',
          slug: p.slug,
          naslov: naslovProizvoda(p),
          linija: p.category,
          slika: p.image,
        }),
      ),
    ],
    [rezultat],
  );

  // Spisak se menja dok se kuca, pa izbor ume da ispadne iz opsega.
  const aktivanIndex = stavke.length === 0 ? 0 : Math.min(izabran, stavke.length - 1);

  const zatvori = () => {
    setOtvoren(false);
    setUpit('');
    setIzabran(0);
  };

  const idiNa = (s: Stavka) => {
    zatvori();
    if (s.vrsta === 'proizvod') {
      router.push(`/proizvodi/${s.slug}`);
      return;
    }
    router.push(`/proizvodi?linija=${s.slug}`);
    // Ako je spisak proizvoda već otvoren, sam `push` ne bi prebacio filter
    // (komponenta ostaje montirana) — zato i poruka.
    window.dispatchEvent(new CustomEvent('sorelle:linija', { detail: s.slug }));
  };

  const naTastere = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      zatvori();
      return;
    }
    if (stavke.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIzabran((i) => (Math.min(i, stavke.length - 1) + 1) % stavke.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIzabran((i) => (Math.min(i, stavke.length - 1) - 1 + stavke.length) % stavke.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const s = stavke[aktivanIndex];
      if (s) idiNa(s);
    }
  };

  const dovoljnoSlova = upit.trim().length >= MIN_UPIT;
  const ucitavam = otvoren && index === null;

  return (
    <>
      <button
        type="button"
        onClick={() => (otvoren ? zatvori() : setOtvoren(true))}
        aria-label="Pretraga"
        aria-expanded={otvoren}
        className="inline-flex h-9 w-9 items-center justify-center text-[color:var(--nav-text)] transition-opacity hover:opacity-60"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden
        >
          {otvoren ? (
            <>
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </>
          ) : (
            <>
              <circle cx="11" cy="11" r="6.5" />
              <line x1="16" y1="16" x2="20.5" y2="20.5" />
            </>
          )}
        </svg>
      </button>

      {otvoren ? (
        <>
          {/* Klik pored pretrage je zatvara. */}
          <div
            className="fixed inset-0 z-30 bg-[color:var(--nav-overlay)]"
            onClick={zatvori}
            aria-hidden
          />

          {/* `w-screen` uz centriranje: panel ide od ivice do ivice ekrana,
              bez obzira što je red navigacije ograničen na 1200px. */}
          <div className="absolute left-1/2 top-full z-40 w-screen -translate-x-1/2 border-b border-[color:var(--nav-border)] bg-[color:var(--nav-bg)] shadow-[0_18px_40px_-28px_rgba(0,0,0,0.5)]">
            <div className="mx-auto max-w-[1200px] px-5 py-4 md:px-8 md:py-5">
              <div className="flex items-center gap-3 border-b border-[color:var(--nav-border)] pb-3">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  className="shrink-0 text-[color:var(--nav-text-soft)]"
                  aria-hidden
                >
                  <circle cx="11" cy="11" r="6.5" />
                  <line x1="16" y1="16" x2="20.5" y2="20.5" />
                </svg>
                <input
                  ref={poljeRef}
                  type="search"
                  value={upit}
                  onChange={(e) => {
                    setUpit(e.target.value);
                    setIzabran(0);
                  }}
                  onKeyDown={naTastere}
                  placeholder="Traži proizvod ili liniju…"
                  aria-label="Traži proizvod ili liniju"
                  autoComplete="off"
                  // 16px sprečava da iPhone zumira stranicu pri kucanju.
                  className="w-full bg-transparent font-body text-[16px] text-[color:var(--nav-text)] outline-none placeholder:text-[color:var(--nav-text-soft)]"
                />
                {upit ? (
                  <button
                    type="button"
                    onClick={() => {
                      setUpit('');
                      setIzabran(0);
                      poljeRef.current?.focus();
                    }}
                    aria-label="Obriši upit"
                    className="shrink-0 font-body text-[12px] uppercase tracking-[0.12em] text-[color:var(--nav-text-soft)] hover:text-[color:var(--nav-text)]"
                  >
                    Obriši
                  </button>
                ) : null}
              </div>

              <div className="max-h-[min(60vh,460px)] overflow-y-auto overscroll-contain">
                {!dovoljnoSlova ? (
                  <p className="py-6 font-body text-[14px] text-[color:var(--nav-text-soft)]">
                    Upiši bar {MIN_UPIT} slova — na primer {'„fiber"'}, {'„rubber"'} ili{' '}
                    {'„milky"'}.
                  </p>
                ) : ucitavam ? (
                  <p className="py-6 font-body text-[14px] text-[color:var(--nav-text-soft)]">
                    Učitavam…
                  </p>
                ) : stavke.length === 0 ? (
                  <p className="py-6 font-body text-[14px] text-[color:var(--nav-text-soft)]">
                    Nema rezultata za {`„${upit.trim()}"`}.
                  </p>
                ) : (
                  <ul className="py-2">
                    {stavke.map((s, i) => {
                      const aktivan = i === aktivanIndex;
                      const zajednicko = `flex w-full items-center gap-3 rounded-card px-2 py-2.5 text-left transition-colors ${
                        aktivan ? 'bg-[color:var(--nav-hover)]' : ''
                      }`;

                      if (s.vrsta === 'kategorija') {
                        return (
                          <li key={`k-${s.slug}`}>
                            <Link
                              href={`/proizvodi?linija=${s.slug}`}
                              onClick={(e) => {
                                e.preventDefault();
                                idiNa(s);
                              }}
                              onMouseEnter={() => setIzabran(i)}
                              className={zajednicko}
                            >
                              <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-[color:var(--nav-border)] text-[color:var(--nav-text-soft)]">
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  aria-hidden
                                >
                                  <rect x="3" y="3" width="7" height="7" />
                                  <rect x="14" y="3" width="7" height="7" />
                                  <rect x="3" y="14" width="7" height="7" />
                                  <rect x="14" y="14" width="7" height="7" />
                                </svg>
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-body text-[14px] font-semibold text-[color:var(--nav-text)]">
                                  {s.label}
                                </span>
                                <span className="mt-0.5 block font-body text-[12px] uppercase tracking-[0.12em] text-[color:var(--nav-text-soft)]">
                                  Linija · {s.count} proizvoda
                                </span>
                              </span>
                            </Link>
                          </li>
                        );
                      }

                      return (
                        <li key={`p-${s.slug}`}>
                          <Link
                            href={`/proizvodi/${s.slug}`}
                            onClick={zatvori}
                            onMouseEnter={() => setIzabran(i)}
                            className={zajednicko}
                          >
                            <span className="h-11 w-11 shrink-0 overflow-hidden border border-[color:var(--nav-border)] bg-surface-2">
                              {s.slika ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={s.slika}
                                  alt=""
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-body text-[14px] font-semibold text-[color:var(--nav-text)]">
                                {s.naslov}
                              </span>
                              {s.linija ? (
                                <span className="mt-0.5 block truncate font-body text-[12px] uppercase tracking-[0.12em] text-[color:var(--nav-text-soft)]">
                                  {s.linija}
                                </span>
                              ) : null}
                            </span>
                          </Link>
                        </li>
                      );
                    })}

                    {rezultat.ukupnoProizvoda > rezultat.proizvodi.length ? (
                      <li className="px-2 pb-1 pt-2">
                        <span className="font-body text-[12px] text-[color:var(--nav-text-soft)]">
                          Još {rezultat.ukupnoProizvoda - rezultat.proizvodi.length} proizvoda —
                          suzi pretragu.
                        </span>
                      </li>
                    ) : null}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
