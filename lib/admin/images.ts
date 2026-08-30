'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

/** Bucket u koji admin panel diže sve slike (proizvodi i hero). */
export const IMAGE_BUCKET = 'product-images';

/**
 * Gornja granica za fajl koji se BIRA. Slika sa telefona ume da bude i 10 MB,
 * a posle obrade ispod završi na par stotina kilobajta — zato je ovde široko,
 * a limit bucket-a (5 MB) čuva `processImage`.
 */
export const MAX_SOURCE_BYTES = 30 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  // iPhone ume da pošalje HEIC; Safari ga dekodira, ostali javе grešku niže.
  'image/heic',
  'image/heif',
];

/**
 * Odnos stranica koji sajt koristi za svaku sliku proizvoda i za hero.
 * Isti je u `Media` (`ratio="4 / 5"`), pa isečena slika popunjava okvir
 * bez praznina bez obzira šta je vlasnica uslikala — 4:3, 9:16, svejedno.
 */
export const TARGET_RATIO = 4 / 5;
/** Najveća visina izlaza; širina se računa iz odnosa. */
export const TARGET_HEIGHT = 1250;
/** Kvalitet WebP-a — 0.82 je granica ispod koje se gubitak vidi na koži i noktima. */
const WEBP_QUALITY = 0.82;

/** Poruka o odbijenom fajlu, ili null ako je u redu. */
export function rejectReason(file: File): string | null {
  if (file.type && !ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Dozvoljene su JPG, PNG, WEBP, AVIF i HEIC slike.';
  }
  if (file.size > MAX_SOURCE_BYTES) return `„${file.name}" je veća od 30 MB.`;
  return null;
}

/** Putanja objekta unutar bucket-a iz javnog URL-a — da stara slika ne ostane da visi. */
export function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/${IMAGE_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export type ProcessedImage = { blob: Blob; ext: string };

/**
 * Seče sliku na 4:5 iz sredine, smanjuje je i pakuje u WebP.
 *
 * Sve se radi u browseru pre slanja: server dobija gotovu sliku, a vlasnica
 * ne mora ništa da kadrira ni da smanjuje. Ako browser ne ume WebP (stariji
 * Safari), pada na JPEG — nikad ne vraća neobrađen original, jer bi tada
 * fotografija sa telefona probila limit bucket-a.
 */
export async function processImage(file: File): Promise<ProcessedImage | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Najčešće HEIC u browseru koji ga ne dekodira.
    return null;
  }

  const srcRatio = bitmap.width / bitmap.height;

  // Isečak je najveći pravougaonik 4:5 koji staje u original.
  let cropW: number;
  let cropH: number;
  if (srcRatio > TARGET_RATIO) {
    cropH = bitmap.height;
    cropW = cropH * TARGET_RATIO;
  } else {
    cropW = bitmap.width;
    cropH = cropW / TARGET_RATIO;
  }
  const sx = (bitmap.width - cropW) / 2;
  const sy = (bitmap.height - cropH) / 2;

  // Ne uvećavaj preko originala — samo smanjuj kad je slika veća od potrebnog.
  const outH = Math.max(1, Math.round(Math.min(TARGET_HEIGHT, cropH)));
  const outW = Math.max(1, Math.round(outH * TARGET_RATIO));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return null;
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, sx, sy, cropW, cropH, 0, 0, outW, outH);
  bitmap.close();

  let blob = await encode(canvas, 'image/webp', WEBP_QUALITY);
  // Browser koji ne ume WebP vrati PNG pod drugim tipom — tada radije JPEG.
  if (!blob || blob.type !== 'image/webp') {
    blob = await encode(canvas, 'image/jpeg', 0.85);
    if (!blob) return null;
    return { blob, ext: 'jpg' };
  }
  return { blob, ext: 'webp' };
}

/**
 * Diže već obrađenu sliku u bucket i vraća javni URL. `folder` odvaja slike
 * proizvoda (`slug/`) od hero slike (`_hero/`). Vreme u nazivu znači da
 * zamenjena slika odmah stigne do kupaca umesto keširane.
 */
export async function uploadProcessed(
  supabase: SupabaseClient,
  folder: string,
  image: ProcessedImage,
): Promise<string | null> {
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${image.ext}`;

  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, image.blob, {
    cacheControl: '31536000',
    upsert: false,
    contentType: image.blob.type,
  });
  if (error) return null;

  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Obrada + slanje u jednom koraku. */
export async function uploadImage(
  supabase: SupabaseClient,
  folder: string,
  file: File,
): Promise<string | null> {
  const processed = await processImage(file);
  if (!processed) return null;
  return uploadProcessed(supabase, folder, processed);
}

/** Briše sliku iz bucket-a. Slike koje nisu iz našeg bucket-a se preskaču. */
export async function removeImage(supabase: SupabaseClient, url: string): Promise<void> {
  const path = storagePathFromPublicUrl(url);
  if (path) await supabase.storage.from(IMAGE_BUCKET).remove([path]);
}
