import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSalonSection, {
  type AdminServiceGroupRow,
  type AdminServiceRow,
} from '@/components/admin/AdminSalonSection';
import { requireAdminServer } from '@/lib/supabase/panel-server';

export const dynamic = 'force-dynamic';

export default async function AdminSalonPage() {
  const supabase = await requireAdminServer();

  const [
    { data: salonRow, error: salonError },
    { data: serviceGroups, error: groupsError },
    { data: serviceRows },
  ] = await Promise.all([
    supabase
      .from('site_settings')
      .select('salon_image_path, salon_phone, salon_title, salon_intro, salon_address, salon_city')
      .eq('id', 1)
      .maybeSingle(),
    supabase
      .from('service_groups')
      .select('slug, title, intro, sort_order')
      .order('sort_order', { ascending: true })
      .order('slug', { ascending: true }),
    supabase
      .from('services')
      .select('id, group_slug, name, description, duration_minutes, price_rsd, sort_order')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true }),
  ]);

  const salon = salonRow as {
    salon_image_path?: string | null;
    salon_phone?: string | null;
    salon_title?: string | null;
    salon_intro?: string | null;
    salon_address?: string | null;
    salon_city?: string | null;
  } | null;

  return (
    <div>
      <AdminPageHeader
        title="Salon"
        description={
          'Fotografija, kontakt i cenovnik usluga. Prikazuje se na stranici „Usluge", u sekciji salona na početnoj i na stranici „Kontakt".'
        }
        siteHref="/usluge"
      />
      <AdminSalonSection
        initialImage={salon?.salon_image_path ?? ''}
        initialPhone={salon?.salon_phone ?? ''}
        initialTitle={salon?.salon_title ?? ''}
        initialIntro={salon?.salon_intro ?? ''}
        initialAddress={salon?.salon_address ?? ''}
        initialCity={salon?.salon_city ?? ''}
        initialGroups={(serviceGroups ?? []) as AdminServiceGroupRow[]}
        initialServices={(serviceRows ?? []) as AdminServiceRow[]}
        // Migracija 0010 nije puštena, pa sekcija to kaže.
        missing={Boolean(salonError || groupsError)}
      />
    </div>
  );
}
