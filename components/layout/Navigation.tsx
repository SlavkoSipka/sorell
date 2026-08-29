'use client';

import { useState } from 'react';
import Link from 'next/link';
import BrandLogo from '@/components/layout/BrandLogo';
import AnnouncementTicker from '@/components/layout/AnnouncementTicker';
import { useCart } from '@/lib/cart-context';

const navLinks = [
  { href: '/proizvodi', label: 'Proizvodi' },
  { href: '/usluge', label: 'Usluge' },
  { href: '/o-nama', label: 'O nama' },
  { href: '/kontakt', label: 'Kontakt' },
];

function CartButton({ className = '', onBeforeOpen }: { className?: string; onBeforeOpen?: () => void }) {
  const { itemCount, openCart } = useCart();
  return (
    <button
      type="button"
      onClick={() => {
        onBeforeOpen?.();
        openCart();
      }}
      className={`relative inline-flex items-center justify-center text-ink transition-opacity hover:opacity-60 ${className}`}
      aria-label={`Korpa${itemCount > 0 ? `, ${itemCount} stavki` : ''}`}
    >
      <svg
        width="21"
        height="21"
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
      {itemCount > 0 ? (
        <span className="absolute -right-2 -top-1.5 flex min-h-[17px] min-w-[17px] items-center justify-center rounded-full bg-ink px-[5px] font-body text-[10px] font-medium leading-none text-canvas">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      ) : null}
    </button>
  );
}

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 bg-canvas">
        <AnnouncementTicker />
        <nav className="h-16 border-b border-line">
          <div className="relative mx-auto flex h-full max-w-[1200px] items-center justify-between px-5 md:px-8">
            <div className="flex w-8 shrink-0 items-center md:w-auto">
              <button
                type="button"
                className="flex h-8 w-8 flex-col items-center justify-center gap-[5px] md:hidden"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Otvori meni"
                aria-expanded={mobileOpen}
              >
                <span className={`block h-px w-5 bg-ink transition-transform duration-200 ${mobileOpen ? 'translate-y-[3px] rotate-45' : ''}`} />
                <span className={`block h-px w-5 bg-ink transition-opacity duration-200 ${mobileOpen ? 'opacity-0' : ''}`} />
                <span className={`block h-px w-5 bg-ink transition-transform duration-200 ${mobileOpen ? '-translate-y-[3px] -rotate-45' : ''}`} />
              </button>
              <div className="hidden md:block">
                <BrandLogo />
              </div>
            </div>

            {/* Logo na sredini (mobilni) */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center md:hidden">
              <BrandLogo className="pointer-events-auto" />
            </div>

            <div className="hidden items-center gap-8 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="link-underline font-body text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ink"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Prijava na panel stoji samo u footeru — nije za kupce. */}
            <div className="flex w-8 shrink-0 items-center justify-end gap-4 md:w-auto md:gap-5">
              <CartButton />
            </div>
          </div>
        </nav>
      </header>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-ink/20 transition-opacity duration-300 md:hidden ${
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Mobilni meni */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-[278px] border-l border-line bg-canvas transition-transform duration-300 ease-out md:hidden ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex justify-end p-5">
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Zatvori meni"
            className="flex h-8 w-8 items-center justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
              <line x1="1" y1="1" x2="15" y2="15" />
              <line x1="15" y1="1" x2="1" y2="15" />
            </svg>
          </button>
        </div>
        <div className="flex flex-col gap-6 px-7">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="font-body text-[13px] uppercase tracking-[0.14em] text-ink-soft"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-3 flex items-center justify-between gap-4 border-t border-line pt-6">
            <span className="font-body text-[11px] uppercase tracking-[0.14em] text-ink-soft">Korpa</span>
            <CartButton onBeforeOpen={() => setMobileOpen(false)} />
          </div>
        </div>
      </div>
    </>
  );
}
