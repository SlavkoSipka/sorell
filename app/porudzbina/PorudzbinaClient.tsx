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

const fieldInput =
  'w-full rounded-card border border-line-strong bg-canvas px-4 py-3 font-body text-[15px] text-ink placeholder:text-muted focus:border-ink focus:outline-none transition-colors';
const fieldLabel = 'block font-body text-[13px] font-medium text-ink mb-1.5';

export default function PorudzbinaClient() {
  const router = useRouter();
  const { items, clearCart, promoCode } = useCart();
  const pricing = useCartPricing();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postal, setPostal] = useState('');
  const [note, setNote] = useState('');

  const empty = items.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
          city: city.trim(),
          postal: postal.trim(),
          note: note.trim() || null,
          promoCode: promoCode ?? null,
          lineItems: items.map((line) => ({ slug: line.slug, quantity: line.quantity })),
          totalRsd: pricing.totalRsd,
        }),
      });

      const data = (await res.json()) as { error?: string; orderId?: string };

      if (!res.ok) {
        setError(data.error ?? 'Slanje nije uspelo.');
        return;
      }

      clearCart();
      router.push('/zahvalnica');
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
            className="mt-7 inline-flex rounded-card border border-ink bg-ink px-6 py-3 font-body text-[11px] uppercase tracking-[0.14em] text-canvas transition-colors hover:bg-canvas hover:text-ink"
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
          <form onSubmit={handleSubmit} className="order-2 space-y-5 lg:order-1">
            <div>
              <h2 className="font-display text-[22px] text-ink">Podaci za dostavu</h2>
              <p className="mt-1 font-body text-[14px] text-ink-soft">
                {pricing.freeShipping
                  ? `Besplatna poštarina za ovu porudžbinu (${SHIPPING_CARRIER}).`
                  : `Poštarina ${formatRsd(pricing.shippingRsd)} (${SHIPPING_CARRIER}) sabira se sa iznosom porudžbine.`}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={fieldLabel} htmlFor="checkout-firstName">Ime</label>
                <input
                  id="checkout-firstName"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  className={fieldInput}
                  placeholder="Ime"
                />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="checkout-lastName">Prezime</label>
                <input
                  id="checkout-lastName"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  className={fieldInput}
                  placeholder="Prezime"
                />
              </div>
            </div>

            <div>
              <label className={fieldLabel} htmlFor="checkout-email">Email</label>
              <input
                id="checkout-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className={fieldInput}
                placeholder="tvoj@email.com"
              />
            </div>

            <div>
              <label className={fieldLabel} htmlFor="checkout-phone">Telefon</label>
              <input
                id="checkout-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                className={fieldInput}
                placeholder="+381 …"
              />
            </div>

            <div>
              <label className={fieldLabel} htmlFor="checkout-address">Adresa (ulica i broj)</label>
              <input
                id="checkout-address"
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                autoComplete="street-address"
                className={fieldInput}
                placeholder="Ulica i broj"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={fieldLabel} htmlFor="checkout-city">Grad</label>
                <input
                  id="checkout-city"
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  autoComplete="address-level2"
                  className={fieldInput}
                  placeholder="Grad"
                />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="checkout-postal">Poštanski broj</label>
                <input
                  id="checkout-postal"
                  type="text"
                  required
                  value={postal}
                  onChange={(e) => setPostal(e.target.value)}
                  autoComplete="postal-code"
                  className={fieldInput}
                  placeholder="npr. 11000"
                />
              </div>
            </div>

            <div>
              <label className={fieldLabel} htmlFor="checkout-note">
                Napomena <span className="font-normal text-muted">(opciono)</span>
              </label>
              <textarea
                id="checkout-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={`${fieldInput} resize-none`}
                placeholder="Npr. vreme dostave, dodatne napomene…"
              />
            </div>

            <PromoCodeField />

            {error ? (
              <p className="font-body text-[14px] font-medium text-danger" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading || !pricing.loaded || pricing.hasUnpricedItems}
              className="w-full rounded-card border border-ink bg-ink py-4 font-body text-[12px] uppercase tracking-[0.14em] text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? 'Šaljem…' : 'Pošalji porudžbinu'}
            </button>

            <p className="font-body text-[12px] leading-relaxed text-muted">
              Plaćanje je pouzećem — iznos se plaća kuriru pri preuzimanju.
            </p>
          </form>

          <aside className="order-1 border border-line bg-surface p-5 lg:sticky lg:top-28 lg:order-2">
            <h2 className="font-display text-[19px] text-ink">Pregled korpe</h2>

            <ul className="mt-4 space-y-3">
              {items.map((line) => (
                <li key={line.slug} className="flex gap-3">
                  <div className="w-10 shrink-0">
                    <Media src={line.image} alt={line.name} ratio="4 / 5" label="Slika" sizes="40px" fit="contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-[13px] leading-snug text-ink">{line.name}</p>
                    <p className="mt-0.5 font-body text-[12px] tabular-nums text-muted">
                      {formatRsd(pricing.unitPriceRsd(line))} × {line.quantity}
                    </p>
                  </div>
                  <p className="shrink-0 font-body text-[13px] tabular-nums text-ink">
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
