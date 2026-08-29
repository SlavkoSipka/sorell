import Link from 'next/link';

export default function NotFound() {
  return (
    <main>
      <div className="mx-auto max-w-[520px] px-5 py-24 text-center md:px-8">
        <p className="font-body text-[10px] uppercase tracking-[0.2em] text-muted">404</p>
        <h1 className="mt-4 font-display text-[30px] text-ink">Stranica nije pronađena</h1>
        <p className="mt-4 font-body text-[14px] text-ink-soft">
          Link je možda promenjen ili stranica više ne postoji.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-card border border-ink bg-ink px-6 py-3 font-body text-[11px] uppercase tracking-[0.14em] text-canvas transition-colors hover:bg-canvas hover:text-ink"
        >
          Nazad na početnu
        </Link>
      </div>
    </main>
  );
}
