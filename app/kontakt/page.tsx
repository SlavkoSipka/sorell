import type { Metadata } from 'next';
import ScrollRevealInit from '@/components/ScrollRevealInit';
import Media from '@/components/ui/Media';
import { SITE } from '@/lib/site-config';
import { telHref } from '@/lib/order-status';
import { getSalonData } from '@/lib/salon-server';

export const metadata: Metadata = {
  title: 'Kontakt',
  description: 'Adresa, radno vreme i kontakt salona.',
  alternates: { canonical: '/kontakt' },
};

export default async function KontaktPage() {
  // Telefon se menja iz admina (Podešavanja → Salon), isto kao na „Uslugama".
  const { phone, address, city, title } = await getSalonData();

  return (
    <main>
      <ScrollRevealInit />

      <section className="border-b border-line">
        <div className="mx-auto max-w-[1200px] px-5 py-12 md:px-8 md:py-16">
          <h1 className="font-display text-[32px] text-ink md:text-[42px]">Kontakt</h1>
          <p className="mt-3 max-w-[520px] font-body text-[14px] leading-relaxed text-ink-soft">
            Pozovi, piši ili svrati — radno vreme i adresa su ispod.
          </p>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-12 md:grid-cols-2 md:gap-16 md:px-8 md:py-16">
          <div data-reveal="true">
            <h2 className="font-display text-[22px] text-ink">{title}</h2>

            <dl className="mt-6 space-y-4">
              <div>
                <dt className="font-body text-[11px] uppercase tracking-[0.16em] text-muted">Adresa</dt>
                <dd className="mt-1 font-body text-[15px] text-ink">
                  {address}
                  <br />
                  {city}
                </dd>
              </div>
              <div>
                <dt className="font-body text-[11px] uppercase tracking-[0.16em] text-muted">Telefon</dt>
                <dd className="mt-1 font-body text-[15px]">
                  <a href={telHref(phone)} className="text-ink underline underline-offset-4">
                    {phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-body text-[11px] uppercase tracking-[0.16em] text-muted">Email</dt>
                <dd className="mt-1 font-body text-[15px]">
                  <a href={`mailto:${SITE.salon.email}`} className="text-ink underline underline-offset-4">
                    {SITE.salon.email}
                  </a>
                </dd>
              </div>
            </dl>

            <h3 className="mt-10 font-body text-[11px] uppercase tracking-[0.16em] text-muted">
              Radno vreme
            </h3>
            <dl className="mt-3">
              {SITE.salon.hours.map((h) => (
                <div key={h.day} className="flex justify-between gap-6 border-b border-line py-2">
                  <dt className="font-body text-[14px] text-ink-soft">{h.day}</dt>
                  <dd className="font-body text-[14px] tabular-nums text-ink">{h.time}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div data-reveal="true" data-reveal-delay="100">
            {SITE.salon.mapEmbedUrl ? (
              <iframe
                src={SITE.salon.mapEmbedUrl}
                title="Mapa — lokacija salona"
                loading="lazy"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="h-[420px] w-full border border-line"
              />
            ) : (
              <Media
                src=""
                alt="Mapa lokacije"
                ratio="1 / 1"
                label="Mapa · zalepi Google Maps embed link u lib/site-config.ts"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
