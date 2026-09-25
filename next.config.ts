import type { NextConfig } from 'next';

/**
 * Slike proizvoda koje admin okači završe u Supabase Storage-u
 * (bucket `product-images`), pa `next/image` mora da sme da ih učita.
 */
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    // Svaka okačena slika ima jedinstveno ime (vreme u nazivu), pa se ista
    // adresa nikad ne menja: optimizovana verzija sme dugo da ostane u kešu.
    minimumCacheTTL: 60 * 60 * 24 * 31,
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
      : [{ protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' }],
  },
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },
  // PDF potvrda čita font sa diska (fs), pa ga Next ne bi sam spakovao u
  // serverless funkciju — bez ovoga na Vercelu PDF pada, a lokalno radi.
  outputFileTracingIncludes: {
    '/api/porudzbine/**': ['./assets/fonts/**/*'],
  },
};

export default nextConfig;
