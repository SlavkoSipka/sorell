import 'server-only';

import { SITE } from '@/lib/site-config';
import { getSiteUrl } from '@/lib/site-url';
import { getSalonData } from '@/lib/salon-server';
import { getPayee } from '@/lib/payment-server';
import type { SellerForPdf } from '@/lib/order-pdf';

/**
 * Prodavac na potvrdi porudžbine: pravni naziv, sedište, PIB i MB iz admina
 * (kartica Plaćanje), telefon iz kartice Salon. Isti podaci stoje i na nalogu
 * za uplatu, pa se potvrda i uplata uvek slažu.
 */
export async function getSellerForPdf(): Promise<SellerForPdf> {
  const [salon, payee] = await Promise.all([getSalonData(), getPayee()]);
  return {
    brand: SITE.brandName,
    legalName: payee.name,
    address: payee.address,
    city: payee.city,
    pib: payee.pib,
    mb: payee.mb,
    phone: salon.phone,
    email: SITE.salon.email,
    website: getSiteUrl().replace(/^https?:\/\//, ''),
  };
}
