import Link from 'next/link';
import AdminHeroSlides, { type AdminHeroSlideRow } from '@/components/admin/AdminHeroSlides';
import AdminHomeBanner, { type AdminBannerRow } from '@/components/admin/AdminHomeBanner';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { getLinkOptions } from '@/lib/admin/link-options';
import { requireAdminServer } from '@/lib/supabase/panel-server';

export const dynamic = 'force-dynamic';

/** Redosled sekcija na početnoj, da se u adminu vidi šta je gde. */
const HOME_ORDER = [
  { n: '1', label: 'Slajdovi na vrhu', hint: 'uređuju se ispod' },
  { n: '2', label: 'Baner', hint: 'uređuje se ispod' },
  { n: '3', label: 'Salon', hint: 'kartica Salon', href: '/admin/salon' },
];

export default async function AdminPocetnaPage() {
  const supabase = await requireAdminServer();

  const [{ data: slideRows, error: slidesError }, { data: bannerRow, error: bannerError }, linkOptions] =
    await Promise.all([
      supabase
        .from('hero_slides')
        .select('id, image_url, link_url, alt, sort_order, is_active')
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true }),
      supabase
        .from('site_settings')
        .select(
          'banner_is_active, banner_image_path, banner_title, banner_text, banner_button_label, banner_button_url',
        )
        .eq('id', 1)
        .maybeSingle(),
      getLinkOptions(supabase),
    ]);

  const banner = bannerRow as Partial<AdminBannerRow> | null;

  return (
    <div>
      <AdminPageHeader
        title="Početna strana"
        description="Sve što kupac vidi na početnoj, od vrha naniže. Izmene se na sajtu vide za najviše pola minuta."
        siteHref="/"
      />

      <ol className="mb-6 grid gap-2 sm:grid-cols-3">
        {HOME_ORDER.map((s) => {
          const body = (
            <>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ink font-body text-[11px] tabular-nums text-ink">
                {s.n}
              </span>
              <span className="min-w-0">
                <span className="block font-body text-[14px] text-ink">{s.label}</span>
                <span className="block font-body text-[12px] text-muted">{s.hint}</span>
              </span>
            </>
          );
          return (
            <li key={s.n}>
              {s.href ? (
                <Link
                  href={s.href}
                  className="flex items-center gap-3 border border-dashed border-line-strong px-3 py-2.5 transition-colors hover:border-ink"
                >
                  {body}
                </Link>
              ) : (
                <div className="flex items-center gap-3 border border-line bg-canvas px-3 py-2.5">
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="space-y-6">
        <AdminHeroSlides
          initialSlides={(slideRows ?? []) as AdminHeroSlideRow[]}
          linkOptions={linkOptions}
          // Migracija 0013 nije puštena.
          missing={Boolean(slidesError)}
        />
        <AdminHomeBanner
          initial={{
            banner_is_active: banner?.banner_is_active !== false,
            banner_image_path: banner?.banner_image_path ?? '',
            banner_title: banner?.banner_title ?? '',
            banner_text: banner?.banner_text ?? '',
            banner_button_label: banner?.banner_button_label ?? '',
            banner_button_url: banner?.banner_button_url ?? '',
          }}
          linkOptions={linkOptions}
          // Migracija 0014 nije puštena.
          missing={Boolean(bannerError)}
        />
      </div>
    </div>
  );
}
