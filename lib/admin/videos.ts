'use client';

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { SupabaseClient } from '@supabase/supabase-js';

import { canvasToBlob, createHiddenVideo, destroyVideo, isMobileDevice, withTimeout } from './media';

/**
 * Video klipovi proizvoda — dva puta do sajta, po uređaju.
 *
 * Na računaru: ffmpeg.wasm prebaci klip u H.264 MP4, smanji stranicu na
 * najviše 1280 px, ograniči na 30 fps i izbaci zvuk. Od 150 MB tipično
 * ostane 1–3 MB. Traje duže nego obično slanje i to je namerno — Supabase
 * free plan daje 1 GB prostora i 5 GB protoka mesečno.
 *
 * Na telefonu: klip ide **direktno**, bez ffmpeg-a. ffmpeg.wasm na
 * iPhone-u traži par stotina megabajta WASM memorije koje Safari nema —
 * kartica se ili sruši ili zauvek stoji na istom procentu. To je bio
 * uzrok zamrzavanja u admin panelu. Direktno slanje je veće, ali radi na
 * svakom telefonu i klip je na sajtu odmah. iPhone pri izboru iz galerije
 * ionako sam prepakuje HEVC u H.264, pa je snimak upotrebljiv na sajtu.
 */

/** Bucket odvojen od slika — svoj limit i jasna slika potrošnje. */
export const VIDEO_BUCKET = 'product-videos';

/** Tipovi koje umemo da pošaljemo. iPhone šalje `video/quicktime`. */
export const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
  'video/3gpp',
  'video/3gpp2',
  'video/x-m4v',
  'video/mpeg',
  'video/x-msvideo',
  'video/avi',
  'video/ogg',
];

/**
 * Šta ide u `accept` fajl-dijaloga. Namerno `video/*`: iPhone filtrira
 * galeriju po ovoj listi i ume da zabrani izbor snimka čiji tip ne
 * prepozna — vlasnica onda vidi pola albuma zasivljeno.
 */
export const VIDEO_INPUT_ACCEPT = 'video/*';

/** Gornja granica ulaznog fajla — iznad ovoga slanje sa telefona nema smisla. */
export const MAX_SOURCE_BYTES = 200 * 1024 * 1024;
/** Duži klipovi previše troše protok; panel ih odbija sa objašnjenjem. */
export const MAX_DURATION_SECONDS = 60;
/** Isti limit koji bucket nameće (migracija 0012) — proveravamo i ovde. */
export const MAX_OUTPUT_BYTES = 200 * 1024 * 1024;

/** Koliko čekamo `<video>` da pročita zaglavlje pre nego što odustanemo. */
const META_TIMEOUT_MS = 20000;
/** Koliko čekamo prvi kadar za sličicu. Sličica nije obavezna. */
const POSTER_TIMEOUT_MS = 20000;

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

/**
 * Trajanje i dimenzije bez učitavanja ffmpeg-a.
 *
 * Element mora da bude u dokumentu, muted i `playsinline` — Safari na
 * iPhone-u odvojenom `<video>` elementu ne javi ni `loadedmetadata` ni
 * `error`, pa je ranije ovde obećanje ostajalo da visi zauvek. Zato i
 * rok: ako za `META_TIMEOUT_MS` ništa ne stigne, vraćamo `null` i
 * nastavljamo bez podataka umesto da se panel zamrzne.
 */
export function readVideoMeta(input: Blob): Promise<VideoMeta | null> {
  return withTimeout(
    new Promise<VideoMeta | null>((resolve) => {
      const url = URL.createObjectURL(input);
      const video = createHiddenVideo();
      video.preload = 'metadata';

      const done = (meta: VideoMeta | null) => {
        URL.revokeObjectURL(url);
        destroyVideo(video);
        resolve(meta);
      };

      video.onloadedmetadata = () => {
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        done({ duration, width: video.videoWidth, height: video.videoHeight });
      };
      video.onerror = () => done(null);
      video.src = url;
      video.load();
    }),
    META_TIMEOUT_MS,
  ).then((meta) => meta ?? null);
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
  // Tip namerno ne odbijamo: iPhone i Samsung umeju da pošalju prazan
  // ili neočekivan `type` za sopstveni snimak. Ako browser ne ume da ga
  // otvori, to se vidi niže — po imenu fajla koje nije video uopšte.
  const looksLikeVideo =
    (file.type ? file.type.startsWith('video/') : false) ||
    /\.(mp4|m4v|mov|webm|mkv|3gp|3g2|avi|mpe?g|ogv)$/i.test(file.name);
  if (!looksLikeVideo) {
    return { reason: `„${file.name}" nije video fajl.`, meta: null };
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

/**
 * Prvi upotrebljiv kadar kao sličica.
 *
 * Ovde se panel na telefonu ranije zamrzavao. Odvojen `<video>` element
 * na iOS-u ne dekodira ništa dok nije u dokumentu, muted i `playsinline`,
 * pa `loadeddata`/`seeked` nikad ne stignu — a stara verzija je čekala
 * bez roka. Sada element ide u dokument, kratko se pusti da Safari
 * napuni prvi kadar, i sve ima rok. Sličica nije obavezna: ako ne uspe,
 * vraćamo `null` i klip svejedno ide na sajt.
 */
export function posterFrom(video: Blob): Promise<Blob | null> {
  return withTimeout(
    new Promise<Blob | null>((resolve) => {
      const url = URL.createObjectURL(video);
      const el = createHiddenVideo();
      el.preload = 'auto';
      let drawn = false;

      const done = (blob: Blob | null) => {
        if (drawn) return;
        drawn = true;
        URL.revokeObjectURL(url);
        destroyVideo(el);
        resolve(blob);
      };

      const draw = async () => {
        if (drawn) return;
        const w = el.videoWidth;
        const h = el.videoHeight;
        if (!w || !h) return done(null);
        const scale = Math.min(1, 800 / Math.max(w, h));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return done(null);
        try {
          ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
        } catch {
          return done(null);
        }
        const webp = await canvasToBlob(canvas, 'image/webp', 0.8, 6000);
        // Safari koji ne peče WebP vrati PNG — tada radije JPEG, manji je.
        if (webp && webp.type === 'image/webp') return done(webp);
        done((await canvasToBlob(canvas, 'image/jpeg', 0.82, 6000)) ?? webp);
      };

      el.onloadeddata = () => {
        // Prvi kadar ume da bude crn; uzimamo malo kasnije.
        const t = Math.min(0.3, (Number.isFinite(el.duration) ? el.duration : 1) / 2);
        try {
          el.currentTime = t;
        } catch {
          void draw();
        }
      };
      el.onseeked = () => void draw();
      // iOS ponekad ne odradi `seeked` na detaljnom fajlu, ali odradi
      // `timeupdate` čim krene reprodukcija — zato i taj put.
      el.ontimeupdate = () => {
        if (el.currentTime > 0) void draw();
      };
      el.onerror = () => done(null);

      el.src = url;
      el.load();
      // Muted + playsinline puštanje je na iOS-u dozvoljeno bez dodira i
      // jedini pouzdan način da se prvi kadar zaista dekodira.
      void el.play().catch(() => {});
    }),
    POSTER_TIMEOUT_MS,
  ).then((blob) => blob ?? null);
}

/**
 * Da li ovaj uređaj sme da pokrene ffmpeg.wasm.
 *
 * Telefoni ne smeju: jezgro traži ~32 MB skidanja i par stotina MB
 * radne memorije, što Safari na iPhone-u ne daje — kartica se sruši ili
 * napredak stane zauvek. Slabiji uređaji (manje od 4 GB) takođe ne.
 */
export function canTranscodeHere(): boolean {
  if (typeof window === 'undefined') return false;
  if (isMobileDevice()) return false;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof memory === 'number' && memory < 4) return false;
  return true;
}

export type PreparedVideo = TranscodeResult & {
  /** MIME koji ide u bucket — direktan put zadržava original. */
  contentType: string;
  /** Nastavak fajla u bucket-u. */
  ext: string;
  /** Da li je klip prošao ffmpeg (manji fajl) ili je poslat kakav jeste. */
  transcoded: boolean;
};

/**
 * Nastavak i MIME za klip koji ide bez obrade.
 *
 * Oba se svode na spisak koji bucket propušta (migracija 0012). Telefon
 * ume da prijavi tip koji nije na spisku — tada radije šaljemo pod
 * `video/mp4` nego da nam Storage vrati grešku i klip ne stigne na sajt.
 */
function directTypes(file: File): { ext: string; contentType: string } {
  const byExt: Record<string, string> = {
    mp4: 'video/mp4',
    m4v: 'video/x-m4v',
    mov: 'video/quicktime',
    qt: 'video/quicktime',
    webm: 'video/webm',
    mkv: 'video/x-matroska',
    '3gp': 'video/3gpp',
    '3g2': 'video/3gpp2',
    avi: 'video/x-msvideo',
    mpg: 'video/mpeg',
    mpeg: 'video/mpeg',
    ogv: 'video/ogg',
  };

  const rawExt = extensionOf(file);
  const ext = rawExt in byExt ? rawExt : 'mp4';

  const declared = file.type?.toLowerCase() ?? '';
  const contentType = ACCEPTED_VIDEO_TYPES.includes(declared)
    ? declared
    : (byExt[ext] ?? 'video/mp4');

  return { ext, contentType };
}

/** Klip ide kakav jeste — samo pročitamo podatke i uhvatimo sličicu. */
async function prepareDirect(
  file: File,
  onProgress?: (stage: TranscodeStage, ratio: number) => void,
): Promise<PreparedVideo | null> {
  const meta = await readVideoMeta(file);
  onProgress?.('poster', 0);
  const poster = await posterFrom(file);
  onProgress?.('poster', 1);

  const { ext, contentType } = directTypes(file);
  return {
    video: file,
    poster,
    duration: meta?.duration ?? 0,
    width: meta?.width ?? 0,
    height: meta?.height ?? 0,
    contentType,
    ext,
    transcoded: false,
  };
}

/**
 * Priprema klip za slanje i bira put sam.
 *
 * Računar ide kroz ffmpeg (mali fajl), telefon direktno (radi uvek).
 * Ako ffmpeg iz bilo kog razloga zakaže, ne odustajemo — klip ide
 * direktno, jer je bolje veći fajl na sajtu nego poruka o grešci.
 */
export async function prepareVideo(
  file: File,
  onProgress?: (stage: TranscodeStage, ratio: number) => void,
): Promise<PreparedVideo | null> {
  if (canTranscodeHere()) {
    try {
      const result = await transcodeVideo(file, onProgress);
      if (result && result.video.size > 0) {
        return { ...result, contentType: 'video/mp4', ext: 'mp4', transcoded: true };
      }
    } catch {
      // Pada na direktan put ispod.
    }
  }
  if (file.size > MAX_OUTPUT_BYTES) return null;
  return prepareDirect(file, onProgress);
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

/**
 * Slanje u bucket preko XHR-a, da bi napredak bio stvaran.
 *
 * Supabase klijent ne javlja koliko je poslato, a snimak sa telefona ide
 * i po nekoliko minuta preko mobilnog interneta — traka koja stoji na
 * nuli izgleda isto kao zamrznut panel. XHR javlja bajtove, pa vlasnica
 * vidi da se nešto dešava. Ako sesija nije pri ruci, pada na obično
 * slanje preko klijenta.
 */
async function uploadToBucket(
  supabase: SupabaseClient,
  path: string,
  body: Blob,
  contentType: string,
  onProgress?: (ratio: number) => void,
): Promise<boolean> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = (await supabase.auth.getSession()).data.session?.access_token;

  if (!base || !anon || !token) {
    const { error } = await supabase.storage.from(VIDEO_BUCKET).upload(path, body, {
      cacheControl: '31536000',
      upsert: false,
      contentType,
    });
    return !error;
  }

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      'POST',
      `${base.replace(/\/$/, '')}/storage/v1/object/${VIDEO_BUCKET}/${path
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`,
    );
    xhr.setRequestHeader('authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', anon);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('cache-control', 'max-age=31536000');
    xhr.setRequestHeader('content-type', contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.min(1, e.loaded / e.total));
    };
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.onabort = () => resolve(false);
    xhr.send(body);
  });
}

/** Šalje gotov klip i njegov poster; poster nije obavezan. */
export async function uploadVideo(
  supabase: SupabaseClient,
  folder: string,
  result: PreparedVideo,
  onProgress?: (ratio: number) => void,
): Promise<UploadedVideo | null> {
  const videoPath = objectPath(folder, result.ext);
  const ok = await uploadToBucket(
    supabase,
    videoPath,
    result.video,
    result.contentType,
    onProgress,
  );
  if (!ok) return null;

  const url = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(videoPath).data.publicUrl;

  let posterUrl = '';
  if (result.poster) {
    const posterExt = result.poster.type === 'image/jpeg' ? 'jpg' : 'webp';
    const posterPath = objectPath(folder, posterExt);
    const posterOk = await uploadToBucket(
      supabase,
      posterPath,
      result.poster,
      result.poster.type || 'image/webp',
    );
    if (posterOk) {
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
