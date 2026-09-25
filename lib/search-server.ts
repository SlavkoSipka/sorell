import 'server-only';

import { categorySlugOf, getProductOverrides, resolveImage } from '@/lib/products-server';
import type { SearchIndex } from '@/lib/search';

/**
 * Spisak za pretragu: svi proizvodi koji su na sajtu, plus linije.
 *
 * Gradi se na serveru i šalje kao jedan mali JSON (vidi app/api/pretraga),
 * pa browser posle toga pretražuje bez ijednog novog zahteva. Isključeni
 * proizvodi se izostavljaju — ne mogu da se kupe, pa nema ni da se nađu.
 */
export async function getSearchIndex(): Promise<SearchIndex> {
  const overrides = await getProductOverrides();

  const vidljivi = overrides.catalog.filter((p) => !overrides.inactiveSlugs.has(p.slug));

  const labelPoSlugu = new Map(overrides.categories.map((c) => [c.slug, c.label]));

  const brojPoKategoriji = new Map<string, number>();
  for (const p of vidljivi) {
    const slug = categorySlugOf(p.slug, overrides);
    if (slug) brojPoKategoriji.set(slug, (brojPoKategoriji.get(slug) ?? 0) + 1);
  }

  return {
    products: vidljivi.map((p) => {
      const catSlug = categorySlugOf(p.slug, overrides);
      return {
        slug: p.slug,
        name: p.name,
        shade: p.shade ?? '',
        category: labelPoSlugu.get(catSlug) ?? p.category ?? '',
        image: resolveImage(p.slug, overrides),
      };
    }),
    categories: overrides.categories
      .filter((c) => c.isActive && (brojPoKategoriji.get(c.slug) ?? 0) > 0)
      .map((c) => ({
        slug: c.slug,
        label: c.label,
        count: brojPoKategoriji.get(c.slug) ?? 0,
      })),
  };
}
