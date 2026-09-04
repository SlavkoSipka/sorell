'use client';

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Video klipovi proizvoda — obrada u browseru pre slanja.
 *
 * Zašto ovako: Supabase free plan daje 1 GB prostora i 5 GB protoka
 * mesečno, a snimak sa telefona ume da bude 150 MB. Server ne može da
 * transkoduje (Vercel nema ffmpeg), pa se posao radi kod vlasnice —
 * ffmpeg.wasm prebaci klip u H.264 MP4, smanji stranicu na najviše
 * 1280 px, ograniči na 30 fps i izbaci zvuk. Od 150 MB tipično ostane
 * 1–3 MB. Traje duže nego obično slanje i to je namerno.
 */

/** Bucket odvojen od slika — svoj limit i jasna slika potrošnje. */
export const VIDEO_BUCKET = 'product-videos';

/** Šta biramo iz fajl-dijaloga. iPhone šalje `video/quicktime`. */
export const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
  'video/3gpp',
  'video/x-m4v',
];

/** Gornja granica ulaznog fajla — preko ovoga ffmpeg.wasm ostaje bez memorije. */
export const MAX_SOURCE_BYTES = 300 * 1024 * 1024;
/** Duži klipovi previše troše protok; panel ih odbija sa objašnjenjem. */
export const MAX_DURATION_SECONDS = 60;
/** Isti limit koji bucket nameće (migracija 0008) — proveravamo i ovde. */
export const MAX_OUTPUT_BYTES = 25 * 1024 * 1024;

/** Duža stranica gotovog klipa. 1280 je dovoljno za prikaz na sajtu. */
const MAX_EDGE = 1280;
/** x264 CRF: manji broj = bolji kvalitet i veći fajl. 28 je granica gde se rad na noktu još lepo vidi. */
const CRF = '28';
const MAX_FPS = 30;
/**
 * Zvuk se izbacuje: klipovi u galeriji se puštaju bez tona, a bez audio
 * zapisa fajl je osetno manji. Ako zatreba zvuk, obriši `-an` ispod i
 * dodaj `-c:a aac -b:a 64k -ac 1`.
 */
const AUDIO_ARGS = ['-an'];

/** Verzija jezgra se drži fiksno da nova verzija ne promeni ponašanje preko noći. */
const CORE_VERSION = '0.12.10';
const CORE_BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

// ── Provera fajla ───────────────────────────────────────────────

export type VideoMeta = { duration: number; width: number; height: number };

/** Trajanje i dimenzije bez učitavanja ffmpeg-a — da se 30 MB jezgra ne skida uzalud. */
export function readVideoMeta(file: File): Promise<VideoMeta | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;

    const done = (meta: VideoMeta | null) => {
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      resolve(meta);
    };

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      done({ duration, width: video.videoWidth, height: video.videoHeight });
    };
    video.onerror = () => done(null);
    video.src = url;
  });
}

/**
 * Razlog odbijanja, ili null ako je klip u redu. Vraća i pročitane podatke
 * da ih pozivalac ne čita dvaput.
 *
 * Format koji browser ne ume da otvori ne odbijamo odmah — ffmpeg često
 * pročita i ono što `<video>` ne može (npr. neki HEVC zapisi).
 */
export async function checkVideo(
  file: File,
): Promise<{ reason: string | null; meta: VideoMeta | null }> {
  if (file.type && !ACCEPTED_VIDEO_TYPES.includes(file.type)) {
    return { reason: 'Dozvoljeni su MP4, MOV, WEBM, MKV i 3GP klipovi.', meta: null };
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return {
      reason: `„${file.name}" je veći od ${Math.round(MAX_SOURCE_BYTES / 1024 / 1024)} MB. Skrati klip u telefonu pa pokušaj ponovo.`,
      meta: null,
    };
  }

  const meta = await readVideoMeta(file);
  if (meta && meta.duration > MAX_DURATION_SECONDS + 0.5) {
    return {
      reason: `Klip traje ${Math.round(meta.duration)} s, a najduže može ${MAX_DURATION_SECONDS} s. Skrati ga u telefonu pa pokušaj ponovo.`,
      meta,
    };
  }
  return { reason: null, meta };
}

// ── ffmpeg.wasm ─────────────────────────────────────────────────

let ffmpegInstance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

/** Da li je jezgro već skinuto — panel time zna da najavi čekanje samo prvi put. */
export function ffmpegReady(): boolean {
  return ffmpegInstance !== null;
}

/**
 * Učitava jezgro sa jsDelivr-a i drži ga za ceo život stranice.
 * Prvo učitavanje skida ~32 MB; browser ga posle kešira.
 */
async function getFfmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loading) return loading;

  loading = (async () => {
    const ffmpeg = new FFmpeg();
    await ffmpeg.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  try {
    return await loading;
  } catch (e) {
    loading = null;
    throw e;
  }
}

function extensionOf(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (/^[a-z0-9]{2,4}$/.test(fromName)) return fromName;
  return 'mp4';
}

export type TranscodeStage = 'jezgro' | 'obrada' | 'poster' | 'slanje';

export type TranscodeResult = {
  video: Blob;
  poster: Blob | null;
  duration: number;
  width: number;
  height: number;
};

/**
 * Prebacuje klip u MP4 (H.264) spreman za sajt.
 * `onProgress` dobija fazu i 0–1 napredak; obrada je najduža faza.
 */
export async function transcodeVideo(
  file: File,
  onProgress?: (stage: TranscodeStage, ratio: number) => void,
): Promise<TranscodeResult | null> {
  onProgress?.('jezgro', ffmpegReady() ? 1 : 0);
  const ffmpeg = await getFfmpeg();
  onProgress?.('jezgro', 1);

  const input = `ulaz.${extensionOf(file)}`;
  const output = 'izlaz.mp4';

  const handleProgress = ({ progress }: { progress: number }) => {
    // ffmpeg zna da prijavi vrednost izvan 0–1 na kraju; skraćujemo je.
    onProgress?.('obrada', Math.min(1, Math.max(0, progress)));
  };
  ffmpeg.on('progress', handleProgress);

  try {
    await ffmpeg.writeFile(input, await fetchFile(file));
    await ffmpeg.exec([
      '-i',
      input,
      // Sigurnosna brana ako je trajanje u zaglavlju pogrešno.
      '-t',
      String(MAX_DURATION_SECONDS),
      '-vf',
      `scale='min(${MAX_EDGE},iw)':'min(${MAX_EDGE},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=${MAX_FPS}`,
      '-c:v',
      'libx264',
      '-profile:v',
      'main',
      '-pix_fmt',
      'yuv420p',
      '-crf',
      CRF,
      '-preset',
      'veryfast',
      ...AUDIO_ARGS,
      // Zaglavlje ide na početak fajla da video krene pre nego što se skine ceo.
      '-movflags',
      '+faststart',
      output,
    ]);

    const data = await ffmpeg.readFile(output);
    const bytes = data as Uint8Array;
    if (!bytes || bytes.length === 0) return null;

    const video = new Blob([bytes as unknown as BlobPart], { type: 'video/mp4' });

    onProgress?.('poster', 0);
    const meta = (await readVideoMeta(new File([video], output, { type: 'video/mp4' }))) ?? {
      duration: 0,
      width: 0,
      height: 0,
    };
    const poster = await posterFrom(video);
    onProgress?.('poster', 1);

    return { video, poster, duration: meta.duration, width: meta.width, height: meta.height };
  } finally {
    ffmpeg.off('progress', handleProgress);
    await ffmpeg.deleteFile(input).catch(() => {});
    await ffmpeg.deleteFile(output).catch(() => {});
  }
}

/** Prvi upotrebljiv kadar kao WebP — galerija ga pokazuje pre puštanja. */
export function posterFrom(video: Blob): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(video);
    const el = document.createElement('video');
    el.muted = true;
    el.playsInline = true;
    el.preload = 'auto';

    const done = (blob: Blob | null) => {
      URL.revokeObjectURL(url);
      el.removeAttribute('src');
      resolve(blob);
    };

    el.onloadeddata = () => {
      // Prvi kadar ume da bude crn; uzimamo malo kasnije.
      el.currentTime = Math.min(0.3, (el.duration || 1) / 2);
    };

    el.onseeked = () => {
      const scale = Math.min(1, 800 / Math.max(el.videoWidth, el.videoHeight, 1));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(el.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(el.videoHeight * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return done(null);
      ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => done(b), 'image/webp', 0.8);
    };

    el.onerror = () => done(null);
    el.src = url;
  });
}

// ── Slanje u bucket ─────────────────────────────────────────────

function objectPath(folder: string, ext: string): string {
  return `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

/** Putanja unutar bucket-a iz javnog URL-a — da obrisan klip ne ostane da visi. */
export function videoPathFromPublicUrl(url: string): string | null {
  const marker = `/${VIDEO_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

export type UploadedVideo = { url: string; posterUrl: string };

/** Šalje gotov klip i njegov poster; poster nije obavezan. */
export async function uploadVideo(
  supabase: SupabaseClient,
  folder: string,
  result: TranscodeResult,
): Promise<UploadedVideo | null> {
  const videoPath = objectPath(folder, 'mp4');
  const { error } = await supabase.storage.from(VIDEO_BUCKET).upload(videoPath, result.video, {
    cacheControl: '31536000',
    upsert: false,
    contentType: 'video/mp4',
  });
  if (error) return null;

  const url = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(videoPath).data.publicUrl;

  let posterUrl = '';
  if (result.poster) {
    const posterPath = objectPath(folder, 'webp');
    const { error: posterError } = await supabase.storage
      .from(VIDEO_BUCKET)
      .upload(posterPath, result.poster, {
        cacheControl: '31536000',
        upsert: false,
        contentType: 'image/webp',
      });
    if (!posterError) {
      posterUrl = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(posterPath).data.publicUrl;
    }
  }

  return { url, posterUrl };
}

/** Briše klip i poster iz bucket-a. */
export async function removeVideoFiles(
  supabase: SupabaseClient,
  url: string,
  posterUrl: string,
): Promise<void> {
  const paths = [url, posterUrl]
    .map((u) => (u ? videoPathFromPublicUrl(u) : null))
    .filter((p): p is string => p !== null);
  if (paths.length > 0) await supabase.storage.from(VIDEO_BUCKET).remove(paths);
}

// ── Sitnice za prikaz ───────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s} s`;
}
