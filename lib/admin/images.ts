'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

/** Bucket u koji admin panel diže sve slike (proizvodi i hero). */
export const IMAGE_BUCKET = 'product-images';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

/** Poruka o odbijenoj slici, ili null ako je fajl u redu. */
export function rejectReason(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return 'Dozvoljene su JPG, PNG, WEBP i AVIF slike.';
  if (file.size > MAX_IMAGE_BYTES) return `„${file.name}" je veća od 5 MB.`;
  return null;
}

/** Putanja objekta unutar bucket-a iz javnog URL-a — da stara slika ne ostane da visi. */
export function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/${IMAGE_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

/**
 * Diže sliku u bucket i vraća javni URL. `folder` odvaja slike proizvoda
 * (`slug/`) od hero slike (`_hero/`). Vreme u nazivu znači da zamenjena slika
 * odmah stigne do kupaca umesto keširane.
 */
export async function uploadImage(
  supabase: SupabaseClient,
  folder: string,
  file: File,
): Promise<string | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { cacheControl: '31536000', upsert: false });
  if (error) return null;

  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Briše sliku iz bucket-a. Slike koje nisu iz našeg bucket-a se preskaču. */
export async function removeImage(supabase: SupabaseClient, url: string): Promise<void> {
  const path = storagePathFromPublicUrl(url);
  if (path) await supabase.storage.from(IMAGE_BUCKET).remove([path]);
}
