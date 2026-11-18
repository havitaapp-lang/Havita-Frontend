/**
 * Botón «Instalar aplicación»: en qué dispositivos se ofrece y cómo.
 *
 * - Solo móviles y tablets (iOS/iPadOS y Android). En escritorio no se muestra.
 * - Nunca dentro de la app ya instalada (modo standalone).
 * - Android/Chrome: instalación directa con el aviso nativo (`beforeinstallprompt`).
 * - iOS/iPadOS: Apple no permite instalar desde un botón; se muestran los pasos (Compartir → Agregar a inicio).
 */

export type InstallPlatform = 'ios' | 'android' | 'desktop';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** iPadOS 13+ se identifica como Mac de escritorio: se distingue por la pantalla táctil. */
export function detectInstallPlatform(userAgent: string, maxTouchPoints: number): InstallPlatform {
  const ua = userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Macintosh/i.test(ua) && maxTouchPoints > 1) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

/**
 * Navegador desde el que se intenta instalar.
 * - `safari` / `chrome`: navegador principal de la plataforma (instalación normal).
 * - `other`: otro navegador (Chrome/Firefox/Edge en iOS; Firefox/Opera… en Android). Puede instalar, con otros pasos.
 * - `in-app`: navegador interno de WhatsApp, Instagram, Facebook, etc. No permite instalar: hay que abrir el enlace
 *   en el navegador del sistema.
 */
export type InstallBrowser = 'safari' | 'chrome' | 'other' | 'in-app';

const IN_APP_RE = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|WhatsApp|Line\/|Twitter|LinkedInApp|Snapchat|musical_ly|BytedanceWebview|TikTok|GSA\//i;

export function detectInstallBrowser(userAgent: string, platform: InstallPlatform): InstallBrowser {
  const ua = userAgent || '';
  if (IN_APP_RE.test(ua)) return 'in-app';
  if (platform === 'ios') {
    return /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|DuckDuckGo|YaBrowser|Brave/i.test(ua) ? 'other' : 'safari';
  }
  if (platform === 'android') {
    if (/; wv\)/.test(ua)) return 'in-app'; // WebView de otra app
    return /Firefox|OPR\/|Opera|DuckDuckGo|YaBrowser/i.test(ua) ? 'other' : 'chrome';
  }
  return 'other';
}

/** iPad: el botón Compartir de Safari está arriba a la derecha; en iPhone, en la barra inferior. */
export function isIpad(userAgent: string, maxTouchPoints: number): boolean {
  return /iPad/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
}

export function isRunningStandalone(win: Window = window): boolean {
  try {
    const mq = (q: string) => typeof win.matchMedia === 'function' && win.matchMedia(q).matches;
    return (
      mq('(display-mode: standalone)') ||
      mq('(display-mode: fullscreen)') ||
      mq('(display-mode: minimal-ui)') ||
      (win.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

// El navegador lanza `beforeinstallprompt` una sola vez y pronto (a veces antes de que se monte el botón):
// se guarda aquí desde que se carga el módulo.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
// Instantánea estable para useSyncExternalStore: solo cambia al notificar.
let snapshot: { deferredPrompt: BeforeInstallPromptEvent | null; installed: boolean } = { deferredPrompt, installed };
const notify = () => {
  snapshot = { deferredPrompt, installed };
  listeners.forEach((l) => l());
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // se muestra con nuestro botón, no con el mini-banner del navegador
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferredPrompt = null;
    notify();
  });
}

export const installPromptStore = {
  get: () => snapshot,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  /** Muestra el aviso nativo (Android). Devuelve false si no hay aviso disponible. */
  async prompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    const p = deferredPrompt;
    if (!p) return 'unavailable';
    deferredPrompt = null; // el evento solo se puede usar una vez
    notify();
    await p.prompt();
    const { outcome } = await p.userChoice;
    if (outcome === 'accepted') installed = true;
    notify();
    return outcome;
  },
  /** Solo para pruebas. */
  _reset(next: { deferredPrompt?: BeforeInstallPromptEvent | null; installed?: boolean } = {}) {
    deferredPrompt = next.deferredPrompt ?? null;
    installed = next.installed ?? false;
    notify();
  },
};
