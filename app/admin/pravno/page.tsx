import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminLegalEditor from '@/components/admin/AdminLegalEditor';
import { requireAdminServer } from '@/lib/supabase/panel-server';
import { getLegalValues } from '@/lib/legal-server';

export const dynamic = 'force-dynamic';

export default async function AdminPravnoPage() {
  const supabase = await requireAdminServer();

  const [{ data, error }, values] = await Promise.all([
    supabase.from('site_settings').select('privacy_text, terms_text').eq('id', 1).maybeSingle(),
    getLegalValues(),
  ]);

  const row = data as { privacy_text?: string | null; terms_text?: string | null } | null;

  return (
    <div>
      <AdminPageHeader
        title="Pravni tekstovi"
        description="Politika privatnosti i Uslovi korišćenja. Linkovi ka njima stoje u footeru na svakoj stranici sajta."
        siteHref="/politika-privatnosti"
      />
      <AdminLegalEditor
        initialPrivacy={row?.privacy_text ?? ''}
        initialTerms={row?.terms_text ?? ''}
        values={values}
        // Migracija 0018 nije puštena — editor to tada kaže umesto da pukne.
        missing={Boolean(error)}
      />
    </div>
  );
}
