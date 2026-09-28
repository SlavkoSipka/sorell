import 'server-only';

import QRCode from 'qrcode';

// Nivo korekcije M i bela margina od 4 polja (po QR standardu): čita se sa
// papira, sa ekrana i sa screenshot-a.
const OPTIONS = { errorCorrectionLevel: 'M' as const, margin: 4 };

/** IPS QR kao SVG (zahvalnica): oštar na svakom ekranu, bez slike za učitavanje. */
export function qrSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, { ...OPTIONS, type: 'svg', color: { dark: '#171614', light: '#ffffff' } });
}

/** IPS QR kao PNG (PDF potvrda). */
export function qrPng(payload: string): Promise<Buffer> {
  return QRCode.toBuffer(payload, { ...OPTIONS, type: 'png', width: 480, color: { dark: '#000000', light: '#ffffff' } });
}
