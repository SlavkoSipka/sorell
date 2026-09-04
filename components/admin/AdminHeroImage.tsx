'use client';

import { useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { invalidatePricingCache } from '@/lib/use-pricing-data';
import {
  ACCEPTED_IMAGE_TYPES,
  processImage,
  rejectReason,
  removeImage,
  uploadProcessed,
} from '@/lib/admin/images';

/** Dozvoljeno je samo interno „/nesto" ili puna http(s) adresa — vrednost ide u href. */
function linkJeIspravan(raw: string): boolean {
  const v = raw.trim();
  return v === '' || /^(\/|https?:\/\/)\S*$/.test(v);
}

/** Velika slika u zaglavlju početne strane, po želji i kao dugme ka nekom linku. */
export default function AdminHeroImage({
  initialUrl,
  initialLink,
}: {
  initialUrl: string;
  initialLink: string;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [link, setLink] = useState(initialLink);
  const [savedLink, setSavedLink] = useState(initialLink);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const save = async (next: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setBusy(true);
    setMsg(null);

    const previous = url;
    const { error } = await supabase
      .from('site_settings')
      .update({ hero_image_path: next })
      .eq('id', 1);

    if (error) {
      setBusy(false);
      setMsg({ ok: false, text: 'Čuvanje hero slike nije uspelo.' });
      return;
    }

    // Stara slika iz našeg bucket-a više nikom ne treba.
    if (previous && previous !== next) await removeImage(supabase, previous);

    setUrl(next);
    setBusy(false);
    setMsg({ ok: true, text: next ? 'Hero slika je sačuvana.' : 'Hero slika je uklonjena.' });
    invalidatePricingCache();
  };

  const saveLink = async () => {
    const next = link.trim();
    if (!linkJeIspravan(next)) {
      setMsg({
        ok: false,
        text: 'Link mora počinjati sa https:// ili sa / za stranicu na sajtu (npr. /proizvodi).',
      });
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setBusy(true);
    setMsg(null);
    const { error } = await supabase
      .from('site_settings')
      .update({ hero_link_url: next })
      .eq('id', 1);
    setBusy(false);

    if (error) {
      setMsg({ ok: false, text: 'Čuvanje linka nije uspelo.' });
      return;
    }
    setSavedLink(next);
    setMsg({ ok: true, text: next ? 'Link je sačuvan — slika je sada dugme.' : 'Link je uklonjen.' });
  };

  const pick = async (file: File) => {
    const reason = rejectReason(file);
    if (reason) {
      setMsg({ ok: false, text: reason });
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setBusy(true);
    setMsg(null);

    // Isecanje na 4:5 i pakovanje u WebP se rade ovde, pre slanja.
    const processed = await processImage(file);
    if (!processed) {
      setBusy(false);
      setMsg({
        ok: false,
        text: 'Sliku nije moguće otvoriti. Sačuvaj je kao JPG ili PNG pa pokušaj ponovo.',
      });
      return;
    }

    const publicUrl = await uploadProcessed(supabase, '_hero', processed);
    if (!publicUrl) {
      setBusy(false);
      setMsg({ ok: false, text: 'Slanje slike nije uspelo.' });
      return;
    }
    await save(publicUrl);
  };

  return (
    <section className="border border-line bg-canvas p-4 md:p-6">
      <h3 className="font-display text-[18px] text-ink">Hero slika početne strane</h3>
      <p className="mt-1.5 font-body text-[13px] leading-relaxed text-muted">
        Velika fotografija pored naslova na početnoj. Slikaj uspravno telefonom i okači kakva
        jeste — sama se iseca na 4:5 i smanjuje.
      </p>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative aspect-[4/5] w-full max-w-[180px] shrink-0 overflow-hidden border border-line bg-surface-2">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center px-3 text-center font-body text-[11px] uppercase tracking-[0.14em] text-muted">
              Nema slike
            </div>
          )}
        </div>

        <div className="flex-1">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void pick(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="w-full rounded-card border border-ink bg-ink px-5 py-3 font-body text-[12px] uppercase tracking-[0.12em] text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50 sm:w-auto"
          >
            {busy ? 'Šaljem…' : url ? 'Zameni sliku' : 'Dodaj sliku'}
          </button>

          {url ? (
            <button
              type="button"
              onClick={() => void save('')}
              disabled={busy}
              className="mt-2 block w-full rounded-card border border-line px-5 py-3 font-body text-[12px] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-50 sm:w-auto"
            >
              Ukloni sliku
            </button>
          ) : null}

          <div className="mt-5 border-t border-line pt-4">
            <label
              htmlFor="hero-link"
              className="mb-1.5 block font-body text-[11px] uppercase tracking-[0.12em] text-muted"
            >
              Klik na sliku vodi na
            </label>
            <p className="mb-2 font-body text-[13px] leading-relaxed text-muted">
              Prazno = slika nije dugme. Za stranicu na sajtu upiši{' '}
              <span className="font-mono text-ink">/proizvodi</span>, za tuđi sajt celu adresu sa{' '}
              <span className="font-mono text-ink">https://</span>.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="hero-link"
                type="text"
                value={link}
                onChange={(e) => {
                  setLink(e.target.value);
                  setMsg(null);
                }}
                placeholder="/proizvodi"
                spellCheck={false}
                className="w-full rounded-card border border-line bg-canvas px-3 py-2.5 font-body text-[14px] text-ink focus:border-ink focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void saveLink()}
                disabled={busy || link.trim() === savedLink.trim()}
                className="shrink-0 rounded-card border border-ink bg-ink px-5 py-2.5 font-body text-[12px] uppercase tracking-[0.12em] text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:opacity-40"
              >
                Sačuvaj link
              </button>
            </div>
          </div>

          {msg ? (
            <p className={`mt-3 font-body text-[13px] ${msg.ok ? 'text-accent' : 'text-danger'}`}>
              {msg.text}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
