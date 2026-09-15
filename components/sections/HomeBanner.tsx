import Link from 'next/link';
import Media from '@/components/ui/Media';
import { getHomeBanner } from '@/lib/home-server';

/**
 * Baner ispod slajdova na početnoj: široka fotografija, mali naslov, opis i
 * dugme. Fotografija i dugme vode na isto mesto, izabrano u adminu.
 */
export default async function HomeBanner() {
  const banner = await getHomeBanner();
  if (!banner.isActive) return null;

  const href = banner.buttonUrl;
  const linkProps = href.startsWith('/') ? {} : { target: '_blank', rel: 'noopener noreferrer' };

  const media = (
    <Media
      src={banner.image}
      alt={banner.title || 'Fotografija iz ponude'}
      ratio="16 / 9"
      label="Baner · preporuka 1600×900"
      sizes="(max-width: 1200px) 100vw, 1200px"
    />
  );

  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-[1200px] px-5 py-14 md:px-8 md:py-20">
        <div data-reveal="true">
          {href ? (
            // Dugme ispod vodi na isto mesto, pa se slika preskače pri tabovanju.
            <Link
              href={href}
              tabIndex={-1}
              aria-hidden
              className="block transition-opacity hover:opacity-90"
              {...linkProps}
            >
              {media}
            </Link>
          ) : (
            media
          )}
        </div>

        <div className="mt-7 max-w-[640px] md:mt-10" data-reveal="true" data-reveal-delay="120">
          {banner.title ? (
            <h2 className="font-display text-[26px] leading-tight text-ink md:text-[32px]">
              {banner.title}
            </h2>
          ) : null}
          {banner.text ? (
            <p className="mt-3 whitespace-pre-line font-body text-[15px] leading-relaxed text-ink-soft">
              {banner.text}
            </p>
          ) : null}
          {href && banner.buttonLabel ? (
            <Link
              href={href}
              className="mt-7 inline-flex rounded-card border border-ink bg-ink px-7 py-3.5 font-body text-[12px] uppercase tracking-[0.14em] text-canvas transition-colors hover:bg-canvas hover:text-ink"
              {...linkProps}
            >
              {banner.buttonLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
