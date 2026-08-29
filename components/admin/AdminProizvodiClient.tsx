'use client';

import { useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { invalidatePricingCache } from '@/lib/use-pricing-data';
import { discountedUnitPriceRsd, formatRsd } from '@/lib/price';
import { placeholderImage } from '@/lib/data/product-images';
import { rejectReason, removeImage, uploadImage } from '@/lib/admin/images';
import ProductImagesField, { type AdminImageRow } from '@/components/admin/ProductImagesField';

/** Koliko proizvoda stane u „Izdvojeno iz ponude" na početnoj. */
const FEATURED_SLOTS = 8;
/** Ključ grupe za proizvode koji ne pripadaju nijednoj kategoriji. */
const UNASSIGNED = '__bez-kategorije__';

export type { AdminImageRow };

export type AdminCategoryRow = {
  slug: string;
  name: string;
  sort_order: number | null;
  is_active: boolean;
};

export type AdminProductRow = {
  slug: string;
  name: string;
  image_path: string | null;
  volume: string;
  /** NULL = koristi se globalni popust. */
  discount_percent: number | string | null;
  is_active: boolean;
  is_featured: boolean;
  /** NULL = proizvod nije razvrstan ni u jednu kategoriju. */
  category_slug: string | null;
  shade: string | null;
  features: string[] | null;
  how_to_use: string | null;
  formulation: string | null;
  eu_compliance: string | null;
};

export type AdminVariantRow = {
  product_slug: string;
  variant_slug: string;
  package_label: string;
  price_rsd: number | string | null;
  sort_order: number | null;
  is_active: boolean;
};

/** Tekstualna polja koja se uređuju u panelu „Uredi proizvod". */
type TextFields = {
  name: string;
  shade: string;
  /** Prikaz pakovanja na kartici (`products.volume`). */
  volume: string;
  /** Opis u tačkama — jedna stavka po redu. */
  features: string;
  howToUse: string;
  formulation: string;
  euCompliance: string;
};

type RowState = TextFields & {
  /** Cena po ključu varijante; prazan string = cena nije uneta. */
  prices: Record<string, string>;
  discount: string;
  saving: boolean;
  saved: boolean;
  error: string | null;
  uploading: boolean;
};

type Filter = 'sve' | 'bez-cene' | 'bez-slike' | 'na-pocetnoj';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'sve', label: 'Svi' },
  { id: 'bez-cene', label: 'Bez cene' },
  { id: 'bez-slike', label: 'Bez slike' },
  { id: 'na-pocetnoj', label: 'Na početnoj' },
];

function parsePct(raw: string): number | null {
  const v = parseFloat(raw.replace(',', '.'));
  if (Number.isNaN(v) || v < 0 || v > 100) return null;
  return Math.round(v * 1e8) / 1e8;
}

function parsePrice(raw: string): number | null {
  const v = parseFloat(raw.replace(/\s/g, '').replace(',', '.'));
  if (Number.isNaN(v) || v < 0) return null;
  return Math.round(v * 100) / 100;
}

/** Naziv kategorije → slug za URL: „Builder Gel – Pro Fiber" → „builder-gel-pro-fiber". */
function slugify(name: string): string {
  const map: Record<string, string> = { č: 'c', ć: 'c', đ: 'dj', š: 's', ž: 'z' };
  return name
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Zajednički stilovi — dovoljno veliki za prst na telefonu (44 px visine),
// a na širem ekranu izgledaju isto kao ostatak panela.
const INPUT =
  'w-full min-h-[44px] rounded-card border border-line bg-canvas px-3 py-2 font-body text-[16px] tabular-nums text-ink focus:border-ink focus:outline-none input-no-spinner sm:text-[14px]';
const BTN_PRIMARY =
  'inline-flex min-h-[44px] items-center justify-center rounded-card border border-ink bg-ink px-5 font-body text-[12px] uppercase tracking-[0.12em] text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50';
const BTN_QUIET =
  'inline-flex min-h-[40px] items-center justify-center rounded-card border border-line px-3 font-body text-[12px] text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-40';
const CHECKBOX = 'h-[18px] w-[18px] shrink-0 accent-current';

export default function AdminProizvodiClient({
  initialProducts,
  initialVariants,
  initialCategories,
  initialImages,
  categoriesMissing,
  imagesMissing,
  siteDiscountPercent,
}: {
  initialProducts: AdminProductRow[];
  initialVariants: AdminVariantRow[];
  initialCategories: AdminCategoryRow[];
  initialImages: AdminImageRow[];
  categoriesMissing: boolean;
  imagesMissing: boolean;
  siteDiscountPercent: number;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [variants, setVariants] = useState(initialVariants);
  const [categories, setCategories] = useState(initialCategories);
  const [images, setImages] = useState(initialImages);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('sve');
  const [notice, setNotice] = useState<string | null>(null);

  // Zatvoreno po ulasku: 46 proizvoda stane u sedam redova sa nazivima kategorija.
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  // Uređivanje se otvara po proizvodu; više njih sme da bude otvoreno.
  const [openEditors, setOpenEditors] = useState<Set<string>>(new Set());
  const [newCategory, setNewCategory] = useState('');
  const [renaming, setRenaming] = useState<{ slug: string; name: string } | null>(null);
  const [catBusy, setCatBusy] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  const variantsByProduct = useMemo(() => {
    const map = new Map<string, AdminVariantRow[]>();
    for (const v of variants) {
      const list = map.get(v.product_slug) ?? [];
      list.push(v);
      map.set(v.product_slug, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }
    return map;
  }, [variants]);

  const imagesByProduct = useMemo(() => {
    const map = new Map<string, AdminImageRow[]>();
    for (const img of images) {
      const list = map.get(img.product_slug) ?? [];
      list.push(img);
      map.set(img.product_slug, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id);
    }
    return map;
  }, [images]);

  const [state, setState] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      initialProducts.map((p) => {
        const prices: Record<string, string> = {};
        for (const v of initialVariants.filter((x) => x.product_slug === p.slug)) {
          prices[v.variant_slug] = v.price_rsd == null ? '' : String(Number(v.price_rsd));
        }
        return [
          p.slug,
          {
            name: p.name ?? '',
            shade: p.shade ?? '',
            volume: p.volume ?? '',
            features: (p.features ?? []).join('\n'),
            howToUse: p.how_to_use ?? '',
            formulation: p.formulation ?? '',
            euCompliance: p.eu_compliance ?? '',
            prices,
            discount: p.discount_percent == null ? '' : String(Number(p.discount_percent)),
            saving: false,
            saved: false,
            error: null,
            uploading: false,
          },
        ];
      }),
    ),
  );

  const patch = (slug: string, next: Partial<RowState>) =>
    setState((s) => ({ ...s, [slug]: { ...s[slug], ...next } }));

  const patchText = (slug: string, next: Partial<TextFields>) =>
    patch(slug, { ...next, saved: false, error: null });

  const toggleEditor = (slug: string) =>
    setOpenEditors((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  const setPrice = (slug: string, variantSlug: string, value: string) =>
    setState((s) => ({
      ...s,
      [slug]: {
        ...s[slug],
        prices: { ...s[slug].prices, [variantSlug]: value },
        saved: false,
        error: null,
      },
    }));

  const categoryOf = (slug: string) =>
    products.find((p) => p.slug === slug)?.category_slug ?? UNASSIGNED;

  const categoryName = (key: string) =>
    key === UNASSIGNED ? 'Bez kategorije' : (categories.find((c) => c.slug === key)?.name ?? key);

  /** Cene + popust jednog proizvoda → baza. Vraća false ako nešto nije prošlo. */
  const persistRow = async (slug: string): Promise<boolean> => {
    const row = state[slug];
    const rowVariants = variantsByProduct.get(slug) ?? [];

    // Sve cene se proveravaju pre bilo kakvog upisa — da proizvod ne ostane
    // sa pola sačuvanih pakovanja.
    const updates: { variant_slug: string; price_rsd: number | null }[] = [];
    for (const v of rowVariants) {
      const raw = (row.prices[v.variant_slug] ?? '').trim();
      if (raw === '') {
        updates.push({ variant_slug: v.variant_slug, price_rsd: null });
        continue;
      }
      const price = parsePrice(raw);
      if (price === null) {
        patch(slug, {
          error: `Cena za ${v.package_label} mora biti broj (npr. 1890 ili 1890,50).`,
          saved: false,
        });
        return false;
      }
      updates.push({ variant_slug: v.variant_slug, price_rsd: price });
    }

    const rawDiscount = row.discount.trim();
    const discount = rawDiscount === '' ? null : parsePct(rawDiscount);
    if (rawDiscount !== '' && discount === null) {
      patch(slug, { error: 'Popust mora biti broj 0–100 (ili prazno).', saved: false });
      return false;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return false;

    patch(slug, { saving: true, error: null, saved: false });

    for (const u of updates) {
      const { error } = await supabase
        .from('product_variants')
        .update({ price_rsd: u.price_rsd })
        .eq('variant_slug', u.variant_slug);
      if (error) {
        patch(slug, { saving: false, error: 'Čuvanje cena nije uspelo.' });
        return false;
      }
    }

    // Tekst i popust idu jednim upisom — „Sačuvaj izmene" je jedno dugme.
    const name = row.name.trim();
    if (name === '') {
      patch(slug, { saving: false, error: 'Naziv proizvoda ne sme biti prazan.' });
      return false;
    }

    const features = row.features
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '');

    const { error: contentErr } = await supabase
      .from('products')
      .update({
        discount_percent: discount,
        name,
        shade: row.shade.trim(),
        volume: row.volume.trim(),
        features,
        how_to_use: row.howToUse.trim(),
        formulation: row.formulation.trim(),
        eu_compliance: row.euCompliance.trim(),
      })
      .eq('slug', slug);

    patch(slug, { saving: false });

    if (contentErr) {
      patch(slug, { error: 'Cene su sačuvane, ali opis i popust nisu.' });
      return false;
    }

    setVariants((prev) =>
      prev.map((v) => {
        const u = updates.find((x) => x.variant_slug === v.variant_slug);
        return u ? { ...v, price_rsd: u.price_rsd } : v;
      }),
    );
    setProducts((prev) =>
      prev.map((p) =>
        p.slug === slug
          ? {
              ...p,
              discount_percent: discount,
              name,
              shade: row.shade.trim(),
              volume: row.volume.trim(),
              features,
              how_to_use: row.howToUse.trim(),
              formulation: row.formulation.trim(),
              eu_compliance: row.euCompliance.trim(),
            }
          : p,
      ),
    );
    patch(slug, {
      saved: true,
      discount: discount == null ? '' : String(discount),
      prices: Object.fromEntries(
        updates.map((u) => [u.variant_slug, u.price_rsd == null ? '' : String(u.price_rsd)]),
      ),
    });
    invalidatePricingCache();
    return true;
  };

  const save = async (slug: string) => {
    setNotice(null);
    await persistRow(slug);
  };

  /**
   * Cene ovog proizvoda → svi ostali proizvodi iste kategorije.
   * Nijanse jedne linije po pravilu imaju istu cenu, pa ovo štedi desetine unosa.
   */
  const applyPricesToLine = async (slug: string) => {
    const category = categoryOf(slug);
    const targets = products.filter((p) => p.slug !== slug && categoryOf(p.slug) === category);
    if (targets.length === 0) return;

    const sourceVariants = variantsByProduct.get(slug) ?? [];
    const byLabel = new Map(
      sourceVariants.map((v) => [
        v.package_label,
        (state[slug].prices[v.variant_slug] ?? '').trim(),
      ]),
    );

    // Prvo se sačuva sam izvor, pa se njegove cene prepišu na ostale nijanse.
    setNotice(null);
    if (!(await persistRow(slug))) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const updates: { variant_slug: string; price_rsd: number | null }[] = [];
    for (const t of targets) {
      for (const v of variantsByProduct.get(t.slug) ?? []) {
        const raw = byLabel.get(v.package_label);
        if (raw === undefined) continue;
        updates.push({
          variant_slug: v.variant_slug,
          price_rsd: raw === '' ? null : parsePrice(raw),
        });
      }
    }

    for (const u of updates) {
      const { error } = await supabase
        .from('product_variants')
        .update({ price_rsd: u.price_rsd })
        .eq('variant_slug', u.variant_slug);
      if (error) {
        setNotice('Prenos cena na kategoriju nije uspeo do kraja. Osveži stranicu i proveri.');
        return;
      }
    }

    const priceByVariant = new Map(updates.map((u) => [u.variant_slug, u.price_rsd]));
    setVariants((prev) =>
      prev.map((v) =>
        priceByVariant.has(v.variant_slug)
          ? { ...v, price_rsd: priceByVariant.get(v.variant_slug)! }
          : v,
      ),
    );
    setState((s) => {
      const next = { ...s };
      for (const t of targets) {
        const prices = { ...next[t.slug].prices };
        for (const v of variantsByProduct.get(t.slug) ?? []) {
          const p = priceByVariant.get(v.variant_slug);
          if (p !== undefined) prices[v.variant_slug] = p == null ? '' : String(p);
        }
        next[t.slug] = { ...next[t.slug], prices, saved: true, error: null };
      }
      return next;
    });
    invalidatePricingCache();
    setNotice(
      `Cene su prenete na još ${targets.length} proizvoda u kategoriji „${categoryName(category)}".`,
    );
  };

  // ── Kategorije ──────────────────────────────────────────────────

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    const slug = slugify(name);
    if (!slug) {
      setCatError('Naziv mora imati bar jedno slovo ili cifru.');
      return;
    }
    if (categories.some((c) => c.slug === slug)) {
      setCatError(`Kategorija „${name}" već postoji.`);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setCatBusy(true);
    setCatError(null);
    const sortOrder = categories.length + 1;
    const { error } = await supabase
      .from('categories')
      .insert({ slug, name, sort_order: sortOrder, is_active: true });
    setCatBusy(false);

    if (error) {
      setCatError('Dodavanje kategorije nije uspelo.');
      return;
    }
    setCategories((prev) => [...prev, { slug, name, sort_order: sortOrder, is_active: true }]);
    setNewCategory('');
    setOpenGroups((prev) => new Set(prev).add(slug));
    invalidatePricingCache();
  };

  const renameCategory = async () => {
    if (!renaming) return;
    const name = renaming.name.trim();
    if (!name) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setCatBusy(true);
    setCatError(null);
    // Slug se namerno NE menja: on je u URL-u i u sidrima na sajtu.
    const { error } = await supabase.from('categories').update({ name }).eq('slug', renaming.slug);
    setCatBusy(false);

    if (error) {
      setCatError('Preimenovanje nije uspelo.');
      return;
    }
    setCategories((prev) => prev.map((c) => (c.slug === renaming.slug ? { ...c, name } : c)));
    setRenaming(null);
    invalidatePricingCache();
  };

  const deleteCategory = async (slug: string) => {
    const count = products.filter((p) => p.category_slug === slug).length;
    const label = categoryName(slug);
    const warning =
      count > 0
        ? `Obriši kategoriju „${label}"? ${count} proizvoda ostaje na sajtu, ali bez kategorije.`
        : `Obriši kategoriju „${label}"?`;
    if (!window.confirm(warning)) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setCatBusy(true);
    setCatError(null);
    const { error } = await supabase.from('categories').delete().eq('slug', slug);
    setCatBusy(false);

    if (error) {
      setCatError('Brisanje kategorije nije uspelo.');
      return;
    }
    setCategories((prev) => prev.filter((c) => c.slug !== slug));
    setProducts((prev) =>
      prev.map((p) => (p.category_slug === slug ? { ...p, category_slug: null } : p)),
    );
    invalidatePricingCache();
  };

  const moveCategory = async (slug: string, direction: -1 | 1) => {
    const i = categories.findIndex((c) => c.slug === slug);
    const j = i + direction;
    if (i === -1 || j < 0 || j >= categories.length) return;

    const reordered = [...categories];
    [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
    const withOrder = reordered.map((c, idx) => ({ ...c, sort_order: idx + 1 }));
    setCategories(withOrder);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setCatBusy(true);
    for (const c of withOrder) {
      const { error } = await supabase
        .from('categories')
        .update({ sort_order: c.sort_order })
        .eq('slug', c.slug);
      if (error) {
        setCatError('Redosled nije sačuvan. Osveži stranicu.');
        break;
      }
    }
    setCatBusy(false);
    invalidatePricingCache();
  };

  const toggleCategoryActive = async (slug: string, next: boolean) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setCatError(null);
    const { error } = await supabase.from('categories').update({ is_active: next }).eq('slug', slug);
    if (error) {
      setCatError('Izmena kategorije nije sačuvana.');
      return;
    }
    setCategories((prev) => prev.map((c) => (c.slug === slug ? { ...c, is_active: next } : c)));
    invalidatePricingCache();
  };

  /** Premešta proizvod u drugu kategoriju; `null` ga izbacuje iz svih. */
  const setProductCategory = async (productSlug: string, next: string | null) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setNotice(null);
    const { error } = await supabase
      .from('products')
      .update({ category_slug: next })
      .eq('slug', productSlug);
    if (error) {
      patch(productSlug, { error: 'Promena kategorije nije sačuvana.' });
      return;
    }
    setProducts((prev) =>
      prev.map((p) => (p.slug === productSlug ? { ...p, category_slug: next } : p)),
    );
    invalidatePricingCache();
  };

  // ── Galerija proizvoda ──────────────────────────────────────────

  /** Najveći `sort_order` u galeriji — nova slika ide iza postojećih. */
  const nextSortOrder = (slug: string) => {
    const list = imagesByProduct.get(slug) ?? [];
    return list.reduce((max, i) => Math.max(max, i.sort_order ?? 0), 0) + 1;
  };

  const addImages = async (slug: string, files: File[]) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    patch(slug, { uploading: true, error: null, saved: false });

    let order = nextSortOrder(slug);
    const added: AdminImageRow[] = [];

    for (const file of files) {
      const reason = rejectReason(file);
      if (reason) {
        patch(slug, { uploading: false, error: reason });
        break;
      }

      const url = await uploadImage(supabase, slug, file);
      if (!url) {
        patch(slug, { uploading: false, error: 'Slanje slike nije uspelo.' });
        break;
      }

      const { data, error } = await supabase
        .from('product_images')
        .insert({ product_slug: slug, url, sort_order: order })
        .select('id, product_slug, url, sort_order')
        .single();

      if (error || !data) {
        // Slika je u bucket-u, ali nije upisana — ne ostavljaj je da visi.
        await removeImage(supabase, url);
        patch(slug, { uploading: false, error: 'Slika je poslata, ali nije povezana sa proizvodom.' });
        break;
      }

      added.push(data as AdminImageRow);
      order += 1;
    }

    if (added.length > 0) {
      setImages((prev) => [...prev, ...added]);
      // Trigger u bazi drži products.image_path na prvoj slici.
      setProducts((prev) =>
        prev.map((p) =>
          p.slug === slug && !p.image_path ? { ...p, image_path: added[0].url } : p,
        ),
      );
      patch(slug, { uploading: false, saved: true });
      invalidatePricingCache();
    }
  };

  const removeProductImage = async (slug: string, id: number) => {
    const target = images.find((i) => i.id === id);
    if (!target) return;
    if (!window.confirm('Obriši ovu sliku?')) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    patch(slug, { uploading: true, error: null });

    const { error } = await supabase.from('product_images').delete().eq('id', id);
    if (error) {
      patch(slug, { uploading: false, error: 'Brisanje slike nije uspelo.' });
      return;
    }

    await removeImage(supabase, target.url);

    const left = (imagesByProduct.get(slug) ?? []).filter((i) => i.id !== id);
    setImages((prev) => prev.filter((i) => i.id !== id));
    setProducts((prev) =>
      prev.map((p) => (p.slug === slug ? { ...p, image_path: left[0]?.url ?? '' } : p)),
    );
    patch(slug, { uploading: false, saved: true });
    invalidatePricingCache();
  };

  const moveProductImage = async (slug: string, id: number, direction: -1 | 1) => {
    const list = imagesByProduct.get(slug) ?? [];
    const i = list.findIndex((x) => x.id === id);
    const j = i + direction;
    if (i === -1 || j < 0 || j >= list.length) return;

    const reordered = [...list];
    [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
    const withOrder = reordered.map((img, idx) => ({ ...img, sort_order: idx + 1 }));

    setImages((prev) => prev.map((img) => withOrder.find((x) => x.id === img.id) ?? img));
    setProducts((prev) =>
      prev.map((p) => (p.slug === slug ? { ...p, image_path: withOrder[0].url } : p)),
    );

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    patch(slug, { uploading: true, error: null });
    for (const img of withOrder) {
      const { error } = await supabase
        .from('product_images')
        .update({ sort_order: img.sort_order })
        .eq('id', img.id);
      if (error) {
        patch(slug, { uploading: false, error: 'Redosled slika nije sačuvan. Osveži stranicu.' });
        return;
      }
    }
    patch(slug, { uploading: false, saved: true });
    invalidatePricingCache();
  };

  const toggleFlag = async (slug: string, column: 'is_active' | 'is_featured', next: boolean) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setNotice(null);
    const { error } = await supabase
      .from('products')
      .update({ [column]: next })
      .eq('slug', slug);
    if (error) {
      patch(slug, { error: 'Izmena nije sačuvana.' });
      return;
    }
    setProducts((prev) => prev.map((p) => (p.slug === slug ? { ...p, [column]: next } : p)));
    invalidatePricingCache();
  };

  // ── Filtriranje i grupisanje ────────────────────────────────────

  const hasNoPrice = (slug: string) =>
    (variantsByProduct.get(slug) ?? []).some((v) => v.price_rsd == null);

  const hasNoImage = (slug: string) => (imagesByProduct.get(slug) ?? []).length === 0;

  const needle = query.trim().toLowerCase();
  const visible = products.filter((p) => {
    if (needle && !p.name.toLowerCase().includes(needle) && !p.slug.toLowerCase().includes(needle)) {
      return false;
    }
    if (filter === 'bez-cene') return hasNoPrice(p.slug);
    if (filter === 'bez-slike') return hasNoImage(p.slug);
    if (filter === 'na-pocetnoj') return p.is_featured;
    return true;
  });

  // Redosled grupa je redosled kategorija; nerazvrstani proizvodi idu na kraj.
  const groups: { key: string; label: string; items: AdminProductRow[] }[] = [
    ...categories.map((c) => ({
      key: c.slug,
      label: c.name,
      items: visible.filter((p) => p.category_slug === c.slug),
    })),
    {
      key: UNASSIGNED,
      label: 'Bez kategorije',
      items: visible.filter(
        (p) => !p.category_slug || !categories.some((c) => c.slug === p.category_slug),
      ),
    },
  ];

  // Pretraga i filteri sami otvaraju grupe — inače bi rezultat ostao sakriven.
  const forceOpen = needle !== '' || filter !== 'sve';
  const isOpen = (key: string) => forceOpen || openGroups.has(key);

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const withoutPrice = products.filter((p) => hasNoPrice(p.slug)).length;
  const featuredCount = products.filter((p) => p.is_featured).length;

  if (categoriesMissing || imagesMissing) {
    return (
      <div>
        <h2 className="mb-2 font-display text-[22px] text-ink md:text-[26px]">Proizvodi</h2>
        <p className="max-w-[720px] font-body text-[14px] leading-relaxed text-danger">
          Baza još nema {categoriesMissing ? 'tabelu kategorija' : 'tabelu slika'}. Otvori Supabase →
          SQL Editor, nalepi ceo <span className="font-mono">supabase/setup.sql</span> i pokreni ga,
          pa osveži ovu stranicu.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 font-display text-[22px] text-ink md:text-[26px]">Proizvodi</h2>
      <p className="mb-5 max-w-[780px] font-body text-[14px] leading-relaxed text-muted">
        Proizvodi su složeni po kategorijama. Dodirni kategoriju da se otvori, pa unesi cene, slike i
        vidljivost. Pakovanje bez cene se na sajtu prikazuje kao{' '}
        <span className="text-ink">{'„Cena uskoro"'}</span> i ne može da se poruči.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
        <Stat label="Proizvoda" value={String(products.length)} />
        <Stat label="Kategorija" value={String(categories.length)} />
        <Stat label="Čeka cenu" value={String(withoutPrice)} warn={withoutPrice > 0} />
        <Stat
          label="Na početnoj"
          value={`${featuredCount} / ${FEATURED_SLOTS}`}
          warn={featuredCount > FEATURED_SLOTS}
        />
      </div>

      <div className="mb-4 space-y-3">
        <label htmlFor="admin-product-search" className="sr-only">
          Pretraga proizvoda
        </label>
        <input
          id="admin-product-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pretraži po nazivu ili nijansi…"
          className={`${INPUT} md:max-w-[320px]`}
        />
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`inline-flex min-h-[44px] items-center justify-center rounded-card border px-3 font-body text-[12px] uppercase tracking-[0.1em] transition-colors ${
                filter === f.id
                  ? 'border-ink bg-ink text-canvas'
                  : 'border-line text-ink-soft hover:border-ink hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 space-y-2 border-t border-line pt-4 sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:space-y-0">
        <label htmlFor="new-category" className="sr-only">
          Naziv nove kategorije
        </label>
        <input
          id="new-category"
          type="text"
          value={newCategory}
          onChange={(e) => {
            setNewCategory(e.target.value);
            setCatError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void addCategory();
          }}
          placeholder="Nova kategorija — npr. Builder Gel"
          className={`${INPUT} sm:max-w-[320px]`}
        />
        <button
          type="button"
          onClick={() => void addCategory()}
          disabled={catBusy || newCategory.trim() === ''}
          className={`${BTN_PRIMARY} w-full sm:w-auto`}
        >
          Dodaj kategoriju
        </button>
        <button
          type="button"
          onClick={() =>
            setOpenGroups((prev) => (prev.size > 0 ? new Set() : new Set(groups.map((g) => g.key))))
          }
          className={`${BTN_QUIET} w-full sm:w-auto`}
        >
          {openGroups.size > 0 ? 'Skupi sve' : 'Otvori sve'}
        </button>
      </div>

      {catError ? (
        <p className="mb-5 font-body text-[14px] text-danger" role="alert">
          {catError}
        </p>
      ) : null}

      {notice ? (
        <p className="mb-5 rounded-card border border-line bg-surface px-4 py-3 font-body text-[14px] text-ink-soft">
          {notice}
        </p>
      ) : null}

      <div className="space-y-2">
        {groups.map((group) => {
          // Prazna „Bez kategorije" grupa ne zaslužuje red u spisku.
          if (group.key === UNASSIGNED && group.items.length === 0) return null;

          const category = categories.find((c) => c.slug === group.key);
          const index = categories.findIndex((c) => c.slug === group.key);
          const open = isOpen(group.key);
          // Proizvodi koje je moguće dodati u ovu kategoriju.
          const addable = category ? products.filter((p) => p.category_slug !== category.slug) : [];

          return (
            <section key={group.key} className="border border-line bg-canvas">
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-3 py-4 text-left md:px-4"
              >
                <span
                  aria-hidden
                  className={`shrink-0 font-body text-[12px] text-muted transition-transform ${
                    open ? 'rotate-90' : ''
                  }`}
                >
                  ▶
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[17px] leading-snug text-ink md:text-[18px]">
                    {group.label}
                  </span>
                  <span className="mt-0.5 block font-body text-[12px] text-muted">
                    {group.items.length} {group.items.length === 1 ? 'proizvod' : 'proizvoda'}
                    {category && !category.is_active ? ' · skriveno na sajtu' : ''}
                  </span>
                </span>
              </button>

              {open ? (
                <div className="border-t border-line px-3 py-4 md:px-4">
                  {category ? (
                    <div className="mb-4 border-b border-line pb-4">
                      {renaming?.slug === group.key ? (
                        <div className="space-y-2 sm:flex sm:items-center sm:gap-2 sm:space-y-0">
                          <input
                            type="text"
                            value={renaming.name}
                            autoFocus
                            aria-label="Novi naziv kategorije"
                            onChange={(e) => setRenaming({ slug: group.key, name: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void renameCategory();
                              if (e.key === 'Escape') setRenaming(null);
                            }}
                            className={`${INPUT} sm:max-w-[300px]`}
                          />
                          <button
                            type="button"
                            onClick={() => void renameCategory()}
                            disabled={catBusy}
                            className={`${BTN_PRIMARY} w-full sm:w-auto`}
                          >
                            Sačuvaj
                          </button>
                          <button
                            type="button"
                            onClick={() => setRenaming(null)}
                            className={`${BTN_QUIET} w-full sm:w-auto`}
                          >
                            Odustani
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void moveCategory(category.slug, -1)}
                            disabled={catBusy || index === 0}
                            aria-label={`Pomeri „${category.name}" naviše`}
                            className={`${BTN_QUIET} w-11`}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => void moveCategory(category.slug, 1)}
                            disabled={catBusy || index === categories.length - 1}
                            aria-label={`Pomeri „${category.name}" naniže`}
                            className={`${BTN_QUIET} w-11`}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => setRenaming({ slug: category.slug, name: category.name })}
                            className={BTN_QUIET}
                          >
                            Preimenuj
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteCategory(category.slug)}
                            disabled={catBusy}
                            className={`${BTN_QUIET} hover:border-danger hover:text-danger`}
                          >
                            Obriši
                          </button>
                          <label className="inline-flex min-h-[40px] items-center gap-2 px-1 font-body text-[13px] text-ink-soft">
                            <input
                              type="checkbox"
                              className={CHECKBOX}
                              checked={category.is_active}
                              onChange={(e) =>
                                void toggleCategoryActive(category.slug, e.target.checked)
                              }
                            />
                            Na sajtu
                          </label>
                        </div>
                      )}

                      {addable.length > 0 ? (
                        <div className="mt-3">
                          <label
                            htmlFor={`add-to-${category.slug}`}
                            className="mb-1.5 block font-body text-[12px] text-muted"
                          >
                            Dodaj postojeći proizvod u ovu kategoriju
                          </label>
                          <select
                            id={`add-to-${category.slug}`}
                            value=""
                            onChange={(e) => {
                              if (e.target.value)
                                void setProductCategory(e.target.value, category.slug);
                            }}
                            className={`${INPUT} sm:max-w-[360px]`}
                          >
                            <option value="">— izaberi proizvod —</option>
                            {addable.map((p) => (
                              <option key={p.slug} value={p.slug}>
                                {p.name} ({categoryName(p.category_slug ?? UNASSIGNED)})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {group.items.length === 0 ? (
                    <p className="font-body text-[14px] text-muted">
                      Kategorija je prazna — dodaj proizvod izborom iznad.
                    </p>
                  ) : null}

                  <div className="space-y-3">
                    {group.items.map((p) => {
                      const s = state[p.slug];
                      if (!s) return null;

                      const rowVariants = variantsByProduct.get(p.slug) ?? [];
                      const rowImages = imagesByProduct.get(p.slug) ?? [];
                      const pct =
                        s.discount.trim() === '' ? siteDiscountPercent : (parsePct(s.discount) ?? 0);
                      const lineSize = products.filter((x) => categoryOf(x.slug) === group.key).length;
                      const editing = openEditors.has(p.slug);

                      return (
                        <div key={p.slug} className="border border-line bg-surface p-3 md:p-5">
                          {/* Naziv uvek zauzima dva reda, pa su kartice iste visine
                              i spisak se čita kao tabela i na telefonu. */}
                          <p className="line-clamp-2 min-h-[2.8em] font-body text-[16px] leading-[1.4] text-ink">
                            {s.name.trim() || p.name}
                            {s.shade.trim() ? (
                              <span className="text-muted"> — {s.shade.trim()}</span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 truncate font-mono text-[11px] text-muted">{p.slug}</p>

                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
                            <label className="inline-flex min-h-[40px] items-center gap-2 font-body text-[13px] text-ink-soft">
                              <input
                                type="checkbox"
                                className={CHECKBOX}
                                checked={p.is_active}
                                onChange={(e) => void toggleFlag(p.slug, 'is_active', e.target.checked)}
                              />
                              Na sajtu
                            </label>
                            <label className="inline-flex min-h-[40px] items-center gap-2 font-body text-[13px] text-ink-soft">
                              <input
                                type="checkbox"
                                className={CHECKBOX}
                                checked={p.is_featured}
                                onChange={(e) =>
                                  void toggleFlag(p.slug, 'is_featured', e.target.checked)
                                }
                              />
                              Na početnoj
                            </label>
                          </div>

                          <div className="mt-3">
                            <label
                              htmlFor={`cat-${p.slug}`}
                              className="mb-1.5 block font-body text-[11px] uppercase tracking-[0.12em] text-muted"
                            >
                              Kategorija
                            </label>
                            <select
                              id={`cat-${p.slug}`}
                              value={p.category_slug ?? ''}
                              onChange={(e) => void setProductCategory(p.slug, e.target.value || null)}
                              className={`${INPUT} sm:max-w-[320px]`}
                            >
                              <option value="">Bez kategorije</option>
                              {categories.map((c) => (
                                <option key={c.slug} value={c.slug}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="mt-4 border-t border-line pt-4">
                            <ProductImagesField
                              images={rowImages}
                              fallbackImage={placeholderImage(p.slug)}
                              busy={s.uploading}
                              onAdd={(files) => void addImages(p.slug, files)}
                              onMove={(id, dir) => void moveProductImage(p.slug, id, dir)}
                              onRemove={(id) => void removeProductImage(p.slug, id)}
                            />
                          </div>

                          {/* Tekst i cene stoje sklopljeni dok se ne zatraže — spisak
                              od 46 proizvoda tako ostaje pregledan i na telefonu. */}
                          <button
                            type="button"
                            onClick={() => toggleEditor(p.slug)}
                            aria-expanded={editing}
                            aria-controls={`edit-${p.slug}`}
                            className={`${BTN_QUIET} mt-4 w-full justify-between gap-3 sm:w-auto sm:justify-center`}
                          >
                            <span>{editing ? 'Zatvori uređivanje' : 'Uredi proizvod'}</span>
                            <span aria-hidden className={editing ? 'rotate-180' : ''}>
                              ▾
                            </span>
                          </button>

                          {editing ? (
                            <div id={`edit-${p.slug}`} className="mt-4 border-t border-line pt-4">
                              <div className="space-y-4">
                                <Field
                                  id={`name-${p.slug}`}
                                  label="Naziv proizvoda"
                                  value={s.name}
                                  onChange={(v) => patchText(p.slug, { name: v })}
                                  placeholder={p.name}
                                />
                                <Field
                                  id={`shade-${p.slug}`}
                                  label="Nijansa"
                                  value={s.shade}
                                  onChange={(v) => patchText(p.slug, { shade: v })}
                                  placeholder="npr. Naked Skin — prazno ako nema nijansu"
                                />
                                <Field
                                  id={`vol-${p.slug}`}
                                  label="Pakovanja (tekst na kartici)"
                                  value={s.volume}
                                  onChange={(v) => patchText(p.slug, { volume: v })}
                                  placeholder="npr. 10 g / 30 g / 50 g"
                                />
                                <Field
                                  id={`feat-${p.slug}`}
                                  label="Opis proizvoda — jedna stavka po redu"
                                  value={s.features}
                                  onChange={(v) => patchText(p.slug, { features: v })}
                                  rows={6}
                                />
                                <Field
                                  id={`how-${p.slug}`}
                                  label="Način primene"
                                  value={s.howToUse}
                                  onChange={(v) => patchText(p.slug, { howToUse: v })}
                                  rows={5}
                                />
                                <Field
                                  id={`form-${p.slug}`}
                                  label="Formulacija — oznake razdvoji znakom •"
                                  value={s.formulation}
                                  onChange={(v) => patchText(p.slug, { formulation: v })}
                                  placeholder="HEMA Free • Di-HEMA Free • TPO Free"
                                />
                                <Field
                                  id={`eu-${p.slug}`}
                                  label="Napomena o usklađenosti"
                                  value={s.euCompliance}
                                  onChange={(v) => patchText(p.slug, { euCompliance: v })}
                                  rows={2}
                                />
                              </div>

                              <div className="mt-5 border-t border-line pt-4">
                                <p className="mb-2 font-body text-[11px] uppercase tracking-[0.12em] text-muted">
                                  Cena po pakovanju (RSD)
                                </p>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                  {rowVariants.map((v) => {
                                    const raw = (s.prices[v.variant_slug] ?? '').trim();
                                    const price = raw === '' ? null : parsePrice(raw);
                                    return (
                                      <div key={v.variant_slug}>
                                        <label
                                          htmlFor={`price-${v.variant_slug}`}
                                          className="mb-1.5 block font-body text-[13px] text-ink-soft"
                                        >
                                          {v.package_label}
                                        </label>
                                        <input
                                          id={`price-${v.variant_slug}`}
                                          type="text"
                                          inputMode="decimal"
                                          value={s.prices[v.variant_slug] ?? ''}
                                          onChange={(e) =>
                                            setPrice(p.slug, v.variant_slug, e.target.value)
                                          }
                                          placeholder="npr. 2490"
                                          className={INPUT}
                                        />
                                        <p className="mt-1 font-body text-[12px] tabular-nums text-muted">
                                          {price != null && price > 0
                                            ? `${formatRsd(discountedUnitPriceRsd(price, pct))}${
                                                pct > 0 ? ` (−${Math.round(pct)}%)` : ''
                                              }`
                                            : 'Cena uskoro'}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="mt-4">
                                  <label
                                    htmlFor={`disc-${p.slug}`}
                                    className="mb-1.5 block font-body text-[11px] uppercase tracking-[0.12em] text-muted"
                                  >
                                    Popust % (prazno = globalni {Math.round(siteDiscountPercent)}%)
                                  </label>
                                  <input
                                    id={`disc-${p.slug}`}
                                    type="text"
                                    inputMode="decimal"
                                    value={s.discount}
                                    onChange={(e) =>
                                      patch(p.slug, {
                                        discount: e.target.value,
                                        saved: false,
                                        error: null,
                                      })
                                    }
                                    placeholder="npr. 15"
                                    className={`${INPUT} sm:max-w-[220px]`}
                                  />
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => void save(p.slug)}
                                disabled={s.saving}
                                className={`${BTN_PRIMARY} mt-5 w-full sm:w-auto`}
                              >
                                {s.saving ? 'Čuvam…' : 'Sačuvaj izmene'}
                              </button>

                              {lineSize > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => void applyPricesToLine(p.slug)}
                                  disabled={s.saving}
                                  className={`${BTN_QUIET} mt-2 w-full sm:w-auto`}
                                >
                                  Prenesi ove cene na svih {lineSize} u kategoriji
                                </button>
                              ) : null}
                            </div>
                          ) : null}

                          {s.error ? (
                            <p className="mt-3 font-body text-[13px] text-danger" role="alert">
                              {s.error}
                            </p>
                          ) : s.saved ? (
                            <p className="mt-3 font-body text-[13px] text-accent">Sačuvano.</p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="mt-4 font-body text-[14px] text-muted">Nema proizvoda po tom filteru.</p>
      ) : null}

      <p className="mt-6 font-body text-[13px] leading-relaxed text-muted">
        Nazivi, nijanse, opisi i način primene dolaze iz tabele proizvoda i menjaju se u kodu (
        <span className="font-mono">lib/data/products.ts</span>). Kategorije, cene, popusti, slike,{' '}
        {'„Na sajtu"'} i {'„Na početnoj"'} se menjaju ovde.
      </p>
    </div>
  );
}

/** Označeno polje za unos; `rows > 1` daje textarea umesto jednog reda. */
function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows = 1,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  // Tekst se ne poravnava kao brojevi — INPUT nosi tabular-nums zbog cena.
  const shared = `${INPUT} [font-variant-numeric:normal]`;
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block font-body text-[11px] uppercase tracking-[0.12em] text-muted"
      >
        {label}
      </label>
      {rows > 1 ? (
        <textarea
          id={id}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${shared} resize-y leading-relaxed`}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={shared}
        />
      )}
    </div>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="border border-line bg-canvas px-3 py-3 md:px-4">
      <p className="font-body text-[10px] uppercase leading-tight tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className={`mt-1 font-body text-[20px] tabular-nums ${warn ? 'text-accent' : 'text-ink'}`}>
        {value}
      </p>
    </div>
  );
}
