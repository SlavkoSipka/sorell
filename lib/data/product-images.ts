/**
 * Privremene („placeholder") slike proizvoda.
 *
 * Ključ je slug proizvoda iz `lib/data/products.ts`, vrednost je putanja do
 * fajla u `/public`. Ovo su radne slike dok klijent ne okači prave fotografije
 * nijansi — čim se slika okači iz admin panela, `products.image_path` iz baze
 * ima prednost nad ovim (vidi `resolveImage` u lib/products-server.ts).
 *
 * Kad stignu fajlovi: ubaci ih u `public/proizvodi/` i dopiši red po proizvodu.
 * Proizvod bez unosa prikazuje siv okvir umesto slike — sajt i dalje radi.
 */
export const PLACEHOLDER_IMAGES: Record<string, string> = {};

export function placeholderImage(slug: string): string {
  return PLACEHOLDER_IMAGES[slug] ?? '';
}
