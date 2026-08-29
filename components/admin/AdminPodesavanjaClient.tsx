'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { invalidatePricingCache } from '@/lib/use-pricing-data';
import { BUNDLE_DEFINITIONS } from '@/lib/pricing-engine';
import { getBundleBySlug } from '@/lib/data/products';
import AdminHeroImage from '@/components/admin/AdminHeroImage';

export type DiscountCodeRow = {
  id: number;
  code: string;
  discount_percent: number | string;
  is_active: boolean;
  created_at: string;
};

type Props = {
  initialSiteDiscount: number;
  initialBundleDiscount: number;
  initialHeroImage: string;
  initialCodes: DiscountCodeRow[];
  codesError: string | null;
};

function parsePct(raw: string): number | null {
  const v = parseFloat(raw.replace(',', '.'));
  if (Number.isNaN(v) || v < 0 || v > 100) return null;
  return Math.round(v * 100) / 100;
}

export default function AdminPodesavanjaClient({
  initialSiteDiscount,
  initialBundleDiscount,
  initialHeroImage,
  initialCodes,
  codesError,
}: Props) {
  const [siteDiscount, setSiteDiscount] = useState(String(initialSiteDiscount));
  const [bundleDiscount, setBundleDiscount] = useState(String(initialBundleDiscount));
  const [savingSite, setSavingSite] = useState(false);
  const [savingBundle, setSavingBundle] = useState(false);
  const [siteMsg, setSiteMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [bundleMsg, setBundleMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [codes, setCodes] = useState(initialCodes);
  const [newCode, setNewCode] = useState('');
  const [newPercent, setNewPercent] = useState('');
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [addingCode, setAddingCode] = useState(false);

  const saveSetting = async (
    column: 'site_discount_percent' | 'bundle_discount_percent',
    raw: string,
    setSaving: (b: boolean) => void,
    setMsg: (m: { ok: boolean; text: string } | null) => void,
  ) => {
    const value = parsePct(raw);
    if (value === null) {
      setMsg({ ok: false, text: 'Unesi broj između 0 i 100.' });
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from('site_settings')
      .update({ [column]: value, updated_at: new Date().toISOString() })
      .eq('id', 1);
    setSaving(false);

    if (error) {
      setMsg({ ok: false, text: 'Čuvanje nije uspelo.' });
      return;
    }
    setMsg({ ok: true, text: 'Sačuvano.' });
    invalidatePricingCache();
  };

  const addCode = async () => {
    const code = newCode.trim().toUpperCase().replace(/\s+/g, '');
    const percent = parsePct(newPercent);

    if (code.length < 3) {
      setCodeMsg({ ok: false, text: 'Kod mora imati bar 3 znaka.' });
      return;
    }
    if (!/^[A-Z0-9_-]+$/.test(code)) {
      setCodeMsg({ ok: false, text: 'Dozvoljena su slova, brojevi, crtica i donja crta.' });
      return;
    }
    if (percent === null || percent <= 0) {
      setCodeMsg({ ok: false, text: 'Popust mora biti broj veći od 0.' });
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setAddingCode(true);
    setCodeMsg(null);
    const { data, error } = await supabase
      .from('discount_codes')
      .insert({ code, discount_percent: percent, is_active: true })
      .select('id, code, discount_percent, is_active, created_at')
      .single();
    setAddingCode(false);

    if (error) {
      setCodeMsg({
        ok: false,
        text: error.code === '23505' ? 'Taj kod već postoji.' : 'Dodavanje nije uspelo.',
      });
      return;
    }

    setCodes((prev) => [data as DiscountCodeRow, ...prev]);
    setNewCode('');
    setNewPercent('');
    setCodeMsg({ ok: true, text: 'Kod je dodat.' });
  };

  const toggleCode = async (id: number, next: boolean) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { error } = await supabase.from('discount_codes').update({ is_active: next }).eq('id', id);
    if (!error) {
      setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: next } : c)));
    }
  };

  const deleteCode = async (id: number) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { error } = await supabase.from('discount_codes').delete().eq('id', id);
    if (!error) {
      setCodes((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const input =
    'w-full min-h-[44px] rounded-card border border-line bg-canvas px-3 py-2.5 font-body text-[16px] tabular-nums text-ink focus:border-ink focus:outline-none input-no-spinner sm:text-[14px]';

  const percentBundles = BUNDLE_DEFINITIONS.filter((d) => d.kind === 'percent');
  const fixedBundles = BUNDLE_DEFINITIONS.filter((d) => d.kind === 'fixed');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 font-display text-[22px] text-ink md:text-[26px]">Podešavanja</h2>
        <p className="max-w-[720px] font-body text-[13px] leading-relaxed text-muted">
          Popusti važe odmah — i na sajtu i pri poručivanju (server ponovo računa iznos).
        </p>
      </div>

      <AdminHeroImage initialUrl={initialHeroImage} />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="border border-line bg-canvas p-5 md:p-6">
          <h3 className="font-display text-[18px] text-ink">Globalni popust</h3>
          <p className="mt-1.5 font-body text-[14px] leading-relaxed text-muted">
            Primenjuje se na sve proizvode koji nemaju svoj popust (kartica Proizvodi).
          </p>
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={siteDiscount}
              onChange={(e) => {
                setSiteDiscount(e.target.value);
                setSiteMsg(null);
              }}
              className={input}
              aria-label="Globalni popust u procentima"
            />
            <button
              type="button"
              onClick={() =>
                void saveSetting('site_discount_percent', siteDiscount, setSavingSite, setSiteMsg)
              }
              disabled={savingSite}
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-card border border-ink bg-ink px-5 font-body text-[12px] uppercase tracking-[0.12em] text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50"
            >
              {savingSite ? 'Čuvam…' : 'Sačuvaj'}
            </button>
          </div>
          {siteMsg ? (
            <p className={`mt-2 font-body text-[13px] ${siteMsg.ok ? 'text-accent' : 'text-danger'}`}>
              {siteMsg.text}
            </p>
          ) : null}
        </section>

        <section className="border border-line bg-canvas p-5 md:p-6">
          <h3 className="font-display text-[18px] text-ink">Paketni popust</h3>
          <p className="mt-1.5 font-body text-[14px] leading-relaxed text-muted">
            Važi za pakete sa procentualnim popustom:{' '}
            {percentBundles.map((d) => getBundleBySlug(d.id)?.name ?? d.id).join(', ') || '—'}.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={bundleDiscount}
              onChange={(e) => {
                setBundleDiscount(e.target.value);
                setBundleMsg(null);
              }}
              className={input}
              aria-label="Paketni popust u procentima"
            />
            <button
              type="button"
              onClick={() =>
                void saveSetting('bundle_discount_percent', bundleDiscount, setSavingBundle, setBundleMsg)
              }
              disabled={savingBundle}
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-card border border-ink bg-ink px-5 font-body text-[12px] uppercase tracking-[0.12em] text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50"
            >
              {savingBundle ? 'Čuvam…' : 'Sačuvaj'}
            </button>
          </div>
          {bundleMsg ? (
            <p className={`mt-2 font-body text-[13px] ${bundleMsg.ok ? 'text-accent' : 'text-danger'}`}>
              {bundleMsg.text}
            </p>
          ) : null}
          {fixedBundles.length > 0 ? (
            <p className="mt-3 font-body text-[14px] leading-relaxed text-muted">
              Paketi sa fiksnom cenom (
              {fixedBundles.map((d) => getBundleBySlug(d.id)?.name ?? d.id).join(', ')}) se menjaju u{' '}
              <span className="font-mono">lib/pricing-engine.ts</span>.
            </p>
          ) : null}
        </section>
      </div>

      <section className="border border-line bg-canvas p-5 md:p-6">
        <h3 className="font-display text-[18px] text-ink">Promo kodovi</h3>
        <p className="mt-1.5 max-w-[640px] font-body text-[14px] leading-relaxed text-muted">
          Kupac unosi kod na stranici porudžbine. Popust se računa na iznos posle popusta na
          proizvode.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_140px_auto] sm:items-end">
          <div>
            <label
              htmlFor="new-code"
              className="mb-1.5 block font-body text-[10px] uppercase tracking-[0.12em] text-muted"
            >
              Kod
            </label>
            <input
              id="new-code"
              type="text"
              value={newCode}
              onChange={(e) => {
                setNewCode(e.target.value);
                setCodeMsg(null);
              }}
              placeholder="npr. LETO10"
              autoCapitalize="characters"
              className={`${input} uppercase`}
            />
          </div>
          <div>
            <label
              htmlFor="new-percent"
              className="mb-1.5 block font-body text-[10px] uppercase tracking-[0.12em] text-muted"
            >
              Popust %
            </label>
            <input
              id="new-percent"
              type="text"
              inputMode="decimal"
              value={newPercent}
              onChange={(e) => {
                setNewPercent(e.target.value);
                setCodeMsg(null);
              }}
              placeholder="10"
              className={input}
            />
          </div>
          <button
            type="button"
            onClick={() => void addCode()}
            disabled={addingCode}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-card border border-ink bg-ink px-5 font-body text-[12px] uppercase tracking-[0.12em] text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50 sm:w-auto"
          >
            {addingCode ? 'Dodajem…' : 'Dodaj kod'}
          </button>
        </div>

        {codeMsg ? (
          <p className={`mt-2 font-body text-[13px] ${codeMsg.ok ? 'text-accent' : 'text-danger'}`}>
            {codeMsg.text}
          </p>
        ) : null}
        {codesError ? (
          <p className="mt-2 font-body text-[13px] text-danger">
            Kodovi nisu učitani: {codesError}
          </p>
        ) : null}

        {codes.length === 0 ? (
          <p className="mt-6 border border-dashed border-line py-8 text-center font-body text-[13px] text-muted">
            Nema promo kodova.
          </p>
        ) : (
          <ul className="mt-5">
            {codes.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3"
              >
                <div>
                  <p className="font-mono text-[14px] text-ink">{c.code}</p>
                  <p className="mt-0.5 font-body text-[13px] text-muted">
                    −{Number(c.discount_percent)}% ·{' '}
                    {new Date(c.created_at).toLocaleDateString('sr-RS')}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <label className="inline-flex min-h-[40px] items-center gap-2 font-body text-[13px] text-ink-soft">
                    <input
                      type="checkbox"
                      checked={c.is_active}
                      onChange={(e) => void toggleCode(c.id, e.target.checked)}
                    />
                    Aktivan
                  </label>
                  <button
                    type="button"
                    onClick={() => void deleteCode(c.id)}
                    className="inline-flex min-h-[40px] items-center font-body text-[13px] text-muted underline underline-offset-2 hover:text-danger"
                  >
                    Obriši
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border border-line bg-canvas p-5 md:p-6">
        <h3 className="font-display text-[18px] text-ink">Sadržaj sajta</h3>
        <ul className="mt-3 space-y-1.5 font-body text-[13px] leading-relaxed text-muted">
          <li>
            Naziv brenda, logo, adresa, radno vreme i traka sa obaveštenjima:{' '}
            <span className="font-mono text-ink">lib/site-config.ts</span>
          </li>
          <li>
            Proizvodi (nazivi, opisi, sastojci, slike):{' '}
            <span className="font-mono text-ink">lib/data/products.ts</span>
          </li>
          <li>
            Cenovnik usluga salona: <span className="font-mono text-ink">lib/data/services.ts</span>
          </li>
          <li>
            Poštarina i prag besplatne dostave:{' '}
            <span className="font-mono text-ink">lib/shipping.ts</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
