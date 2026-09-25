/**
 * Pretraga kataloga — tipovi i poređenje teksta.
 *
 * Ovaj fajl nema `server-only` namerno: isti kod koristi i ruta koja gradi
 * spisak i komponenta u browseru koja po njemu pretražuje. Pretraga se radi
 * kod korisnika, pa nema čekanja na server posle svakog otkucanog slova.
 */

export type SearchProduct = {
  slug: string;
  name: string;
  shade: string;
  /** Naziv linije kojoj proizvod pripada. */
  category: string;
  /** Sličica; prazno = prikazuje se sivi kvadrat. */
  image: string;
};

export type SearchCategory = {
  slug: string;
  label: string;
  /** Koliko proizvoda ima u liniji — stoji uz naziv u padajućem meniju. */
  count: number;
};

export type SearchIndex = {
  products: SearchProduct[];
  categories: SearchCategory[];
};

/** Najmanje slova pre nego što krene padajući meni. */
export const MIN_UPIT = 2;
/** Koliko rezultata najviše prikazujemo — duža lista se ionako ne čita. */
export const MAX_PROIZVODA = 8;
export const MAX_KATEGORIJA = 3;

const ZAMENE: Record<string, string> = {
  č: 'c',
  ć: 'c',
  š: 's',
  ž: 'z',
  đ: 'd',
};

/**
 * „Šampanj Ćurčić" → „sampanj curcic". Kupac ne kuca kvačice, a ni naši
 * nazivi ih ne koriste dosledno — bez ovoga „cistac" ne bi našao „čistač".
 */
export function normalizuj(tekst: string): string {
  return tekst
    .toLowerCase()
    .replace(/[čćšžđ]/g, (z) => ZAMENE[z] ?? z)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Upit se cepa na reči, pa „fiber blush" nalazi i kad reči nisu jedna do druge. */
export function reciUpita(upit: string): string[] {
  return normalizuj(upit).split(' ').filter(Boolean);
}

/** Tačno kada se red smatra pogotkom: svaka reč upita mora negde da se nađe. */
function pogodak(sadrzaj: string, reci: string[]): boolean {
  return reci.every((r) => sadrzaj.includes(r));
}

/** Tekst po kom se proizvod pretražuje — naziv, nijansa i linija zajedno. */
function sadrzajProizvoda(p: SearchProduct): string {
  return normalizuj(`${p.name} ${p.shade} ${p.category}`);
}

export type SearchRezultat = {
  kategorije: SearchCategory[];
  proizvodi: SearchProduct[];
  ukupnoProizvoda: number;
};

export function pretrazi(index: SearchIndex, upit: string): SearchRezultat {
  const reci = reciUpita(upit);
  if (reci.length === 0 || normalizuj(upit).length < MIN_UPIT) {
    return { kategorije: [], proizvodi: [], ukupnoProizvoda: 0 };
  }

  const kategorije = index.categories.filter((c) => pogodak(normalizuj(c.label), reci));

  const pogoci = index.products.filter((p) => pogodak(sadrzajProizvoda(p), reci));

  // Ono što počinje upitom ide gore — tako „nak" prvo ponudi „Naked Skin".
  const prvaRec = reci[0];
  const rangirani = [...pogoci].sort((a, b) => {
    const aRano = normalizuj(`${a.shade} ${a.name}`).startsWith(prvaRec) ? 0 : 1;
    const bRano = normalizuj(`${b.shade} ${b.name}`).startsWith(prvaRec) ? 0 : 1;
    if (aRano !== bRano) return aRano - bRano;
    return a.name.localeCompare(b.name, 'sr');
  });

  return {
    kategorije: kategorije.slice(0, MAX_KATEGORIJA),
    proizvodi: rangirani.slice(0, MAX_PROIZVODA),
    ukupnoProizvoda: pogoci.length,
  };
}

/** Naslov proizvoda u rezultatima — nijansa je ono po čemu se razlikuju. */
export function naslovProizvoda(p: SearchProduct): string {
  return p.shade ? `${p.name} — ${p.shade}` : p.name;
}
