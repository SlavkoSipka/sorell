import 'server-only';

import { SITE } from '@/lib/site-config';
import { getSiteUrl } from '@/lib/site-url';
import { getSalonData } from '@/lib/salon-server';
import type { SellerForPdf } from '@/lib/order-pdf';

/**
 * Podaci prodavca za potvrdu porudžbine — isti koje sajt prikazuje na
 * „Kontaktu" i u footeru (naziv, adresa i telefon se menjaju iz admina).
 */
export async function getSellerForPdf(): Promise<SellerForPdf> {
  const salon = await getSalonData();
  return {
    brand: SITE.brandName,
    title: salon.title,
    address: salon.address,
    city: salon.city,
    phone: salon.phone,
    email: SITE.salon.email,
    website: getSiteUrl().replace(/^https?:\/\//, ''),
  };
}
