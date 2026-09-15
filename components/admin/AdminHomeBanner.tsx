'use client';

import { useRef, useState } from 'react';
import AdminCard from '@/components/admin/AdminCard';
import LinkPicker, { LINK_ERROR, isSafeLink, type LinkOption } from '@/components/admin/LinkPicker';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  BANNER_HEIGHT,
  BANNER_RATIO,
  IMAGE_INPUT_ACCEPT,
  processImage,
  rejectReason,
  removeImage,
  uploadProcessed,
} from '@/lib/admin/images';

export type AdminBannerRow = {
  banner_is_active: boolean;
  banner_image_path: string;
  banner_title: string;
  banner_text: string;
  banner_button_label: string;
  banner_button_url: string;
};

type Draft = {
  isActive: boolean;
  title: string;
  text: string;
  buttonLabel: string;
  buttonUrl: string;
};

type Msg = { ok: boolean; text: string } | null;

const INPUT =
  'w-full min-h-[44px] rounded-card border border-line bg-canvas px-3 py-2.5 font-body text-[16px] text-ink focus:border-ink focus:outline-none sm:text-[14px]';
const LABEL = 'mb-1.5 block font-body text-[11px] uppercase tracking-[0.12em] text-muted';
const HINT = 'mt-1.5 font-body text-[12px] leading-relaxed text-muted';
const PRIMARY =
  'min-h-[44px] rounded-card border border-ink bg-ink px-5 font-body text-[12px] uppercase tracking-[0.12em] text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:opacity-40';
const SECONDARY =
  'min-h-[44px] rounded-card border border-line-strong px-5 font-body text-[12px] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-40';

const TITLE = 'Baner ispod slajdova';
const DESCRIPTION =
  'Široka fotografija sa malim naslovom, opisom i dugmetom. Stoji odmah ispod slajdova, na mestu gde je ranije bio spisak proizvoda.';

function toDraft(row: AdminBannerRow): Draft {
  return {
    isActive: row.banner_is_active,
    title: row.banner_title,
    text: row.banner_text,
    buttonLabel: row.banner_button_label,
    buttonUrl: row.banner_button_url,
  };
}

function sameDraft(a: Draft, b: Draft): boolean {
  return (
    a.isActive === b.isActive &&
    a.title === b.title &&
    a.text === b.text &&
    a.buttonLabel === b.buttonLabel &&
    a.buttonUrl === b.buttonUrl
  );
}

/** Baner na početnoj: fotografija se čuva odmah, tekstovi i link na „Sačuvaj baner". */
export default function AdminHomeBanner({
  initial,
  linkOptions,
  missing,
}: {
  initial: AdminBannerRow;
  linkOptions: LinkOption[];
  missing: boolean;
}) {
  const [image, setImage] = useState(initial.banner_image_path);
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [saved, setSaved] = useState<Draft>(() => toDraft(initial));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (missing) {
    return (
      <AdminCard badge="2" title={TITLE} description={DESCRIPTION}>
        <p className="font-body text-[13px] leading-relaxed text-danger">
          Baza još nema polja za baner. Pokreni <span className="font-mono">supabase/setup.sql</span>{' '}
          u Supabase SQL Editoru pa osveži stranicu.
        </p>
      </AdminCard>
    );
  }

  const dirty = !sameDraft(draft, saved);
  const patch = (next: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...next }));
    setMsg(null);
  };

  const saveImage = async (next: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setBusy(true);
    setMsg(null);
    const previous = image;
    const { error } = await supabase
      .from('site_settings')
      .update({ banner_image_path: next })
      .eq('id', 1);

    if (error) {
      setBusy(false);
      setMsg({ ok: false, text: 'Čuvanje fotografije nije uspelo.' });
      return;
    }
    // Stara slika iz našeg bucket-a više nikom ne treba.
    if (previous && previous !== next) await removeImage(supabase, previous);
    setImage(next);
    setBusy(false);
    setMsg({ ok: true, text: next ? 'Fotografija je sačuvana.' : 'Fotografija je uklonjena.' });
  };

  const pickImage = async (file: File) => {
    const reason = rejectReason(file);
    if (reason) {
      setMsg({ ok: false, text: reason });
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setBusy(true);
    setMsg(null);
    const processed = await processImage(file, BANNER_RATIO, BANNER_HEIGHT);
    const url = processed ? await uploadProcessed(supabase, '_baner', processed) : null;
    if (!url) {
      setBusy(false);
      setMsg({
        ok: false,
        text: 'Slanje fotografije nije uspelo. Sačuvaj je kao JPG ili PNG pa probaj ponovo.',
      });
      return;
    }
    await saveImage(url);
  };

  const save = async () => {
    const next: Draft = {
      isActive: draft.isActive,
      title: draft.title.trim(),
      text: draft.text.trim(),
      buttonLabel: draft.buttonLabel.trim(),
      buttonUrl: draft.buttonUrl.trim(),
    };
    if (!isSafeLink(next.buttonUrl)) {
      setMsg({ ok: false, text: LINK_ERROR });
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setBusy(true);
    setMsg(null);
    const { error } = await supabase
      .from('site_settings')
      .update({
        banner_is_active: next.isActive,
        banner_title: next.title,
        banner_text: next.text,
        banner_button_label: next.buttonLabel,
        banner_button_url: next.buttonUrl,
      })
      .eq('id', 1);
    setBusy(false);

    if (error) {
      setMsg({ ok: false, text: 'Čuvanje nije uspelo.' });
      return;
    }
    setDraft(next);
    setSaved(next);
    setMsg({ ok: true, text: 'Baner je sačuvan. Na sajtu se vidi za najviše pola minuta.' });
  };

  return (
    <AdminCard badge="2" title={TITLE} description={DESCRIPTION}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:gap-8">
        {/* ── Fotografija ── */}
        <div>
          <p className={LABEL}>Fotografija</p>
          <div className="relative aspect-video w-full overflow-hidden border border-line bg-surface-2">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center px-3 text-center font-body text-[11px] uppercase tracking-[0.14em] text-muted">
                Nema fotografije
              </div>
            )}
          </div>
          <p className={HINT}>Slikaj vodoravno. Sama se iseca na široki format 16:9 i smanjuje.</p>

          <input
            ref={fileRef}
            type="file"
            accept={IMAGE_INPUT_ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void pickImage(file);
              e.target.value = '';
            }}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className={PRIMARY}
            >
              {busy ? 'Radim…' : image ? 'Zameni fotografiju' : 'Dodaj fotografiju'}
            </button>
            {image ? (
              <button
                type="button"
                onClick={() => void saveImage('')}
                disabled={busy}
                className={SECONDARY}
              >
                Ukloni
              </button>
            ) : null}
          </div>
        </div>

        {/* ── Tekst i dugme ── */}
        <div className="space-y-4">
          <div>
            <label htmlFor="banner-title" className={LABEL}>
              Mali naslov
            </label>
            <input
              id="banner-title"
              type="text"
              value={draft.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="npr. Nova kolekcija boja"
              className={INPUT}
            />
          </div>

          <div>
            <label htmlFor="banner-text" className={LABEL}>
              Opis
            </label>
            <textarea
              id="banner-text"
              value={draft.text}
              onChange={(e) => patch({ text: e.target.value })}
              rows={3}
              placeholder="Jedna ili dve rečenice ispod naslova."
              className={`${INPUT} resize-y`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="banner-button" className={LABEL}>
                Tekst na dugmetu
              </label>
              <input
                id="banner-button"
                type="text"
                value={draft.buttonLabel}
                onChange={(e) => patch({ buttonLabel: e.target.value })}
                placeholder="Proizvodi"
                className={INPUT}
              />
              <p className={HINT}>Prazno = nema dugmeta.</p>
            </div>
            <div>
              <label htmlFor="banner-link" className={LABEL}>
                Dugme i fotografija vode na
              </label>
              <LinkPicker
                id="banner-link"
                value={draft.buttonUrl}
                options={linkOptions}
                disabled={busy}
                emptyLabel="Nigde (bez dugmeta)"
                onChange={(href) => patch({ buttonUrl: href })}
              />
            </div>
          </div>

          <label className="inline-flex min-h-[44px] items-center gap-2 font-body text-[14px] text-ink-soft">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => patch({ isActive: e.target.checked })}
            />
            Prikaži baner na početnoj
          </label>

          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy || !dirty}
              className={PRIMARY}
            >
              Sačuvaj baner
            </button>
            {dirty ? (
              <span className="font-body text-[13px] text-accent">Ima nesačuvanih izmena.</span>
            ) : null}
          </div>
        </div>
      </div>

      {msg ? (
        <p className={`mt-4 font-body text-[13px] ${msg.ok ? 'text-accent' : 'text-danger'}`}>
          {msg.text}
        </p>
      ) : null}
    </AdminCard>
  );
}
