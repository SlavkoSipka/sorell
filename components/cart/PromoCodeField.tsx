'use client';

import { useState } from 'react';
import { useCart } from '@/lib/cart-context';

/** Unos i provera promo koda (`discount_codes` u bazi, provera preko API-ja). */
export default function PromoCodeField() {
  const { promoCode, promoDiscountPercent, setPromo, clearPromo } = useCart();
  const [input, setInput] = useState(promoCode ?? '');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const apply = async () => {
    const raw = input.trim();
    setError(null);
    if (!raw) {
      clearPromo();
      return;
    }
    setChecking(true);
    try {
      const res = await fetch('/api/discount-code/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: raw }),
      });
      const data = (await res.json()) as
        | { valid: true; code: string; discountPercent: number }
        | { valid: false; error?: string };

      if (data.valid) {
        setPromo(data.code, data.discountPercent);
        setInput(data.code);
      } else {
        setError(data.error ?? 'Kod nije važeći.');
        clearPromo();
      }
    } catch {
      setError('Mrežna greška. Pokušaj ponovo.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="border border-line bg-surface p-4 md:p-5">
      <label htmlFor="promo-code" className="block font-body text-[13px] font-medium text-ink">
        Promo kod
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="promo-code"
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void apply();
            }
          }}
          placeholder="Unesi kod"
          autoCapitalize="characters"
          className="min-w-0 flex-1 rounded-card border border-line-strong bg-canvas px-4 py-3 font-body text-[15px] uppercase text-ink placeholder:text-muted focus:border-ink focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void apply()}
          disabled={checking}
          className="shrink-0 rounded-card border border-ink bg-ink px-5 py-3 font-body text-[12px] uppercase tracking-[0.1em] text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50"
        >
          {checking ? '…' : 'Proveri'}
        </button>
      </div>

      {error ? (
        <p className="mt-2 font-body text-[13px] text-danger" role="alert">
          {error}
        </p>
      ) : promoCode && promoDiscountPercent != null ? (
        <p className="mt-2 font-body text-[13px] text-accent">
          Kod <span className="font-mono text-ink">{promoCode}</span> — popust{' '}
          {Math.round(promoDiscountPercent)}%
        </p>
      ) : (
        <p className="mt-2 font-body text-[13px] text-muted">
          Imaš promo kod? Unesi ga i dobij popust na porudžbinu.
        </p>
      )}

      {promoCode ? (
        <button
          type="button"
          onClick={() => {
            clearPromo();
            setInput('');
            setError(null);
          }}
          className="mt-1.5 font-body text-[11px] text-muted underline underline-offset-2 hover:text-ink"
        >
          Ukloni kod
        </button>
      ) : null}
    </div>
  );
}
