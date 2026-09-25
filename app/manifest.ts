import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site-config';
import { SEO_DEFAULT_DESCRIPTION } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.brandName,
    short_name: SITE.brandName,
    description: SEO_DEFAULT_DESCRIPTION,
    lang: 'sr-Latn-RS',
    start_url: '/',
    display: 'browser',
    background_color: '#FFFFFF',
    theme_color: '#FFFFFF',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
