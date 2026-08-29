'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatAmount } from '@/lib/price';
import {
  ORDER_LIST_INITIAL_LIMIT,
  ORDER_LIST_PAGE_SIZE,
  ORDER_SEARCH_LIMIT,
} from '@/lib/supabase/query-limits';
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  formatOrderStatusLabel,
  telHref,
  type OrderStatus,
} from '@/lib/order-status';

export type LineItem = {
  slug?: string;
  name?: string;
  quantity?: number;
  unit_price_rsd?: number;
  line_total_rsd?: number;
};

export type AdminOrderRow = {
  id: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  address_line: string;
  city: string;
  postal_code: string;
  note: string | null;
  admin_notes?: string | null;
  line_items: unknown;
  total_rsd: number | string;
  subtotal_rsd: number | string | null;
  shipping_rsd?: number | string | null;
  discount_type: string | null;
  discount_percent: number | string | null;
  promo_code?: string | null;
  promo_discount_percent?: number | string | null;
  promo_discount_rsd?: number | string | null;
  status: string;
  created_at: string;
};

type Props = {
  initialOrders: AdminOrderRow[];
  initialHasMore: boolean;
  initialStatus?: StatusFilter;
};

type StatusFilter = 'all' | OrderStatus;

/** Iznos proizvoda bez poštarine. */
function productsTotalRsd(o: AdminOrderRow): number {
  const total = Number(o.total_rsd) || 0;
  const shipping = o.shipping_rsd != null ? Number(o.shipping_rsd) : 0;
  return total - shipping;
}

function OrderDetails({ o }: { o: AdminOrderRow }) {
  return (
    <div className="space-y-2 font-body text-[11px] text-muted">
      <p>
        {o.address_line}, {o.postal_code} {o.city}
      </p>
      {o.note ? <p>Napomena kupca: {o.note}</p> : null}

      {Array.isArray(o.line_items) ? (
        <ul className="list-disc space-y-1 pl-4 text-ink">
          {(o.line_items as LineItem[]).map((li, i) => (
            <li key={i}>
              {li.name ?? li.slug} × {li.quantity}
              {li.line_total_rsd != null ? ` — ${formatAmount(Number(li.line_total_rsd))} RSD` : ''}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-2 space-y-1 border-t border-line pt-2">
        {o.subtotal_rsd != null ? (
          <p>
            Pre popusta: <span className="text-ink">{formatAmount(Number(o.subtotal_rsd))} RSD</span>
          </p>
        ) : null}
        {o.discount_type && o.discount_percent != null ? (
          <p>
            {o.discount_type === 'bundle' ? 'Paket' : 'Sajt'} popust:{' '}
            <span className="text-ink">−{Number(o.discount_percent)}%</span>
          </p>
        ) : null}
        {o.promo_code && o.promo_discount_percent != null ? (
          <p>
            Promo <span className="font-mono">{o.promo_code}</span>:{' '}
            <span className="text-ink">
              −{Number(o.promo_discount_percent)}%
              {o.promo_discount_rsd != null ? ` (−${formatAmount(Number(o.promo_discount_rsd))} RSD)` : ''}
            </span>
          </p>
        ) : null}
        <p>
          Poštarina:{' '}
          <span className="text-ink">
            {o.shipping_rsd != null && Number(o.shipping_rsd) > 0
              ? `${formatAmount(Number(o.shipping_rsd))} RSD`
              : 'Besplatno'}
          </span>
        </p>
        <p>
          Naplaćeno ukupno: <span className="text-ink">{formatAmount(Number(o.total_rsd))} RSD</span>
        </p>
      </div>
    </div>
  );
}

function OrderAdminNotesField({
  orderId,
  initial,
  onSaved,
}: {
  orderId: string;
  initial: string | null | undefined;
  onSaved: (id: string, notes: string | null) => void;
}) {
  const [value, setValue] = useState(() => initial ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // Kad se lista ponovo učita (druga porudžbina u istom redu), polje prati novi red.
  const [syncedId, setSyncedId] = useState(orderId);
  if (syncedId !== orderId) {
    setSyncedId(orderId);
    setValue(initial ?? '');
  }

  const save = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const trimmed = value.trim();
    const payload = trimmed === '' ? null : trimmed;
    setSaving(true);
    setSaveError(false);
    const { error } = await supabase.from('orders').update({ admin_notes: payload }).eq('id', orderId);
    setSaving(false);
    if (error) {
      setSaveError(true);
      return;
    }
    onSaved(orderId, payload);
  };

  return (
    <div className="w-full min-w-0 space-y-1">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        rows={4}
        maxLength={8000}
        placeholder="Interne beleške…"
        className="min-h-[5.5rem] w-full resize-y rounded-card border border-line bg-canvas px-2.5 py-2 font-body text-[12px] leading-relaxed text-ink placeholder:text-muted focus:border-ink focus:outline-none"
      />
      <div className="min-h-[14px]">
        {saving ? (
          <span className="font-body text-[10px] text-muted">Čuvanje…</span>
        ) : saveError ? (
          <span className="font-body text-[10px] text-danger">Nije sačuvano. Pokušaj ponovo.</span>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminPorudzbineClient({
  initialOrders,
  initialHasMore,
  initialStatus = 'all',
}: Props) {
  const [orders, setOrders] = useState(initialOrders);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [allLoaded, setAllLoaded] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipFirstFetchRef = useRef(true);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  const fetchOrdersPage = useCallback(
    async (opts: { q: string; offset: number; limit: number }) => {
      const params = new URLSearchParams();
      if (opts.q) params.set('q', opts.q);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (opts.offset > 0) params.set('offset', String(opts.offset));
      params.set('limit', String(opts.limit));

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const text = await res.text();
      if (!text.trim()) throw new Error('Prazan odgovor servera. Pokušaj ponovo.');

      let data: { orders?: AdminOrderRow[]; hasMore?: boolean; error?: string };
      try {
        data = JSON.parse(text) as typeof data;
      } catch {
        throw new Error('Server nije vratio validan odgovor.');
      }

      if (!res.ok) throw new Error(data.error ?? 'Učitavanje nije uspelo.');

      return { rows: data.orders ?? [], hasMore: Boolean(data.hasMore) };
    },
    [statusFilter],
  );

  const fetchOrders = useCallback(
    async (opts: { q: string }) => {
      const { rows, hasMore: more } = await fetchOrdersPage({
        q: opts.q,
        offset: 0,
        limit: ORDER_LIST_INITIAL_LIMIT,
      });
      setOrders(rows);
      setHasMore(more);
    },
    [fetchOrdersPage],
  );

  // Server je poslao nove početne podatke (npr. dolazak sa ?status=…) — lista se resetuje.
  const [syncedInitial, setSyncedInitial] = useState(initialOrders);
  if (syncedInitial !== initialOrders) {
    setSyncedInitial(initialOrders);
    if (!searchQuery) {
      setOrders(initialOrders);
      setHasMore(initialHasMore);
      setAllLoaded(false);
    }
  }

  /**
   * Pretraga i promena filtera idu na server — traži se kroz celu bazu, ne samo kroz
   * već učitanu stranicu. Prvi render preskačemo jer podaci stižu sa servera.
   */
  useEffect(() => {
    if (skipFirstFetchRef.current) {
      skipFirstFetchRef.current = false;
      return;
    }

    let cancelled = false;
    const query = searchQuery;

    void (async () => {
      setFetchError(null);
      setAllLoaded(false);
      if (query) setIsSearching(true);
      try {
        await fetchOrders({ q: query });
      } catch (err) {
        if (!cancelled) {
          setFetchError(
            err instanceof Error ? err.message : query ? 'Pretraga nije uspela.' : 'Učitavanje nije uspelo.',
          );
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchQuery, statusFilter, fetchOrders]);

  const filteredOrders = useMemo(() => {
    if (searchQuery || statusFilter === 'all') return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter, searchQuery]);

  const listedTotalRsd = useMemo(
    () => filteredOrders.reduce((sum, o) => sum + productsTotalRsd(o), 0),
    [filteredOrders],
  );

  const listedTotalLabel = useMemo(() => {
    if (searchQuery) return 'Ukupno (pretraga)';
    if (statusFilter !== 'all') return `Ukupno (${ORDER_STATUS_LABELS[statusFilter]})`;
    return 'Ukupno (prikazano)';
  }, [searchQuery, statusFilter]);

  const loadAll = async () => {
    if (loadingAll || allLoaded) return;
    setLoadingAll(true);
    setFetchError(null);
    try {
      let accumulated = [...orders];
      let offset = orders.length;
      let more = hasMore;
      const batchSize = searchQuery ? ORDER_SEARCH_LIMIT : ORDER_LIST_PAGE_SIZE;
      let batches = 0;
      const maxBatches = 30;

      while (more && batches < maxBatches) {
        const { rows, hasMore: nextHasMore } = await fetchOrdersPage({
          q: searchQuery,
          offset,
          limit: batchSize,
        });
        accumulated = [...accumulated, ...rows];
        offset += rows.length;
        more = nextHasMore && rows.length > 0;
        batches += 1;
        setOrders(accumulated);
        setHasMore(more);
      }

      setAllLoaded(!more);
      if (more) setFetchError('Učitan je maksimum porudžbina. Koristi pretragu za starije.');
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Učitavanje nije uspelo.');
    } finally {
      setLoadingAll(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setUpdating(id);
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    setUpdating(null);
    if (!error) {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    }
  };

  const patchAdminNotes = (id: string, admin_notes: string | null) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, admin_notes } : o)));
  };

  const statusSelect = (o: AdminOrderRow) => (
    <select
      value={o.status}
      disabled={updating === o.id}
      onChange={(e) => updateStatus(o.id, e.target.value)}
      className="w-full rounded-card border border-line bg-canvas px-2 py-1.5 font-body text-[11px] text-ink focus:border-ink focus:outline-none md:max-w-[130px]"
      aria-label="Status porudžbine"
    >
      {Array.from(new Set([...ORDER_STATUSES, o.status])).map((s) => (
        <option key={s} value={s}>
          {formatOrderStatusLabel(s)}
        </option>
      ))}
    </select>
  );

  return (
    <div>
      <h2 className="mb-2 font-display text-[22px] text-ink md:text-[26px]">Porudžbine</h2>
      <p className="mb-5 max-w-[720px] font-body text-[13px] leading-relaxed text-muted">
        Plaćanje je <strong className="font-medium text-ink">pouzećem</strong>. Pretraga ide kroz celu
        bazu — ime, telefon, email, adresa, grad, iznos, promo kod i nazivi proizvoda.
        {!searchQuery && !allLoaded ? (
          <span className="mt-2 block">
            Prikazano poslednjih {orders.length}. Klikni {'„Učitaj sve porudžbine"'} za kompletan
            spisak.
          </span>
        ) : null}
      </p>

      <div className="mb-4 space-y-3">
        <label htmlFor="admin-orders-search" className="sr-only">
          Pretraga porudžbina
        </label>
        <input
          id="admin-orders-search"
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Pretraga: ime, telefon, email, adresa, grad, iznos, proizvod…"
          className="w-full rounded-card border border-line bg-canvas px-3 py-2.5 font-body text-[13px] text-ink placeholder:text-muted focus:border-ink focus:outline-none"
        />
        {isSearching ? <p className="font-body text-[11px] text-muted">Pretraga…</p> : null}
        {fetchError ? (
          <p className="font-body text-[11px] text-danger" role="alert">
            {fetchError}
          </p>
        ) : null}
        {searchQuery && !isSearching ? (
          <p className="font-body text-[11px] text-muted">
            Rezultata: {filteredOrders.length}
            {filteredOrders.length === 0 ? ' — probaj drugi pojam.' : null}
          </p>
        ) : null}
      </div>

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <label
          htmlFor="admin-orders-status"
          className="shrink-0 font-body text-[10px] uppercase tracking-[0.12em] text-muted"
        >
          Status
        </label>
        <select
          id="admin-orders-status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="w-full min-w-[200px] rounded-card border border-line bg-canvas px-3 py-2 font-body text-[12px] text-ink focus:border-ink focus:outline-none sm:w-auto"
        >
          <option value="all">Sve porudžbine</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {filteredOrders.length > 0 ? (
        <div className="mb-5 border border-line bg-canvas px-4 py-3 md:px-5 md:py-4">
          <p className="font-body text-[10px] uppercase tracking-[0.12em] text-muted">{listedTotalLabel}</p>
          <p className="mt-1 font-display text-[22px] tabular-nums text-ink md:text-[26px]">
            {formatAmount(listedTotalRsd)} RSD
          </p>
          <p className="mt-1 font-body text-[11px] text-muted">
            {filteredOrders.length} porudžbina · bez poštarine
            {!allLoaded && hasMore ? ' · nije sve učitano' : null}
          </p>
        </div>
      ) : null}

      {!allLoaded && (hasMore || searchQuery) ? (
        <div className="mb-5">
          <button
            type="button"
            onClick={() => void loadAll()}
            disabled={loadingAll}
            className="rounded-card border border-line bg-canvas px-4 py-2 font-body text-[12px] text-ink hover:border-ink disabled:opacity-50"
          >
            {loadingAll ? 'Učitavanje…' : 'Učitaj sve porudžbine'}
          </button>
        </div>
      ) : null}

      {/* Mobilni prikaz */}
      <div className="space-y-3 md:hidden">
        {filteredOrders.map((o) => (
          <div key={o.id} className="space-y-3 border border-line bg-canvas p-4 font-body text-[12px]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-ink">
                  {o.customer_first_name} {o.customer_last_name}
                </p>
                <p className="mt-0.5 text-[10px] tabular-nums text-muted">
                  {new Date(o.created_at).toLocaleString('sr-RS', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
              <p className="whitespace-nowrap tabular-nums text-ink">
                {formatAmount(productsTotalRsd(o))} RSD
              </p>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
              <a href={telHref(o.customer_phone)} className="text-ink underline underline-offset-2">
                {o.customer_phone}
              </a>
              <a
                href={`mailto:${encodeURIComponent(o.customer_email)}`}
                className="max-w-[200px] truncate text-muted underline underline-offset-2"
              >
                {o.customer_email}
              </a>
            </div>

            <div>{statusSelect(o)}</div>

            <div>
              <p className="mb-1.5 font-body text-[10px] uppercase tracking-[0.1em] text-muted">Beleške</p>
              <OrderAdminNotesField orderId={o.id} initial={o.admin_notes} onSaved={patchAdminNotes} />
            </div>

            <details className="cursor-pointer">
              <summary className="font-body text-[11px] text-ink underline underline-offset-2">
                Adresa i stavke
              </summary>
              <div className="mt-3 max-w-[320px] pl-1">
                <OrderDetails o={o} />
              </div>
            </details>
          </div>
        ))}
      </div>

      {/* Desktop tabela */}
      <div className="hidden overflow-x-auto border border-line bg-canvas md:block">
        <table className="w-full min-w-[1100px] text-left font-body text-[12px]">
          <thead>
            <tr className="border-b border-line bg-surface">
              {['Datum', 'Kupac', 'Kontakt', 'Iznos', 'Promo', 'Status', 'Detalji', 'Beleške'].map((h) => (
                <th
                  key={h}
                  className="px-3 py-3 font-normal text-[10px] uppercase tracking-[0.1em] text-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((o) => (
              <tr key={o.id} className="border-b border-line align-top">
                <td className="whitespace-nowrap px-3 py-3 tabular-nums text-muted">
                  {new Date(o.created_at).toLocaleString('sr-RS', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </td>
                <td className="max-w-[140px] px-3 py-3 text-ink">
                  {o.customer_first_name} {o.customer_last_name}
                </td>
                <td className="max-w-[180px] break-words px-3 py-3 text-muted">
                  <a
                    href={`mailto:${encodeURIComponent(o.customer_email)}`}
                    className="text-ink underline underline-offset-2"
                  >
                    {o.customer_email}
                  </a>
                  <span className="mt-0.5 block">
                    <a href={telHref(o.customer_phone)} className="text-ink underline underline-offset-2">
                      {o.customer_phone}
                    </a>
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums text-ink">
                  {formatAmount(productsTotalRsd(o))} RSD
                </td>
                <td className="px-3 py-3 font-mono text-[11px] text-muted">{o.promo_code ?? '—'}</td>
                <td className="px-3 py-3">{statusSelect(o)}</td>
                <td className="px-3 py-3">
                  <details className="cursor-pointer">
                    <summary className="font-body text-[11px] text-ink underline underline-offset-2">
                      Adresa i stavke
                    </summary>
                    <div className="mt-3 max-w-[320px] pl-1">
                      <OrderDetails o={o} />
                    </div>
                  </details>
                </td>
                <td className="min-w-[220px] max-w-[280px] px-3 py-3 align-top">
                  <OrderAdminNotesField orderId={o.id} initial={o.admin_notes} onSaved={patchAdminNotes} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {orders.length === 0 ? (
        <p className="mt-8 border border-dashed border-line py-12 text-center font-body text-[14px] text-muted">
          Još nema porudžbina.
        </p>
      ) : filteredOrders.length === 0 ? (
        <p className="mt-8 border border-dashed border-line py-12 text-center font-body text-[14px] text-muted">
          {searchQuery ? 'Nema rezultata za tu pretragu.' : 'Nema porudžbina sa izabranim statusom.'}
        </p>
      ) : null}
    </div>
  );
}
