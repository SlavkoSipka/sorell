'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import AdminCard from '@/components/admin/AdminCard';
import LinkPicker, { LINK_ERROR, isSafeLink, type LinkOption } from '@/components/admin/LinkPicker';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  IMAGE_INPUT_ACCEPT,
  processImage,
  rejectReason,
  removeImage,
  uploadProcessed,
} from '@/lib/admin/images';

export type AdminHeroSlideRow = {
  id: number;
  image_url: string;
  link_url: string;
  alt: string;
  sort_order: number | null;
  is_active: boolean;
};

const COLUMNS = 'id, image_url, link_url, alt, sort_order, is_active';
const LABEL = 'mb-1.5 block font-body text-[11px] uppercase tracking-[0.12em] text-muted';
const TITLE = 'Slajdovi na vrhu';
const DESCRIPTION =
  'Velike uspravne fotografije na vrhu početne. Smenjuju se same, a kupac ih prevlači ili klikće strelice. Za svaku izaberi gde vodi klik: na gel ili boju, na celu liniju ili na neku stranicu.';

type Msg = { ok: boolean; text: string } | null;

/** Slajdovi u zaglavlju početne: slike koje se smenjuju, svaka sa svojim linkom. */
export default function AdminHeroSlides({
  initialSlides,
  linkOptions,
  missing,
}: {
  initialSlides: AdminHeroSlideRow[];
  linkOptions: LinkOption[];
  missing: boolean;
}) {
  const [slides, setSlides] = useState(initialSlides);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (missing) {
    return (
      <AdminCard badge="1" title={TITLE} description={DESCRIPTION}>
        <p className="font-body text-[13px] leading-relaxed text-danger">
          Baza još nema tabelu slajdova. Pokreni <span className="font-mono">supabase/setup.sql</span>{' '}
          u Supabase SQL Editoru pa osveži stranicu.
        </p>
      </AdminCard>
    );
  }

  const addSlides = async (files: File[]) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setBusy(true);
    setMsg(null);

    let order = slides.reduce((max, s) => Math.max(max, s.sort_order ?? 0), 0);
    const failed: string[] = [];

    for (const file of files) {
      if (rejectReason(file)) {
        failed.push(file.name);
        continue;
      }
      // Isecanje na 4:5 i pakovanje u WebP se rade ovde, pre slanja.
      const processed = await processImage(file);
      const url = processed ? await uploadProcessed(supabase, '_hero', processed) : null;
      if (!url) {
        failed.push(file.name);
        continue;
      }

      order += 1;
      const { data, error } = await supabase
        .from('hero_slides')
        .insert({ image_url: url, sort_order: order })
        .select(COLUMNS)
        .single();

      if (error || !data) {
        await removeImage(supabase, url);
        failed.push(file.name);
        continue;
      }
      setSlides((prev) => [...prev, data as AdminHeroSlideRow]);
    }

    setBusy(false);
    setMsg(
      failed.length > 0
        ? { ok: false, text: `Nije okačeno: ${failed.join(', ')}. Sačuvaj kao JPG ili PNG pa probaj ponovo.` }
        : {
            ok: true,
            text: files.length > 1 ? 'Slajdovi su dodati. Izaberi gde koji vodi.' : 'Slajd je dodat. Izaberi gde vodi.',
          },
    );
  };

  const updateSlide = async (
    id: number,
    patch: Partial<Pick<AdminHeroSlideRow, 'link_url' | 'is_active'>>,
    okText: string,
  ): Promise<boolean> => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return false;

    setBusy(true);
    setMsg(null);
    const { error } = await supabase.from('hero_slides').update(patch).eq('id', id);
    setBusy(false);

    if (error) {
      setMsg({ ok: false, text: 'Čuvanje nije uspelo.' });
      return false;
    }
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setMsg({ ok: true, text: okText });
    return true;
  };

  const saveLink = async (id: number, raw: string) => {
    const next = raw.trim();
    if (!isSafeLink(next)) {
      setMsg({ ok: false, text: LINK_ERROR });
      return false;
    }
    return updateSlide(id, { link_url: next }, next ? 'Link je sačuvan.' : 'Link je uklonjen.');
  };

  const removeSlide = async (slide: AdminHeroSlideRow) => {
    if (!window.confirm('Obriši ovaj slajd?')) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setBusy(true);
    setMsg(null);
    const { error } = await supabase.from('hero_slides').delete().eq('id', slide.id);
    if (error) {
      setBusy(false);
      setMsg({ ok: false, text: 'Brisanje nije uspelo.' });
      return;
    }
    // Slika iz našeg bucket-a više nikom ne treba.
    await removeImage(supabase, slide.image_url);
    setSlides((prev) => prev.filter((s) => s.id !== slide.id));
    setBusy(false);
    setMsg({ ok: true, text: 'Slajd je obrisan.' });
  };

  const moveSlide = async (id: number, direction: -1 | 1) => {
    const i = slides.findIndex((s) => s.id === id);
    const j = i + direction;
    if (i === -1 || j < 0 || j >= slides.length) return;

    const reordered = [...slides];
    [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
    const withOrder = reordered.map((s, idx) => ({ ...s, sort_order: idx + 1 }));
    setSlides(withOrder);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setBusy(true);
    setMsg(null);
    for (const s of withOrder) {
      const { error } = await supabase
        .from('hero_slides')
        .update({ sort_order: s.sort_order })
        .eq('id', s.id);
      if (error) {
        setBusy(false);
        setMsg({ ok: false, text: 'Redosled nije sačuvan. Osveži stranicu.' });
        return;
      }
    }
    setBusy(false);
  };

  const iconBtn =
    'flex h-10 w-10 items-center justify-center rounded-card border border-line font-body text-[15px] text-muted transition-colors hover:border-ink hover:text-ink disabled:opacity-25';

  return (
    <AdminCard badge="1" title={TITLE} description={DESCRIPTION}>
      {slides.length === 0 ? (
        <p className="border border-dashed border-line py-8 text-center font-body text-[13px] text-muted">
          Nema slajdova. Na početnoj stoji prazan okvir.
        </p>
      ) : (
        <ol className="space-y-3">
          {slides.map((slide, i) => (
            <li key={slide.id} className="flex gap-3 border border-line bg-surface p-2.5 sm:gap-4 sm:p-3">
              <div className="relative aspect-[4/5] w-[88px] shrink-0 overflow-hidden bg-surface-2 sm:w-[120px]">
                <Image
                  src={slide.image_url}
                  alt=""
                  fill
                  sizes="120px"
                  className={`object-cover ${slide.is_active ? '' : 'opacity-40'}`}
                />
                <span className="absolute left-0 top-0 bg-ink px-1.5 py-0.5 font-body text-[10px] tabular-nums text-canvas">
                  {i + 1}.
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <SlideLink
                  slide={slide}
                  options={linkOptions}
                  busy={busy}
                  onSave={(href) => saveLink(slide.id, href)}
                />

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex min-h-[40px] items-center gap-2 font-body text-[13px] text-ink-soft">
                    <input
                      type="checkbox"
                      checked={slide.is_active}
                      disabled={busy}
                      onChange={(e) =>
                        void updateSlide(
                          slide.id,
                          { is_active: e.target.checked },
                          e.target.checked ? 'Slajd se prikazuje.' : 'Slajd je sakriven.',
                        )
                      }
                    />
                    Prikazuje se na sajtu
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => void moveSlide(slide.id, -1)}
                      disabled={busy || i === 0}
                      aria-label="Pomeri slajd ranije"
                      title="Pomeri ranije"
                      className={iconBtn}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => void moveSlide(slide.id, 1)}
                      disabled={busy || i === slides.length - 1}
                      aria-label="Pomeri slajd kasnije"
                      title="Pomeri kasnije"
                      className={iconBtn}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeSlide(slide)}
                      disabled={busy}
                      aria-label="Obriši slajd"
                      title="Obriši"
                      className={`${iconBtn} hover:!border-danger hover:!text-danger`}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={IMAGE_INPUT_ACCEPT}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) void addSlides(files);
          e.target.value = '';
        }}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="min-h-[44px] w-full rounded-card border border-ink bg-ink px-5 font-body text-[12px] uppercase tracking-[0.12em] text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50 sm:w-auto"
        >
          {busy ? 'Radim…' : '+ Dodaj slajdove'}
        </button>
        <p className="font-body text-[12px] text-muted">
          Slikaj uspravno. Slika se sama iseca na 4:5. Može više odjednom.
        </p>
      </div>

      {msg ? (
        <p className={`mt-3 font-body text-[13px] ${msg.ok ? 'text-accent' : 'text-danger'}`}>
          {msg.text}
        </p>
      ) : null}
    </AdminCard>
  );
}

/** Gde vodi klik na slajd. Izbor se čuva tek na „Sačuvaj link", da ništa ne ode slučajno. */
function SlideLink({
  slide,
  options,
  busy,
  onSave,
}: {
  slide: AdminHeroSlideRow;
  options: LinkOption[];
  busy: boolean;
  onSave: (href: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(slide.link_url);
  const dirty = draft.trim() !== slide.link_url;
  const id = `slide-link-${slide.id}`;

  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        Klik na sliku vodi na
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <LinkPicker
            id={id}
            value={draft}
            options={options}
            disabled={busy}
            emptyLabel="Nigde (slika nije link)"
            onChange={setDraft}
          />
        </div>
        <button
          type="button"
          onClick={() => void onSave(draft)}
          disabled={busy || !dirty}
          className="min-h-[44px] shrink-0 rounded-card border border-ink bg-ink px-5 font-body text-[12px] uppercase tracking-[0.12em] text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:opacity-30"
        >
          Sačuvaj link
        </button>
      </div>
      {dirty ? (
        <p className="mt-1.5 font-body text-[12px] text-accent">Izmena nije sačuvana.</p>
      ) : null}
    </div>
  );
}
