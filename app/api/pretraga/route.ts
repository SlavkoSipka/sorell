import { NextResponse } from 'next/server';
import { getSearchIndex } from '@/lib/search-server';

/**
 * Spisak za pretragu u jednom JSON-u.
 *
 * Browser ga povuče tek kad kupac prvi put otvori lupu, pa ostale stranice
 * ne nose taj teret. Posle toga se pretraga vrti lokalno, bez zahteva po
 * otkucanom slovu.
 */
export const revalidate = 60;

export async function GET() {
  try {
    const index = await getSearchIndex();
    return NextResponse.json(index, {
      headers: {
        // Isti prozor kao i katalog na sajtu; deljeni keš sme duže da ga drži.
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch {
    // Pretraga je dodatak — kad baza zakaže, lupa samo kaže da nema rezultata.
    return NextResponse.json({ products: [], categories: [] }, { status: 200 });
  }
}
