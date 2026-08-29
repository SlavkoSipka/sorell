/**
 * Katalog SORELLE — generisan iz tabele koju je poslao klijent
 * (SORELLE_proizvodi_za_sajt_NOVA_TABELA, list „Proizvodi za sajt").
 * Tekstovi su preneti doslovno; ne prepisuj ih ovde bez nove tabele.
 *
 * Cene NISU ovde. Svaka varijanta pakovanja ima svoju cenu u tabeli
 * `product_variants` (Supabase) i unosi se iz admin panela — dok cena
 * nije uneta, proizvod se prikazuje kao „Cena uskoro" i ne može da se poruči.
 *
 * Slike: nisu deo ovog fajla. Privremene su u `lib/data/product-images.ts`,
 * a slika okačena iz admina (`products.image_path`) ima prednost nad njom.
 */

/** Jedno pakovanje proizvoda (10 g / 30 g / 50 g, odnosno 10 ml / 15 ml). */
export interface ProductVariant {
  /** Kratka oznaka pakovanja bez razmaka — deo ključa varijante. */
  code: string;
  /** Naziv pakovanja kako se prikazuje na sajtu. */
  label: string;
}

export interface Product {
  slug: string;
  /** Kategorija sa lista „Pregled" — koristi se za grupisanje na /proizvodi. */
  category: string;
  categorySlug: string;
  /** Naziv linije doslovno iz tabele. */
  lineLabel: string;
  name: string;
  /** Naziv nijanse za prikaz; prazno kod proizvoda bez nijansi. */
  shade: string;
  /** Opis — ključne osobine, tačku po tačku iz tabele. */
  features: string[];
  howToUse: string;
  formulation: string;
  euCompliance: string;
  /** Sva pakovanja u jednom stringu, npr. „10 g / 30 g / 50 g". */
  packagesLabel: string;
  variants: ProductVariant[];
}

/** Ključ varijante u korpi, bazi i porudžbini: `slug--code`. */
export function variantKey(productSlug: string, variantCode: string): string {
  return `${productSlug}--${variantCode}`;
}

/** Puni naziv za korpu i porudžbinu: „Naziv — Nijansa (30 g)". */
export function variantDisplayName(product: Product, variant: ProductVariant): string {
  const base = product.shade ? `${product.name} — ${product.shade}` : product.name;
  return `${base} (${variant.label})`;
}

export const products: Product[] = [
  {
    slug: 'pro-fiber-naked-skin',
    category: 'Builder Gel – Pro Fiber Line',
    categorySlug: 'builder-gel-pro-fiber-line',
    lineLabel: 'BUILDER GEL – PRO FIBER LINE',
    name: 'Pro Fiber Builder Gel',
    shade: 'Naked Skin',
    features: [
      'Profesionalna formula pogodna i za početnike i za iskusne tehničare',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Fiber vlakna pružaju dodatnu čvrstinu i stabilnost',
      'Odličan balans fleksibilnosti i čvrstine',
      'Samonivelišuća tekstura koja se lako kontroliše i ne razliva',
      'Pogodan za rad na šablonima, dual tipsama i No File tehniku',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Pro Fiber Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'pro-fiber-silky-blush',
    category: 'Builder Gel – Pro Fiber Line',
    categorySlug: 'builder-gel-pro-fiber-line',
    lineLabel: 'BUILDER GEL – PRO FIBER LINE',
    name: 'Pro Fiber Builder Gel',
    shade: 'Silky Blush',
    features: [
      'Profesionalna formula pogodna i za početnike i za iskusne tehničare',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Fiber vlakna pružaju dodatnu čvrstinu i stabilnost',
      'Odličan balans fleksibilnosti i čvrstine',
      'Samonivelišuća tekstura koja se lako kontroliše i ne razliva',
      'Pogodan za rad na šablonima, dual tipsama i No File tehniku',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Pro Fiber Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'pro-fiber-natural-harmony',
    category: 'Builder Gel – Pro Fiber Line',
    categorySlug: 'builder-gel-pro-fiber-line',
    lineLabel: 'BUILDER GEL – PRO FIBER LINE',
    name: 'Pro Fiber Builder Gel',
    shade: 'Natural Harmony',
    features: [
      'Profesionalna formula pogodna i za početnike i za iskusne tehničare',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Fiber vlakna pružaju dodatnu čvrstinu i stabilnost',
      'Odličan balans fleksibilnosti i čvrstine',
      'Samonivelišuća tekstura koja se lako kontroliše i ne razliva',
      'Pogodan za rad na šablonima, dual tipsama i No File tehniku',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Pro Fiber Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'pro-fiber-cosmopolitan-pink',
    category: 'Builder Gel – Pro Fiber Line',
    categorySlug: 'builder-gel-pro-fiber-line',
    lineLabel: 'BUILDER GEL – PRO FIBER LINE',
    name: 'Pro Fiber Builder Gel',
    shade: 'Cosmopolitan Pink',
    features: [
      'Profesionalna formula pogodna i za početnike i za iskusne tehničare',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Fiber vlakna pružaju dodatnu čvrstinu i stabilnost',
      'Odličan balans fleksibilnosti i čvrstine',
      'Samonivelišuća tekstura koja se lako kontroliše i ne razliva',
      'Pogodan za rad na šablonima, dual tipsama i No File tehniku',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Pro Fiber Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'pro-fiber-perfect-milky-white',
    category: 'Builder Gel – Pro Fiber Line',
    categorySlug: 'builder-gel-pro-fiber-line',
    lineLabel: 'BUILDER GEL – PRO FIBER LINE',
    name: 'Pro Fiber Builder Gel',
    shade: 'Perfect Milky White',
    features: [
      'Profesionalna formula pogodna i za početnike i za iskusne tehničare',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Fiber vlakna pružaju dodatnu čvrstinu i stabilnost',
      'Odličan balans fleksibilnosti i čvrstine',
      'Samonivelišuća tekstura koja se lako kontroliše i ne razliva',
      'Pogodan za rad na šablonima, dual tipsama i No File tehniku',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Pro Fiber Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'pro-fiber-creamy-latte',
    category: 'Builder Gel – Pro Fiber Line',
    categorySlug: 'builder-gel-pro-fiber-line',
    lineLabel: 'BUILDER GEL – PRO FIBER LINE',
    name: 'Pro Fiber Builder Gel',
    shade: 'Creamy Latte',
    features: [
      'Profesionalna formula pogodna i za početnike i za iskusne tehničare',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Fiber vlakna pružaju dodatnu čvrstinu i stabilnost',
      'Odličan balans fleksibilnosti i čvrstine',
      'Samonivelišuća tekstura koja se lako kontroliše i ne razliva',
      'Pogodan za rad na šablonima, dual tipsama i No File tehniku',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Pro Fiber Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'pro-fiber-angel-pink',
    category: 'Builder Gel – Pro Fiber Line',
    categorySlug: 'builder-gel-pro-fiber-line',
    lineLabel: 'BUILDER GEL – PRO FIBER LINE',
    name: 'Pro Fiber Builder Gel',
    shade: 'Angel Pink',
    features: [
      'Profesionalna formula pogodna i za početnike i za iskusne tehničare',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Fiber vlakna pružaju dodatnu čvrstinu i stabilnost',
      'Odličan balans fleksibilnosti i čvrstine',
      'Samonivelišuća tekstura koja se lako kontroliše i ne razliva',
      'Pogodan za rad na šablonima, dual tipsama i No File tehniku',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Pro Fiber Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'pro-fiber-soft-milky-white',
    category: 'Builder Gel – Pro Fiber Line',
    categorySlug: 'builder-gel-pro-fiber-line',
    lineLabel: 'BUILDER GEL – PRO FIBER LINE',
    name: 'Pro Fiber Builder Gel',
    shade: 'Soft Milky White',
    features: [
      'Profesionalna formula pogodna i za početnike i za iskusne tehničare',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Fiber vlakna pružaju dodatnu čvrstinu i stabilnost',
      'Odličan balans fleksibilnosti i čvrstine',
      'Samonivelišuća tekstura koja se lako kontroliše i ne razliva',
      'Pogodan za rad na šablonima, dual tipsama i No File tehniku',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Pro Fiber Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'fluid-perfect-cool-milky-white',
    category: 'Builder Gel – Fluid Perfect',
    categorySlug: 'builder-gel-fluid-perfect',
    lineLabel: 'BUILDER GEL – FLUID PERFECT',
    name: 'Fluid Perfect Builder Gel',
    shade: 'Cool Milky White',
    features: [
      'Fluidna, samonivelišuća formula za brz i precizan rad',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Ređa struktura omogućava lako raspoređivanje i glatko nivelisanje',
      'Odličan izbor za tehničare koji vole brži rad uz dobru kontrolu materijala',
      'Pogodan za No File tehniku',
      'Može se koristiti za rad na šablonima i dual tipsama',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Fluid Perfect Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'fluid-perfect-crystal-ice-pink',
    category: 'Builder Gel – Fluid Perfect',
    categorySlug: 'builder-gel-fluid-perfect',
    lineLabel: 'BUILDER GEL – FLUID PERFECT',
    name: 'Fluid Perfect Builder Gel',
    shade: 'Crystal Ice Pink',
    features: [
      'Fluidna, samonivelišuća formula za brz i precizan rad',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Ređa struktura omogućava lako raspoređivanje i glatko nivelisanje',
      'Odličan izbor za tehničare koji vole brži rad uz dobru kontrolu materijala',
      'Pogodan za No File tehniku',
      'Može se koristiti za rad na šablonima i dual tipsama',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Fluid Perfect Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'fluid-perfect-pink-sensational',
    category: 'Builder Gel – Fluid Perfect',
    categorySlug: 'builder-gel-fluid-perfect',
    lineLabel: 'BUILDER GEL – FLUID PERFECT',
    name: 'Fluid Perfect Builder Gel',
    shade: 'Pink Sensational',
    features: [
      'Fluidna, samonivelišuća formula za brz i precizan rad',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Ređa struktura omogućava lako raspoređivanje i glatko nivelisanje',
      'Odličan izbor za tehničare koji vole brži rad uz dobru kontrolu materijala',
      'Pogodan za No File tehniku',
      'Može se koristiti za rad na šablonima i dual tipsama',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Fluid Perfect Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'fluid-perfect-cashmere-rose',
    category: 'Builder Gel – Fluid Perfect',
    categorySlug: 'builder-gel-fluid-perfect',
    lineLabel: 'BUILDER GEL – FLUID PERFECT',
    name: 'Fluid Perfect Builder Gel',
    shade: 'Cashmere Rose',
    features: [
      'Fluidna, samonivelišuća formula za brz i precizan rad',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Ređa struktura omogućava lako raspoređivanje i glatko nivelisanje',
      'Odličan izbor za tehničare koji vole brži rad uz dobru kontrolu materijala',
      'Pogodan za No File tehniku',
      'Može se koristiti za rad na šablonima i dual tipsama',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Fluid Perfect Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'fluid-perfect-rich-worm-nude',
    category: 'Builder Gel – Fluid Perfect',
    categorySlug: 'builder-gel-fluid-perfect',
    lineLabel: 'BUILDER GEL – FLUID PERFECT',
    name: 'Fluid Perfect Builder Gel',
    shade: 'Rich Worm Nude',
    features: [
      'Fluidna, samonivelišuća formula za brz i precizan rad',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Ređa struktura omogućava lako raspoređivanje i glatko nivelisanje',
      'Odličan izbor za tehničare koji vole brži rad uz dobru kontrolu materijala',
      'Pogodan za No File tehniku',
      'Može se koristiti za rad na šablonima i dual tipsama',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Fluid Perfect Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'fluid-perfect-rich-deep-nude',
    category: 'Builder Gel – Fluid Perfect',
    categorySlug: 'builder-gel-fluid-perfect',
    lineLabel: 'BUILDER GEL – FLUID PERFECT',
    name: 'Fluid Perfect Builder Gel',
    shade: 'Rich Deep Nude',
    features: [
      'Fluidna, samonivelišuća formula za brz i precizan rad',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Ređa struktura omogućava lako raspoređivanje i glatko nivelisanje',
      'Odličan izbor za tehničare koji vole brži rad uz dobru kontrolu materijala',
      'Pogodan za No File tehniku',
      'Može se koristiti za rad na šablonima i dual tipsama',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Fluid Perfect Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'fluid-perfect-rich-cold-nude',
    category: 'Builder Gel – Fluid Perfect',
    categorySlug: 'builder-gel-fluid-perfect',
    lineLabel: 'BUILDER GEL – FLUID PERFECT',
    name: 'Fluid Perfect Builder Gel',
    shade: 'Rich Cold Nude',
    features: [
      'Fluidna, samonivelišuća formula za brz i precizan rad',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Ređa struktura omogućava lako raspoređivanje i glatko nivelisanje',
      'Odličan izbor za tehničare koji vole brži rad uz dobru kontrolu materijala',
      'Pogodan za No File tehniku',
      'Može se koristiti za rad na šablonima i dual tipsama',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Fluid Perfect Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'fluid-perfect-clear',
    category: 'Builder Gel – Fluid Perfect',
    categorySlug: 'builder-gel-fluid-perfect',
    lineLabel: 'BUILDER GEL – FLUID PERFECT',
    name: 'Fluid Perfect Builder Gel',
    shade: 'Clear',
    features: [
      'Fluidna, samonivelišuća formula za brz i precizan rad',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Ređa struktura omogućava lako raspoređivanje i glatko nivelisanje',
      'Odličan izbor za tehničare koji vole brži rad uz dobru kontrolu materijala',
      'Pogodan za No File tehniku',
      'Može se koristiti za rad na šablonima i dual tipsama',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Fluid Perfect Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'fluid-perfect-jogurt-banana',
    category: 'Builder Gel – Fluid Perfect',
    categorySlug: 'builder-gel-fluid-perfect',
    lineLabel: 'BUILDER GEL – FLUID PERFECT',
    name: 'Fluid Perfect Builder Gel',
    shade: 'Jogurt Banana',
    features: [
      'Fluidna, samonivelišuća formula za brz i precizan rad',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Ređa struktura omogućava lako raspoređivanje i glatko nivelisanje',
      'Odličan izbor za tehničare koji vole brži rad uz dobru kontrolu materijala',
      'Pogodan za No File tehniku',
      'Može se koristiti za rad na šablonima i dual tipsama',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Fluid Perfect Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'fluid-perfect-jogurt-lavander-milk',
    category: 'Builder Gel – Fluid Perfect',
    categorySlug: 'builder-gel-fluid-perfect',
    lineLabel: 'BUILDER GEL – FLUID PERFECT',
    name: 'Fluid Perfect Builder Gel',
    shade: 'Jogurt Lavander Milk',
    features: [
      'Fluidna, samonivelišuća formula za brz i precizan rad',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Ređa struktura omogućava lako raspoređivanje i glatko nivelisanje',
      'Odličan izbor za tehničare koji vole brži rad uz dobru kontrolu materijala',
      'Pogodan za No File tehniku',
      'Može se koristiti za rad na šablonima i dual tipsama',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Fluid Perfect Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'fluid-perfect-jogurt-blue-raspberry',
    category: 'Builder Gel – Fluid Perfect',
    categorySlug: 'builder-gel-fluid-perfect',
    lineLabel: 'BUILDER GEL – FLUID PERFECT',
    name: 'Fluid Perfect Builder Gel',
    shade: 'Jogurt Blue Raspberry',
    features: [
      'Fluidna, samonivelišuća formula za brz i precizan rad',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Ređa struktura omogućava lako raspoređivanje i glatko nivelisanje',
      'Odličan izbor za tehničare koji vole brži rad uz dobru kontrolu materijala',
      'Pogodan za No File tehniku',
      'Može se koristiti za rad na šablonima i dual tipsama',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Fluid Perfect Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'fluid-perfect-jogurt-fresh-mint',
    category: 'Builder Gel – Fluid Perfect',
    categorySlug: 'builder-gel-fluid-perfect',
    lineLabel: 'BUILDER GEL – FLUID PERFECT',
    name: 'Fluid Perfect Builder Gel',
    shade: 'Jogurt Fresh Mint',
    features: [
      'Fluidna, samonivelišuća formula za brz i precizan rad',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Ređa struktura omogućava lako raspoređivanje i glatko nivelisanje',
      'Odličan izbor za tehničare koji vole brži rad uz dobru kontrolu materijala',
      'Pogodan za No File tehniku',
      'Može se koristiti za rad na šablonima i dual tipsama',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Fluid Perfect Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'fluid-perfect-natural-perfection',
    category: 'Builder Gel – Fluid Perfect',
    categorySlug: 'builder-gel-fluid-perfect',
    lineLabel: 'BUILDER GEL – FLUID PERFECT',
    name: 'Fluid Perfect Builder Gel',
    shade: 'Natural Perfection',
    features: [
      'Fluidna, samonivelišuća formula za brz i precizan rad',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Ređa struktura omogućava lako raspoređivanje i glatko nivelisanje',
      'Odličan izbor za tehničare koji vole brži rad uz dobru kontrolu materijala',
      'Pogodan za No File tehniku',
      'Može se koristiti za rad na šablonima i dual tipsama',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Fluid Perfect Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'fluid-perfect-royal-beige',
    category: 'Builder Gel – Fluid Perfect',
    categorySlug: 'builder-gel-fluid-perfect',
    lineLabel: 'BUILDER GEL – FLUID PERFECT',
    name: 'Fluid Perfect Builder Gel',
    shade: 'Royal Beige',
    features: [
      'Fluidna, samonivelišuća formula za brz i precizan rad',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Ređa struktura omogućava lako raspoređivanje i glatko nivelisanje',
      'Odličan izbor za tehničare koji vole brži rad uz dobru kontrolu materijala',
      'Pogodan za No File tehniku',
      'Može se koristiti za rad na šablonima i dual tipsama',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Fluid Perfect Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'fluid-perfect-jogurt-melon-cream',
    category: 'Builder Gel – Fluid Perfect',
    categorySlug: 'builder-gel-fluid-perfect',
    lineLabel: 'BUILDER GEL – FLUID PERFECT',
    name: 'Fluid Perfect Builder Gel',
    shade: 'Jogurt Melon Cream',
    features: [
      'Fluidna, samonivelišuća formula za brz i precizan rad',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Ređa struktura omogućava lako raspoređivanje i glatko nivelisanje',
      'Odličan izbor za tehničare koji vole brži rad uz dobru kontrolu materijala',
      'Pogodan za No File tehniku',
      'Može se koristiti za rad na šablonima i dual tipsama',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Fluid Perfect Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'fluid-perfect-jogurt-ice-berry-milk',
    category: 'Builder Gel – Fluid Perfect',
    categorySlug: 'builder-gel-fluid-perfect',
    lineLabel: 'BUILDER GEL – FLUID PERFECT',
    name: 'Fluid Perfect Builder Gel',
    shade: 'Jogurt Ice Berry Milk',
    features: [
      'Fluidna, samonivelišuća formula za brz i precizan rad',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Ređa struktura omogućava lako raspoređivanje i glatko nivelisanje',
      'Odličan izbor za tehničare koji vole brži rad uz dobru kontrolu materijala',
      'Pogodan za No File tehniku',
      'Može se koristiti za rad na šablonima i dual tipsama',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Fluid Perfect Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'fluid-perfect-jogurt-sweet-strawberry',
    category: 'Builder Gel – Fluid Perfect',
    categorySlug: 'builder-gel-fluid-perfect',
    lineLabel: 'BUILDER GEL – FLUID PERFECT',
    name: 'Fluid Perfect Builder Gel',
    shade: 'Jogurt Sweet Strawberry',
    features: [
      'Fluidna, samonivelišuća formula za brz i precizan rad',
      'Namenjen za izlivanje, ojačavanje i korekcije noktiju',
      'Ređa struktura omogućava lako raspoređivanje i glatko nivelisanje',
      'Odličan izbor za tehničare koji vole brži rad uz dobru kontrolu materijala',
      'Pogodan za No File tehniku',
      'Može se koristiti za rad na šablonima i dual tipsama',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti Sorelle Pro Base kao preporučenu podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Fluid Perfect Builder Gel odabranom tehnikom i polimerizovati 90–120 sekundi. Završiti Sorelle završnim sjajem po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 g / 30 g / 50 g',
    variants: [
      { code: '10g', label: '10 g' },
      { code: '30g', label: '30 g' },
      { code: '50g', label: '50 g' },
    ],
  },
  {
    slug: 'rubber-base-cool-milky-white',
    category: 'Rubber Base – Camouflage',
    categorySlug: 'rubber-base-camouflage',
    lineLabel: 'RUBBER BASE – CAMOUFLAGE',
    name: 'Rubber Base Camouflage',
    shade: 'Cool Milky White',
    features: [
      'Fleksibilna formula namenjena ojačavanju prirodnih noktiju',
      'Posebno pogodna za kraće nokte i tehniku nivelisanja',
      'Ređa, samonivelišuća struktura koja se lako raspoređuje',
      'Nije namenjena za izlivanje',
      'Kamuflažne nijanse daju uredan i prirodan završni izgled',
      'Idealna za brzo i precizno salonsko ojačavanje noktiju',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti tanak sloj Sorelle Pro Base kao podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Rubber Base tehnikom nivelisanja i polimerizovati 90–120 sekundi. Nastaviti dizajnom ili završiti Sorelle topom po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 ml / 15 ml',
    variants: [
      { code: '10ml', label: '10 ml' },
      { code: '15ml', label: '15 ml' },
    ],
  },
  {
    slug: 'rubber-base-crystal-ice-pink',
    category: 'Rubber Base – Camouflage',
    categorySlug: 'rubber-base-camouflage',
    lineLabel: 'RUBBER BASE – CAMOUFLAGE',
    name: 'Rubber Base Camouflage',
    shade: 'Crystal Ice Pink',
    features: [
      'Fleksibilna formula namenjena ojačavanju prirodnih noktiju',
      'Posebno pogodna za kraće nokte i tehniku nivelisanja',
      'Ređa, samonivelišuća struktura koja se lako raspoređuje',
      'Nije namenjena za izlivanje',
      'Kamuflažne nijanse daju uredan i prirodan završni izgled',
      'Idealna za brzo i precizno salonsko ojačavanje noktiju',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti tanak sloj Sorelle Pro Base kao podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Rubber Base tehnikom nivelisanja i polimerizovati 90–120 sekundi. Nastaviti dizajnom ili završiti Sorelle topom po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 ml / 15 ml',
    variants: [
      { code: '10ml', label: '10 ml' },
      { code: '15ml', label: '15 ml' },
    ],
  },
  {
    slug: 'rubber-base-pink-sensational',
    category: 'Rubber Base – Camouflage',
    categorySlug: 'rubber-base-camouflage',
    lineLabel: 'RUBBER BASE – CAMOUFLAGE',
    name: 'Rubber Base Camouflage',
    shade: 'Pink Sensational',
    features: [
      'Fleksibilna formula namenjena ojačavanju prirodnih noktiju',
      'Posebno pogodna za kraće nokte i tehniku nivelisanja',
      'Ređa, samonivelišuća struktura koja se lako raspoređuje',
      'Nije namenjena za izlivanje',
      'Kamuflažne nijanse daju uredan i prirodan završni izgled',
      'Idealna za brzo i precizno salonsko ojačavanje noktiju',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti tanak sloj Sorelle Pro Base kao podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Rubber Base tehnikom nivelisanja i polimerizovati 90–120 sekundi. Nastaviti dizajnom ili završiti Sorelle topom po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 ml / 15 ml',
    variants: [
      { code: '10ml', label: '10 ml' },
      { code: '15ml', label: '15 ml' },
    ],
  },
  {
    slug: 'rubber-base-cashmere-rose',
    category: 'Rubber Base – Camouflage',
    categorySlug: 'rubber-base-camouflage',
    lineLabel: 'RUBBER BASE – CAMOUFLAGE',
    name: 'Rubber Base Camouflage',
    shade: 'Cashmere Rose',
    features: [
      'Fleksibilna formula namenjena ojačavanju prirodnih noktiju',
      'Posebno pogodna za kraće nokte i tehniku nivelisanja',
      'Ređa, samonivelišuća struktura koja se lako raspoređuje',
      'Nije namenjena za izlivanje',
      'Kamuflažne nijanse daju uredan i prirodan završni izgled',
      'Idealna za brzo i precizno salonsko ojačavanje noktiju',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti tanak sloj Sorelle Pro Base kao podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Rubber Base tehnikom nivelisanja i polimerizovati 90–120 sekundi. Nastaviti dizajnom ili završiti Sorelle topom po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 ml / 15 ml',
    variants: [
      { code: '10ml', label: '10 ml' },
      { code: '15ml', label: '15 ml' },
    ],
  },
  {
    slug: 'rubber-base-rich-worm-nude',
    category: 'Rubber Base – Camouflage',
    categorySlug: 'rubber-base-camouflage',
    lineLabel: 'RUBBER BASE – CAMOUFLAGE',
    name: 'Rubber Base Camouflage',
    shade: 'Rich Worm Nude',
    features: [
      'Fleksibilna formula namenjena ojačavanju prirodnih noktiju',
      'Posebno pogodna za kraće nokte i tehniku nivelisanja',
      'Ređa, samonivelišuća struktura koja se lako raspoređuje',
      'Nije namenjena za izlivanje',
      'Kamuflažne nijanse daju uredan i prirodan završni izgled',
      'Idealna za brzo i precizno salonsko ojačavanje noktiju',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti tanak sloj Sorelle Pro Base kao podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Rubber Base tehnikom nivelisanja i polimerizovati 90–120 sekundi. Nastaviti dizajnom ili završiti Sorelle topom po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 ml / 15 ml',
    variants: [
      { code: '10ml', label: '10 ml' },
      { code: '15ml', label: '15 ml' },
    ],
  },
  {
    slug: 'rubber-base-rich-deep-nude',
    category: 'Rubber Base – Camouflage',
    categorySlug: 'rubber-base-camouflage',
    lineLabel: 'RUBBER BASE – CAMOUFLAGE',
    name: 'Rubber Base Camouflage',
    shade: 'Rich Deep Nude',
    features: [
      'Fleksibilna formula namenjena ojačavanju prirodnih noktiju',
      'Posebno pogodna za kraće nokte i tehniku nivelisanja',
      'Ređa, samonivelišuća struktura koja se lako raspoređuje',
      'Nije namenjena za izlivanje',
      'Kamuflažne nijanse daju uredan i prirodan završni izgled',
      'Idealna za brzo i precizno salonsko ojačavanje noktiju',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti tanak sloj Sorelle Pro Base kao podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Rubber Base tehnikom nivelisanja i polimerizovati 90–120 sekundi. Nastaviti dizajnom ili završiti Sorelle topom po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 ml / 15 ml',
    variants: [
      { code: '10ml', label: '10 ml' },
      { code: '15ml', label: '15 ml' },
    ],
  },
  {
    slug: 'rubber-base-rich-cold-nude',
    category: 'Rubber Base – Camouflage',
    categorySlug: 'rubber-base-camouflage',
    lineLabel: 'RUBBER BASE – CAMOUFLAGE',
    name: 'Rubber Base Camouflage',
    shade: 'Rich Cold Nude',
    features: [
      'Fleksibilna formula namenjena ojačavanju prirodnih noktiju',
      'Posebno pogodna za kraće nokte i tehniku nivelisanja',
      'Ređa, samonivelišuća struktura koja se lako raspoređuje',
      'Nije namenjena za izlivanje',
      'Kamuflažne nijanse daju uredan i prirodan završni izgled',
      'Idealna za brzo i precizno salonsko ojačavanje noktiju',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti tanak sloj Sorelle Pro Base kao podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Rubber Base tehnikom nivelisanja i polimerizovati 90–120 sekundi. Nastaviti dizajnom ili završiti Sorelle topom po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 ml / 15 ml',
    variants: [
      { code: '10ml', label: '10 ml' },
      { code: '15ml', label: '15 ml' },
    ],
  },
  {
    slug: 'rubber-base-clear',
    category: 'Rubber Base – Camouflage',
    categorySlug: 'rubber-base-camouflage',
    lineLabel: 'RUBBER BASE – CAMOUFLAGE',
    name: 'Rubber Base Camouflage',
    shade: 'Clear',
    features: [
      'Fleksibilna formula namenjena ojačavanju prirodnih noktiju',
      'Posebno pogodna za kraće nokte i tehniku nivelisanja',
      'Ređa, samonivelišuća struktura koja se lako raspoređuje',
      'Nije namenjena za izlivanje',
      'Kamuflažne nijanse daju uredan i prirodan završni izgled',
      'Idealna za brzo i precizno salonsko ojačavanje noktiju',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti tanak sloj Sorelle Pro Base kao podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Rubber Base tehnikom nivelisanja i polimerizovati 90–120 sekundi. Nastaviti dizajnom ili završiti Sorelle topom po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 ml / 15 ml',
    variants: [
      { code: '10ml', label: '10 ml' },
      { code: '15ml', label: '15 ml' },
    ],
  },
  {
    slug: 'rubber-base-jogurt-banana',
    category: 'Rubber Base – Camouflage',
    categorySlug: 'rubber-base-camouflage',
    lineLabel: 'RUBBER BASE – CAMOUFLAGE',
    name: 'Rubber Base Camouflage',
    shade: 'Jogurt Banana',
    features: [
      'Fleksibilna formula namenjena ojačavanju prirodnih noktiju',
      'Posebno pogodna za kraće nokte i tehniku nivelisanja',
      'Ređa, samonivelišuća struktura koja se lako raspoređuje',
      'Nije namenjena za izlivanje',
      'Kamuflažne nijanse daju uredan i prirodan završni izgled',
      'Idealna za brzo i precizno salonsko ojačavanje noktiju',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti tanak sloj Sorelle Pro Base kao podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Rubber Base tehnikom nivelisanja i polimerizovati 90–120 sekundi. Nastaviti dizajnom ili završiti Sorelle topom po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 ml / 15 ml',
    variants: [
      { code: '10ml', label: '10 ml' },
      { code: '15ml', label: '15 ml' },
    ],
  },
  {
    slug: 'rubber-base-jogurt-lavander-milk',
    category: 'Rubber Base – Camouflage',
    categorySlug: 'rubber-base-camouflage',
    lineLabel: 'RUBBER BASE – CAMOUFLAGE',
    name: 'Rubber Base Camouflage',
    shade: 'Jogurt Lavander Milk',
    features: [
      'Fleksibilna formula namenjena ojačavanju prirodnih noktiju',
      'Posebno pogodna za kraće nokte i tehniku nivelisanja',
      'Ređa, samonivelišuća struktura koja se lako raspoređuje',
      'Nije namenjena za izlivanje',
      'Kamuflažne nijanse daju uredan i prirodan završni izgled',
      'Idealna za brzo i precizno salonsko ojačavanje noktiju',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti tanak sloj Sorelle Pro Base kao podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Rubber Base tehnikom nivelisanja i polimerizovati 90–120 sekundi. Nastaviti dizajnom ili završiti Sorelle topom po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 ml / 15 ml',
    variants: [
      { code: '10ml', label: '10 ml' },
      { code: '15ml', label: '15 ml' },
    ],
  },
  {
    slug: 'rubber-base-jogurt-blue-raspberry',
    category: 'Rubber Base – Camouflage',
    categorySlug: 'rubber-base-camouflage',
    lineLabel: 'RUBBER BASE – CAMOUFLAGE',
    name: 'Rubber Base Camouflage',
    shade: 'Jogurt Blue Raspberry',
    features: [
      'Fleksibilna formula namenjena ojačavanju prirodnih noktiju',
      'Posebno pogodna za kraće nokte i tehniku nivelisanja',
      'Ređa, samonivelišuća struktura koja se lako raspoređuje',
      'Nije namenjena za izlivanje',
      'Kamuflažne nijanse daju uredan i prirodan završni izgled',
      'Idealna za brzo i precizno salonsko ojačavanje noktiju',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti tanak sloj Sorelle Pro Base kao podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Rubber Base tehnikom nivelisanja i polimerizovati 90–120 sekundi. Nastaviti dizajnom ili završiti Sorelle topom po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 ml / 15 ml',
    variants: [
      { code: '10ml', label: '10 ml' },
      { code: '15ml', label: '15 ml' },
    ],
  },
  {
    slug: 'rubber-base-jogurt-fresh-mint',
    category: 'Rubber Base – Camouflage',
    categorySlug: 'rubber-base-camouflage',
    lineLabel: 'RUBBER BASE – CAMOUFLAGE',
    name: 'Rubber Base Camouflage',
    shade: 'Jogurt Fresh Mint',
    features: [
      'Fleksibilna formula namenjena ojačavanju prirodnih noktiju',
      'Posebno pogodna za kraće nokte i tehniku nivelisanja',
      'Ređa, samonivelišuća struktura koja se lako raspoređuje',
      'Nije namenjena za izlivanje',
      'Kamuflažne nijanse daju uredan i prirodan završni izgled',
      'Idealna za brzo i precizno salonsko ojačavanje noktiju',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti tanak sloj Sorelle Pro Base kao podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Rubber Base tehnikom nivelisanja i polimerizovati 90–120 sekundi. Nastaviti dizajnom ili završiti Sorelle topom po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 ml / 15 ml',
    variants: [
      { code: '10ml', label: '10 ml' },
      { code: '15ml', label: '15 ml' },
    ],
  },
  {
    slug: 'rubber-base-natural-perfection',
    category: 'Rubber Base – Camouflage',
    categorySlug: 'rubber-base-camouflage',
    lineLabel: 'RUBBER BASE – CAMOUFLAGE',
    name: 'Rubber Base Camouflage',
    shade: 'Natural Perfection',
    features: [
      'Fleksibilna formula namenjena ojačavanju prirodnih noktiju',
      'Posebno pogodna za kraće nokte i tehniku nivelisanja',
      'Ređa, samonivelišuća struktura koja se lako raspoređuje',
      'Nije namenjena za izlivanje',
      'Kamuflažne nijanse daju uredan i prirodan završni izgled',
      'Idealna za brzo i precizno salonsko ojačavanje noktiju',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti tanak sloj Sorelle Pro Base kao podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Rubber Base tehnikom nivelisanja i polimerizovati 90–120 sekundi. Nastaviti dizajnom ili završiti Sorelle topom po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 ml / 15 ml',
    variants: [
      { code: '10ml', label: '10 ml' },
      { code: '15ml', label: '15 ml' },
    ],
  },
  {
    slug: 'rubber-base-royal-beige',
    category: 'Rubber Base – Camouflage',
    categorySlug: 'rubber-base-camouflage',
    lineLabel: 'RUBBER BASE – CAMOUFLAGE',
    name: 'Rubber Base Camouflage',
    shade: 'Royal Beige',
    features: [
      'Fleksibilna formula namenjena ojačavanju prirodnih noktiju',
      'Posebno pogodna za kraće nokte i tehniku nivelisanja',
      'Ređa, samonivelišuća struktura koja se lako raspoređuje',
      'Nije namenjena za izlivanje',
      'Kamuflažne nijanse daju uredan i prirodan završni izgled',
      'Idealna za brzo i precizno salonsko ojačavanje noktiju',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti tanak sloj Sorelle Pro Base kao podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Rubber Base tehnikom nivelisanja i polimerizovati 90–120 sekundi. Nastaviti dizajnom ili završiti Sorelle topom po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 ml / 15 ml',
    variants: [
      { code: '10ml', label: '10 ml' },
      { code: '15ml', label: '15 ml' },
    ],
  },
  {
    slug: 'rubber-base-jogurt-melon-cream',
    category: 'Rubber Base – Camouflage',
    categorySlug: 'rubber-base-camouflage',
    lineLabel: 'RUBBER BASE – CAMOUFLAGE',
    name: 'Rubber Base Camouflage',
    shade: 'Jogurt Melon Cream',
    features: [
      'Fleksibilna formula namenjena ojačavanju prirodnih noktiju',
      'Posebno pogodna za kraće nokte i tehniku nivelisanja',
      'Ređa, samonivelišuća struktura koja se lako raspoređuje',
      'Nije namenjena za izlivanje',
      'Kamuflažne nijanse daju uredan i prirodan završni izgled',
      'Idealna za brzo i precizno salonsko ojačavanje noktiju',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti tanak sloj Sorelle Pro Base kao podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Rubber Base tehnikom nivelisanja i polimerizovati 90–120 sekundi. Nastaviti dizajnom ili završiti Sorelle topom po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 ml / 15 ml',
    variants: [
      { code: '10ml', label: '10 ml' },
      { code: '15ml', label: '15 ml' },
    ],
  },
  {
    slug: 'rubber-base-jogurt-ice-berry-milk',
    category: 'Rubber Base – Camouflage',
    categorySlug: 'rubber-base-camouflage',
    lineLabel: 'RUBBER BASE – CAMOUFLAGE',
    name: 'Rubber Base Camouflage',
    shade: 'Jogurt Ice Berry Milk',
    features: [
      'Fleksibilna formula namenjena ojačavanju prirodnih noktiju',
      'Posebno pogodna za kraće nokte i tehniku nivelisanja',
      'Ređa, samonivelišuća struktura koja se lako raspoređuje',
      'Nije namenjena za izlivanje',
      'Kamuflažne nijanse daju uredan i prirodan završni izgled',
      'Idealna za brzo i precizno salonsko ojačavanje noktiju',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti tanak sloj Sorelle Pro Base kao podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Rubber Base tehnikom nivelisanja i polimerizovati 90–120 sekundi. Nastaviti dizajnom ili završiti Sorelle topom po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 ml / 15 ml',
    variants: [
      { code: '10ml', label: '10 ml' },
      { code: '15ml', label: '15 ml' },
    ],
  },
  {
    slug: 'rubber-base-jogurt-sweet-strawberry',
    category: 'Rubber Base – Camouflage',
    categorySlug: 'rubber-base-camouflage',
    lineLabel: 'RUBBER BASE – CAMOUFLAGE',
    name: 'Rubber Base Camouflage',
    shade: 'Jogurt Sweet Strawberry',
    features: [
      'Fleksibilna formula namenjena ojačavanju prirodnih noktiju',
      'Posebno pogodna za kraće nokte i tehniku nivelisanja',
      'Ređa, samonivelišuća struktura koja se lako raspoređuje',
      'Nije namenjena za izlivanje',
      'Kamuflažne nijanse daju uredan i prirodan završni izgled',
      'Idealna za brzo i precizno salonsko ojačavanje noktiju',
    ],
    howToUse:
      'Pripremiti i matirati nokatnu ploču i očistiti alkoholom. Naneti tanak sloj Sorelle Pro Base kao podlogu i polimerizovati 90–120 sekundi u UV/LED lampi. Zatim naneti Rubber Base tehnikom nivelisanja i polimerizovati 90–120 sekundi. Nastaviti dizajnom ili završiti Sorelle topom po izboru.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 ml / 15 ml',
    variants: [
      { code: '10ml', label: '10 ml' },
      { code: '15ml', label: '15 ml' },
    ],
  },
  {
    slug: 'pro-base-clear',
    category: 'Pro Base – Clear',
    categorySlug: 'pro-base-clear',
    lineLabel: 'PRO BASE – CLEAR',
    name: 'Pro Base Clear',
    shade: '',
    features: [
      'Univerzalna providna baza idealna za sve tipove noktiju',
      'Obezbeđuje odlično prijanjanje uz nokatnu ploču',
      'Odlična podloga za Sorelle gradivne gelove',
      'Nisu potrebne dodatne pripremne tečnosti pre nanošenja',
      'Može se koristiti i za ojačavanje prirodnih noktiju tehnikom nivelisanja',
      'Jednostavna za rad i pogodna za početnike i profesionalce',
    ],
    howToUse:
      'Kao podloga za Sorelle gradivne gelove: naneti tanak sloj Pro Base na pripremljen nokat i polimerizovati 90–120 sekundi u UV/LED lampi, zatim nastaviti odabranim Sorelle gradivnim gelom. Za ojačavanje: naneti i iznivelisati Pro Base, pa polimerizovati 90–120 sekundi.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 ml / 15 ml',
    variants: [
      { code: '10ml', label: '10 ml' },
      { code: '15ml', label: '15 ml' },
    ],
  },
  {
    slug: 'super-shine-top-coat',
    category: 'Super Shine Top Coat',
    categorySlug: 'super-shine-top-coat',
    lineLabel: 'SUPER SHINE TOP COAT',
    name: 'Super Shine Top Coat',
    shade: '',
    features: [
      'Završni sjaj namenjen zatvaranju kompletnog dizajna',
      'Odlična tekstura omogućava lako i ravnomerno nanošenje',
      'Daje noktima izražen, ujednačen sjaj koji traje do korekcije',
      'Završnom radu daje čist i uredan finiš',
    ],
    howToUse:
      'Naneti tanak i ravnomeran sloj na završen dizajn i polimerizovati 90–120 sekundi u UV/LED lampi.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 ml / 15 ml',
    variants: [
      { code: '10ml', label: '10 ml' },
      { code: '15ml', label: '15 ml' },
    ],
  },
  {
    slug: 'effect-top-coat-milky',
    category: 'Effect Top Coat – Milky',
    categorySlug: 'effect-top-coat-milky',
    lineLabel: 'EFFECT TOP COAT – MILKY',
    name: 'Effect Top Coat Milky',
    shade: '',
    features: [
      'Efektni završni sjaj sa nežnim mlečnim efektom',
      'Daje noktima mekši, ujednačen i elegantan završni izgled',
      'Idealan kada želite da ublažite postojeću nijansu i dodate mlečni finiš',
      'Služi za zatvaranje dizajna',
      'Sjaj i efekat u jednom završnom koraku',
    ],
    howToUse:
      'Naneti tanak i ravnomeran sloj preko završenog dizajna i polimerizovati 90–120 sekundi u UV/LED lampi.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 ml / 15 ml',
    variants: [
      { code: '10ml', label: '10 ml' },
      { code: '15ml', label: '15 ml' },
    ],
  },
  {
    slug: 'effect-top-coat-shimmer-vibe',
    category: 'Effect Top Coat – Shimmer Vibe',
    categorySlug: 'effect-top-coat-shimmer-vibe',
    lineLabel: 'EFFECT TOP COAT – SHIMMER VIBE',
    name: 'Effect Top Coat Shimmer Vibe',
    shade: '',
    features: [
      'Efektni završni sjaj sa nežnim shimmer/bisernim efektom',
      'Daje dodatnu dimenziju i poseban finiš postojećoj nijansi',
      'Može promeniti završni izgled manikira bez dodatnog dizajna',
      'Služi za zatvaranje dizajna',
      'Sjaj i efekat u jednom završnom koraku',
    ],
    howToUse:
      'Naneti tanak i ravnomeran sloj preko završenog dizajna i polimerizovati 90–120 sekundi u UV/LED lampi.',
    formulation: 'HEMA Free • Di-HEMA Free • TPO Free',
    euCompliance: 'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
    packagesLabel: '10 ml / 15 ml',
    variants: [
      { code: '10ml', label: '10 ml' },
      { code: '15ml', label: '15 ml' },
    ],
  },
];

const BY_SLUG = new Map(products.map((p) => [p.slug, p]));

export function getProductBySlug(slug: string): Product | undefined {
  return BY_SLUG.get(slug);
}

/** Redosled kategorija na sajtu — isti kao u tabeli. */
export const CATEGORIES: { label: string; slug: string }[] = (() => {
  const seen = new Map<string, string>();
  for (const p of products) if (!seen.has(p.categorySlug)) seen.set(p.categorySlug, p.category);
  return [...seen.entries()].map(([slug, label]) => ({ slug, label }));
})();

export function productsByCategory(list: Product[] = products) {
  return CATEGORIES.map((c) => ({
    ...c,
    items: list.filter((p) => p.categorySlug === c.slug),
  })).filter((g) => g.items.length > 0);
}

export type VariantRef = { product: Product; variant: ProductVariant; key: string };

/** Sve varijante iz kataloga, po ključu `slug--code`. */
export const VARIANTS: Map<string, VariantRef> = new Map(
  products.flatMap((p) =>
    p.variants.map((v) => [variantKey(p.slug, v.code), { product: p, variant: v, key: variantKey(p.slug, v.code) }] as const),
  ),
);

export function getVariantByKey(key: string): VariantRef | undefined {
  return VARIANTS.get(key);
}

/**
 * Paketi. Klijent ih još nije definisao za SORELLE asortiman — dok je niz prazan,
 * sekcija „Paketi" i stranice /paketi/* se ne prikazuju. Kad stignu, dodaj ih ovde
 * i u BUNDLE_DEFINITIONS (lib/pricing-engine.ts) sa ključevima varijanti.
 */
export interface BundleContent {
  slug: string;
  name: string;
  image: string;
  tagline: string;
  fullDescription: string;
  howToUse: string;
}

export const bundles: BundleContent[] = [];

export function getBundleBySlug(slug: string): BundleContent | undefined {
  return bundles.find((b) => b.slug === slug);
}
