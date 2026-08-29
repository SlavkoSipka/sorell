'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { SITE } from '@/lib/site-config';

const tabs = [
  { href: '/admin', label: 'Pregled' },
  { href: '/admin/porudzbine', label: 'Porudžbine' },
  { href: '/admin/proizvodi', label: 'Proizvodi' },
  { href: '/admin/podesavanja', label: 'Podešavanja' },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    router.push('/prijava?next=/admin');
    router.refresh();
  };

  return (
    <div className="min-h-[70vh] border-t border-line bg-surface">
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8 md:py-10">
        <div className="mb-6 flex flex-col gap-4 border-b border-line pb-5 md:mb-10 md:flex-row md:items-center md:justify-between md:pb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-[10px] uppercase tracking-[0.2em] text-muted">
                {SITE.brandName}
              </p>
              <h1 className="mt-0.5 font-display text-[20px] text-ink md:text-[24px]">Admin panel</h1>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="font-body text-[10px] uppercase tracking-[0.12em] text-muted hover:text-ink md:hidden"
            >
              Odjavi se
            </button>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            {tabs.map((t) => {
              const active = pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  prefetch
                  className={`inline-flex min-h-[2rem] items-center justify-center rounded-card border px-3 py-2 font-body text-[10px] uppercase tracking-[0.1em] transition-colors md:text-[11px] ${
                    active
                      ? 'border-ink bg-ink text-canvas'
                      : 'border-line text-ink-soft hover:border-ink hover:text-ink'
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={handleLogout}
              className="ml-1 hidden min-h-[2rem] items-center font-body text-[11px] uppercase tracking-[0.12em] text-muted hover:text-ink md:inline-flex"
            >
              Odjavi se
            </button>
          </nav>
        </div>

        {children}
      </div>
    </div>
  );
}
