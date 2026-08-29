/**
 * Kanonski javni URL sajta. Postavi NEXT_PUBLIC_SITE_URL u produkciji.
 * Uvek vraća string validan za `new URL()` — bez šeme metadata baca 500.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    const noTrail = explicit.replace(/\/+$/, '');
    return /^https?:\/\//i.test(noTrail) ? noTrail : `https://${noTrail}`;
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, '')}`;
  return 'http://localhost:3000';
}

/** Za `metadataBase` — nikad ne baca. */
export function getMetadataBaseUrl(): URL {
  try {
    return new URL(getSiteUrl());
  } catch {
    return new URL('http://localhost:3000');
  }
}
