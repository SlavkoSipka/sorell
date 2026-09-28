import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminPaymentSettings from '@/components/admin/AdminPaymentSettings';
import { requireAdminServer } from '@/lib/supabase/panel-server';
import { PAYEE_COLUMNS, payeeFromRow } from '@/lib/payment-server';

export const dynamic = 'force-dynamic';

export default async function AdminPlacanjePage() {
  const supabase = await requireAdminServer();
  const { data, error } = await supabase.from('site_settings').select(PAYEE_COLUMNS).eq('id', 1).maybeSingle();

  return (
    <div>
      <AdminPageHeader
        title="Plaćanje"
        description="Pored pouzeća, kupci mogu da plate uplatom na račun: posle porudžbine dobijaju podatke za nalog i IPS QR kod."
      />
      <AdminPaymentSettings
        initial={payeeFromRow(data as Parameters<typeof payeeFromRow>[0])}
        // Migracija 0019 nije puštena: kartica to kaže umesto da pukne.
        missing={Boolean(error)}
      />
    </div>
  );
}
