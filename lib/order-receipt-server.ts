import 'server-only';

import { createAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import type { OrderForPdf } from '@/lib/order-pdf';

/**
 * Porudžbina za potvrdu — i za PDF i za prikaz na zahvalnici.
 *
 * Ključ je UUID porudžbine (122 bita slučajnosti): ne može da se pogodi, pa
 * link radi kao tajni ključ koji imaju samo kupac (zahvalnica, mejl) i admin.
 * Redni broj (1001, 1002…) namerno nikad ne otvara potvrdu — po njemu bi se
 * lako izlistale tuđe adrese i telefoni.
 */

export const ORDER_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COLUMNS =
  'order_number, created_at, customer_first_name, customer_last_name, customer_email, customer_phone, address_line, address_extra, city, municipality, postal_code, note, line_items, subtotal_rsd, shipping_rsd, promo_code, promo_discount_rsd, total_rsd';

/** null = ID nije ispravan, porudžbina ne postoji ili baza nije podešena. */
export async function getOrderForReceipt(id: string): Promise<OrderForPdf | null> {
  if (!ORDER_UUID.test(id) || !isSupabaseAdminConfigured()) return null;

  const { data, error } = await createAdminClient()
    .from('orders')
    .select(COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as OrderForPdf;
}
