import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { LinkOption } from '@/components/admin/LinkPicker';
import { CATEGORIES, getProductBySlug, products } from '@/lib/data/products';

/**
 * Mesta na koja slika ili dugme iz admina mogu da vode: linije, proizvodi i
 * boje, pa stranice sajta. Proizvodi su iz baze, zajedno sa onima napravljenim
 * u adminu; nazivi iz baze imaju prednost nad katalogom iz koda.
 */
export async function getLinkOptions(supabase: SupabaseClient): Promise<LinkOption[]> {
  const [{ data: categoryRows }, { data: productRows }] = await Promise.all([
    supabase
      .from('categories')
      .select('slug, name')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true }),
    supabase
      .from('products')
      .select('slug, name, shade')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true }),
  ]);

  const lines =
    categoryRows && categoryRows.length > 0
      ? (categoryRows as { slug: string; name: string }[]).map((c) => ({
          slug: c.slug,
          label: c.name,
        }))
      : CATEGORIES;

  const productList =
    productRows && productRows.length > 0
      ? (productRows as { slug: string; name: string | null; shade: string | null }[]).map((p) => {
          const code = getProductBySlug(p.slug);
          return {
            slug: p.slug,
            name: p.name?.trim() || code?.name || p.slug,
            shade: p.shade?.trim() || code?.shade || '',
          };
        })
      : products.map((p) => ({ slug: p.slug, name: p.name, shade: p.shade }));

  return [
    ...lines.map((c) => ({
      group: 'Linije',
      label: c.label,
      href: `/proizvodi?linija=${c.slug}`,
    })),
    ...productList.map((p) => ({
      group: 'Proizvodi i boje',
      label: p.shade ? `${p.name} · ${p.shade}` : p.name,
      href: `/proizvodi/${p.slug}`,
    })),
    { group: 'Stranice', label: 'Svi proizvodi', href: '/proizvodi' },
    { group: 'Stranice', label: 'Usluge salona', href: '/usluge' },
    { group: 'Stranice', label: 'O nama', href: '/o-nama' },
    { group: 'Stranice', label: 'Kontakt', href: '/kontakt' },
  ];
}
