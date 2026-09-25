import { isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { buildOrderPdf, orderNumberLabel } from '@/lib/order-pdf';
import { getSellerForPdf } from '@/lib/order-seller';
import { getOrderForReceipt } from '@/lib/order-receipt-server';

/**
 * PDF potvrda porudžbine: /api/porudzbine/<uuid>/potvrda
 * Pristup samo preko tajnog UUID-a — vidi lib/order-receipt-server.ts.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isSupabaseAdminConfigured()) {
    return new Response('Porudžbine nisu podešene na serveru.', { status: 503 });
  }

  const order = await getOrderForReceipt(id);
  if (!order) {
    return new Response('Porudžbina nije pronađena.', { status: 404 });
  }

  const bytes = await buildOrderPdf(order, await getSellerForPdf());

  const broj = orderNumberLabel(order.order_number);
  // ?preuzmi=1 → snimi na disk; bez toga se otvara u pregledaču.
  const preuzmi = new URL(request.url).searchParams.get('preuzmi') === '1';

  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${preuzmi ? 'attachment' : 'inline'}; filename="Sorelle-porudzbina-${broj}.pdf"`,
      // Lični podaci kupca — nikakvo deljeno keširanje.
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
