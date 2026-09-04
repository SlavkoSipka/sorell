'use client';

import { useEffect, useRef, useState } from 'react';
import Media from '@/components/ui/Media';
import type { ProductVideo } from '@/lib/products-server';

type Slide = { kind: 'slika'; src: string } | { kind: 'video'; src: string; poster: string };

/**
 * Slike i klipovi jednog proizvoda.
 *
 * Traka se svajpuje prstom (scroll-snap, bez biblioteke) i istovremeno prati
 * sličice ispod — klik na sličicu pomera traku, a svajp osvetli odgovarajuću
 * sličicu. Sa jednom slikom izgleda kao i pre: nema ni sličica ni tačkica.
 *
 * Klip se ne skida dok ga kupac ne pusti (`preload="none"`): video je
 * najskuplja stavka u mesečnom protoku.
 */
export default function ProductGallery({
  images,
  videos = [],
  alt,
}: {
  images: string[];
  videos?: ProductVideo[];
  alt: string;
}) {
  const slides: Slide[] = [
    ...images.map((src): Slide => ({ kind: 'slika', src })),
    ...videos.map((v): Slide => ({ kind: 'video', src: v.url, poster: v.poster })),
  ];

  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Koji je kadar na sredini trake — čita se iz pozicije skrola, pa svajp i
  // klik na sličicu daju isti rezultat bez dodatnog stanja.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onScroll = () => {
      const width = track.clientWidth || 1;
      const i = Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / width)));
      // Postavlja se samo kad se kadar stvarno promeni, pa scroll ne izaziva
      // ponovno crtanje na svaki piksel.
      setActive((prev) => (prev === i ? prev : i));
    };

    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  }, [slides.length]);

  const goTo = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    // Isto pravilo kao za ostale animacije na sajtu (vidi globals.css).
    const glatko = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({ left: i * track.clientWidth, behavior: glatko ? 'smooth' : 'auto' });
    setActive(i);
  };

  if (slides.length === 0) return null;

  return (
    <div>
      <div
        ref={trackRef}
        className="no-scrollbar flex snap-x snap-mandatory items-start overflow-x-auto overscroll-x-contain"
        aria-roledescription="karusel"
        aria-label="Fotografije i klipovi proizvoda"
      >
        {slides.map((slide, i) => (
          <div
            key={`${slide.kind}-${slide.src}`}
            className="w-full shrink-0 snap-center"
            aria-roledescription="kadar"
            aria-label={`${i + 1} od ${slides.length}`}
          >
            {slide.kind === 'video' ? (
              // Klip zadržava svoj odnos stranica — ne seče se u 4:5 kalup.
              <div className="flex justify-center bg-surface-2">
                <video
                  src={slide.src}
                  poster={slide.poster || undefined}
                  controls
                  playsInline
                  preload="none"
                  className="block h-auto max-h-[85vh] w-auto max-w-full"
                />
              </div>
            ) : (
              <Media
                src={slide.src}
                alt={alt}
                ratio="4 / 5"
                label="Slika proizvoda · 1000×1250"
                priority={i === 0}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            )}
          </div>
        ))}
      </div>

      {slides.length > 1 ? (
        <>
          {/* Tačkice — jedini znak na telefonu da traka ima još kadrova. */}
          <div className="mt-3 flex justify-center gap-1.5 sm:hidden">
            {slides.map((slide, i) => (
              <button
                key={`tacka-${slide.kind}-${slide.src}`}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Kadar ${i + 1} od ${slides.length}`}
                aria-current={i === active}
                className={`h-1.5 rounded-full transition-all ${
                  i === active ? 'w-5 bg-ink' : 'w-1.5 bg-line-strong'
                }`}
              />
            ))}
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
            {slides.map((slide, i) => (
              <button
                key={`slicica-${slide.kind}-${slide.src}`}
                type="button"
                onClick={() => goTo(i)}
                aria-label={
                  slide.kind === 'video'
                    ? `Video ${i + 1} od ${slides.length}`
                    : `Slika ${i + 1} od ${slides.length}`
                }
                aria-current={i === active}
                className={`relative aspect-square overflow-hidden border transition-colors ${
                  i === active ? 'border-ink' : 'border-line hover:border-line-strong'
                }`}
              >
                {slide.kind === 'video' ? (
                  <>
                    {slide.poster ? (
                      // `contain` da se u sličici vidi ceo kadar, kao i u samom klipu.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={slide.poster}
                        alt=""
                        className="h-full w-full bg-surface-2 object-contain"
                      />
                    ) : (
                      <span className="block h-full w-full bg-surface-2" />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink/65">
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="#fff" aria-hidden>
                          <path d="M2 1l8 5-8 5z" />
                        </svg>
                      </span>
                    </span>
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={slide.src} alt="" className="h-full w-full object-cover" />
                )}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
