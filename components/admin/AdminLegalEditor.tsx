'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import LegalDocument from '@/components/LegalDocument';
import { DEFAULT_LEGAL } from '@/lib/legal-defaults';
import { LEGAL_PLACEHOLDERS, type LegalKind, type LegalValues } from '@/lib/legal';

const DOKUMENTI: { kind: LegalKind; naslov: string; href: string; kolona: 'privacy' | 'terms' }[] = [
  { kind: 'privatnost', naslov: 'Politika privatnosti', href: '/politika-privatnosti', kolona: 'privacy' },
  { kind: 'uslovi', naslov: 'Uslovi korišćenja', href: '/uslovi-koriscenja', kolona: 'terms' },
];

/**
 * Izmena pravnih tekstova. Polje je unapred popunjeno postojećim tekstom,
 * pa se menja ono što već stoji umesto da se piše od nule. Ako se tekst
 * vrati na podrazumevani, u bazu ide prazno — sajt tada prati tekst iz koda.
 */
export default function AdminLegalEditor({
  initialPrivacy,
  initialTerms,
  values,
  missing,
}: {
  initialPrivacy: string;
  initialTerms: string;
  values: LegalValues;
  /** Migracija 0018 nije puštena. */
  missing: boolean;
}) {
  const [aktivan, setAktivan] = useState<LegalKind>('privatnost');
  const [tekst, setTekst] = useState<Record<LegalKind, string>>({
    privatnost: initialPrivacy.trim() || DEFAULT_LEGAL.privatnost,
    uslovi: initialTerms.trim() || DEFAULT_LEGAL.uslovi,
  });
  const [sacuvano, setSacuvano] = useState<Record<LegalKind, string>>({ ...tekst });
  const [pregled, setPregled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const doc = DOKUMENTI.find((d) => d.kind === aktivan) ?? DOKUMENTI[0];
  const izmenjeno = tekst[aktivan] !== sacuvano[aktivan];
  const jePodrazumevani = tekst[aktivan].trim() === DEFAULT_LEGAL[aktivan].trim();

  const sacuvaj = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const vrednost = tekst[aktivan].trim();
    if (vrednost.length < 50) {
      setMsg({ ok: false, text: 'Tekst je prekratak — proveri da nije slučajno obrisan.' });
      return;
    }

    setBusy(true);
    setMsg(null);
    // Podrazumevani tekst se ne kopira u bazu — tako kasnije ispravke u kodu
    // stižu i do sajta koji ga nije menjao.
    const { error } = await supabase
      .from('site_settings')
      .update({
        [`${doc.kolona}_text`]: jePodrazumevani ? '' : vrednost,
        [`${doc.kolona}_updated_at`]: jePodrazumevani ? null : new Date().toISOString(),
      })
      .eq('id', 1);
    setBusy(false);

    if (error) {
      setMsg({ ok: false, text: 'Čuvanje nije uspelo.' });
      return;
    }
    setSacuvano((prev) => ({ ...prev, [aktivan]: tekst[aktivan] }));
    setMsg({ ok: true, text: 'Sačuvano — na sajtu se vidi za najviše 30 sekundi.' });
  };

  if (missing) {
    return (
      <section className="border border-line bg-canvas p-5 md:p-6">
        <h3 className="font-display text-[18px] text-ink">Pravni tekstovi</h3>
        <p className="mt-2 font-body text-[13px] text-danger">
          Pokreni <span className="font-mono">supabase/migrations/0018_pravni_tekstovi.sql</span> u
          Supabase SQL Editoru pa osveži stranicu.
        </p>
      </section>
    );
  }

  return (
    <section className="border border-line bg-canvas p-5 md:p-6">
      <h3 className="font-display text-[18px] text-ink">Pravni tekstovi</h3>
      <p className="mt-1.5 max-w-[680px] font-body text-[13px] leading-relaxed text-muted">
        Politika privatnosti i Uslovi korišćenja — stranice iz footera. Menjaš ih ovde, a sajt
        ih prikazuje najviše 30 sekundi posle čuvanja.
      </p>

      <div className="mt-4 flex flex-wrap gap-2" role="tablist">
        {DOKUMENTI.map((d) => {
          const sel = d.kind === aktivan;
          return (
            <button
              key={d.kind}
              type="button"
              role="tab"
              aria-selected={sel}
              onClick={() => {
                setAktivan(d.kind);
                setMsg(null);
              }}
              className={`min-h-[44px] rounded-card border px-4 font-body text-[13px] uppercase tracking-[0.1em] transition-colors ${
                sel ? 'border-ink bg-ink text-canvas' : 'border-line-strong text-ink-soft hover:border-ink'
              }`}
            >
              {d.naslov}
              {tekst[d.kind] !== sacuvano[d.kind] ? ' •' : ''}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPregled(false)}
            className={`min-h-[40px] rounded-card border px-3 font-body text-[12px] ${
              !pregled ? 'border-ink text-ink' : 'border-line text-muted hover:border-ink'
            }`}
          >
            Uređivanje
          </button>
          <button
            type="button"
            onClick={() => setPregled(true)}
            className={`min-h-[40px] rounded-card border px-3 font-body text-[12px] ${
              pregled ? 'border-ink text-ink' : 'border-line text-muted hover:border-ink'
            }`}
          >
            Pregled
          </button>
        </div>
        <a
          href={doc.href}
          target="_blank"
          rel="noopener"
          className="font-body text-[12px] text-ink underline underline-offset-2"
        >
          Otvori na sajtu ↗
        </a>
      </div>

      {pregled ? (
        <div className="mt-3 max-h-[70vh] overflow-y-auto border border-line bg-surface p-5">
          <LegalDocument text={tekst[aktivan]} values={values} compact />
        </div>
      ) : (
        <textarea
          value={tekst[aktivan]}
          onChange={(e) => {
            const v = e.target.value;
            setTekst((prev) => ({ ...prev, [aktivan]: v }));
            setMsg(null);
          }}
          rows={22}
          spellCheck
          aria-label={doc.naslov}
          className="mt-3 w-full resize-y rounded-card border border-line-strong bg-canvas px-4 py-3 font-body text-[14px] leading-relaxed text-ink focus:border-ink focus:outline-none"
        />
      )}

      <details className="mt-3 border border-line bg-surface px-4 py-3">
        <summary className="cursor-pointer font-body text-[13px] font-semibold text-ink">
          Kako se piše tekst
        </summary>
        <ul className="mt-2 space-y-1.5 font-body text-[13px] leading-relaxed text-ink-soft">
          <li>
            <span className="font-mono text-ink">## Naslov</span> — naslov odeljka (dve tarabe i
            razmak na početku reda)
          </li>
          <li>
            <span className="font-mono text-ink">- stavka</span> — tačka u spisku
          </li>
          <li>
            <span className="font-mono text-ink">**tekst**</span> — podebljano
          </li>
          <li>Prazan red — novi pasus</li>
        </ul>
        <p className="mt-3 font-body text-[13px] leading-relaxed text-ink-soft">
          Podaci o salonu se ne kucaju ručno — upiši oznaku, a sajt ubaci trenutnu vrednost iz
          Podešavanja (promeniš telefon tamo, menja se i ovde):
        </p>
        <ul className="mt-2 grid gap-x-6 gap-y-1 font-body text-[13px] text-ink-soft sm:grid-cols-2">
          {LEGAL_PLACEHOLDERS.map((p) => (
            <li key={p.key}>
              <span className="font-mono text-ink">{`{${p.key}}`}</span> — {p.opis}
              {values[p.key] ? <span className="text-muted"> ({values[p.key]})</span> : null}
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <button
          type="button"
          onClick={() => void sacuvaj()}
          disabled={busy || !izmenjeno}
          className="min-h-[44px] rounded-card border border-ink bg-ink px-5 font-body text-[12px] font-semibold uppercase tracking-[0.12em] text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:opacity-40 disabled:hover:bg-ink disabled:hover:text-canvas"
        >
          {busy ? 'Čuvam…' : `Sačuvaj — ${doc.naslov}`}
        </button>
        {izmenjeno ? (
          <button
            type="button"
            onClick={() => setTekst((prev) => ({ ...prev, [aktivan]: sacuvano[aktivan] }))}
            className="font-body text-[12px] uppercase tracking-[0.1em] text-muted underline underline-offset-2 hover:text-ink"
          >
            Poništi izmene
          </button>
        ) : null}
        {!jePodrazumevani ? (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Vratiti podrazumevani tekst? Tvoje izmene se brišu kad sačuvaš.')) {
                setTekst((prev) => ({ ...prev, [aktivan]: DEFAULT_LEGAL[aktivan] }));
                setMsg(null);
              }
            }}
            className="font-body text-[12px] uppercase tracking-[0.1em] text-muted underline underline-offset-2 hover:text-ink"
          >
            Vrati podrazumevani tekst
          </button>
        ) : null}
        {msg ? (
          <span className={`font-body text-[13px] ${msg.ok ? 'text-accent' : 'text-danger'}`}>
            {msg.text}
          </span>
        ) : null}
      </div>
    </section>
  );
}
