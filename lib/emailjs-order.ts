import emailjs, { EmailJSResponseStatus } from '@emailjs/nodejs';
import { formatRsd } from '@/lib/price';
import { SITE } from '@/lib/site-config';
import {
  PAYMENT_LABELS,
  formatVatRate,
  orderVatRate,
  splitVat,
  transferRows,
  type CustomerType,
  type Payee,
  type PaymentMethod,
} from '@/lib/payment';

/**
 * Javni ključ, servis i šablon nisu tajne — javni ključ je po EmailJS-u
 * namenjen za pregledač, a ID-jevi ništa ne otvaraju bez njega. Zato stoje
 * ovde i mejl radi na svakom hostingu bez podešavanja; env ih po potrebi
 * pregazi (npr. drugi nalog za probu).
 *
 * Privatni ključ JESTE tajna i ne sme u kod — repozitorijum je javan.
 * Čita se samo iz env-a; bez njega slanje radi dok je u EmailJS-u isključeno
 * „Use Private Key".
 */
const publicKey = process.env.EMAILJS_PUBLIC_KEY?.trim() || 'kgriFhtObeYOdyGE9';
const privateKey = process.env.EMAILJS_PRIVATE_KEY?.trim() ?? '';
const serviceId = process.env.EMAILJS_SERVICE_ID?.trim() || 'service_qktcm9w';
const orderTemplateId = process.env.EMAILJS_ORDER_TEMPLATE_ID?.trim() || 'template_q080t3p';

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
  /** Čitljiv broj za kupca (1001…); prazno kod starih porudžbina. */
  orderNumber: string;
  /** Link ka PDF potvrdi — ide u mejl kao dugme/link. */
  receiptUrl: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  addressExtra: string;
  city: string;
  municipality: string;
  postal: string;
  note: string | null;
  customerType: CustomerType;
  companyName: string;
  companyPib: string;
  companyMb: string;
  companyAddress: string;
  paymentMethod: PaymentMethod;
  payee: Payee;
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
    orderId, orderNumber, receiptUrl, firstName, lastName, email, phone, address, addressExtra,
    city, municipality, postal, note,
    customerType, companyName, companyPib, companyMb, companyAddress, paymentMethod, payee,
    promoCode, lineItems, subtotalRsd, shippingRsd, totalRsd,
    discountType, discountPercent, discountAmountRsd,
    promoDiscountPercent, promoDiscountRsd,
  } = payload;

  const line_items_text = lineItems
    .map((l) => `${l.name} × ${l.quantity} — ${formatRsd(l.lineTotalRsd)}`)
    .join('\n');

  const line_items_html = [
    '<table role="presentation" cellpadding="8" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:14px;color:#171614;">',
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
      : 'nema';

  const promo_line =
    promoDiscountPercent > 0
      ? `Promo kod ${promoCode ?? ''} −${promoDiscountPercent}% (−${formatRsd(promoDiscountRsd)})`
      : 'nema';

  const box =
    'background:#faf9f7;border:1px solid #e7e4df;padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:#171614;';
  const naslov =
    'margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:#6e6a63;';

  // Firma: naziv, PIB, MB i sedište, za račun na firmu.
  const company_html =
    customerType === 'firma'
      ? `<div style="padding-top:24px;"><p style="${naslov}">Porudžbina na firmu</p><div style="${box}"><strong>${escapeHtml(companyName)}</strong><br>PIB: <strong>${escapeHtml(companyPib)}</strong><br>Matični broj: ${escapeHtml(companyMb)}<br>Sedište: ${escapeHtml(companyAddress)}</div></div>`
      : '';

  // Uplata na račun: podaci po kojima kupac plaća, da se uplata lako upari.
  const payment_html =
    paymentMethod === 'uplata'
      ? `<div style="padding-top:24px;"><p style="${naslov}">Uplata na račun</p><div style="${box}">${transferRows({
          payee,
          amount: totalRsd,
          orderNumber: orderNumber || orderId.slice(0, 8),
          customerType,
        })
          .filter((r) => r.label !== 'Primalac' && r.label !== 'Banka')
          .map((r) => `${escapeHtml(r.label)}: <strong>${escapeHtml(r.value)}</strong>`)
          .join('<br>')}<br><span style="color:#6e6a63;font-size:13px;">Paket se šalje kad uplata stigne na račun.</span></div></div>`
      : '';

  // PDV uračunat u cenu (ili napomena da prodavac nije u sistemu PDV-a).
  const stopa = orderVatRate(payee);
  const pdv = stopa > 0 ? splitVat(totalRsd, stopa) : null;
  const vat_line = pdv
    ? `PDV ${formatVatRate(pdv.rate)}% uračunat: ${formatRsd(pdv.vat)} (osnovica ${formatRsd(pdv.base)})`
    : 'Prodavac nije u sistemu PDV-a, PDV nije obračunat.';

  const template_params: Record<string, string> = {
    order_id: orderId,
    order_number: orderNumber || orderId.slice(0, 8),
    receipt_url: receiptUrl,
    // Dugme u mejlu vodi pravo na spisak porudžbina u adminu.
    admin_orders_url: receiptUrl.replace(/\/api\/porudzbine\/.*$/, '/admin/porudzbine'),
    // tel: link — na telefonu jedan dodir zove kupca.
    customer_phone_href: 'tel:' + phone.replace(/[^\d+]/g, ''),
    municipality,
    address_extra: addressExtra || '',
    customer_first_name: firstName,
    customer_last_name: lastName,
    customer_full_name: `${firstName} ${lastName}`.trim(),
    customer_email: email,
    customer_phone: phone,
    address_line: address,
    city,
    postal_code: postal,
    full_address: [
      address,
      addressExtra,
      `${postal} ${city}`.trim(),
      municipality ? `opština ${municipality}` : '',
    ]
      .filter(Boolean)
      .join(', '),
    note: note && note.length > 0 ? note : 'nema',
    promo_code: promoCode && promoCode.length > 0 ? promoCode : 'nema',
    line_items_text,
    line_items_html,
    subtotal_rsd: formatRsd(subtotalRsd),
    shipping_rsd: shippingRsd > 0 ? formatRsd(shippingRsd) : 'Besplatno',
    discount_line,
    promo_line,
    total_rsd: formatRsd(totalRsd),
    order_date: new Date().toLocaleString('sr-RS', { dateStyle: 'medium', timeStyle: 'short' }),
    site_name: SITE.brandName,
    customer_type_label: customerType === 'firma' ? 'Firma' : 'Fizičko lice',
    company_name: companyName || '',
    company_html,
    payment_label: PAYMENT_LABELS[paymentMethod],
    total_label: paymentMethod === 'uplata' ? 'Za uplatu na račun' : 'Za naplatu pouzećem',
    payment_html,
    vat_line,
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
