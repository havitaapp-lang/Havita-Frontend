/**
 * P8-A3 — Preparación anticipada del SDK de RealtimeKit mientras timbra (VITE_INTERCOM_EARLY_PREPARE='true';
 * desactivada por defecto).
 *
 * - El SDK se inicializa con el token del participante (`RealtimeKitClient.init`), SIN micrófono (`audio:false`) y SIN
 *   `join()`.
 * - La seguridad NO depende de este código. El backend crea la reunión en estado INACTIVE antes de emitir tokens y solo
 *   la activa al aceptar el residente autorizado. Según Cloudflare, nadie puede unirse a una reunión INACTIVE. Un
 *   cliente modificado que llamara a `join()` antes de tiempo sería rechazado por el servidor de Cloudflare; se verifica
 *   en las llamadas reales con `__havitaIntercomEarlyDebug.tryJoinBeforeAccept`.
 * - Tras aceptar: `enableAudio()` (captura con consentimiento) y `join()`, con reintentos breves mientras la activación
 *   se propaga.
 * - Si la llamada se rechaza, cancela o pierde, el cliente preparado se descarta (`leave()`). El backend borra los
 *   participantes, lo que revoca sus tokens.
 *
 * Depende de `@cloudflare/realtimekit` 2.0.3, la misma versión que usa internamente `@cloudflare/realtimekit-react`.
 */
import RealtimeKitClient from '@cloudflare/realtimekit';
import { markIntercom, type IntercomTrace } from './callMetrics';

export const earlyPrepareEnabled = (): boolean => {
  try {
    return import.meta.env.VITE_INTERCOM_EARLY_PREPARE === 'true';
  } catch {
    return false;
  }
};

/** Módulos del SDK que no usa la citofonía (los mismos que en IntercomActiveCallModal). */
export const INTERCOM_SDK_MODULES = {
  chat: false,
  poll: false,
  stage: false,
  plugin: false,
  recording: false,
  livestream: false,
  pip: false,
  connectedMeetings: false,
  tracing: false,
  devTools: { logs: false },
} as const;

type Client = Awaited<ReturnType<typeof RealtimeKitClient.init>>;
interface Entry {
  promise: Promise<Client | null>;
  token: string; // solo en memoria; nunca se registra
}
const prepared = new Map<string, Entry>();

/** Código del SDK y estado HTTP de un error del SDK, sin token ni datos personales (p. ej. «ERR0004:401»). */
export function errorSummary(err: any): string {
  const msg = String(err?.message ?? '');
  const code = msg.match(/ERR\d{4}/)?.[0] ?? String(err?.code ?? err?.name ?? 'error');
  const status = msg.match(/\((\d{3})\)/)?.[1] ?? '';
  const hint = /concurrent/i.test(msg) ? 'concurrent' : /inactive/i.test(msg) ? 'inactive' : '';
  return [code, status, hint].filter(Boolean).join(':');
}

/** Inicia la preparación (sin micrófono ni join). Devuelve false si está desactivada o ya en curso. */
export function preInitializeForCall(callId: string, token: string | undefined, trace?: IntercomTrace): boolean {
  if (!earlyPrepareEnabled() || !callId || !token || prepared.has(callId)) return false;
  markIntercom(trace, 'SDK_INITIALIZATION_STARTED', 'early');
  const promise = RealtimeKitClient.init({
    authToken: token,
    defaults: { audio: false, video: false },
    modules: INTERCOM_SDK_MODULES as any,
  })
    .then((client) => {
      markIntercom(trace, 'SDK_INITIALIZATION_COMPLETED', 'early');
      return client;
    })
    .catch((err: any) => {
      markIntercom(trace, 'MEDIA_ERROR', `early-init:${errorSummary(err)}`);
      return null;
    });
  prepared.set(callId, { promise, token });
  return true;
}

/** Entrega (una sola vez) el cliente preparado de esta llamada. */
export function takePreInitialized(callId: string): Promise<Client | null> | undefined {
  const entry = prepared.get(callId);
  prepared.delete(callId);
  return entry?.promise;
}

/** Descarta el cliente preparado y no usado (rechazo, cancelación, llamada perdida o desmontaje). */
export async function discardPreInitialized(callId: string): Promise<void> {
  const p = takePreInitialized(callId);
  if (!p) return;
  const client = await p;
  try {
    await client?.leave();
  } catch {
    /* no se había unido */
  }
}

/**
 * Tras aceptar: `join()` con reintentos breves. Si la activación aún no ha llegado a Cloudflare, el primer intento puede
 * fallar. Devuelve el número de intentos fallidos.
 */
export async function joinWithRetry(client: Client, attempts = 4, delayMs = 400): Promise<number> {
  let failures = 0;
  for (;;) {
    try {
      await client.join();
      return failures;
    } catch (err) {
      failures += 1;
      if (failures >= attempts) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

/** Solo para pruebas. */
export function resetEarlyPrepareState(): void {
  prepared.clear();
}

// Diagnóstico de seguridad SOLO en desarrollo y con `localStorage['havita:intercom-debug']='1'`. Simula un cliente
// modificado: con un cliente NUEVO y el mismo token, intenta unirse ANTES de aceptar. Debe ser rechazado por Cloudflare
// mientras la reunión esté INACTIVE.
try {
  if (import.meta.env?.DEV && typeof window !== 'undefined' && localStorage.getItem('havita:intercom-debug') === '1') {
    (window as unknown as Record<string, unknown>).__havitaIntercomEarlyDebug = {
      hasPrepared: (callId: string) => prepared.has(callId),
      tryJoinBeforeAccept: async (callId: string, timeoutMs = 12_000): Promise<string> => {
        const entry = prepared.get(callId);
        if (!entry) return 'NO_TOKEN';
        // Primero termina el init legítimo: el SDK rechaza dos init concurrentes en la misma página.
        const legit = await entry.promise;
        const legitState = legit ? 'legit-init-ok' : 'legit-init-failed';
        let attacker: Client | null = null;
        const t0 = performance.now();
        try {
          attacker = await RealtimeKitClient.init({ authToken: entry.token, defaults: { audio: false, video: false }, modules: INTERCOM_SDK_MODULES as any });
        } catch (e: any) {
          return `${legitState}; INIT_REJECTED:${errorSummary(e)}`;
        }
        try {
          let joined = false;
          attacker.self.on('roomJoined', () => { joined = true; });
          await Promise.race([
            attacker.join(),
            new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('join timeout'), { name: 'Timeout' })), timeoutMs)),
          ]);
          return `${legitState}; JOINED${joined ? '(roomJoined)' : ''} after ${Math.round(performance.now() - t0)}ms`;
        } catch (e: any) {
          return `${legitState}; JOIN_REJECTED:${errorSummary(e)}`;
        } finally {
          try { await attacker?.leave(); } catch { /* sin sala */ }
        }
      },
    };
  }
} catch {
  /* sin window o localStorage */
}
