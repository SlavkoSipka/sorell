import 'server-only';

import { DEFAULT_PAYEE, normalizeAccount, type Payee } from '@/lib/payment';

type PayeeRow = {
  payee_name: string | null;
  payee_address: string | null;
  payee_city: string | null;
  payee_account: string | null;
  payee_bank: string | null;
  payee_pib: string | null;
  payee_mb: string | null;
  transfer_enabled: boolean | null;
  vat_enabled: boolean | null;
  vat_rate: number | string | null;
};

export const PAYEE_COLUMNS =
  'payee_name,payee_address,payee_city,payee_account,payee_bank,payee_pib,payee_mb,transfer_enabled,vat_enabled,vat_rate';

/** Red iz baze → podaci primaoca; prazno polje uzima vrednost iz koda. */
export function payeeFromRow(row: Partial<PayeeRow> | null | undefined): Payee {
  const t = (v: string | null | undefined) => (v ?? '').trim();
  const account = normalizeAccount(t(row?.payee_account));
  return {
    name: t(row?.payee_name) || DEFAULT_PAYEE.name,
    address: t(row?.payee_address) || DEFAULT_PAYEE.address,
    city: t(row?.payee_city) || DEFAULT_PAYEE.city,
    account: account || DEFAULT_PAYEE.account,
    bank: t(row?.payee_bank) || DEFAULT_PAYEE.bank,
    pib: t(row?.payee_pib) || DEFAULT_PAYEE.pib,
    mb: t(row?.payee_mb) || DEFAULT_PAYEE.mb,
    transferEnabled: row?.transfer_enabled ?? DEFAULT_PAYEE.transferEnabled,
    vatEnabled: row?.vat_enabled ?? DEFAULT_PAYEE.vatEnabled,
    vatRate: Number.isFinite(Number(row?.vat_rate)) && row?.vat_rate != null ? Number(row.vat_rate) : DEFAULT_PAYEE.vatRate,
  };
}

/**
 * Podaci za uplatu na račun, iz admina (kartica Plaćanje), keš 30 s kao i
 * ostala podešavanja. Bez baze ili migracije 0019 važe vrednosti iz koda.
 */
export async function getPayee(): Promise<Payee> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return DEFAULT_PAYEE;
  try {
    const res = await fetch(`${url}/rest/v1/site_settings?select=${PAYEE_COLUMNS}&id=eq.1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 30 },
    });
    if (!res.ok) return DEFAULT_PAYEE;
    const rows = (await res.json()) as PayeeRow[];
    return payeeFromRow(rows[0]);
  } catch {
    return DEFAULT_PAYEE;
  }
}
