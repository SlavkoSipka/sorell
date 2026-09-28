import { isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { buildOrderPdf, orderNumberLabel, orderTransfer } from '@/lib/order-pdf';
import { ipsQrPayload } from '@/lib/payment';
import { getPayee } from '@/lib/payment-server';
import { qrPng } from '@/lib/payment-qr';
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

  const [seller, payee] = await Promise.all([getSellerForPdf(), getPayee()]);
  // Uplata na račun: isti QR kod kao na zahvalnici, da može da se plati i sa papira.
  const details = orderTransfer(order, payee);
  const transfer = details ? { details, qrPng: new Uint8Array(await qrPng(ipsQrPayload(details))) } : null;
  const bytes = await buildOrderPdf(order, seller, transfer);

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
