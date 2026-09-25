'use client';

import { useEffect } from 'react';
import { useCart } from '@/lib/cart-context';

/** Koliko obaveštenje stoji pre nego što samo nestane. */
const TRAJANJE_MS = 4500;

/**
 * Kratko obaveštenje posle „Dodaj u korpu".
 *
 * Korpa se više ne otvara sama — kupac ostaje na stranici i bira dalje, a
 * ovo mu kaže da je dodato i nudi prečicu do korpe. Na telefonu stoji dole,
 * pod palcem; na kompu gore desno, ispod ikonice korpe.
 */
export default function CartAddedToast() {
  const { lastAdded, dismissAdded, itemCount, openCart } = useCart();

  // Svako novo dodavanje (novo `at`) produžava prikaz od početka.
  useEffect(() => {
    if (!lastAdded) return;
    const t = window.setTimeout(dismissAdded, TRAJANJE_MS);
    return () => window.clearTimeout(t);
  }, [lastAdded, dismissAdded]);

  if (!lastAdded) return null;

  return (
    <div
      // `key` ponovo pokreće ulaznu animaciju kad se doda još jedan proizvod.
      key={lastAdded.at}
      role="status"
      aria-live="polite"
      // Na iPhone-u dno ekrana zauzima „home" traka — obaveštenje ide iznad nje.
      className="toast-in fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-[60] border border-ink bg-canvas p-3 shadow-[0_18px_44px_-20px_rgba(0,0,0,0.45)] md:inset-x-auto md:bottom-auto md:right-8 md:top-[108px] md:w-[380px] md:p-4"
    >
      <div className="flex items-start gap-3">
        <span className="h-14 w-14 shrink-0 overflow-hidden border border-line bg-surface-2">
          {lastAdded.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lastAdded.image} alt="" className="h-full w-full object-cover" />
          ) : null}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-body text-[12px] font-semibold uppercase tracking-[0.12em] text-ink">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            Dodato u korpu
          </p>
          <p className="mt-1 line-clamp-2 font-body text-[14px] leading-snug text-ink-soft">
            {lastAdded.name}
          </p>
        </div>
        <button
          type="button"
          onClick={dismissAdded}
          aria-label="Zatvori obaveštenje"
          className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center text-muted hover:text-ink"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
            <line x1="2" y1="2" x2="14" y2="14" />
            <line x1="14" y1="2" x2="2" y2="14" />
          </svg>
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={dismissAdded}
          className="min-h-[44px] rounded-card border border-line-strong px-3 font-body text-[12px] uppercase tracking-[0.1em] text-ink transition-colors hover:border-ink"
        >
          Nastavi kupovinu
        </button>
        <button
          type="button"
          onClick={() => {
            dismissAdded();
            openCart();
          }}
          className="min-h-[44px] rounded-card border border-ink bg-ink px-3 font-body text-[12px] font-semibold uppercase tracking-[0.1em] text-canvas transition-colors hover:bg-canvas hover:text-ink"
        >
          Korpa ({itemCount})
        </button>
      </div>
    </div>
  );
}
