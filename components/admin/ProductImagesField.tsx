'use client';

import { useRef } from 'react';
import { ACCEPTED_IMAGE_TYPES } from '@/lib/admin/images';

export type AdminImageRow = {
  id: number;
  product_slug: string;
  url: string;
  sort_order: number | null;
};

/**
 * Galerija jednog proizvoda u adminu. Prva slika je glavna — ona ide na
 * karticu proizvoda i u deljenje linka, pa je posebno označena.
 */
export default function ProductImagesField({
  images,
  fallbackImage,
  busy,
  onAdd,
  onMove,
  onRemove,
}: {
  images: AdminImageRow[];
  fallbackImage: string;
  busy: boolean;
  onAdd: (files: File[]) => void;
  onMove: (id: number, direction: -1 | 1) => void;
  onRemove: (id: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="w-full">
      <p className="mb-2 font-body text-[11px] uppercase tracking-[0.12em] text-muted">
        Slike ({images.length})
      </p>

      {images.length === 0 ? (
        <div className="flex items-center gap-3">
          <div className="relative aspect-[4/5] w-[84px] shrink-0 overflow-hidden border border-line bg-surface-2">
            {fallbackImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fallbackImage} alt="" className="h-full w-full object-contain p-1.5" />
            ) : null}
          </div>
          <p className="font-body text-[13px] leading-relaxed text-muted">
            Nema slika — prikazuje se privremena iz koda.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {images.map((img, i) => (
            <li key={img.id} className="border border-line bg-canvas p-1.5">
              <div className="relative aspect-square w-full overflow-hidden bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-contain p-1" />
                {i === 0 ? (
                  <span className="absolute left-0 top-0 bg-ink px-1.5 py-0.5 font-body text-[9px] uppercase tracking-[0.1em] text-canvas">
                    Glavna
                  </span>
                ) : null}
              </div>

              <div className="mt-1.5 flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => onMove(img.id, -1)}
                  disabled={busy || i === 0}
                  aria-label="Pomeri sliku unazad"
                  className="flex h-8 w-8 items-center justify-center font-body text-[14px] text-muted hover:text-ink disabled:opacity-25"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => onMove(img.id, 1)}
                  disabled={busy || i === images.length - 1}
                  aria-label="Pomeri sliku unapred"
                  className="flex h-8 w-8 items-center justify-center font-body text-[14px] text-muted hover:text-ink disabled:opacity-25"
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(img.id)}
                  disabled={busy}
                  aria-label="Obriši sliku"
                  className="flex h-8 w-8 items-center justify-center font-body text-[15px] text-muted hover:text-danger disabled:opacity-25"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) onAdd(files);
          e.target.value = '';
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="mt-3 min-h-[44px] w-full rounded-card border border-line-strong px-4 font-body text-[12px] uppercase tracking-[0.1em] text-ink transition-colors hover:border-ink disabled:opacity-50 sm:w-auto"
      >
        {busy ? 'Šaljem…' : 'Dodaj slike'}
      </button>
    </div>
  );
}
