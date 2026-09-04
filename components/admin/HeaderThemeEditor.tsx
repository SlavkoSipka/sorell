'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SITE } from '@/lib/site-config';
import {
  DEFAULT_HEADER_THEME,
  HEADER_THEME_FIELDS,
  HEADER_THEME_PRESETS,
  contrastRatio,
  isHexColor,
  normalizeHex,
  type HeaderTheme,
} from '@/lib/theme';

function sameTheme(a: HeaderTheme, b: HeaderTheme): boolean {
  return HEADER_THEME_FIELDS.every((f) => a[f.key].toUpperCase() === b[f.key].toUpperCase());
}

/** Mali prikaz zaglavlja sa izabranim bojama. */
function Preview({ theme }: { theme: HeaderTheme }) {
  const message = SITE.announcements[0] ?? 'Besplatna dostava iznad 7.000 RSD';
  return (
    <div className="overflow-hidden rounded-card border border-line">
      <div
        className="px-4 py-2 text-center font-body text-[10px] uppercase tracking-[0.18em]"
        style={{ backgroundColor: theme.tickerBg, color: theme.tickerText }}
      >
        {message}
      </div>
      <div
        className="flex items-center justify-between px-4 py-3.5"
        style={{
          backgroundColor: theme.navBg,
          color: theme.navText,
          borderBottom: `1px solid ${theme.navBorder}`,
        }}
      >
        <span className="font-display text-[16px] leading-none">{SITE.brandName}</span>
        <span className="hidden gap-5 font-body text-[10px] uppercase tracking-[0.14em] sm:flex">
          <span style={{ opacity: 0.68 }}>Proizvodi</span>
          <span style={{ opacity: 0.68 }}>Usluge</span>
          <span style={{ opacity: 0.68 }}>Kontakt</span>
        </span>
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 9V6a6 6 0 0 1 12 0v3" />
          <path d="M4 9h16l-1.2 12H5.2L4 9z" />
        </svg>
      </div>
      <div className="h-9 bg-canvas" />
    </div>
  );
}

export default function HeaderThemeEditor({ initialTheme }: { initialTheme: HeaderTheme }) {
  const router = useRouter();
  const [saved, setSaved] = useState<HeaderTheme>(initialTheme);
  const [theme, setTheme] = useState<HeaderTheme>(initialTheme);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const setField = (key: keyof HeaderTheme, value: string) => {
    setTheme((prev) => ({ ...prev, [key]: value }));
    setMsg(null);
  };

  const dirty = !sameTheme(theme, saved);
  const invalid = HEADER_THEME_FIELDS.filter((f) => !isHexColor(theme[f.key]));

  const lowContrast = [
    { label: 'traci sa obaveštenjima', ratio: contrastRatio(theme.tickerText, theme.tickerBg) },
    { label: 'navigaciji', ratio: contrastRatio(theme.navText, theme.navBg) },
  ].filter((c) => c.ratio < 4.5);

  const save = async () => {
    if (invalid.length > 0) {
      setMsg({ ok: false, text: 'Neka boja nije u HEX formatu (npr. #F5F0EA).' });
      return;
    }
    setSaving(true);
    setMsg(null);

    const payload = Object.fromEntries(
      HEADER_THEME_FIELDS.map((f) => [
        f.key,
        normalizeHex(theme[f.key], DEFAULT_HEADER_THEME[f.key]),
      ]),
    );

    try {
      const res = await fetch('/api/admin/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { theme?: HeaderTheme; error?: string };
      if (!res.ok || !data.theme) {
        setMsg({ ok: false, text: data.error ?? 'Čuvanje nije uspelo.' });
        return;
      }
      setSaved(data.theme);
      setTheme(data.theme);
      setMsg({ ok: true, text: 'Sačuvano — boje su odmah aktivne na sajtu.' });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: 'Čuvanje nije uspelo. Proveri internet vezu.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="border border-line bg-canvas p-5 md:p-6">
      <h3 className="font-display text-[18px] text-ink">Boje zaglavlja</h3>
      <p className="mt-1.5 max-w-[640px] font-body text-[12px] leading-relaxed text-muted">
        Traka sa porukama i navigacija na vrhu sajta. Izaberi gotovu kombinaciju ili podesi svaku
        boju posebno — pregled odmah pokazuje kako izgleda.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {HEADER_THEME_PRESETS.map((p) => {
          const active = sameTheme(theme, p.theme);
          return (
            <button
              key={p.name}
              type="button"
              onClick={() => {
                setTheme(p.theme);
                setMsg(null);
              }}
              className={`flex items-center gap-2 rounded-card border px-3 py-2 font-body text-[11px] transition-colors ${
                active ? 'border-ink text-ink' : 'border-line text-ink-soft hover:border-line-strong'
              }`}
            >
              <span className="flex overflow-hidden rounded-full border border-line">
                <span className="h-3.5 w-3.5" style={{ backgroundColor: p.theme.tickerBg }} />
                <span className="h-3.5 w-3.5" style={{ backgroundColor: p.theme.navBg }} />
                <span className="h-3.5 w-3.5" style={{ backgroundColor: p.theme.navText }} />
              </span>
              {p.name}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="space-y-3">
          {HEADER_THEME_FIELDS.map((f) => {
            const value = theme[f.key];
            const ok = isHexColor(value);
            return (
              <div key={f.key}>
                <label
                  htmlFor={`color-${f.key}`}
                  className="mb-1.5 block font-body text-[10px] uppercase tracking-[0.12em] text-muted"
                >
                  {f.label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id={`color-${f.key}`}
                    type="color"
                    value={
                      ok
                        ? normalizeHex(value, DEFAULT_HEADER_THEME[f.key])
                        : DEFAULT_HEADER_THEME[f.key]
                    }
                    onChange={(e) => setField(f.key, e.target.value.toUpperCase())}
                    className="h-10 w-12 shrink-0 cursor-pointer rounded-card border border-line bg-canvas p-1"
                    aria-label={f.label}
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setField(f.key, e.target.value)}
                    onBlur={() => setField(f.key, normalizeHex(value, value))}
                    spellCheck={false}
                    className={`w-full rounded-card border bg-canvas px-3 py-2.5 font-mono text-[13px] uppercase text-ink focus:outline-none ${
                      ok ? 'border-line focus:border-ink' : 'border-danger'
                    }`}
                  />
                </div>
                <p className="mt-1 font-body text-[11px] leading-relaxed text-muted">{f.hint}</p>
              </div>
            );
          })}
        </div>

        <div>
          <p className="mb-2 font-body text-[10px] uppercase tracking-[0.12em] text-muted">Pregled</p>
          <Preview theme={theme} />
          {lowContrast.length > 0 ? (
            <p className="mt-3 font-body text-[12px] leading-relaxed text-danger">
              Slab kontrast u {lowContrast.map((c) => c.label).join(' i ')} — tekst se teško čita.
              Uzmi tamniji tekst ili svetliju pozadinu.
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !dirty}
          className="rounded-card border border-ink bg-ink px-5 py-2.5 font-body text-[11px] uppercase tracking-[0.12em] text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:opacity-40 disabled:hover:bg-ink disabled:hover:text-canvas"
        >
          {saving ? 'Čuvam…' : 'Sačuvaj boje'}
        </button>
        {dirty ? (
          <button
            type="button"
            onClick={() => {
              setTheme(saved);
              setMsg(null);
            }}
            className="font-body text-[11px] uppercase tracking-[0.12em] text-muted underline underline-offset-2 hover:text-ink"
          >
            Poništi izmene
          </button>
        ) : null}
        {!sameTheme(theme, DEFAULT_HEADER_THEME) ? (
          <button
            type="button"
            onClick={() => {
              setTheme(DEFAULT_HEADER_THEME);
              setMsg(null);
            }}
            className="font-body text-[11px] uppercase tracking-[0.12em] text-muted underline underline-offset-2 hover:text-ink"
          >
            Vrati podrazumevane
          </button>
        ) : null}
        {msg ? (
          <span className={`font-body text-[12px] ${msg.ok ? 'text-accent' : 'text-danger'}`}>
            {msg.text}
          </span>
        ) : null}
      </div>
    </section>
  );
}
