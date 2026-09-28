'use client';

import { useState } from 'react';

/** Malo dugme „Kopiraj": broj računa ili poziv na broj ide pravo u aplikaciju banke. */
export default function CopyButton({ value, label }: { value: string; label: string }) {
  const [kopirano, setKopirano] = useState(false);

  const kopiraj = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Stariji pregledači: privremeno polje + execCommand.
      const el = document.createElement('textarea');
      el.value = value;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
    }
    setKopirano(true);
    setTimeout(() => setKopirano(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={kopiraj}
      aria-label={`Kopiraj: ${label}`}
      className="inline-flex min-h-[32px] shrink-0 items-center rounded-card border border-line-strong px-2.5 font-body text-[11px] uppercase tracking-[0.08em] text-ink transition-colors hover:border-ink"
    >
      <span aria-live="polite">{kopirano ? 'Kopirano' : 'Kopiraj'}</span>
    </button>
  );
}
