'use client';

import { useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  formatAccount,
  formatVatRate,
  splitVat,
  isValidAccount,
  isValidMb,
  isValidPib,
  normalizeAccount,
  transferRows,
  type Payee,
} from '@/lib/payment';

const input =
  'min-h-[44px] w-full rounded-card border bg-canvas px-3 py-2.5 font-body text-[16px] text-ink placeholder:text-muted focus:outline-none sm:text-[14px]';
const label = 'mb-1.5 block font-body text-[13px] font-semibold text-ink';

type Forma = Omit<Payee, 'transferEnabled' | 'vatEnabled' | 'vatRate'>;

const STOPE = [20, 10];
type Greske = Partial<Record<keyof Forma, string>>;

function proveri(f: Forma): Greske {
  const e: Greske = {};
  if (!f.name.trim()) e.name = 'Upiši naziv primaoca, tačno kao u banci.';
  if (!f.address.trim()) e.address = 'Upiši ulicu i broj sedišta.';
  if (!f.city.trim()) e.city = 'Upiši poštanski broj i mesto.';
  const racun = normalizeAccount(f.account);
  if (!racun) e.account = 'Račun ima 18 cifara, npr. 325-9500700227546-49.';
  else if (!isValidAccount(racun)) e.account = 'Kontrolni broj računa ne odgovara. Proveri cifre.';
  if (f.pib.trim() && !isValidPib(f.pib.trim())) e.pib = 'PIB ima 9 cifara i kontrolnu cifru. Proveri ga.';
  if (f.mb.trim() && !isValidMb(f.mb.trim())) e.mb = 'Matični broj ima 8 cifara.';
  return e;
}

/**
 * Podaci za uplatu na račun: idu na zahvalnicu, u PDF potvrdu i u IPS QR kod.
 * Prekidač isključuje uplatu na sajtu (ostaje samo pouzeće), a podaci ostaju sačuvani.
 */
export default function AdminPaymentSettings({
  initial,
  missing,
}: {
  initial: Payee;
  /** Migracija 0019 nije puštena. */
  missing: boolean;
}) {
  const [forma, setForma] = useState<Forma>({
    name: initial.name,
    address: initial.address,
    city: initial.city,
    account: formatAccount(initial.account),
    bank: initial.bank,
    pib: initial.pib,
    mb: initial.mb,
  });
  const [ukljuceno, setUkljuceno] = useState(initial.transferEnabled);
  const [pdvUkljucen, setPdvUkljucen] = useState(initial.vatEnabled);
  const [stopa, setStopa] = useState(initial.vatRate);
  const [pdvMsg, setPdvMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [greske, setGreske] = useState<Greske>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const postavi = (key: keyof Forma, value: string) => {
    setForma((prev) => ({ ...prev, [key]: value }));
    if (greske[key]) setGreske((prev) => ({ ...prev, [key]: undefined }));
    setMsg(null);
  };

  const racun = normalizeAccount(forma.account);
  const pregled = useMemo(
    () =>
      transferRows({
        payee: {
          ...forma,
          account: racun || forma.account,
          transferEnabled: ukljuceno,
          vatEnabled: pdvUkljucen,
          vatRate: stopa,
        },
        amount: 4290,
        orderNumber: 1024,
        customerType: 'fizicko',
      }),
    [forma, racun, ukljuceno, pdvUkljucen, stopa],
  );
  const primerPdv = splitVat(4290, stopa);

  /** PDV se čuva odmah na klik: prekidač i stopa. */
  const sacuvajPdv = async (enabled: boolean, rate: number) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setBusy(true);
    setPdvMsg(null);
    const { error } = await supabase
      .from('site_settings')
      .update({ vat_enabled: enabled, vat_rate: rate })
      .eq('id', 1);
    setBusy(false);
    if (error) {
      setPdvMsg({ ok: false, text: 'Čuvanje nije uspelo.' });
      return;
    }
    setPdvUkljucen(enabled);
    setStopa(rate);
    setPdvMsg({ ok: true, text: 'Sačuvano. Važi za nove porudžbine.' });
  };

  const sacuvaj = async (opts: { samoPrekidac?: boolean; ukljuceno?: boolean } = {}) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const noviPrekidac = opts.ukljuceno ?? ukljuceno;

    const nadjene = proveri(forma);
    if (!opts.samoPrekidac && Object.values(nadjene).some(Boolean)) {
      setGreske(nadjene);
      setMsg({ ok: false, text: 'Proveri označena polja.' });
      return;
    }
    // Uključivanje uplate sa neispravnim računom bi kupcima dalo pogrešne podatke.
    if (opts.samoPrekidac && noviPrekidac && nadjene.account) {
      setGreske(nadjene);
      setMsg({ ok: false, text: 'Prvo ispravi broj računa, pa uključi uplatu.' });
      return;
    }

    setBusy(true);
    setMsg(null);
    const { error } = await supabase
      .from('site_settings')
      .update(
        opts.samoPrekidac
          ? { transfer_enabled: noviPrekidac }
          : {
              payee_name: forma.name.trim(),
              payee_address: forma.address.trim(),
              payee_city: forma.city.trim(),
              payee_account: racun,
              payee_bank: forma.bank.trim(),
              payee_pib: forma.pib.trim(),
              payee_mb: forma.mb.trim(),
              transfer_enabled: noviPrekidac,
            },
      )
      .eq('id', 1);
    setBusy(false);

    if (error) {
      setMsg({ ok: false, text: 'Čuvanje nije uspelo.' });
      return;
    }
    setUkljuceno(noviPrekidac);
    if (!opts.samoPrekidac) setForma((prev) => ({ ...prev, account: formatAccount(racun) }));
    setMsg({ ok: true, text: 'Sačuvano. Na sajtu se vidi za najviše 30 sekundi.' });
  };

  if (missing) {
    return (
      <section className="border border-line bg-canvas p-5 md:p-6">
        <h3 className="font-display text-[18px] text-ink">Uplata na račun</h3>
        <p className="mt-2 font-body text-[13px] text-danger">
          Pokreni <span className="font-mono">supabase/migrations/0019_firma_i_uplata_na_racun.sql</span>{' '}
          u Supabase SQL Editoru pa osveži stranicu.
        </p>
      </section>
    );
  }

  const polje = (key: keyof Forma, naslov: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className={label} htmlFor={`placanje-${key}`}>
        {naslov}
      </label>
      <input
        id={`placanje-${key}`}
        value={forma[key]}
        onChange={(e) => postavi(key, e.target.value)}
        className={`${input} ${greske[key] ? 'border-danger' : 'border-line focus:border-ink'}`}
        aria-invalid={greske[key] ? true : undefined}
        {...extra}
      />
      {greske[key] ? <p className="mt-1 font-body text-[12px] text-danger">{greske[key]}</p> : null}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ── Prekidač ── */}
      <section className="flex flex-col gap-3 border border-line bg-canvas p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div>
          <h3 className="font-display text-[18px] text-ink">Uplata na račun na sajtu</h3>
          <p className="mt-1 max-w-[520px] font-body text-[13px] leading-relaxed text-muted">
            {ukljuceno
              ? 'Uključeno: kupac na porudžbini bira pouzeće ili uplatu na račun.'
              : 'Isključeno: kupci vide samo plaćanje pouzećem.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={ukljuceno}
          disabled={busy}
          onClick={() => void sacuvaj({ samoPrekidac: true, ukljuceno: !ukljuceno })}
          className={`inline-flex min-h-[44px] shrink-0 items-center gap-3 rounded-card border px-4 font-body text-[13px] font-semibold transition-colors disabled:opacity-50 ${
            ukljuceno ? 'border-ink bg-ink text-canvas' : 'border-line-strong text-ink hover:border-ink'
          }`}
        >
          <span
            aria-hidden
            className={`relative h-5 w-9 rounded-full transition-colors ${ukljuceno ? 'bg-canvas' : 'bg-line-strong'}`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${
                ukljuceno ? 'left-[18px] bg-ink' : 'left-0.5 bg-canvas'
              }`}
            />
          </span>
          {ukljuceno ? 'Uključeno' : 'Isključeno'}
        </button>
      </section>

      {/* ── Podaci primaoca ── */}
      <section className="border border-line bg-canvas p-5 md:p-6">
        <h3 className="font-display text-[18px] text-ink">Podaci za uplatu</h3>
        <p className="mt-1.5 max-w-[680px] font-body text-[13px] leading-relaxed text-muted">
          Ovi podaci stoje na zahvalnici, u PDF potvrdi i u IPS QR kodu koji kupac skenira u
          aplikaciji banke. Naziv i račun upiši tačno kao u banci. PIB i matični broj su opcioni i
          prikazuju se na potvrdi kao podaci prodavca.
        </p>

        <div className="mt-5 grid gap-4">
          {polje('name', 'Naziv primaoca', { placeholder: 'Ime Prezime PR Naziv radnje' })}
          <div className="grid gap-4 sm:grid-cols-2">
            {polje('address', 'Ulica i broj sedišta')}
            {polje('city', 'Poštanski broj i mesto', { placeholder: '11500 Obrenovac' })}
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            {polje('account', 'Tekući račun', {
              inputMode: 'numeric',
              placeholder: '325-9500700227546-49',
              onBlur: () => {
                if (racun) setForma((prev) => ({ ...prev, account: formatAccount(racun) }));
              },
            })}
            {polje('bank', 'Banka', { placeholder: 'OTP banka' })}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {polje('pib', 'PIB prodavca (opciono)', { inputMode: 'numeric', maxLength: 9 })}
            {polje('mb', 'Matični broj prodavca (opciono)', { inputMode: 'numeric', maxLength: 8 })}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void sacuvaj()}
            className="min-h-[44px] rounded-card border border-ink bg-ink px-5 font-body text-[13px] font-semibold uppercase tracking-[0.1em] text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50"
          >
            {busy ? 'Čuvam…' : 'Sačuvaj'}
          </button>
          {msg ? (
            <p className={`font-body text-[13px] ${msg.ok ? 'text-ink' : 'text-danger'}`} role="status">
              {msg.text}
            </p>
          ) : null}
        </div>
      </section>

      {/* ── PDV ── */}
      <section className="border border-line bg-canvas p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-display text-[18px] text-ink">PDV na potvrdi</h3>
            <p className="mt-1 max-w-[560px] font-body text-[13px] leading-relaxed text-muted">
              Cene na sajtu su sa PDV-om. Kad je uključeno, potvrda, zahvalnica i mejl pokazuju
              osnovicu i iznos PDV-a uračunat u cenu. Uključi samo ako je prodavac u sistemu PDV-a.
              Ako nije, isključi: tada na potvrdi piše da PDV nije obračunat.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={pdvUkljucen}
            disabled={busy}
            onClick={() => void sacuvajPdv(!pdvUkljucen, stopa)}
            className={`inline-flex min-h-[44px] shrink-0 items-center gap-3 rounded-card border px-4 font-body text-[13px] font-semibold transition-colors disabled:opacity-50 ${
              pdvUkljucen ? 'border-ink bg-ink text-canvas' : 'border-line-strong text-ink hover:border-ink'
            }`}
          >
            {pdvUkljucen ? 'U sistemu PDV-a' : 'Nije u sistemu PDV-a'}
          </button>
        </div>

        {pdvUkljucen ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="font-body text-[13px] font-semibold text-ink">Stopa:</span>
            {STOPE.map((r) => (
              <button
                key={r}
                type="button"
                disabled={busy}
                onClick={() => void sacuvajPdv(true, r)}
                aria-pressed={stopa === r}
                className={`min-h-[40px] rounded-card border px-4 font-body text-[13px] transition-colors disabled:opacity-50 ${
                  stopa === r ? 'border-ink bg-ink text-canvas' : 'border-line-strong text-ink hover:border-ink'
                }`}
              >
                {r}%
              </button>
            ))}
            <span className="font-body text-[12px] text-muted">
              Primer: od 4.290 RSD, PDV {formatVatRate(primerPdv.rate)}% je{' '}
              {primerPdv.vat.toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD.
            </span>
          </div>
        ) : null}
        {pdvMsg ? (
          <p className={`mt-3 font-body text-[13px] ${pdvMsg.ok ? 'text-ink' : 'text-danger'}`} role="status">
            {pdvMsg.text}
          </p>
        ) : null}
      </section>

      {/* ── Pregled ── */}
      <section className="border border-dashed border-line-strong bg-surface p-5 md:p-6">
        <h3 className="font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Ovako kupac vidi podatke (primer porudžbine br. 1024)
        </h3>
        <dl className="mt-3 grid gap-x-6 gap-y-1.5 font-body text-[13px] sm:grid-cols-[160px_1fr]">
          {pregled.map((r) => (
            <div key={r.label} className="contents">
              <dt className="text-muted">{r.label}</dt>
              <dd className="text-ink">{r.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
