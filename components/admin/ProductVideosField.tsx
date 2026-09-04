'use client';

import { useRef } from 'react';
import {
  ACCEPTED_VIDEO_TYPES,
  MAX_DURATION_SECONDS,
  formatBytes,
  formatDuration,
  type TranscodeStage,
} from '@/lib/admin/videos';

export type AdminVideoRow = {
  id: number;
  product_slug: string;
  url: string;
  poster_url: string;
  duration_seconds: number | string | null;
  size_bytes: number | string | null;
  sort_order: number | null;
};

export type VideoProgress = { stage: TranscodeStage; ratio: number; fileName: string };

const STAGE_LABEL: Record<TranscodeStage, string> = {
  jezgro: 'Pripremam obradu (prvi put se skida oko 32 MB)',
  obrada: 'Smanjujem i prepakujem klip',
  poster: 'Hvatam sličicu',
  slanje: 'Šaljem na sajt',
};

/**
 * Klipovi jednog proizvoda u adminu. Obrada ide u browseru pre slanja
 * (lib/admin/videos.ts), pa je napredak vidljiv — zna da potraje.
 */
export default function ProductVideosField({
  videos,
  busy,
  progress,
  onAdd,
  onMove,
  onRemove,
}: {
  videos: AdminVideoRow[];
  busy: boolean;
  progress: VideoProgress | null;
  onAdd: (files: File[]) => void;
  onMove: (id: number, direction: -1 | 1) => void;
  onRemove: (id: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const totalBytes = videos.reduce((sum, v) => sum + Number(v.size_bytes ?? 0), 0);

  return (
    <div className="mt-5 w-full border-t border-line pt-5">
      <p className="font-body text-[11px] uppercase tracking-[0.12em] text-muted">
        Video klipovi ({videos.length})
      </p>
      <p className="mb-2 mt-1 font-body text-[12px] leading-relaxed text-muted">
        Okači snimak sa telefona kakav jeste — sam se smanjuje, prepakuje u MP4 i ostaje bez zvuka.
        Od 100 MB obično ostane 1–2 MB. Najduže {MAX_DURATION_SECONDS} s po klipu. Obrada traje
        koliko i sam snimak, ponekad i duže — ne zatvaraj stranicu dok radi.
      </p>

      {videos.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {videos.map((v, i) => (
            <li key={v.id} className="border border-line bg-canvas p-1.5">
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-2">
                {v.poster_url ? (
                  // `contain` — klip se na sajtu prikazuje ceo, pa neka i ovde
                  // bude jasno šta je u kadru.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.poster_url} alt="" className="h-full w-full object-contain" />
                ) : null}
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/70">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="#fff" aria-hidden>
                      <path d="M2 1l8 5-8 5z" />
                    </svg>
                  </span>
                </span>
                <span className="absolute bottom-0 left-0 right-0 bg-ink/70 px-1.5 py-0.5 text-center font-body text-[9px] text-canvas">
                  {formatDuration(Number(v.duration_seconds ?? 0))}
                  {v.size_bytes ? ` · ${formatBytes(Number(v.size_bytes))}` : ''}
                </span>
              </div>

              <div className="mt-1.5 flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => onMove(v.id, -1)}
                  disabled={busy || i === 0}
                  aria-label="Pomeri klip unazad"
                  className="flex h-8 w-8 items-center justify-center font-body text-[14px] text-muted hover:text-ink disabled:opacity-25"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => onMove(v.id, 1)}
                  disabled={busy || i === videos.length - 1}
                  aria-label="Pomeri klip unapred"
                  className="flex h-8 w-8 items-center justify-center font-body text-[14px] text-muted hover:text-ink disabled:opacity-25"
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(v.id)}
                  disabled={busy}
                  aria-label="Obriši klip"
                  className="flex h-8 w-8 items-center justify-center font-body text-[15px] text-muted hover:text-danger disabled:opacity-25"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border border-dashed border-line py-5 text-center font-body text-[12px] text-muted">
          Nema klipova.
        </p>
      )}

      {progress ? (
        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-body text-[12px] text-ink">
              {STAGE_LABEL[progress.stage]}
              <span className="text-muted"> · {progress.fileName}</span>
            </p>
            <p className="shrink-0 font-body text-[12px] tabular-nums text-muted">
              {Math.round(progress.ratio * 100)}%
            </p>
          </div>
          <div className="mt-1.5 h-1 w-full overflow-hidden bg-surface-2">
            <div
              className="h-full bg-ink transition-[width] duration-200"
              style={{ width: `${Math.max(2, Math.round(progress.ratio * 100))}%` }}
            />
          </div>
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_VIDEO_TYPES.join(',')}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) onAdd(files);
          e.target.value = '';
        }}
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="min-h-[44px] w-full rounded-card border border-line-strong px-4 font-body text-[12px] uppercase tracking-[0.1em] text-ink transition-colors hover:border-ink disabled:opacity-50 sm:w-auto"
        >
          {busy ? 'Obrađujem…' : 'Dodaj video'}
        </button>
        {totalBytes > 0 ? (
          <span className="font-body text-[11px] text-muted">
            Ukupno {formatBytes(totalBytes)} na ovom proizvodu
          </span>
        ) : null}
      </div>
    </div>
  );
}
