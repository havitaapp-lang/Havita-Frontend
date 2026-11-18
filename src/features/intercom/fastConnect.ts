/**
 * P8-A2 — Optimizaciones de conexión de la citofonía, detrás de VITE_INTERCOM_FAST_CONNECT ('true' las activa; por
 * defecto desactivadas).
 *
 * 1. Micrófono en paralelo con la aceptación. Al pulsar «Contestar» (consentimiento del usuario), el micrófono se prepara
 *    con la API pública del SDK `initRTKMedia({ audio: true, video: false })`, que no usa token, MIENTRAS viaja
 *    `POST /accept`. Después se entrega a `RealtimeKitClient.init` como `defaults.mediaHandler`, así que `init` no vuelve
 *    a capturarlo. Nunca se captura nada mientras timbra. Si la aceptación falla o la llamada termina, se libera.
 * 2. Preconexión (DNS/TLS) mientras timbra, con `<link rel="preconnect">` a los hosts que usa el SDK. No envía token,
 *    cookies ni datos de la reunión: no puede unir a nadie ni generar consumo.
 *
 * Ni el `init` ni el `join` del SDK se adelantan: ambos requieren el token del participante (P8A2_SDK_PREPARATION.md).
 */
import { initRTKMedia } from '@cloudflare/realtimekit-react';

export const fastConnectEnabled = (): boolean => {
  try {
    return import.meta.env.VITE_INTERCOM_FAST_CONNECT === 'true';
  } catch {
    return false;
  }
};

/** Hosts observados en las llamadas reales de P8-A durante `init` y `join` del SDK 2.0.3. */
export const REALTIMEKIT_PRECONNECT_ORIGINS = [
  'https://api.realtime.cloudflare.com',
  'https://location.realtime.cloudflare.com',
] as const;

const PRECONNECT_ATTR = 'data-havita-intercom-preconnect';

export function preconnectRealtime(): void {
  if (!fastConnectEnabled() || typeof document === 'undefined') return;
  for (const origin of REALTIMEKIT_PRECONNECT_ORIGINS) {
    if (document.head.querySelector(`link[${PRECONNECT_ATTR}="${origin}"]`)) continue;
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    link.setAttribute(PRECONNECT_ATTR, origin);
    document.head.appendChild(link);
  }
}

export function removePreconnect(): void {
  if (typeof document === 'undefined') return;
  document.head.querySelectorAll(`link[${PRECONNECT_ATTR}]`).forEach((el) => el.remove());
}

type PreparedMedia = Awaited<ReturnType<typeof initRTKMedia>>;
const prepared = new Map<string, Promise<PreparedMedia | null>>();

/** Solo tras el gesto «Contestar». Devuelve false si la bandera está desactivada. */
export function prepareMicrophoneForCall(callId: string): boolean {
  if (!fastConnectEnabled() || !callId || prepared.has(callId)) return false;
  const promise = initRTKMedia({ audio: true, video: false })
    .then((media) => media ?? null)
    .catch(() => null); // sin micrómono preparado, init lo intentará por su cuenta
  prepared.set(callId, promise);
  return true;
}

/** Entrega (una sola vez) el micrófono preparado para esta llamada, o undefined si no hay. */
export function takePreparedMicrophone(callId: string): Promise<PreparedMedia | null> | undefined {
  const p = prepared.get(callId);
  prepared.delete(callId);
  return p;
}

/** Libera el micrófono preparado y no usado (aceptación fallida, llamada terminada antes del init). */
export async function releasePreparedMicrophone(callId: string, media?: PreparedMedia | null): Promise<void> {
  const target = media ?? (await takePreparedMicrophone(callId)) ?? null;
  if (!target) return;
  try {
    await target.disableAudio();
  } catch {
    /* ya deshabilitado */
  }
  for (const track of [target.audioTrack, target.rawAudioTrack]) {
    try {
      track?.stop();
    } catch {
      /* ya detenida */
    }
  }
}

/** Solo para pruebas. */
export function resetFastConnectState(): void {
  prepared.clear();
  removePreconnect();
}
