'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import Media from '@/components/ui/Media';
import type { HeroSlide } from '@/lib/products-server';

const AUTOPLAY_MS = 6000;

/**
 * Slajdovi u zaglavlju početne. Prevlačenje je čist CSS scroll-snap, isto kao
 * trake proizvoda; JS samo prati koji je slajd u kadru i pomera ga strelicama.
 * Sami se smenjuju dok kupac ne dirne slider — posle toga ostaju gde ih ostavi.
 */
export default function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [stopped, setStopped] = useState(false);
  const count = slides.length;

  const goTo = useCallback(
    (i: number) => {
      const el = scrollerRef.current;
      if (!el || count === 0) return;
      const next = (i + count) % count;
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    },
    [count],
  );

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.min(count - 1, Math.round(el.scrollLeft / el.clientWidth)));
  };

  useEffect(() => {
    if (count < 2 || stopped || hovered) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setTimeout(() => goTo(index + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(t);
  }, [index, count, stopped, hovered, goTo]);

  const manual = (i: number) => {
    setStopped(true);
    goTo(i);
  };

  const arrow =
    'absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-canvas/85 text-ink shadow-sm backdrop-blur-sm transition-colors hover:bg-canvas';

  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carousel"
      aria-label="Istaknuto"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        onPointerDown={() => setStopped(true)}
        className="flex snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [overscroll-behavior-x:contain] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => {
          const media = (
            <Media
              src={slide.image}
              alt={slide.alt || 'Istaknuta ponuda'}
              ratio="4 / 5"
              label="Hero slika · preporuka 1200×1500"
              priority={i === 0}
              sizes="(max-width: 768px) 100vw, 560px"
            />
          );
          return (
            <div
              key={`${slide.image}-${i}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} od ${count}`}
              className="w-full shrink-0 snap-start"
            >
              {slide.link ? (
                <Link
                  href={slide.link}
                  className="block transition-opacity hover:opacity-90"
                  aria-label={slide.alt || 'Otvori istaknutu ponudu'}
                  draggable={false}
                  {...(slide.link.startsWith('/')
                    ? {}
                    : { target: '_blank', rel: 'noopener noreferrer' })}
                >
                  {media}
                </Link>
              ) : (
                media
              )}
            </div>
          );
        })}
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={() => manual(index - 1)}
            aria-label="Prethodna slika"
            className={`${arrow} left-3`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => manual(index + 1)}
            aria-label="Sledeća slika"
            className={`${arrow} right-3`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => manual(i)}
                aria-label={`Slika ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                className="flex h-8 items-center px-1.5"
              >
                <span
                  className={`block h-2 rounded-full shadow-[0_0_3px_rgba(0,0,0,0.35)] transition-all duration-300 ${
                    i === index ? 'w-6 bg-white' : 'w-2 bg-white/60'
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
