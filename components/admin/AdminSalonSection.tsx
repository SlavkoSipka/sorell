'use client';

import { useMemo, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  ACCEPTED_IMAGE_TYPES,
  SALON_HEIGHT,
  SALON_RATIO,
  processImage,
  rejectReason,
  removeImage,
  uploadProcessed,
} from '@/lib/admin/images';

export type AdminServiceGroupRow = {
  slug: string;
  title: string;
  intro: string;
  sort_order: number | null;
};

export type AdminServiceRow = {
  id: number;
  group_slug: string;
  name: string;
  description: string;
  duration_minutes: number | null;
  price_rsd: number | string | null;
  sort_order: number | null;
};

type Props = {
  initialImage: string;
  initialPhone: string;
  initialTitle: string;
  initialIntro: string;
  initialAddress: string;
  initialCity: string;
  initialGroups: AdminServiceGroupRow[];
  initialServices: AdminServiceRow[];
  /** Migracija 0010 nije puštena — sekcija tada samo kaže šta da se uradi. */
  missing: boolean;
};

/** Naziv grupe → slug, jer je slug primarni ključ i ne menja se posle. */
function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/č|ć/g, 'c')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

function parseNumber(raw: string): number | null {
  const v = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(v) && v >= 0 ? v : null;
}

const INPUT =
  'w-full rounded-card border border-line bg-canvas px-3 py-2.5 font-body text-[14px] text-ink focus:border-ink focus:outline-none';
const LABEL = 'mb-1.5 block font-body text-[11px] uppercase tracking-[0.12em] text-muted';

export default function AdminSalonSection({
  initialImage,
  initialPhone,
  initialTitle,
  initialIntro,
  initialAddress,
  initialCity,
  initialGroups,
  initialServices,
  missing,
}: Props) {
  const [image, setImage] = useState(initialImage);
  const [phone, setPhone] = useState(initialPhone);
  const [title, setTitle] = useState(initialTitle);
  const [intro, setIntro] = useState(initialIntro);
  const [address, setAddress] = useState(initialAddress);
  const [city, setCity] = useState(initialCity);
  const [groups, setGroups] = useState(initialGroups);
  const [services, setServices] = useState(initialServices);
  const [newGroup, setNewGroup] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const byGroup = useMemo(() => {
    const map = new Map<string, AdminServiceRow[]>();
    for (const s of services) {
      const list = map.get(s.group_slug) ?? [];
      list.push(s);
      map.set(s.group_slug, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id);
    }
    return map;
  }, [services]);

  const client = () => getSupabaseBrowserClient();

  // ── Slika ───────────────────────────────────────────────────────

  const saveImage = async (next: string) => {
    const supabase = client();
    if (!supabase) return;
    setBusy(true);
    setMsg(null);

    const previous = image;
    const { error } = await supabase
      .from('site_settings')
      .update({ salon_image_path: next })
      .eq('id', 1);
    setBusy(false);

    if (error) {
      setMsg({ ok: false, text: 'Čuvanje fotografije nije uspelo.' });
      return;
    }
    if (previous && previous !== next) await removeImage(supabase, previous);
    setImage(next);
    setMsg({ ok: true, text: next ? 'Fotografija salona je sačuvana.' : 'Fotografija je uklonjena.' });
  };

  const pickImage = async (file: File) => {
    const reason = rejectReason(file);
    if (reason) {
      setMsg({ ok: false, text: reason });
      return;
    }
    const supabase = client();
    if (!supabase) return;

    setBusy(true);
    setMsg(null);
    // Salon stoji u širem okviru nego proizvodi — 3:2 umesto 4:5.
    const processed = await processImage(file, SALON_RATIO, SALON_HEIGHT);
    if (!processed) {
      setBusy(false);
      setMsg({ ok: false, text: 'Sliku nije moguće otvoriti. Sačuvaj je kao JPG pa pokušaj ponovo.' });
      return;
    }
    const url = await uploadProcessed(supabase, '_salon', processed);
    if (!url) {
      setBusy(false);
      setMsg({ ok: false, text: 'Slanje slike nije uspelo.' });
      return;
    }
    await saveImage(url);
  };

  // ── Tekst i telefon ─────────────────────────────────────────────

  const saveHeader = async () => {
    const supabase = client();
    if (!supabase) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase
      .from('site_settings')
      .update({
        salon_phone: phone.trim(),
        salon_title: title.trim(),
        salon_intro: intro.trim(),
        salon_address: address.trim(),
        salon_city: city.trim(),
      })
      .eq('id', 1);
    setBusy(false);
    setMsg(
      error
        ? { ok: false, text: 'Čuvanje nije uspelo.' }
        : { ok: true, text: 'Sačuvano.' },
    );
  };

  // ── Grupe ───────────────────────────────────────────────────────

  const addGroup = async () => {
    const name = newGroup.trim();
    if (name.length < 2) {
      setMsg({ ok: false, text: 'Naziv grupe mora imati bar 2 znaka.' });
      return;
    }
    const slug = toSlug(name);
    if (!slug) {
      setMsg({ ok: false, text: 'Naziv grupe mora imati bar jedno slovo ili broj.' });
      return;
    }
    if (groups.some((g) => g.slug === slug)) {
      setMsg({ ok: false, text: 'Grupa sa tim nazivom već postoji.' });
      return;
    }

    const supabase = client();
    if (!supabase) return;
    setBusy(true);
    setMsg(null);
    const { data, error } = await supabase
      .from('service_groups')
      .insert({
        slug,
        title: name,
        intro: '',
        sort_order: groups.reduce((m, g) => Math.max(m, g.sort_order ?? 0), 0) + 1,
      })
      .select('slug, title, intro, sort_order')
      .single();
    setBusy(false);

    if (error || !data) {
      setMsg({ ok: false, text: 'Dodavanje grupe nije uspelo.' });
      return;
    }
    setGroups((prev) => [...prev, data as AdminServiceGroupRow]);
    setNewGroup('');
  };

  const saveGroup = async (slug: string) => {
    const group = groups.find((g) => g.slug === slug);
    if (!group) return;
    const supabase = client();
    if (!supabase) return;

    setBusy(true);
    setMsg(null);
    const { error } = await supabase
      .from('service_groups')
      .update({ title: group.title.trim(), intro: group.intro.trim() })
      .eq('slug', slug);
    setBusy(false);
    setMsg(
      error ? { ok: false, text: 'Grupa nije sačuvana.' } : { ok: true, text: 'Grupa je sačuvana.' },
    );
  };

  const deleteGroup = async (slug: string) => {
    if (!window.confirm('Obrisati celu grupu sa svim uslugama u njoj?')) return;
    const supabase = client();
    if (!supabase) return;

    setBusy(true);
    const { error } = await supabase.from('service_groups').delete().eq('slug', slug);
    setBusy(false);
    if (error) {
      setMsg({ ok: false, text: 'Brisanje grupe nije uspelo.' });
      return;
    }
    setGroups((prev) => prev.filter((g) => g.slug !== slug));
    setServices((prev) => prev.filter((s) => s.group_slug !== slug));
  };

  // ── Usluge ──────────────────────────────────────────────────────

  const addService = async (groupSlug: string) => {
    const supabase = client();
    if (!supabase) return;
    const list = byGroup.get(groupSlug) ?? [];

    setBusy(true);
    setMsg(null);
    const { data, error } = await supabase
      .from('services')
      .insert({
        group_slug: groupSlug,
        name: 'Nova usluga',
        description: '',
        duration_minutes: null,
        price_rsd: null,
        sort_order: list.reduce((m, s) => Math.max(m, s.sort_order ?? 0), 0) + 1,
      })
      .select('id, group_slug, name, description, duration_minutes, price_rsd, sort_order')
      .single();
    setBusy(false);

    if (error || !data) {
      setMsg({ ok: false, text: 'Dodavanje usluge nije uspelo.' });
      return;
    }
    setServices((prev) => [...prev, data as AdminServiceRow]);
  };

  const saveService = async (id: number) => {
    const row = services.find((s) => s.id === id);
    if (!row) return;
    if (row.name.trim() === '') {
      setMsg({ ok: false, text: 'Usluga mora imati naziv.' });
      return;
    }
    const supabase = client();
    if (!supabase) return;

    setBusy(true);
    setMsg(null);
    const { error } = await supabase
      .from('services')
      .update({
        name: row.name.trim(),
        description: row.description.trim(),
        duration_minutes:
          row.duration_minutes == null || Number(row.duration_minutes) <= 0
            ? null
            : Math.round(Number(row.duration_minutes)),
        price_rsd: row.price_rsd == null || row.price_rsd === '' ? null : Number(row.price_rsd),
      })
      .eq('id', id);
    setBusy(false);
    setMsg(
      error
        ? { ok: false, text: 'Usluga nije sačuvana.' }
        : { ok: true, text: 'Usluga je sačuvana.' },
    );
  };

  const deleteService = async (id: number) => {
    if (!window.confirm('Obrisati ovu uslugu?')) return;
    const supabase = client();
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.from('services').delete().eq('id', id);
    setBusy(false);
    if (error) {
      setMsg({ ok: false, text: 'Brisanje nije uspelo.' });
      return;
    }
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const patchService = (id: number, next: Partial<AdminServiceRow>) =>
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...next } : s)));

  if (missing) {
    return (
      <section className="border border-line bg-canvas p-5 md:p-6">
        <h3 className="font-display text-[18px] text-ink">Salon i cenovnik</h3>
        <p className="mt-2 font-body text-[13px] leading-relaxed text-danger">
          Baza još nema tabele cenovnika. Pokreni{' '}
          <span className="font-mono">supabase/migrations/0010_salon_cenovnik.sql</span> u Supabase
          SQL Editoru pa osveži stranicu.
        </p>
      </section>
    );
  }

  return (
    <section className="border border-line bg-canvas p-5 md:p-6">
      <h3 className="font-display text-[18px] text-ink">Salon i cenovnik</h3>
      <p className="mt-1.5 max-w-[680px] font-body text-[13px] leading-relaxed text-muted">
        Sve odavde ide na stranicu {'„Usluge"'} i u sekciju salona na početnoj — fotografija,
        naslov, uvodni tekst, broj telefona i ceo cenovnik.
      </p>

      {/* ── Fotografija ── */}
      <div className="mt-6 flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-start">
        <div className="relative aspect-[3/2] w-full max-w-[220px] shrink-0 overflow-hidden border border-line bg-surface-2">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center px-3 text-center font-body text-[11px] uppercase tracking-[0.14em] text-muted">
              Nema fotografije
            </div>
          )}
        </div>

        <div className="flex-1">
          <p className={LABEL}>Fotografija salona</p>
          <p className="mb-3 font-body text-[13px] leading-relaxed text-muted">
            Okači je kakva jeste — sama se iseca na 3:2 iz sredine i smanjuje.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void pickImage(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="w-full rounded-card border border-ink bg-ink px-5 py-3 font-body text-[12px] uppercase tracking-[0.12em] text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50 sm:w-auto"
          >
            {busy ? 'Šaljem…' : image ? 'Zameni fotografiju' : 'Dodaj fotografiju'}
          </button>
          {image ? (
            <button
              type="button"
              onClick={() => void saveImage('')}
              disabled={busy}
              className="mt-2 block w-full rounded-card border border-line px-5 py-3 font-body text-[12px] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-50 sm:w-auto"
            >
              Ukloni fotografiju
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Naslov, uvod, telefon ── */}
      <div className="mt-6 grid gap-4 border-t border-line pt-5 md:grid-cols-2">
        <div>
          <label htmlFor="salon-title" className={LABEL}>
            Naslov sekcije
          </label>
          <input
            id="salon-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Kozmetički salon"
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="salon-phone" className={LABEL}>
            Telefon za zakazivanje
          </label>
          <input
            id="salon-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="069 251 0146"
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="salon-address" className={LABEL}>
            Ulica i broj
          </label>
          <input
            id="salon-address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Vojvode Mišića 166В"
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="salon-city" className={LABEL}>
            Poštanski broj i grad
          </label>
          <input
            id="salon-city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="11500 Obrenovac"
            className={INPUT}
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="salon-intro" className={LABEL}>
            Uvodni tekst
          </label>
          <textarea
            id="salon-intro"
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            rows={3}
            placeholder="Nekoliko rečenica o salonu i tretmanima."
            className={`${INPUT} resize-y`}
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="button"
            onClick={() => void saveHeader()}
            disabled={busy}
            className="w-full rounded-card border border-ink bg-ink px-5 py-3 font-body text-[12px] uppercase tracking-[0.12em] text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50 sm:w-auto"
          >
            Sačuvaj naslov, adresu, uvod i telefon
          </button>
        </div>
      </div>

      {/* ── Cenovnik ── */}
      <div className="mt-8 border-t border-line pt-5">
        <p className="font-body text-[11px] uppercase tracking-[0.12em] text-muted">Cenovnik</p>

        {groups.length === 0 ? (
          <p className="mt-4 border border-dashed border-line py-6 text-center font-body text-[13px] text-muted">
            Nema nijedne grupe.
          </p>
        ) : null}

        {groups.map((g) => {
          const list = byGroup.get(g.slug) ?? [];
          return (
            <div key={g.slug} className="mt-5 border border-line p-4 md:p-5">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label htmlFor={`grp-t-${g.slug}`} className={LABEL}>
                    Naziv grupe
                  </label>
                  <input
                    id={`grp-t-${g.slug}`}
                    type="text"
                    value={g.title}
                    onChange={(e) =>
                      setGroups((prev) =>
                        prev.map((x) => (x.slug === g.slug ? { ...x, title: e.target.value } : x)),
                      )
                    }
                    className={INPUT}
                  />
                </div>
                <div>
                  <label htmlFor={`grp-i-${g.slug}`} className={LABEL}>
                    Uvod grupe
                  </label>
                  <input
                    id={`grp-i-${g.slug}`}
                    type="text"
                    value={g.intro}
                    onChange={(e) =>
                      setGroups((prev) =>
                        prev.map((x) => (x.slug === g.slug ? { ...x, intro: e.target.value } : x)),
                      )
                    }
                    className={INPUT}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void saveGroup(g.slug)}
                  disabled={busy}
                  className="rounded-card border border-ink px-4 py-2 font-body text-[12px] text-ink transition-colors hover:bg-ink hover:text-canvas disabled:opacity-50"
                >
                  Sačuvaj grupu
                </button>
                <button
                  type="button"
                  onClick={() => void deleteGroup(g.slug)}
                  disabled={busy}
                  className="font-body text-[12px] text-muted underline underline-offset-2 hover:text-danger disabled:opacity-50"
                >
                  Obriši grupu
                </button>
              </div>

              <ul className="mt-4 space-y-3">
                {list.map((s) => (
                  <li key={s.id} className="border-t border-line pt-3">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px_130px]">
                      <div>
                        <label htmlFor={`svc-n-${s.id}`} className={LABEL}>
                          Usluga
                        </label>
                        <input
                          id={`svc-n-${s.id}`}
                          type="text"
                          value={s.name}
                          onChange={(e) => patchService(s.id, { name: e.target.value })}
                          className={INPUT}
                        />
                      </div>
                      <div>
                        <label htmlFor={`svc-d-${s.id}`} className={LABEL}>
                          Minuta
                        </label>
                        <input
                          id={`svc-d-${s.id}`}
                          type="text"
                          inputMode="numeric"
                          value={s.duration_minutes == null ? '' : String(s.duration_minutes)}
                          onChange={(e) =>
                            patchService(s.id, {
                              duration_minutes:
                                e.target.value.trim() === ''
                                  ? null
                                  : (parseNumber(e.target.value) ?? null),
                            })
                          }
                          placeholder="—"
                          className={`${INPUT} tabular-nums`}
                        />
                      </div>
                      <div>
                        <label htmlFor={`svc-p-${s.id}`} className={LABEL}>
                          Cena (RSD)
                        </label>
                        <input
                          id={`svc-p-${s.id}`}
                          type="text"
                          inputMode="decimal"
                          value={s.price_rsd == null ? '' : String(s.price_rsd)}
                          onChange={(e) =>
                            patchService(s.id, {
                              price_rsd:
                                e.target.value.trim() === ''
                                  ? null
                                  : (parseNumber(e.target.value) ?? null),
                            })
                          }
                          placeholder="na upit"
                          className={`${INPUT} tabular-nums`}
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <label htmlFor={`svc-o-${s.id}`} className={LABEL}>
                        Kratak opis (može prazno)
                      </label>
                      <input
                        id={`svc-o-${s.id}`}
                        type="text"
                        value={s.description}
                        onChange={(e) => patchService(s.id, { description: e.target.value })}
                        className={INPUT}
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={() => void saveService(s.id)}
                        disabled={busy}
                        className="rounded-card border border-ink px-4 py-2 font-body text-[12px] text-ink transition-colors hover:bg-ink hover:text-canvas disabled:opacity-50"
                      >
                        Sačuvaj uslugu
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteService(s.id)}
                        disabled={busy}
                        className="font-body text-[12px] text-muted underline underline-offset-2 hover:text-danger disabled:opacity-50"
                      >
                        Obriši
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => void addService(g.slug)}
                disabled={busy}
                className="mt-4 min-h-[44px] w-full rounded-card border border-line-strong px-4 font-body text-[12px] uppercase tracking-[0.1em] text-ink transition-colors hover:border-ink disabled:opacity-50 sm:w-auto"
              >
                Dodaj uslugu u ovu grupu
              </button>
            </div>
          );
        })}

        <div className="mt-6 grid gap-2 border-t border-line pt-5 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label htmlFor="new-group" className={LABEL}>
              Nova grupa
            </label>
            <input
              id="new-group"
              type="text"
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              placeholder="npr. Manikir"
              className={INPUT}
            />
          </div>
          <button
            type="button"
            onClick={() => void addGroup()}
            disabled={busy}
            className="min-h-[44px] rounded-card border border-ink bg-ink px-5 font-body text-[12px] uppercase tracking-[0.12em] text-canvas transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50"
          >
            Dodaj grupu
          </button>
        </div>
      </div>

      {msg ? (
        <p className={`mt-4 font-body text-[13px] ${msg.ok ? 'text-accent' : 'text-danger'}`}>
          {msg.text}
        </p>
      ) : null}
    </section>
  );
}
