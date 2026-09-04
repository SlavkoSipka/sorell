import Link from 'next/link';
import { SITE } from '@/lib/site-config';
import { FREE_SHIPPING_THRESHOLD_LABEL } from '@/lib/shipping';
import { telHref } from '@/lib/order-status';
import { getSalonData } from '@/lib/salon-server';

const columns = [
  {
    title: 'Prodavnica',
    links: [
      { href: '/proizvodi', label: 'Svi proizvodi' },
      { href: '/korpa', label: 'Korpa' },
      { href: '/porudzbina', label: 'Porudžbina' },
    ],
  },
  {
    title: 'Salon',
    links: [
      { href: '/usluge', label: 'Usluge i cenovnik' },
      { href: '/kontakt', label: 'Kontakt i radno vreme' },
      { href: '/o-nama', label: 'O nama' },
    ],
  },
];

export default async function Footer() {
  // Isti broj kao na „Uslugama" i „Kontaktu" — menja se iz admina.
  const { phone, address, city } = await getSalonData();
  const socials = Object.entries(SITE.social).filter(([, url]) => url);

  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 md:grid-cols-4 md:px-8">
        <div className="md:col-span-2">
          <p className="font-display text-[22px] text-ink">{SITE.brandName}</p>
          <p className="mt-3 max-w-[380px] font-body text-[14px] leading-relaxed text-ink-soft">
            {SITE.description}
          </p>
          <p className="mt-5 font-body text-[13px] text-muted">{FREE_SHIPPING_THRESHOLD_LABEL}</p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <p className="font-body text-[11px] uppercase tracking-[0.18em] text-muted">{col.title}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="link-underline font-body text-[14px] text-ink-soft hover:text-ink"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-5 py-6 font-body text-[13px] text-muted md:flex-row md:items-center md:justify-between md:px-8">
          <p>
            {address}, {city} ·{' '}
            <a href={telHref(phone)} className="hover:text-ink">
              {phone}
            </a>
          </p>
          <div className="flex items-center gap-5">
            {socials.map(([name, url]) => (
              <a
                key={name}
                href={url}
                target="_blank"
                rel="noreferrer noopener"
                className="capitalize hover:text-ink"
              >
                {name}
              </a>
            ))}
            <span>
              © {new Date().getFullYear()} {SITE.brandName}
            </span>
            <Link href="/politika-privatnosti" className="hover:text-ink">
              Privatnost
            </Link>
            <Link href="/uslovi-koriscenja" className="hover:text-ink">
              Uslovi
            </Link>
            <Link href="/prijava" className="hover:text-ink">
              Prijava
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
