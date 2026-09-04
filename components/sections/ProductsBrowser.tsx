'use client';

import { Children, useState } from 'react';

export type BrowserGroup = { slug: string; label: string; count: number };

const ALL = '';

/**
 * Izbor kategorije iznad spiska. Na telefonu je red dugmadi koji se prevlači
 * u stranu — isto ponašanje kao trake proizvoda ispod, pa ništa ne prelama u
 * više redova. Sekcije stižu već iscrtane sa servera i samo se sakrivaju.
 */
export default function ProductsBrowser({
  groups,
  children,
}: {
  groups: BrowserGroup[];
  children: React.ReactNode;
}) {
  const [active, setActive] = useState<string>(ALL);
  const sections = Children.toArray(children);

  const chip = (selected: boolean) =>
    `inline-flex min-h-[44px] shrink-0 snap-start items-center whitespace-nowrap rounded-card border px-4 font-body text-[13px] uppercase tracking-[0.1em] transition-colors ${
      selected
        ? 'border-ink bg-ink text-canvas'
        : 'border-line-strong text-ink-soft hover:border-ink hover:text-ink'
    }`;

  return (
    <>
      {groups.length > 1 ? (
        <div
          role="tablist"
          aria-label="Kategorije proizvoda"
          className="-mx-5 mb-8 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-5 px-5 pb-1 [-ms-overflow-style:none] [overscroll-behavior-x:contain] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:mb-10 md:flex-wrap md:overflow-visible md:px-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={active === ALL}
            onClick={() => setActive(ALL)}
            className={chip(active === ALL)}
          >
            Sve
          </button>
          {groups.map((g) => (
            <button
              key={g.slug}
              type="button"
              role="tab"
              aria-selected={active === g.slug}
              onClick={() => setActive(g.slug)}
              className={chip(active === g.slug)}
            >
              {g.label}
              <span className="ml-2 font-body text-[12px] normal-case tracking-normal opacity-60">
                {g.count}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="product-groups">
        {sections.map((section, i) => (
          <div
            key={groups[i]?.slug ?? i}
            data-group=""
            hidden={active !== ALL && active !== groups[i]?.slug}
          >
            {section}
          </div>
        ))}
      </div>
    </>
  );
}
