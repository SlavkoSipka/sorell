'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Media from '@/components/ui/Media';
import CartSummary from '@/components/cart/CartSummary';
import PromoCodeField from '@/components/cart/PromoCodeField';
import { useCart } from '@/lib/cart-context';
import { useCartPricing } from '@/lib/use-cart-pricing';
import { formatRsd } from '@/lib/price';
import { SHIPPING_CARRIER } from '@/lib/shipping';
import {
  firstCheckoutError,
  validateCheckout,
  type CheckoutErrors,
  type CheckoutFields,
} from '@/lib/checkout-validation';

const fieldInput =
  'w-full rounded-card border bg-canvas px-4 py-3 font-body text-[16px] text-ink placeholder:text-muted focus:outline-none transition-colors';
const fieldLabel = 'mb-1.5 block font-body text-[14px] font-semibold text-ink';

const PRAZNO: CheckoutFields = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  address: '',
  addressExtra: '',
  city: '',
  municipality: '',
  postal: '',
  note: '',
};

export default function PorudzbinaClient() {
  const router = useRouter();
  const { items, clearCart, promoCode } = useCart();
  const pricing = useCartPricing();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polja, setPolja] = useState<CheckoutFields>(PRAZNO);
  const [greske, setGreske] = useState<CheckoutErrors>({});

  const empty = items.length === 0;

  const postavi = (key: keyof CheckoutFields, value: string) => {
    setPolja((prev) => ({ ...prev, [key]: value }));
    // Greška nestaje čim kupac počne da je ispravlja.
    if (greske[key]) setGreske((prev) => ({ ...prev, [key]: undefined }));
  };

  /** Stil polja — crveni okvir kad je greška, da se na telefonu vidi i bez čitanja. */
  const okvir = (key: keyof CheckoutFields) =>
    `${fieldInput} ${greske[key] ? 'border-danger' : 'border-line-strong focus:border-ink'}`;

  const poruka = (key: keyof CheckoutFields) =>
    greske[key] ? (
      <p id={`greska-${key}`} className="mt-1.5 font-body text-[13px] text-danger">
        {greske[key]}
      </p>
    ) : null;

  const aria = (key: keyof CheckoutFields) => ({
    'aria-invalid': greske[key] ? true : undefined,
    'aria-describedby': greske[key] ? `greska-${key}` : undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nadjene = validateCheckout(polja);
    if (firstCheckoutError(nadjene)) {
      setGreske(nadjene);
      setError('Proveri označena polja.');
      // Na telefonu forma je duga — vodi kupca do prvog pogrešnog polja.
      const prvo = (Object.keys(nadjene) as (keyof CheckoutFields)[]).find((k) => nadjene[k]);
      if (prvo) document.getElementById(`checkout-${prvo}`)?.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: polja.firstName.trim(),
          lastName: polja.lastName.trim(),
          email: polja.email.trim(),
          phone: polja.phone.trim(),
          address: polja.address.trim(),
          addressExtra: polja.addressExtra.trim(),
          city: polja.city.trim(),
          municipality: polja.municipality.trim(),
          postal: polja.postal.trim(),
          note: polja.note.trim() || null,
          promoCode: promoCode ?? null,
          lineItems: items.map((line) => ({ slug: line.slug, quantity: line.quantity })),
          totalRsd: pricing.totalRsd,
        }),
      });

      const data = (await res.json()) as { error?: string; orderId?: string; orderNumber?: string };

      if (!res.ok || !data.orderId) {
        setError(data.error ?? 'Slanje nije uspelo.');
        return;
      }

      clearCart();
      const q = new URLSearchParams({ id: data.orderId });
      if (data.orderNumber) q.set('br', data.orderNumber);
      router.push(`/zahvalnica?${q.toString()}`);
    } catch {
      setError('Mrežna greška. Pokušajte ponovo.');
    } finally {
      setLoading(false);
    }
  };

  if (empty) {
    return (
      <main>
        <div className="mx-auto max-w-[520px] px-5 py-20 text-center md:px-8">
          <h1 className="font-display text-[28px] text-ink">Porudžbina</h1>
          <p className="mt-4 font-body text-[14px] text-muted">
            Korpa je prazna. Dodaj proizvode pre nego što nastaviš.
          </p>
          <Link
            href="/proizvodi"
            className="mt-7 inline-flex rounded-card border border-ink bg-ink px-6 py-3 font-body text-[12px] uppercase tracking-[0.14em] text-canvas transition-colors hover:bg-canvas hover:text-ink"
          >
            Pogledaj proizvode
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="mx-auto max-w-[1000px] px-5 py-12 md:px-8 md:py-16">
        <h1 className="font-display text-[30px] text-ink md:text-[38px]">Porudžbina</h1>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px] lg:items-start">
          <form onSubmit={handleSubmit} noValidate className="order-2 space-y-8 lg:order-1">
            {/* ── Kupac ── */}
            <fieldset className="space-y-4">
              <legend className="font-display text-[22px] text-ink">Tvoji podaci</legend>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={fieldLabel} htmlFor="checkout-firstName">
                    Ime
                  </label>
                  <input
                    id="checkout-firstName"
                    type="text"
                    value={polja.firstName}
                    onChange={(e) => postavi('firstName', e.target.value)}
                    autoComplete="given-name"
                    className={okvir('firstName')}
                    {...aria('firstName')}
                  />
                  {poruka('firstName')}
                </div>
                <div>
                  <label className={fieldLabel} htmlFor="checkout-lastName">
                    Prezime
                  </label>
                  <input
                    id="checkout-lastName"
                    type="text"
                    value={polja.lastName}
                    onChange={(e) => postavi('lastName', e.target.value)}
                    autoComplete="family-name"
                    className={okvir('lastName')}
                    {...aria('lastName')}
                  />
                  {poruka('lastName')}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={fieldLabel} htmlFor="checkout-phone">
                    Broj telefona
                  </label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    inputMode="tel"
                    value={polja.phone}
                    onChange={(e) => postavi('phone', e.target.value)}
                    autoComplete="tel"
                    className={okvir('phone')}
                    placeholder="064 123 4567"
                    {...aria('phone')}
                  />
                  {poruka('phone') ?? (
                    <p className="mt-1.5 font-body text-[13px] text-muted">Kurir zove pre dostave.</p>
                  )}
                </div>
                <div>
                  <label className={fieldLabel} htmlFor="checkout-email">
                    Email
                  </label>
                  <input
                    id="checkout-email"
                    type="email"
                    inputMode="email"
                    value={polja.email}
                    onChange={(e) => postavi('email', e.target.value)}
                    autoComplete="email"
                    className={okvir('email')}
                    placeholder="ime@primer.rs"
                    {...aria('email')}
                  />
                  {poruka('email') ?? (
                    <p className="mt-1.5 font-body text-[13px] text-muted">
                      Ovde stiže potvrda porudžbine.
                    </p>
                  )}
                </div>
              </div>
            </fieldset>

            {/* ── Adresa ── */}
            <fieldset className="space-y-4">
              <legend className="font-display text-[22px] text-ink">Adresa za dostavu</legend>
              <p className="-mt-2 font-body text-[14px] text-ink-soft">
                {pricing.freeShipping
                  ? `Besplatna poštarina za ovu porudžbinu (${SHIPPING_CARRIER}).`
                  : `Poštarina ${formatRsd(pricing.shippingRsd)} (${SHIPPING_CARRIER}) sabira se sa iznosom porudžbine.`}
              </p>

              <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
                <div>
                  <label className={fieldLabel} htmlFor="checkout-address">
                    Ulica i kućni broj
                  </label>
                  <input
                    id="checkout-address"
                    type="text"
                    value={polja.address}
                    onChange={(e) => postavi('address', e.target.value)}
                    autoComplete="address-line1"
                    className={okvir('address')}
                    placeholder="Knez Mihailova 12"
                    {...aria('address')}
                  />
                  {poruka('address')}
                </div>
                <div>
                  <label className={fieldLabel} htmlFor="checkout-addressExtra">
                    Sprat, stan, ulaz{' '}
                    <span className="font-normal text-muted">(opciono)</span>
                  </label>
                  <input
                    id="checkout-addressExtra"
                    type="text"
                    value={polja.addressExtra}
                    onChange={(e) => postavi('addressExtra', e.target.value)}
                    autoComplete="address-line2"
                    className={okvir('addressExtra')}
                    placeholder="3. sprat, stan 8"
                    {...aria('addressExtra')}
                  />
                  {poruka('addressExtra')}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={fieldLabel} htmlFor="checkout-city">
                    Mesto
                  </label>
                  <input
                    id="checkout-city"
                    type="text"
                    value={polja.city}
                    onChange={(e) => postavi('city', e.target.value)}
                    autoComplete="address-level2"
                    className={okvir('city')}
                    placeholder="Beograd"
                    {...aria('city')}
                  />
                  {poruka('city')}
                </div>
                <div>
                  <label className={fieldLabel} htmlFor="checkout-municipality">
                    Opština
                  </label>
                  <input
                    id="checkout-municipality"
                    type="text"
                    value={polja.municipality}
                    onChange={(e) => postavi('municipality', e.target.value)}
                    autoComplete="address-level3"
                    className={okvir('municipality')}
                    placeholder="Zvezdara"
                    {...aria('municipality')}
                  />
                  {poruka('municipality')}
                </div>
                <div>
                  <label className={fieldLabel} htmlFor="checkout-postal">
                    Poštanski broj
                  </label>
                  <input
                    id="checkout-postal"
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    value={polja.postal}
                    onChange={(e) => postavi('postal', e.target.value.replace(/\D/g, ''))}
                    autoComplete="postal-code"
                    className={okvir('postal')}
                    placeholder="11000"
                    {...aria('postal')}
                  />
                  {poruka('postal')}
                </div>
              </div>

              <div>
                <label className={fieldLabel} htmlFor="checkout-note">
                  Napomena za dostavu <span className="font-normal text-muted">(opciono)</span>
                </label>
                <textarea
                  id="checkout-note"
                  rows={3}
                  value={polja.note}
                  onChange={(e) => postavi('note', e.target.value)}
                  className={`${okvir('note')} resize-none`}
                  placeholder="Npr. interfon ne radi, pozvati pre dolaska…"
                  {...aria('note')}
                />
                {poruka('note')}
              </div>
            </fieldset>

            {/* ── Plaćanje ── */}
            <fieldset>
              <legend className="font-display text-[22px] text-ink">Način plaćanja</legend>
              <div className="mt-3 flex items-start gap-3 rounded-card border border-ink bg-surface px-4 py-4">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-ink"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-ink" />
                </span>
                <div>
                  <p className="font-body text-[15px] font-semibold text-ink">Plaćanje pouzećem</p>
                  <p className="mt-1 font-body text-[14px] leading-relaxed text-ink-soft">
                    Iznos plaćaš gotovinom kuriru kada preuzmeš paket. Online plaćanje karticom nije
                    dostupno.
                  </p>
                </div>
              </div>
            </fieldset>

            <PromoCodeField />

            {error ? (
              <p className="font-body text-[14px] font-semibold text-danger" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading || !pricing.loaded || pricing.hasUnpricedItems}
              className="w-full rounded-card border border-ink bg-ink py-4 font-body text-[14px] font-semibold uppercase tracking-[0.12em] text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:pointer-events-none disabled:opacity-50"
            >
              {loading
                ? 'Šaljem porudžbinu…'
                : `Poruči — ${formatRsd(pricing.totalRsd)} pouzećem`}
            </button>

            <p className="font-body text-[13px] leading-relaxed text-muted">
              Klikom na dugme potvrđuješ porudžbinu i prihvataš{' '}
              <Link href="/uslovi-koriscenja" className="text-ink underline underline-offset-2">
                uslove prodaje
              </Link>
              . Potvrda porudžbine u PDF-u stiže odmah na sledećoj stranici i na tvoj email.
            </p>
          </form>

          <aside className="order-1 border border-line bg-surface p-5 lg:sticky lg:top-28 lg:order-2">
            <h2 className="font-display text-[19px] text-ink">Pregled korpe</h2>

            <ul className="mt-4 space-y-3">
              {items.map((line) => (
                <li key={line.slug} className="flex gap-3">
                  <div className="w-10 shrink-0">
                    <Media
                      src={line.image}
                      alt={line.name}
                      ratio="4 / 5"
                      label="Slika"
                      sizes="40px"
                      fit="contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-[14px] leading-snug text-ink">{line.name}</p>
                    <p className="mt-0.5 font-body text-[13px] tabular-nums text-muted">
                      {formatRsd(pricing.unitPriceRsd(line))} × {line.quantity}
                    </p>
                  </div>
                  <p className="shrink-0 font-body text-[14px] tabular-nums text-ink">
                    {formatRsd(pricing.lineTotalRsd(line))}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-5 border-t border-line pt-4">
              <CartSummary pricing={pricing} />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
