'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { SITE } from '@/lib/site-config';

type Tab = { href: string; label: string; hint: string; icon: string };

/** Meni je podeljen po tome šta se menja, da se odmah vidi gde je šta. */
const SECTIONS: { title: string; tabs: Tab[] }[] = [
  {
    title: 'Prodaja',
    tabs: [
      {
        href: '/admin',
        label: 'Pregled',
        hint: 'Promet i stanje kataloga',
        icon: 'M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z',
      },
      {
        href: '/admin/porudzbine',
        label: 'Porudžbine',
        hint: 'Nove porudžbine i statusi',
        icon: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
      },
    ],
  },
  {
    title: 'Ponuda',
    tabs: [
      {
        href: '/admin/proizvodi',
        label: 'Proizvodi',
        hint: 'Cene, slike, linije',
        icon: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
      },
      {
        href: '/admin/popusti',
        label: 'Popusti',
        hint: 'Popusti i promo kodovi',
        icon: 'M19 5L5 19M7.5 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM16.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
      },
    ],
  },
  {
    title: 'Izgled sajta',
    tabs: [
      {
        href: '/admin/pocetna',
        label: 'Početna strana',
        hint: 'Slajdovi i baner',
        icon: 'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9.5a1 1 0 100-2 1 1 0 000 2z',
      },
      {
        href: '/admin/salon',
        label: 'Salon',
        hint: 'Usluge, cenovnik, kontakt',
        icon: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8z',
      },
      {
        href: '/admin/izgled',
        label: 'Boje zaglavlja',
        hint: 'Traka i meni na vrhu',
        icon: 'M12 3a9 9 0 100 18c1 0 1.5-.8 1.5-1.5 0-1.2-1-1.5-1-2.5s.8-2 2-2H17a4 4 0 004-4c0-4.4-4-8-9-8zM7.5 11.5h.01M10 7.5h.01M15 7.5h.01',
      },
    ],
  },
];

const ALL_TABS = SECTIONS.flatMap((s) => s.tabs);

const ICON_SITE = 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6';
const ICON_LOGOUT = 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10';

function Icon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const chipsRef = useRef<HTMLElement>(null);

  // Na telefonu aktivna kartica dolazi u sredinu reda, i kad je na kraju.
  useEffect(() => {
    const nav = chipsRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;
    nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.clientWidth) / 2;
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    router.push('/prijava?next=/admin');
    router.refresh();
  };

  return (
    <div className="min-h-[70vh] border-t border-line bg-surface">
      <div className="mx-auto max-w-[1280px] px-4 py-5 md:grid md:grid-cols-[232px_minmax(0,1fr)] md:gap-10 md:px-8 md:py-10">
        <aside className="md:sticky md:top-6 md:self-start">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-[10px] uppercase tracking-[0.2em] text-muted">
                {SITE.brandName}
              </p>
              <h1 className="mt-0.5 font-display text-[20px] text-ink md:text-[22px]">Admin panel</h1>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="min-h-[44px] font-body text-[12px] uppercase tracking-[0.12em] text-muted hover:text-ink md:hidden"
            >
              Odjavi se
            </button>
          </div>

          {/* Telefon: red kartica koji se prevlači u stranu. */}
          <nav
            ref={chipsRef}
            aria-label="Admin meni"
            className="relative -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden"
          >
            {ALL_TABS.map((t) => {
              const active = isActive(pathname, t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  prefetch
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-card border px-3.5 font-body text-[13px] transition-colors ${
                    active
                      ? 'border-ink bg-ink text-canvas'
                      : 'border-line bg-canvas text-ink-soft hover:border-ink hover:text-ink'
                  }`}
                >
                  <Icon path={t.icon} />
                  {t.label}
                </Link>
              );
            })}
          </nav>

          {/* Računar: meni po celinama, uz kratko objašnjenje svake kartice. */}
          <nav aria-label="Admin meni" className="mt-8 hidden md:block">
            {SECTIONS.map((section) => (
              <div key={section.title} className="mb-6">
                <p className="mb-2 px-3 font-body text-[10px] uppercase tracking-[0.18em] text-muted">
                  {section.title}
                </p>
                <ul className="space-y-0.5">
                  {section.tabs.map((t) => {
                    const active = isActive(pathname, t.href);
                    return (
                      <li key={t.href}>
                        <Link
                          href={t.href}
                          prefetch
                          aria-current={active ? 'page' : undefined}
                          className={`flex items-start gap-3 rounded-card px-3 py-2.5 transition-colors ${
                            active ? 'bg-ink text-canvas' : 'text-ink hover:bg-canvas'
                          }`}
                        >
                          <span className="mt-px">
                            <Icon path={t.icon} />
                          </span>
                          <span className="min-w-0">
                            <span className="block font-body text-[14px] leading-tight">
                              {t.label}
                            </span>
                            <span
                              className={`mt-0.5 block font-body text-[12px] leading-snug ${
                                active ? 'text-canvas/70' : 'text-muted'
                              }`}
                            >
                              {t.hint}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            <div className="space-y-0.5 border-t border-line pt-4">
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[40px] items-center gap-3 rounded-card px-3 font-body text-[13px] text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
              >
                <Icon path={ICON_SITE} />
                Otvori sajt
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex min-h-[40px] w-full items-center gap-3 rounded-card px-3 text-left font-body text-[13px] text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
              >
                <Icon path={ICON_LOGOUT} />
                Odjavi se
              </button>
            </div>
          </nav>
        </aside>

        <div className="mt-6 min-w-0 md:mt-0">{children}</div>
      </div>
    </div>
  );
}
