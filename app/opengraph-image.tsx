import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { markSvg } from '@/lib/brand-mark';

// Slika koja se prikazuje kad se link sajta pošalje (Viber, WhatsApp,
// Instagram, Facebook) i u Google rezultatima. Proizvodi imaju svoju — sliku proizvoda.
export const alt = 'Sorelle — gel za nokte, builder gel, top gel i materijal za manikir';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const [bold, medium] = await Promise.all([
    readFile(join(process.cwd(), 'assets/fonts/Manrope-Bold.ttf')),
    readFile(join(process.cwd(), 'assets/fonts/Manrope-Medium.ttf')),
  ]);
  const src = `data:image/svg+xml;base64,${Buffer.from(markSvg({ pad: 1.5 })).toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FAF9F7',
          color: '#171614',
          fontFamily: 'Manrope',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={src} width={170} height={170} />
        <div style={{ marginTop: 34, fontSize: 76, fontWeight: 700, letterSpacing: 22, paddingLeft: 22 }}>
          SORELLE
        </div>
        <div style={{ marginTop: 10, width: 90, height: 2, background: '#B08E6A' }} />
        <div style={{ marginTop: 26, fontSize: 30, fontWeight: 500, color: '#4B4843' }}>
          Gel za nokte · Builder gel · Top gel · Završni sjaj
        </div>
        <div style={{ marginTop: 12, fontSize: 22, fontWeight: 500, color: '#6E6A63', letterSpacing: 3 }}>
          PROFESIONALNI MATERIJAL ZA MANIKIR
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Manrope', data: bold, weight: 700, style: 'normal' },
        { name: 'Manrope', data: medium, weight: 500, style: 'normal' },
      ],
    },
  );
}
