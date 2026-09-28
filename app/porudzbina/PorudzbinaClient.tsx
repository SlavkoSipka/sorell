'use client';

import { useState, type ReactNode } from 'react';
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
  CHECKOUT_FIELD_ORDER,
  firstCheckoutError,
  validateCheckout,
  type CheckoutErrors,
  type CheckoutFields,
} from '@/lib/checkout-validation';
import type { CustomerType, PaymentMethod } from '@/lib/payment';

const fieldInput =
  'w-full rounded-card border bg-canvas px-4 py-3 font-body text-[16px] text-ink placeholder:text-muted focus:outline-none transition-colors';
const fieldLabel = 'mb-1.5 block font-body text-[14px] font-semibold text-ink';

const PRAZNO: CheckoutFields = {
  customerType: 'fizicko',
  companyName: '',
  pib: '',
  mb: '',
  companyAddress: '',
  companySameAddress: true,
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
  paymentMethod: 'pouzece',
};

type TextKey = Exclude<keyof CheckoutFields, 'customerType' | 'paymentMethod' | 'companySameAddress'>;

/** Kartica sa radio dugmetom: ceo okvir je klikabilan, na telefonu lako pogoditi prstom. */
function Izbor({
  name,
  checked,
  onSelect,
  title,
  children,
  id,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  children?: ReactNode;
  id?: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-card border px-4 py-4 transition-colors ${
        checked ? 'border-ink bg-surface' : 'border-line-strong bg-canvas hover:border-ink'
      }`}
    >
      <input
        id={id}
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink peer-focus-visible:ring-offset-2"
      >
        {checked ? <span className="h-2.5 w-2.5 rounded-full bg-ink" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block font-body text-[15px] font-semibold text-ink">{title}</span>
        {children ? (
          <span className="mt-1 block font-body text-[14px] leading-relaxed text-ink-soft">{children}</span>
        ) : null}
      </span>
    </label>
  );
}

export default function PorudzbinaClient({ transferAvailable }: { transferAvailable: boolean }) {
  const router = useRouter();
  const { items, clearCart, promoCode } = useCart();
  const pricing = useCartPricing();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polja, setPolja] = useState<CheckoutFields>(PRAZNO);
  const [greske, setGreske] = useState<CheckoutErrors>({});

  const empty = items.length === 0;
  const firma = polja.customerType === 'firma';
  const uplata = polja.paymentMethod === 'uplata';

  const postavi = <K extends keyof CheckoutFields>(key: K, value: CheckoutFields[K]) => {
    setPolja((prev) => ({ ...prev, [key]: value }));
    // Greška nestaje čim kupac počne da je ispravlja.
    if (greske[key]) setGreske((prev) => ({ ...prev, [key]: undefined }));
  };

  /** Stil polja: crveni okvir kad je greška, da se na telefonu vidi i bez čitanja. */
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

  /** Tekstualno polje sa labelom, greškom i pomoćnim tekstom. */
  const polje = (
    key: TextKey,
    label: ReactNode,
    props: React.InputHTMLAttributes<HTMLInputElement> & { hint?: string } = {},
  ) => {
    const { hint, ...rest } = props;
    return (
      <div>
        <label className={fieldLabel} htmlFor={`checkout-${key}`}>
          {label}
        </label>
        <input
          id={`checkout-${key}`}
          type="text"
          value={polja[key]}
          onChange={(e) => postavi(key, e.target.value)}
          className={okvir(key)}
          {...aria(key)}
          {...rest}
        />
        {poruka(key) ?? (hint ? <p className="mt-1.5 font-body text-[13px] text-muted">{hint}</p> : null)}
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nadjene = validateCheckout(polja, { transferAvailable });
    if (firstCheckoutError(nadjene)) {
      setGreske(nadjene);
      setError('Proveri označena polja.');
      // Na telefonu forma je duga: vodi kupca do prvog pogrešnog polja.
      const prvo = CHECKOUT_FIELD_ORDER.find((k) => nadjene[k]);
      if (prvo) document.getElementById(`checkout-${prvo}`)?.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerType: polja.customerType,
          companyName: firma ? polja.companyName.trim() : '',
          pib: firma ? polja.pib.trim() : '',
          mb: firma ? polja.mb.trim() : '',
          companyAddress: firma && !polja.companySameAddress ? polja.companyAddress.trim() : '',
          companySameAddress: polja.companySameAddress,
          paymentMethod: polja.paymentMethod,
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

  const tipKupca = (tip: CustomerType, naslov: string) => {
    const sel = polja.customerType === tip;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={sel}
        id={tip === 'fizicko' ? 'checkout-customerType' : undefined}
        onClick={() => postavi('customerType', tip)}
        className={`min-h-[48px] flex-1 rounded-card border px-3 font-body text-[14px] font-semibold transition-colors ${
          sel ? 'border-ink bg-ink text-canvas' : 'border-line-strong bg-canvas text-ink hover:border-ink'
        }`}
      >
        {naslov}
      </button>
    );
  };

  const nacinPlacanja = (m: PaymentMethod) => () => postavi('paymentMethod', m);

  return (
    <main>
      <div className="mx-auto max-w-[1000px] px-5 py-12 md:px-8 md:py-16">
        <h1 className="font-display text-[30px] text-ink md:text-[38px]">Porudžbina</h1>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px] lg:items-start">
          <form onSubmit={handleSubmit} noValidate className="order-2 space-y-8 lg:order-1">
            {/* ── Fizičko lice ili firma ── */}
            <fieldset className="space-y-3">
              <legend className="font-display text-[22px] text-ink">Poručuješ kao</legend>
              <div role="radiogroup" aria-label="Poručuješ kao" className="flex gap-2">
                {tipKupca('fizicko', 'Fizičko lice')}
                {tipKupca('firma', 'Firma')}
              </div>
              {firma ? (
                <p className="font-body text-[13px] leading-relaxed text-muted">
                  Račun glasi na firmu. Upiši podatke tačno kao u APR-u.
                </p>
              ) : null}
            </fieldset>

            {/* ── Podaci o firmi ── */}
            {firma ? (
              <fieldset className="space-y-4">
                <legend className="font-display text-[22px] text-ink">Podaci o firmi</legend>

                {polje('companyName', 'Naziv firme', {
                  autoComplete: 'organization',
                  placeholder: 'Salon Lepota DOO',
                })}

                <div className="grid gap-4 sm:grid-cols-2">
                  {polje('pib', 'PIB', {
                    inputMode: 'numeric',
                    maxLength: 9,
                    placeholder: '9 cifara',
                    onChange: (e) => postavi('pib', e.target.value.replace(/\D/g, '')),
                  })}
                  {polje('mb', 'Matični broj', {
                    inputMode: 'numeric',
                    maxLength: 8,
                    placeholder: '8 cifara',
                    onChange: (e) => postavi('mb', e.target.value.replace(/\D/g, '')),
                  })}
                </div>

                <label className="flex cursor-pointer items-center gap-3 font-body text-[14px] text-ink">
                  <input
                    type="checkbox"
                    checked={polja.companySameAddress}
                    onChange={(e) => postavi('companySameAddress', e.target.checked)}
                    className="h-5 w-5 shrink-0 accent-[color:var(--color-ink)]"
                  />
                  Sedište firme je na adresi za dostavu
                </label>

                {!polja.companySameAddress
                  ? polje('companyAddress', 'Adresa sedišta firme', {
                      autoComplete: 'off',
                      placeholder: 'Ulica i broj, poštanski broj i mesto',
                    })
                  : null}
              </fieldset>
            ) : null}

            {/* ── Kupac ── */}
            <fieldset className="space-y-4">
              <legend className="font-display text-[22px] text-ink">
                {firma ? 'Osoba za kontakt' : 'Tvoji podaci'}
              </legend>

              <div className="grid gap-4 sm:grid-cols-2">
                {polje('firstName', 'Ime', { autoComplete: 'given-name' })}
                {polje('lastName', 'Prezime', { autoComplete: 'family-name' })}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {polje('phone', 'Broj telefona', {
                  type: 'tel',
                  inputMode: 'tel',
                  autoComplete: 'tel',
                  placeholder: '064 123 4567',
                  hint: 'Kurir zove pre dostave.',
                })}
                {polje('email', 'Email', {
                  type: 'email',
                  inputMode: 'email',
                  autoComplete: 'email',
                  placeholder: 'ime@primer.rs',
                  hint: 'Ovde stiže potvrda porudžbine.',
                })}
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
                {polje('address', 'Ulica i kućni broj', {
                  autoComplete: 'address-line1',
                  placeholder: 'Knez Mihailova 12',
                })}
                {polje(
                  'addressExtra',
                  <>
                    Sprat, stan, ulaz <span className="font-normal text-muted">(opciono)</span>
                  </>,
                  { autoComplete: 'address-line2', placeholder: '3. sprat, stan 8' },
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {polje('city', 'Mesto', { autoComplete: 'address-level2', placeholder: 'Beograd' })}
                {polje('municipality', 'Opština', {
                  autoComplete: 'address-level3',
                  placeholder: 'Zvezdara',
                })}
                {polje('postal', 'Poštanski broj', {
                  inputMode: 'numeric',
                  maxLength: 5,
                  autoComplete: 'postal-code',
                  placeholder: '11000',
                  onChange: (e) => postavi('postal', e.target.value.replace(/\D/g, '')),
                })}
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
              <div className="mt-3 space-y-2" role="radiogroup" aria-label="Način plaćanja">
                <Izbor
                  id="checkout-paymentMethod"
                  name="paymentMethod"
                  checked={polja.paymentMethod === 'pouzece'}
                  onSelect={nacinPlacanja('pouzece')}
                  title="Pouzećem"
                >
                  Plaćaš gotovinom kuriru kada preuzmeš paket.
                </Izbor>
                {transferAvailable ? (
                  <Izbor
                    name="paymentMethod"
                    checked={uplata}
                    onSelect={nacinPlacanja('uplata')}
                    title="Uplata na račun"
                  >
                    Posle porudžbine dobijaš podatke za uplatu i IPS QR kod za aplikaciju banke.
                    Paket šaljemo kad uplata stigne na račun.
                  </Izbor>
                ) : null}
              </div>
              {poruka('paymentMethod')}
              <p className="mt-2 font-body text-[13px] text-muted">Plaćanje karticom na sajtu nije dostupno.</p>
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
                : `Poruči · ${formatRsd(pricing.totalRsd)}${uplata ? '' : ' pouzećem'}`}
            </button>

            <p className="font-body text-[13px] leading-relaxed text-muted">
              Klikom na dugme potvrđuješ porudžbinu i prihvataš{' '}
              <Link href="/uslovi-koriscenja" className="text-ink underline underline-offset-2">
                uslove prodaje
              </Link>
              .{' '}
              {uplata
                ? 'Podaci za uplatu i QR kod stižu odmah na sledećoj stranici, zajedno sa potvrdom u PDF-u.'
                : 'Potvrda porudžbine u PDF-u stiže odmah na sledećoj stranici i na tvoj email.'}
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
