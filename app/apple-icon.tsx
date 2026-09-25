import { ImageResponse } from 'next/og';
import { markSvg } from '@/lib/brand-mark';

// Ikonica kad se sajt doda na početni ekran iPhone-a.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  const src = `data:image/svg+xml;base64,${Buffer.from(markSvg({ pad: 10 })).toString('base64')}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FAF9F7',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={src} width={150} height={150} />
      </div>
    ),
    size,
  );
}
