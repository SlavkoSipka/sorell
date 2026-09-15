'use client';

import { useState } from 'react';

/** Jedno mesto na sajtu na koje slika ili dugme može da vodi. */
export type LinkOption = { group: string; label: string; href: string };

const CUSTOM = '__custom__';

export const LINK_ERROR =
  'Link mora počinjati sa https:// ili sa / za stranicu na sajtu (npr. /proizvodi).';

/** Dozvoljeno je samo interno „/nesto" ili puna http(s) adresa, jer vrednost ide u href. */
export function isSafeLink(raw: string): boolean {
  const v = raw.trim();
  return v === '' || /^(\/|https?:\/\/)\S*$/.test(v);
}

/**
 * Izbor odredišta sa gotovog spiska (linije, proizvodi i boje, stranice),
 * ili ručno upisan link kad odredište nije na spisku.
 */
export default function LinkPicker({
  id,
  value,
  options,
  disabled,
  emptyLabel = 'Nigde',
  onChange,
}: {
  id: string;
  value: string;
  options: LinkOption[];
  disabled?: boolean;
  emptyLabel?: string;
  onChange: (href: string) => void;
}) {
  const known = value === '' || options.some((o) => o.href === value);
  const [custom, setCustom] = useState(!known);
  const groups = [...new Set(options.map((o) => o.group))];

  const field =
    'w-full min-h-[44px] rounded-card border border-line bg-canvas px-3 py-2 font-body text-[16px] text-ink focus:border-ink focus:outline-none disabled:opacity-60 sm:text-[14px]';

  return (
    <div>
      <select
        id={id}
        value={custom ? CUSTOM : value}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value;
          if (next === CUSTOM) {
            setCustom(true);
            return;
          }
          setCustom(false);
          onChange(next);
        }}
        className={field}
      >
        <option value="">{emptyLabel}</option>
        {groups.map((g) => (
          <optgroup key={g} label={g}>
            {options
              .filter((o) => o.group === g)
              .map((o) => (
                <option key={o.href} value={o.href}>
                  {o.label}
                </option>
              ))}
          </optgroup>
        ))}
        <option value={CUSTOM}>Drugi link (upiši adresu)…</option>
      </select>

      {custom ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="https://instagram.com/…"
          spellCheck={false}
          aria-label="Adresa linka"
          className={`${field} mt-2`}
        />
      ) : null}
    </div>
  );
}
