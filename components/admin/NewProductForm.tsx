'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { parsePct, parsePrice, slugify, uniqueSlug } from '@/lib/admin/parse';
import type {
  AdminCategoryRow,
  AdminProductRow,
  AdminVariantRow,
} from '@/components/admin/AdminProizvodiClient';

const PRODUCT_COLUMNS =
  'slug, name, image_path, volume, discount_percent, is_active, is_featured, category_slug, shade, features, how_to_use, formulation, eu_compliance, instagram_url';
const VARIANT_COLUMNS = 'product_slug, variant_slug, package_label, price_rsd, sort_order, is_active';

const INPUT =
  'w-full min-h-[44px] rounded-card border border-line bg-canvas px-3 py-2 font-body text-[16px] text-ink focus:border-ink focus:outline-none sm:text-[14px]';
const LABEL = 'mb-1.5 block font-body text-[11px] uppercase tracking-[0.12em] text-muted';
const HINT = 'mt-1 font-body text-[12px] leading-relaxed text-muted';
const BTN_PRIMARY =
  'inline-flex min-h-[44px] items-center justify-center rounded-card border border-ink bg-ink px-5 font-body text-[12px] uppercase tracking-[0.12em] text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50';
const BTN_QUIET =
  'inline-flex min-h-[40px] items-center justify-center rounded-card border border-line px-3 font-body text-[12px] text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-40';

type PackageDraft = { label: string; price: string };

/**
 * Novi proizvod od nule: naziv, opis, pakovanja sa cenama ili jedna cena bez
 * gramaže. Slike i klipovi se dodaju posle, na kartici proizvoda, jer za njih
 * proizvod već mora da postoji u bazi.
 */
export default function NewProductForm({
  categories,
  defaultCategory,
  existingSlugs,
  sortOrder,
  onCreated,
  onCancel,
}: {
  categories: AdminCategoryRow[];
  defaultCategory: string;
  existingSlugs: string[];
  sortOrder: number;
  onCreated: (product: AdminProductRow, variants: AdminVariantRow[]) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState(defaultCategory);
  const [name, setName] = useState('');
  const [shade, setShade] = useState('');
  const [features, setFeatures] = useState('');
  const [howToUse, setHowToUse] = useState('');
  const [formulation, setFormulation] = useState('HEMA Free • Di-HEMA Free • TPO Free');
  const [euCompliance, setEuCompliance] = useState(
    'Usklađeno sa važećim propisima EU za kozmetičke proizvode',
  );
  const [mode, setMode] = useState<'packages' | 'single'>('packages');
  const [singlePrice, setSinglePrice] = useState('');
  const [packages, setPackages] = useState<PackageDraft[]>([{ label: '', price: '' }]);
  const [discount, setDiscount] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchPackage = (index: number, next: Partial<PackageDraft>) =>
    setPackages((prev) => prev.map((p, i) => (i === index ? { ...p, ...next } : p)));

  const create = async () => {
    setError(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setError('Upiši naziv proizvoda.');
      return;
    }

    const rawDiscount = discount.trim();
    const discountPct = rawDiscount === '' ? null : parsePct(rawDiscount);
    if (rawDiscount !== '' && discountPct === null) {
      setError('Popust mora biti broj od 0 do 100 (ili prazno).');
      return;
    }

    // Jedna cena = jedno pakovanje bez naziva; inače spisak gramaža sa cenama.
    const drafts =
      mode === 'single'
        ? [{ label: '', price: singlePrice }]
        : packages.filter((p) => p.label.trim() !== '' || p.price.trim() !== '');
    if (drafts.length === 0) {
      setError('Dodaj bar jedno pakovanje sa nazivom, npr. 30 g.');
      return;
    }

    const rows: { label: string; price: number | null; code: string }[] = [];
    const seen = new Set<string>();
    for (const d of drafts) {
      const label = d.label.trim();
      if (mode === 'packages' && !label) {
        setError('Svako pakovanje mora imati naziv, npr. 30 g.');
        return;
      }
      if (seen.has(label.toLowerCase())) {
        setError(`Pakovanje „${label}" je upisano dva puta.`);
        return;
      }
      seen.add(label.toLowerCase());

      const rawPrice = d.price.trim();
      const price = rawPrice === '' ? null : parsePrice(rawPrice);
      if (rawPrice !== '' && price === null) {
        setError(`Cena${label ? ` za ${label}` : ''} mora biti broj (npr. 1890 ili 1890,50).`);
        return;
      }
      const code = uniqueSlug(label ? slugify(label) || 'pakovanje' : 'osnovno', rows.map((r) => r.code));
      rows.push({ label, price, code });
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const slug = uniqueSlug(slugify(`${cleanName} ${shade}`) || 'proizvod', existingSlugs);

    setBusy(true);
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        slug,
        name: cleanName,
        shade: shade.trim(),
        features: features
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line !== ''),
        how_to_use: howToUse.trim(),
        formulation: formulation.trim(),
        eu_compliance: euCompliance.trim(),
        instagram_url: '',
        volume: rows
          .map((r) => r.label)
          .filter(Boolean)
          .join(' / '),
        category_slug: category || null,
        sort_order: sortOrder,
        is_active: isActive,
        discount_percent: discountPct,
        base_price_rsd: 0,
        image_path: '',
      })
      .select(PRODUCT_COLUMNS)
      .single();

    if (productError || !product) {
      setBusy(false);
      setError(
        productError?.code === '23505'
          ? 'Proizvod sa tim nazivom već postoji. Promeni naziv ili nijansu.'
          : 'Pravljenje proizvoda nije uspelo.',
      );
      return;
    }

    const { data: variantRows, error: variantError } = await supabase
      .from('product_variants')
      .insert(
        rows.map((r, i) => ({
          product_slug: slug,
          variant_slug: `${slug}--${r.code}`,
          package_label: r.label,
          price_rsd: r.price,
          sort_order: i + 1,
          is_active: true,
        })),
      )
      .select(VARIANT_COLUMNS);

    if (variantError || !variantRows) {
      // Proizvod bez pakovanja ne može da se kupi, pa ne ostaje napola napravljen.
      await supabase.from('products').delete().eq('slug', slug);
      setBusy(false);
      setError('Pakovanja nisu sačuvana, pa proizvod nije napravljen. Pokušaj ponovo.');
      return;
    }

    setBusy(false);
    onCreated(
      product as AdminProductRow,
      (variantRows as AdminVariantRow[]).map((v) => ({ ...v, discount_percent: null })),
    );
  };

  const modeBtn = (active: boolean) =>
    `inline-flex min-h-[44px] flex-1 items-center justify-center rounded-card border px-3 font-body text-[13px] transition-colors sm:flex-none ${
      active ? 'border-ink bg-ink text-canvas' : 'border-line text-ink-soft hover:border-ink hover:text-ink'
    }`;

  return (
    <div className="border border-ink bg-surface p-4 md:p-5">
      <p className="font-display text-[18px] text-ink">Novi proizvod</p>
      <p className={HINT}>
        Popuni naziv, opis i cene. Slike i klipove dodaješ odmah posle, na kartici proizvoda.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="np-name" className={LABEL}>
            Naziv proizvoda *
          </label>
          <input
            id="np-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="npr. Fluid Perfect Builder Gel"
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="np-shade" className={LABEL}>
            Nijansa (može prazno)
          </label>
          <input
            id="np-shade"
            type="text"
            value={shade}
            onChange={(e) => setShade(e.target.value)}
            placeholder="npr. Jogurt Banana"
            className={INPUT}
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="np-category" className={LABEL}>
            Kategorija
          </label>
          <select
            id="np-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`${INPUT} md:max-w-[360px]`}
          >
            <option value="">Bez kategorije</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="np-features" className={LABEL}>
            Opis proizvoda (jedna stavka po redu)
          </label>
          <textarea
            id="np-features"
            rows={5}
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            placeholder={'Samonivelišuća formula\nPogodan za No File tehniku'}
            className={`${INPUT} resize-y leading-relaxed`}
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="np-how" className={LABEL}>
            Način primene (može prazno)
          </label>
          <textarea
            id="np-how"
            rows={4}
            value={howToUse}
            onChange={(e) => setHowToUse(e.target.value)}
            className={`${INPUT} resize-y leading-relaxed`}
          />
        </div>
        <div>
          <label htmlFor="np-form" className={LABEL}>
            Formulacija (oznake razdvoji znakom •)
          </label>
          <input
            id="np-form"
            type="text"
            value={formulation}
            onChange={(e) => setFormulation(e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="np-eu" className={LABEL}>
            Napomena o usklađenosti
          </label>
          <input
            id="np-eu"
            type="text"
            value={euCompliance}
            onChange={(e) => setEuCompliance(e.target.value)}
            className={INPUT}
          />
        </div>
      </div>

      {/* ── Cene ── */}
      <div className="mt-5 border-t border-line pt-4">
        <p className={LABEL}>Cena</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode('packages')} className={modeBtn(mode === 'packages')}>
            Više gramaža
          </button>
          <button type="button" onClick={() => setMode('single')} className={modeBtn(mode === 'single')}>
            Jedna cena, bez gramaže
          </button>
        </div>

        {mode === 'single' ? (
          <div className="mt-3 sm:max-w-[240px]">
            <label htmlFor="np-price" className={LABEL}>
              Cena (RSD)
            </label>
            <input
              id="np-price"
              type="text"
              inputMode="decimal"
              value={singlePrice}
              onChange={(e) => setSinglePrice(e.target.value)}
              placeholder="npr. 1890"
              className={`${INPUT} tabular-nums`}
            />
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {packages.map((p, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] gap-2">
                <input
                  type="text"
                  value={p.label}
                  onChange={(e) => patchPackage(i, { label: e.target.value })}
                  placeholder="Gramaža, npr. 30 g"
                  aria-label={`Naziv pakovanja ${i + 1}`}
                  className={INPUT}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={p.price}
                  onChange={(e) => patchPackage(i, { price: e.target.value })}
                  placeholder="Cena RSD"
                  aria-label={`Cena pakovanja ${i + 1}`}
                  className={`${INPUT} tabular-nums`}
                />
                <button
                  type="button"
                  onClick={() => setPackages((prev) => prev.filter((_, j) => j !== i))}
                  disabled={packages.length <= 1}
                  aria-label={`Ukloni pakovanje ${i + 1}`}
                  className={`${BTN_QUIET} min-h-[44px] hover:border-danger hover:text-danger`}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setPackages((prev) => [...prev, { label: '', price: '' }])}
              className={BTN_QUIET}
            >
              + Još jedna gramaža
            </button>
          </div>
        )}
        <p className={HINT}>Pakovanje bez cene se na sajtu ne prikazuje dok ne upišeš cenu.</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="np-discount" className={LABEL}>
              Popust % (prazno = globalni)
            </label>
            <input
              id="np-discount"
              type="text"
              inputMode="decimal"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="npr. 15"
              className={`${INPUT} tabular-nums sm:max-w-[160px]`}
            />
          </div>
          <label className="inline-flex min-h-[44px] items-center gap-2 self-end font-body text-[14px] text-ink-soft">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Odmah na sajtu
          </label>
        </div>
      </div>

      {error ? (
        <p className="mt-4 font-body text-[13px] text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => void create()} disabled={busy} className={BTN_PRIMARY}>
          {busy ? 'Pravim…' : 'Napravi proizvod'}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={BTN_QUIET}>
          Odustani
        </button>
      </div>
    </div>
  );
}
