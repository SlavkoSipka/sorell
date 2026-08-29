'use client';

import { Children, useCallback, useEffect, useRef } from 'react';

/**
 * Vodoravna traka proizvoda na telefonu, mreža od `md` naviše.
 *
 * Skrol je čist CSS (`overflow-x: auto` + scroll-snap): pretraživač sam odlučuje
 * da li je pokret prsta vodoravan ili uspravan, pa oba rade u svakom trenutku.
 * JS ovde NE dira dodir — samo prati poziciju da bi iscrtao traku napretka,
 * i to upisom u `style` bez ponovnog renderovanja komponente.
 */
export default function ProductCarousel({ children }: { children: React.ReactNode }) {
  const items = Children.toArray(children);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);

  const sync = useCallback(() => {
    const el = scrollerRef.current;
    const thumb = thumbRef.current;
    const track = trackRef.current;
    if (!el || !thumb || !track) return;

    const overflow = el.scrollWidth - el.clientWidth;
    // Mreža na širem ekranu ne skroluje — traka tada nema šta da pokaže.
    if (overflow <= 1) {
      track.style.opacity = '0';
      return;
    }

    const ratio = el.clientWidth / el.scrollWidth;
    const progress = Math.min(1, Math.max(0, el.scrollLeft / overflow));

    track.style.opacity = '1';
    thumb.style.width = `${ratio * 100}%`;
    // translateX je u procentima ŠIRINE PALCA, otud deljenje sa ratio.
    thumb.style.transform = `translateX(${(progress * (1 - ratio) * 100) / ratio}%)`;
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, [sync]);

  return (
    <div>
      <div
        ref={scrollerRef}
        onScroll={sync}
        // -mx-5/px-5 prati padding stranice: prva kartica je poravnata sa
        // naslovom, a poslednja može do kraja da uđe u vidno polje.
        className="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-5 px-5 pb-1 [-ms-overflow-style:none] [overscroll-behavior-x:contain] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:snap-none md:grid-cols-4 md:gap-x-8 md:gap-y-12 md:overflow-visible md:px-0 md:pb-0"
      >
        {items.map((child, i) => (
          <div
            key={i}
            className="w-[70%] min-w-0 max-w-[300px] shrink-0 snap-start sm:w-[46%] md:w-auto md:max-w-none md:shrink"
          >
            {child}
          </div>
        ))}
      </div>

      <div
        ref={trackRef}
        aria-hidden
        className="mt-5 h-[3px] w-full overflow-hidden rounded-full bg-line opacity-0 transition-opacity duration-200 md:hidden"
      >
        <span className="block h-full w-0 rounded-full bg-ink transition-transform duration-100 ease-out" ref={thumbRef} />
      </div>
    </div>
  );
}
