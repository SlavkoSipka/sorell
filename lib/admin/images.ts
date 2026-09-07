'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

import { canvasToBlob, isIosLike, withTimeout } from './media';

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
  'image/gif',
  'image/bmp',
  'image/tiff',
  // iPhone ume da pošalje HEIC; Safari ga dekodira, ostali javе grešku niže.
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
];

/**
 * Šta ide u `accept` fajl-dijaloga. Namerno `image/*`, a ne spisak:
 * iPhone strogo filtrira galeriju po `accept` listi i ume da zabrani
 * izbor slike čiji tip ne prepozna, pa vlasnica vidi pola albuma sivo.
 */
export const IMAGE_INPUT_ACCEPT = 'image/*';

/** Koliko čekamo dekodiranje jedne slike pre nego što odustanemo. */
const DECODE_TIMEOUT_MS = 25000;
/**
 * Gornja granica površine platna na iOS-u. Safari tiho vrati prazno
 * (belo/crno) platno kad se pređe, umesto da javi grešku.
 */
const IOS_MAX_CANVAS_PIXELS = 16_000_000;

/**
 * Odnos stranica koji sajt koristi za svaku sliku proizvoda i za hero.
 * Isti je u `Media` (`ratio="4 / 5"`), pa isečena slika popunjava okvir
 * bez praznina bez obzira šta je vlasnica uslikala — 4:3, 9:16, svejedno.
 */
export const TARGET_RATIO = 4 / 5;
/** Najveća visina izlaza; širina se računa iz odnosa. */
export const TARGET_HEIGHT = 1250;
/** Fotografija salona stoji u širem okviru (3:2) i na „Uslugama" i na početnoj. */
export const SALON_RATIO = 3 / 2;
export const SALON_HEIGHT = 900;
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

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

/**
 * Otvara sliku bilo kojim putem koji browser ume, redom:
 *
 * 1. `createImageBitmap` sa EXIF orijentacijom — brzo, ne blokira nit;
 * 2. `createImageBitmap` bez opcija — stariji Safari puca na opcije;
 * 3. `<img>` preko object URL-a — jedini put koji na iPhone-u otvori HEIC.
 *
 * Svaki korak ima rok. Bez roka Safari na velikoj fotografiji ume da
 * ostavi obećanje da visi, a panel onda zauvek stoji na „Obrađujem…".
 */
async function decodeImage(file: File): Promise<DecodedImage | null> {
  if (typeof createImageBitmap === 'function') {
    const attempts: Array<() => Promise<ImageBitmap>> = [
      () => createImageBitmap(file, { imageOrientation: 'from-image' }),
      () => createImageBitmap(file),
    ];
    for (const attempt of attempts) {
      let bitmap: ImageBitmap | null = null;
      try {
        bitmap = await withTimeout(attempt(), DECODE_TIMEOUT_MS);
      } catch {
        bitmap = null;
      }
      if (bitmap && bitmap.width > 0 && bitmap.height > 0) {
        const bmp = bitmap;
        return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close() };
      }
      if (bitmap) bitmap.close();
    }
  }

  // Rezervni put: `<img>`. Browseri od 2021. naovamo sami primenjuju EXIF
  // orijentaciju pri crtanju, pa slika sa telefona nije izvrnuta.
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = 'async';
  const loaded = await withTimeout(
    new Promise<boolean>((resolve, reject) => {
      img.onload = () => resolve(true);
      img.onerror = () => reject(new Error('nečitljiva slika'));
      img.src = url;
    }),
    DECODE_TIMEOUT_MS,
  );

  if (!loaded || !img.naturalWidth || !img.naturalHeight) {
    URL.revokeObjectURL(url);
    return null;
  }
  return {
    source: img,
    width: img.naturalWidth,
    height: img.naturalHeight,
    release: () => URL.revokeObjectURL(url),
  };
}

export type ProcessedImage = { blob: Blob; ext: string };

/**
 * Seče sliku na 4:5 iz sredine, smanjuje je i pakuje u WebP.
 *
 * Sve se radi u browseru pre slanja: server dobija gotovu sliku, a vlasnica
 * ne mora ništa da kadrira ni da smanjuje. Ako browser ne ume WebP (stariji
 * Safari), pada na JPEG — nikad ne vraća neobrađen original, jer bi tada
 * fotografija sa telefona probila limit bucket-a.
 *
 * Nijedan korak nema pravo da visi: dekodiranje i pakovanje imaju rok, a
 * na iOS-u se preveliki original prvo smanji u međukoraku, jer Safari
 * preko ~16 Mpx tiho nacrta prazno platno umesto slike.
 */
export async function processImage(
  file: File,
  ratio: number = TARGET_RATIO,
  maxHeight: number = TARGET_HEIGHT,
): Promise<ProcessedImage | null> {
  const decoded = await decodeImage(file);
  if (!decoded) return null;

  try {
    const srcRatio = decoded.width / decoded.height;

    // Isečak je najveći pravougaonik traženog odnosa koji staje u original.
    let cropW: number;
    let cropH: number;
    if (srcRatio > ratio) {
      cropH = decoded.height;
      cropW = cropH * ratio;
    } else {
      cropW = decoded.width;
      cropH = cropW / ratio;
    }
    let sx = (decoded.width - cropW) / 2;
    let sy = (decoded.height - cropH) / 2;
    let source = decoded.source;

    // iPhone: fotografija od 48 Mpx probija Safarijev limit platna, pa
    // je prvo smanjimo u jedan međukorak koji sigurno staje.
    if (isIosLike() && decoded.width * decoded.height > IOS_MAX_CANVAS_PIXELS) {
      const scale = Math.sqrt(IOS_MAX_CANVAS_PIXELS / (decoded.width * decoded.height));
      const midW = Math.max(1, Math.round(decoded.width * scale));
      const midH = Math.max(1, Math.round(decoded.height * scale));
      const mid = document.createElement('canvas');
      mid.width = midW;
      mid.height = midH;
      const midCtx = mid.getContext('2d');
      if (midCtx) {
        midCtx.imageSmoothingQuality = 'high';
        midCtx.drawImage(decoded.source, 0, 0, midW, midH);
        source = mid;
        cropW *= scale;
        cropH *= scale;
        sx *= scale;
        sy *= scale;
      }
    }

    // Ne uvećavaj preko originala — samo smanjuj kad je slika veća od potrebnog.
    const outH = Math.max(1, Math.round(Math.min(maxHeight, cropH)));
    const outW = Math.max(1, Math.round(outH * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, sx, sy, cropW, cropH, 0, 0, outW, outH);

    const webp = await canvasToBlob(canvas, 'image/webp', WEBP_QUALITY);
    // Browser koji ne ume WebP vrati PNG pod drugim tipom — tada radije JPEG.
    if (webp && webp.type === 'image/webp') return { blob: webp, ext: 'webp' };

    const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.85);
    if (jpeg) return { blob: jpeg, ext: 'jpg' };

    // Poslednja šansa: PNG je veći, ali bolje veliki nego nijedan.
    if (webp) return { blob: webp, ext: webp.type === 'image/png' ? 'png' : 'jpg' };
    return null;
  } finally {
    decoded.release();
  }
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
