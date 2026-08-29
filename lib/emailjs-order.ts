import emailjs, { EmailJSResponseStatus } from '@emailjs/nodejs';
import { formatRsd } from '@/lib/price';
import { SITE } from '@/lib/site-config';

const publicKey = process.env.EMAILJS_PUBLIC_KEY?.trim() ?? '';
const privateKey = process.env.EMAILJS_PRIVATE_KEY?.trim() ?? '';
const serviceId = process.env.EMAILJS_SERVICE_ID?.trim() ?? '';
const orderTemplateId = process.env.EMAILJS_ORDER_TEMPLATE_ID?.trim() ?? '';

export function isOrderEmailJsConfigured(): boolean {
  return Boolean(publicKey && serviceId && orderTemplateId);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type OrderEmailPayload = {
  orderId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal: string;
  note: string | null;
  promoCode: string | null;
  lineItems: Array<{ name: string; quantity: number; lineTotalRsd: number }>;
  subtotalRsd: number;
  shippingRsd: number;
  totalRsd: number;
  discountType: 'site' | 'bundle' | null;
  discountPercent: number;
  discountAmountRsd: number;
  promoDiscountPercent: number;
  promoDiscountRsd: number;
};

async function sendOnce(templateParams: Record<string, string>): Promise<void> {
  await emailjs.send(serviceId, orderTemplateId, templateParams, {
    publicKey,
    ...(privateKey ? { privateKey } : {}),
    /** Bez ovoga SDK ume da vrati 429 pri više porudžbina sa iste instance. */
    limitRate: { throttle: 0 },
  });
}

/**
 * Šalje obaveštenje o novoj porudžbini preko EmailJS Node SDK-a.
 * @returns `true` ako je poslato, `false` ako env nije kompletan.
 * @throws Ako EmailJS vrati grešku (porudžbina je već sačuvana u bazi).
 *
 * Napomena: u EmailJS → Account → Security mora biti dozvoljeno slanje van
 * pregledača („Allow non-browser / API requests"), inače stiže 403.
 */
export async function sendOrderNotificationEmail(payload: OrderEmailPayload): Promise<boolean> {
  if (!isOrderEmailJsConfigured()) {
    console.warn(
      '[emailjs-order] Preskačem slanje: nedostaje EMAILJS_PUBLIC_KEY / EMAILJS_SERVICE_ID / EMAILJS_ORDER_TEMPLATE_ID.',
    );
    return false;
  }

  const {
    orderId, firstName, lastName, email, phone, address, city, postal, note,
    promoCode, lineItems, subtotalRsd, shippingRsd, totalRsd,
    discountType, discountPercent, discountAmountRsd,
    promoDiscountPercent, promoDiscountRsd,
  } = payload;

  const line_items_text = lineItems
    .map((l) => `${l.name} × ${l.quantity} — ${formatRsd(l.lineTotalRsd)}`)
    .join('\n');

  const line_items_html = [
    '<table role="presentation" cellpadding="8" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;max-width:480px;font-family:Arial,sans-serif;font-size:14px;color:#171614;">',
    '<thead><tr style="border-bottom:1px solid #D5D1CA;"><th align="left">Proizvod</th><th align="right">Kol.</th><th align="right">Iznos</th></tr></thead><tbody>',
    ...lineItems.map(
      (l) =>
        `<tr><td>${escapeHtml(l.name)}</td><td align="right">${l.quantity}</td><td align="right">${escapeHtml(formatRsd(l.lineTotalRsd))}</td></tr>`,
    ),
    '</tbody></table>',
  ].join('');

  const discount_line =
    discountType && discountPercent > 0
      ? `${discountType === 'bundle' ? 'Paket popust' : 'Popust'} −${discountPercent}% (−${formatRsd(discountAmountRsd)})`
      : '—';

  const promo_line =
    promoDiscountPercent > 0
      ? `Promo kod ${promoCode ?? ''} −${promoDiscountPercent}% (−${formatRsd(promoDiscountRsd)})`
      : '—';

  const template_params: Record<string, string> = {
    order_id: orderId,
    customer_first_name: firstName,
    customer_last_name: lastName,
    customer_full_name: `${firstName} ${lastName}`.trim(),
    customer_email: email,
    customer_phone: phone,
    address_line: address,
    city,
    postal_code: postal,
    full_address: `${address}, ${postal} ${city}`.trim(),
    note: note && note.length > 0 ? note : '—',
    promo_code: promoCode && promoCode.length > 0 ? promoCode : '—',
    line_items_text,
    line_items_html,
    subtotal_rsd: formatRsd(subtotalRsd),
    shipping_rsd: shippingRsd > 0 ? formatRsd(shippingRsd) : 'Besplatno',
    discount_line,
    promo_line,
    total_rsd: formatRsd(totalRsd),
    order_date: new Date().toLocaleString('sr-RS', { dateStyle: 'medium', timeStyle: 'short' }),
    site_name: SITE.brandName,
  };

  try {
    try {
      await sendOnce(template_params);
    } catch (err) {
      if (err instanceof EmailJSResponseStatus && err.status === 429) {
        await new Promise((r) => setTimeout(r, 1500));
        await sendOnce(template_params);
      } else {
        throw err;
      }
    }
  } catch (err) {
    if (err instanceof EmailJSResponseStatus) {
      const hint =
        err.status === 403
          ? ' → Proveri EMAILJS_PRIVATE_KEY i „API access" za ne-browser zahteve u EmailJS → Account → Security.'
          : '';
      console.error(`[emailjs-order] EmailJS ${err.status} za porudžbinu ${orderId}: ${err.text}${hint}`);
      throw new Error(`EmailJS order: ${err.status} ${err.text}`);
    }
    throw err;
  }

  console.info('[emailjs-order] Obaveštenje o porudžbini poslato.', orderId);
  return true;
}
