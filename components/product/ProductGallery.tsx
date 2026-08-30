'use client';

import { useState } from 'react';
import Media from '@/components/ui/Media';

/**
 * Slike jednog proizvoda. Sa jednom slikom izgleda isto kao ranije —
 * sličice se pojavljuju tek kad proizvod ima više fotografija.
 */
export default function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const shown = images[active] ?? images[0] ?? '';

  return (
    <div>
      <Media
        src={shown}
        alt={alt}
        ratio="4 / 5"
        label="Slika proizvoda · 1000×1250"
        priority
        sizes="(max-width: 768px) 100vw, 50vw"
      />

      {images.length > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Slika ${i + 1} od ${images.length}`}
              aria-current={i === active}
              className={`relative aspect-square overflow-hidden border transition-colors ${
                i === active ? 'border-ink' : 'border-line hover:border-line-strong'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
