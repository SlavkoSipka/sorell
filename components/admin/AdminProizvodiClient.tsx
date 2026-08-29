'use client';

import { useMemo, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { invalidatePricingCache } from '@/lib/use-pricing-data';
import { discountedUnitPriceRsd, formatRsd } from '@/lib/price';
import { placeholderImage } from '@/lib/data/product-images';
import { getProductBySlug } from '@/lib/data/products';

const IMAGE_BUCKET = 'product-images';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
/** Koliko proizvoda stane u „Izdvojeno iz ponude" na početnoj. */
const FEATURED_SLOTS = 8;

export type AdminProductRow = {
  slug: string;
  name: string;
  image_path: string | null;
  volume: string;
  /** NULL = koristi se globalni popust. */
  discount_percent: number | string | null;
  is_active: boolean;
  is_featured: boolean;
};

export type AdminVariantRow = {
  product_slug: string;
  variant_slug: string;
  package_label: string;
  price_rsd: number | string | null;
  sort_order: number | null;
  is_active: boolean;
};

type RowState = {
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

/** Putanja objekta unutar bucket-a iz javnog URL-a — da stara slika ne ostane da visi. */
function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/${IMAGE_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

/** Naziv linije iz kataloga — za grupisanje liste. */
function categoryOf(slug: string): string {
  return getProductBySlug(slug)?.category ?? 'Ostalo';
}

export default function AdminProizvodiClient({
  initialProducts,
  initialVariants,
  siteDiscountPercent,
}: {
  initialProducts: AdminProductRow[];
  initialVariants: AdminVariantRow[];
  siteDiscountPercent: number;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [variants, setVariants] = useState(initialVariants);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('sve');
  const [notice, setNotice] = useState<string | null>(null);

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

    const { error: discErr } = await supabase
      .from('products')
      .update({ discount_percent: discount })
      .eq('slug', slug);

    patch(slug, { saving: false });

    if (discErr) {
      patch(slug, { error: 'Cene su sačuvane, ali popust nije.' });
      return false;
    }

    setVariants((prev) =>
      prev.map((v) => {
        const u = updates.find((x) => x.variant_slug === v.variant_slug);
        return u ? { ...v, price_rsd: u.price_rsd } : v;
      }),
    );
    setProducts((prev) =>
      prev.map((p) => (p.slug === slug ? { ...p, discount_percent: discount } : p)),
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
   * Cene ovog proizvoda → svi ostali proizvodi iste linije.
   * Nijanse jedne linije po pravilu imaju istu cenu, pa ovo štedi desetine unosa.
   */
  const applyPricesToLine = async (slug: string) => {
    const category = categoryOf(slug);
    const targets = products.filter((p) => p.slug !== slug && categoryOf(p.slug) === category);
    if (targets.length === 0) return;

    const sourceVariants = variantsByProduct.get(slug) ?? [];
    const byLabel = new Map(
      sourceVariants.map((v) => [v.package_label, (state[slug].prices[v.variant_slug] ?? '').trim()]),
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
        setNotice('Prenos cena na liniju nije uspeo do kraja. Osveži stranicu i proveri.');
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
    setNotice(`Cene su prenete na još ${targets.length} nijansi u liniji „${category}".`);
  };

  const uploadImage = async (slug: string, file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      patch(slug, { error: 'Dozvoljene su JPG, PNG, WEBP i AVIF slike.' });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      patch(slug, { error: 'Slika je veća od 5 MB.' });
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    patch(slug, { uploading: true, error: null, saved: false });

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    // Vreme u nazivu: kad se slika zameni, kupci odmah vide novu umesto keširane.
    const path = `${slug}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, file, { cacheControl: '31536000', upsert: false });

    if (uploadErr) {
      patch(slug, { uploading: false, error: 'Slanje slike nije uspelo.' });
      return;
    }

    const publicUrl = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;

    const { error: updateErr } = await supabase
      .from('products')
      .update({ image_path: publicUrl })
      .eq('slug', slug);

    if (updateErr) {
      patch(slug, { uploading: false, error: 'Slika je poslata, ali nije povezana sa proizvodom.' });
      return;
    }

    // Prethodna slika iz istog bucket-a više nikom ne treba.
    const previous = products.find((p) => p.slug === slug)?.image_path ?? '';
    const previousPath = previous ? storagePathFromPublicUrl(previous) : null;
    if (previousPath && previousPath !== path) {
      await supabase.storage.from(IMAGE_BUCKET).remove([previousPath]);
    }

    setProducts((prev) => prev.map((p) => (p.slug === slug ? { ...p, image_path: publicUrl } : p)));
    patch(slug, { uploading: false, saved: true });
    invalidatePricingCache();
  };

  const clearImage = async (slug: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const previous = products.find((p) => p.slug === slug)?.image_path ?? '';
    patch(slug, { uploading: true, error: null });

    const { error } = await supabase.from('products').update({ image_path: '' }).eq('slug', slug);
    if (error) {
      patch(slug, { uploading: false, error: 'Uklanjanje slike nije uspelo.' });
      return;
    }

    const previousPath = previous ? storagePathFromPublicUrl(previous) : null;
    if (previousPath) await supabase.storage.from(IMAGE_BUCKET).remove([previousPath]);

    setProducts((prev) => prev.map((p) => (p.slug === slug ? { ...p, image_path: '' } : p)));
    patch(slug, { uploading: false, saved: true });
    invalidatePricingCache();
  };

  const toggleFlag = async (
    slug: string,
    column: 'is_active' | 'is_featured',
    next: boolean,
  ) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setNotice(null);
    const { error } = await supabase.from('products').update({ [column]: next }).eq('slug', slug);
    if (error) {
      patch(slug, { error: 'Izmena nije sačuvana.' });
      return;
    }
    setProducts((prev) => prev.map((p) => (p.slug === slug ? { ...p, [column]: next } : p)));
    invalidatePricingCache();
  };

  const input =
    'w-full rounded-card border border-line bg-canvas px-2.5 py-2 font-body text-[13px] tabular-nums text-ink focus:border-ink focus:outline-none input-no-spinner';

  const hasNoPrice = (slug: string) =>
    (variantsByProduct.get(slug) ?? []).some((v) => v.price_rsd == null);

  const needle = query.trim().toLowerCase();
  const visible = products.filter((p) => {
    if (needle && !p.name.toLowerCase().includes(needle) && !p.slug.toLowerCase().includes(needle)) {
      return false;
    }
    if (filter === 'bez-cene') return hasNoPrice(p.slug);
    if (filter === 'bez-slike') return !p.image_path;
    if (filter === 'na-pocetnoj') return p.is_featured;
    return true;
  });

  // Grupisanje po liniji — 46 proizvoda je previše za jednu neprekinutu listu.
  const groups: { label: string; items: AdminProductRow[] }[] = [];
  for (const p of visible) {
    const label = categoryOf(p.slug);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(p);
    else groups.push({ label, items: [p] });
  }

  const withoutPrice = products.filter((p) => hasNoPrice(p.slug)).length;
  const withoutImage = products.filter((p) => !p.image_path).length;
  const featuredCount = products.filter((p) => p.is_featured).length;

  return (
    <div>
      <h2 className="mb-2 font-display text-[22px] text-ink md:text-[26px]">Proizvodi</h2>
      <p className="mb-5 max-w-[780px] font-body text-[13px] leading-relaxed text-muted">
        Svaki proizvod ima cenu po pakovanju. Sve što ovde sačuvaš odmah važi na sajtu i pri
        poručivanju. Pakovanje bez cene se na sajtu prikazuje kao{' '}
        <span className="text-ink">{'„Cena uskoro"'}</span> i ne može da se poruči.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Proizvoda" value={String(products.length)} />
        <Stat label="Čeka cenu" value={String(withoutPrice)} warn={withoutPrice > 0} />
        <Stat label="Čeka sliku" value={String(withoutImage)} warn={withoutImage > 0} />
        <Stat
          label="Na početnoj"
          value={`${featuredCount} / ${FEATURED_SLOTS}`}
          warn={featuredCount > FEATURED_SLOTS}
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label htmlFor="admin-product-search" className="sr-only">
          Pretraga proizvoda
        </label>
        <input
          id="admin-product-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pretraži po nazivu ili nijansi…"
          className="w-full max-w-[320px] rounded-card border border-line bg-canvas px-3 py-2.5 font-body text-[13px] text-ink focus:border-ink focus:outline-none"
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`rounded-card border px-3 py-2 font-body text-[11px] uppercase tracking-[0.1em] transition-colors ${
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

      {notice ? (
        <p className="mb-5 rounded-card border border-line bg-surface px-4 py-3 font-body text-[13px] text-ink-soft">
          {notice}
        </p>
      ) : null}

      {groups.map((group) => (
        <section key={group.label} className="mb-8">
          <h3 className="mb-3 border-b border-line pb-2 font-display text-[17px] text-ink">
            {group.label}{' '}
            <span className="font-body text-[12px] text-muted">({group.items.length})</span>
          </h3>

          <div className="space-y-3">
            {group.items.map((p) => {
              const s = state[p.slug];
              if (!s) return null;

              const rowVariants = variantsByProduct.get(p.slug) ?? [];
              const pct = s.discount.trim() === '' ? siteDiscountPercent : (parsePct(s.discount) ?? 0);
              const lineSize = products.filter((x) => categoryOf(x.slug) === group.label).length;

              return (
                <div key={p.slug} className="border border-line bg-canvas p-4 md:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-body text-[15px] text-ink">{p.name}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted">
                        {p.slug} · {p.volume}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-2 font-body text-[12px] text-ink-soft">
                        <input
                          type="checkbox"
                          checked={p.is_featured}
                          onChange={(e) =>
                            void toggleFlag(p.slug, 'is_featured', e.target.checked)
                          }
                        />
                        Na početnoj
                      </label>
                      <label className="flex items-center gap-2 font-body text-[12px] text-ink-soft">
                        <input
                          type="checkbox"
                          checked={p.is_active}
                          onChange={(e) => void toggleFlag(p.slug, 'is_active', e.target.checked)}
                        />
                        Na sajtu
                      </label>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-start gap-4">
                    <ImageField
                      slug={p.slug}
                      imagePath={p.image_path ?? ''}
                      fallbackImage={placeholderImage(p.slug)}
                      uploading={s.uploading}
                      onUpload={(file) => void uploadImage(p.slug, file)}
                      onClear={() => void clearImage(p.slug)}
                    />

                    <div className="min-w-[260px] flex-1">
                      <p className="mb-2 font-body text-[10px] uppercase tracking-[0.12em] text-muted">
                        Cena po pakovanju (RSD)
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {rowVariants.map((v) => {
                          const raw = (s.prices[v.variant_slug] ?? '').trim();
                          const price = raw === '' ? null : parsePrice(raw);
                          return (
                            <div key={v.variant_slug}>
                              <label
                                htmlFor={`price-${v.variant_slug}`}
                                className="mb-1.5 block font-body text-[11px] text-ink-soft"
                              >
                                {v.package_label}
                              </label>
                              <input
                                id={`price-${v.variant_slug}`}
                                type="text"
                                inputMode="decimal"
                                value={s.prices[v.variant_slug] ?? ''}
                                onChange={(e) => setPrice(p.slug, v.variant_slug, e.target.value)}
                                placeholder="npr. 2490"
                                className={input}
                              />
                              <p className="mt-1 font-body text-[11px] tabular-nums text-muted">
                                {price != null && price > 0
                                  ? `${formatRsd(discountedUnitPriceRsd(price, pct))}${pct > 0 ? ` (−${Math.round(pct)}%)` : ''}`
                                  : 'Cena uskoro'}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                        <div>
                          <label
                            htmlFor={`disc-${p.slug}`}
                            className="mb-1.5 block font-body text-[10px] uppercase tracking-[0.12em] text-muted"
                          >
                            Popust % (prazno = globalni {Math.round(siteDiscountPercent)}%)
                          </label>
                          <input
                            id={`disc-${p.slug}`}
                            type="text"
                            inputMode="decimal"
                            value={s.discount}
                            onChange={(e) =>
                              patch(p.slug, { discount: e.target.value, saved: false, error: null })
                            }
                            placeholder="npr. 15"
                            className={input}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => void save(p.slug)}
                          disabled={s.saving}
                          className="rounded-card border border-ink bg-ink px-5 py-2.5 font-body text-[11px] uppercase tracking-[0.12em] text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50"
                        >
                          {s.saving ? 'Čuvam…' : 'Sačuvaj'}
                        </button>
                      </div>

                      {lineSize > 1 ? (
                        <button
                          type="button"
                          onClick={() => void applyPricesToLine(p.slug)}
                          disabled={s.saving}
                          className="mt-3 font-body text-[12px] text-muted underline underline-offset-2 hover:text-ink disabled:opacity-50"
                        >
                          Sačuvaj i prenesi ove cene na svih {lineSize} nijansi u liniji
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {s.error ? (
                    <p className="mt-3 font-body text-[12px] text-danger" role="alert">
                      {s.error}
                    </p>
                  ) : s.saved ? (
                    <p className="mt-3 font-body text-[12px] text-accent">Sačuvano.</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {visible.length === 0 ? (
        <p className="font-body text-[13px] text-muted">Nema proizvoda po tom filteru.</p>
      ) : null}

      <p className="mt-6 font-body text-[12px] leading-relaxed text-muted">
        Nazivi, nijanse, opisi i način primene dolaze iz tabele proizvoda i menjaju se u kodu (
        <span className="font-mono">lib/data/products.ts</span>). Cene, popusti, slike,{' '}
        {'„Na sajtu"'} i {'„Na početnoj"'} se menjaju ovde.
      </p>
    </div>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="border border-line bg-canvas px-4 py-3">
      <p className="font-body text-[10px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p
        className={`mt-1 font-body text-[20px] tabular-nums ${warn ? 'text-accent' : 'text-ink'}`}
      >
        {value}
      </p>
    </div>
  );
}

/** Prikaz i zamena slike proizvoda. */
function ImageField({
  slug,
  imagePath,
  fallbackImage,
  uploading,
  onUpload,
  onClear,
}: {
  slug: string;
  imagePath: string;
  fallbackImage: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const shown = imagePath || fallbackImage;

  return (
    <div className="w-[128px] shrink-0">
      <div className="relative aspect-[4/5] w-full overflow-hidden border border-line bg-surface-2">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" className="h-full w-full object-contain p-2" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-2 text-center font-body text-[10px] uppercase tracking-[0.14em] text-muted">
            Nema slike
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        id={`image-${slug}`}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = '';
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="mt-2 w-full rounded-card border border-line-strong px-3 py-2 font-body text-[11px] uppercase tracking-[0.1em] text-ink transition-colors hover:border-ink disabled:opacity-50"
      >
        {uploading ? 'Šaljem…' : imagePath ? 'Zameni sliku' : 'Dodaj sliku'}
      </button>

      {imagePath ? (
        <button
          type="button"
          onClick={onClear}
          disabled={uploading}
          className="mt-1 w-full py-1 font-body text-[11px] text-muted underline underline-offset-2 hover:text-ink disabled:opacity-50"
        >
          Vrati privremenu
        </button>
      ) : null}
    </div>
  );
}
