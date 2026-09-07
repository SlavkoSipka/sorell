'use client';

/**
 * Sitni alati koje dele slike i video u admin panelu.
 *
 * Sve ovde postoji zbog telefona. Na iPhone-u (Safari) i na slabijim
 * Android uređajima `canvas.toBlob`, `createImageBitmap` i `<video>`
 * umeju da nikad ne pozovu svoj callback — obećanje ostane da visi,
 * panel zauvek piše „Obrađujem…" i vlasnica misli da se sajt zamrzao.
 * Zato ovde nijedno čekanje nema pravo da traje beskonačno: svaka
 * funkcija ili vrati rezultat, ili posle isteka vremena vrati `null`
 * pa pozivalac ide na rezervni put.
 */

/** Obećanje sa rokom. Posle `ms` vraća `null` umesto da visi. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(null);
      }
    }, ms);
    promise.then(
      (value) => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(value);
        }
      },
      () => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(null);
        }
      },
    );
  });
}

/** Telefon ili tablet — tamo ffmpeg.wasm nema dovoljno memorije. */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // iPadOS se predstavlja kao Mac, pa ga hvatamo preko dodira.
  const iPadOS = /Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1;
  return /iPhone|iPad|iPod|Android|Mobile|Silk|Kindle/i.test(ua) || iPadOS;
}

/** iOS Safari — najstroži po pitanju canvas-a i video dekodiranja. */
export function isIosLike(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /iPhone|iPad|iPod/i.test(ua) ||
    (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1)
  );
}

/** Sinhroni izlaz iz canvas-a — radi i kad `toBlob` zaćuti. */
function blobFromDataUrl(canvas: HTMLCanvasElement, type: string, quality: number): Blob | null {
  try {
    const url = canvas.toDataURL(type, quality);
    const comma = url.indexOf(',');
    if (comma === -1) return null;
    const mime = url.slice(5, comma).split(';')[0] || type;
    const binary = atob(url.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

/**
 * `canvas.toBlob` sa rokom i rezervnim putem.
 *
 * Na iOS-u `toBlob` ume da ne pozove callback kad je slika sa telefona
 * velika — tada posle `timeoutMs` prelazimo na `toDataURL`, koji je
 * sinhron i uvek vrati nešto.
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
  timeoutMs = 8000,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (blob: Blob | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(blob && blob.size > 0 ? blob : blobFromDataUrl(canvas, type, quality));
    };
    const timer = setTimeout(() => finish(null), timeoutMs);

    try {
      canvas.toBlob((blob) => finish(blob), type, quality);
    } catch {
      finish(null);
    }
  });
}

/**
 * `<video>` koji iOS zaista dekodira: mora da bude u dokumentu, muted i
 * `playsinline`, inače Safari nikad ne javi `loadeddata`. Držimo ga van
 * vidnog polja umesto `display:none` — skriven element Safari preskoči.
 */
export function createHiddenVideo(): HTMLVideoElement {
  const el = document.createElement('video');
  el.muted = true;
  el.defaultMuted = true;
  el.playsInline = true;
  el.setAttribute('muted', '');
  el.setAttribute('playsinline', '');
  el.setAttribute('webkit-playsinline', '');
  el.crossOrigin = 'anonymous';
  el.style.cssText =
    'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1';
  if (typeof document !== 'undefined') document.body.appendChild(el);
  return el;
}

/** Uklanja pomoćni `<video>` i pušta memoriju. */
export function destroyVideo(el: HTMLVideoElement): void {
  try {
    el.pause();
  } catch {
    /* svejedno */
  }
  el.removeAttribute('src');
  try {
    el.load();
  } catch {
    /* svejedno */
  }
  el.remove();
}
