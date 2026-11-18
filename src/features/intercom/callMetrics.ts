/**
 * P8-A2 — Instrumentación de latencia de la citofonía.
 *
 * - Cada llamada tiene una traza en ESTE navegador, con un `traceId` aleatorio, más `callId`, `meetingId`, rol y
 *   comunidad cuando se conocen.
 * - Los tiempos son de `performance.now()`, el reloj monotónico del proceso. Los intervalos solo se calculan dentro de
 *   una misma traza, es decir, un mismo dispositivo.
 * - La hora de pared (`wallClock`) se guarda solo como referencia. Las horas de dos dispositivos distintos NO se
 *   restan, porque sus relojes no están sincronizados.
 * - Nunca se guardan tokens, SDP, direcciones IP, audio ni nombres de personas. El detalle opcional pasa por
 *   `sanitizeDetail`.
 * - Medir no cambia el comportamiento de la llamada: cada función atrapa sus propios errores.
 */
import { summarizeWebrtcDiagnostics } from './webrtcDiagnostics';

export type IntercomRole = 'CALLER' | 'RECIPIENT';

export const INTERCOM_METRIC_EVENTS = [
  'CALL_REQUESTED',
  'MEETING_CREATED',
  'RINGING',
  'RESIDENT_NOTIFIED',
  'ACCEPT_REQUESTED',
  'RESIDENT_ACCEPTED',
  'SDK_INITIALIZATION_STARTED',
  'SDK_INITIALIZATION_COMPLETED',
  'MICROPHONE_REQUEST_STARTED',
  'MICROPHONE_READY',
  'JOIN_STARTED',
  'JOIN_COMPLETED',
  'JOIN_RETRY',
  'ICE_CONNECTED',
  'LOCAL_AUDIO_PUBLISHED',
  'REMOTE_PARTICIPANT_JOINED',
  'REMOTE_AUDIO_TRACK_RECEIVED',
  'REMOTE_AUDIO_PLAYBACK_STARTED',
  'AUDIO_READY',
  'AUTOPLAY_BLOCKED',
  'NO_REMOTE_AUDIO_WARNING',
  'REMOTE_PARTICIPANT_LEFT',
  'MEDIA_ERROR',
  'CALL_ENDED',
  'MEETING_CLOSED',
] as const;

export type IntercomMetricEvent = (typeof INTERCOM_METRIC_EVENTS)[number];

export interface IntercomMark {
  event: IntercomMetricEvent;
  /** ms desde el inicio de la traza (reloj monotónico). */
  t: number;
  /** Hora de pared ISO, solo como referencia; no se resta entre dispositivos. */
  wallClock: string;
  detail?: string;
}

export interface IntercomTrace {
  traceId: string;
  role: IntercomRole;
  callId?: string;
  meetingId?: string;
  communityId?: string;
  origin: number;
  marks: IntercomMark[];
}

/** Repetibles: pueden darse varias veces en una llamada. El resto solo se registra la primera vez. */
const REPEATABLE: ReadonlySet<IntercomMetricEvent> = new Set([
  'REMOTE_PARTICIPANT_JOINED',
  'REMOTE_PARTICIPANT_LEFT',
  'AUTOPLAY_BLOCKED',
  'MEDIA_ERROR',
  'JOIN_RETRY',
]);

const MAX_TRACES = 20;
const traces: IntercomTrace[] = [];

const now = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();

const randomId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    /* sin crypto: se usa la alternativa */
  }
  return `t-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
};

const TOKENISH = /[A-Za-z0-9_\-+/=]{32,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const IPV4 = /\b\d{1,3}(?:\.\d{1,3}){3}\b/g;
const IPV6 = /\b(?:[0-9a-f]{1,4}:){2,7}[0-9a-f]{0,4}\b/gi;

/** Reduce un detalle a texto corto sin tokens, SDP ni direcciones IP. */
export function sanitizeDetail(detail: unknown): string | undefined {
  if (detail === undefined || detail === null) return undefined;
  let text = typeof detail === 'string' ? detail : String(detail);
  if (/\bv=0\b|a=candidate|a=fingerprint/i.test(text)) return '[sdp-redacted]';
  text = text.replace(TOKENISH, '[redacted]').replace(IPV4, '[ip]').replace(IPV6, '[ip]');
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

/** Crea una traza antes de conocer el callId (p. ej. al pulsar «Llamar»). */
export function createIntercomTrace(role: IntercomRole, communityId?: string): IntercomTrace {
  const trace: IntercomTrace = { traceId: randomId(), role, communityId, origin: now(), marks: [] };
  traces.push(trace);
  while (traces.length > MAX_TRACES) traces.shift();
  return trace;
}

/** Asocia la traza a la llamada y la reunión cuando el backend las devuelve. */
export function bindIntercomTrace(trace: IntercomTrace, callId?: string, meetingId?: string): IntercomTrace {
  if (callId) trace.callId = callId;
  if (meetingId) trace.meetingId = meetingId;
  return trace;
}

/** Traza de una llamada y un rol en este navegador; la crea si no existe. */
export function traceForCall(callId: string | undefined, role: IntercomRole, meetingId?: string): IntercomTrace {
  const existing = callId ? traces.find((t) => t.callId === callId && t.role === role) : undefined;
  if (existing) {
    if (meetingId && !existing.meetingId) existing.meetingId = meetingId;
    return existing;
  }
  return bindIntercomTrace(createIntercomTrace(role), callId, meetingId);
}

/** Registra un evento. Nunca lanza excepciones. */
export function markIntercom(trace: IntercomTrace | undefined, event: IntercomMetricEvent, detail?: unknown): void {
  try {
    if (!trace) return;
    if (!REPEATABLE.has(event) && trace.marks.some((m) => m.event === event)) return;
    trace.marks.push({
      event,
      t: Math.round((now() - trace.origin) * 10) / 10,
      wallClock: new Date().toISOString(),
      detail: sanitizeDetail(detail),
    });
  } catch {
    /* la medición nunca interrumpe la llamada */
  }
}

const at = (trace: IntercomTrace, event: IntercomMetricEvent): number | undefined =>
  trace.marks.find((m) => m.event === event)?.t;

const span = (trace: IntercomTrace, from: IntercomMetricEvent, to: IntercomMetricEvent): number | null => {
  const a = at(trace, from);
  const b = at(trace, to);
  return a === undefined || b === undefined ? null : Math.round((b - a) * 10) / 10;
};

export interface IntercomTraceSummary {
  traceId: string;
  role: IntercomRole;
  callId?: string;
  meetingId?: string;
  /** Intervalos en ms, todos medidos en este dispositivo; null si falta alguno de los dos eventos. */
  intervals: {
    acceptToSdkInitStart: number | null;
    sdkInit: number | null;
    microphone: number | null;
    join: number | null;
    joinToIceConnected: number | null;
    joinToRemoteParticipant: number | null;
    joinToRemoteAudio: number | null;
    remoteTrackToPlayback: number | null;
    acceptToAudioReady: number | null;
  };
  events: IntercomMetricEvent[];
}

export function summarizeIntercomTrace(trace: IntercomTrace): IntercomTraceSummary {
  return {
    traceId: trace.traceId,
    role: trace.role,
    callId: trace.callId,
    meetingId: trace.meetingId,
    intervals: {
      acceptToSdkInitStart: span(trace, 'RESIDENT_ACCEPTED', 'SDK_INITIALIZATION_STARTED'),
      sdkInit: span(trace, 'SDK_INITIALIZATION_STARTED', 'SDK_INITIALIZATION_COMPLETED'),
      microphone: span(trace, 'MICROPHONE_REQUEST_STARTED', 'MICROPHONE_READY'),
      join: span(trace, 'JOIN_STARTED', 'JOIN_COMPLETED'),
      joinToIceConnected: span(trace, 'JOIN_STARTED', 'ICE_CONNECTED'),
      joinToRemoteParticipant: span(trace, 'JOIN_COMPLETED', 'REMOTE_PARTICIPANT_JOINED'),
      joinToRemoteAudio: span(trace, 'JOIN_COMPLETED', 'REMOTE_AUDIO_PLAYBACK_STARTED'),
      remoteTrackToPlayback: span(trace, 'REMOTE_AUDIO_TRACK_RECEIVED', 'REMOTE_AUDIO_PLAYBACK_STARTED'),
      acceptToAudioReady: span(trace, 'RESIDENT_ACCEPTED', 'AUDIO_READY'),
    },
    events: trace.marks.map((m) => m.event),
  };
}

/** Copia de las trazas de este navegador (diagnóstico y pruebas reales autorizadas). */
export function listIntercomTraces(): IntercomTrace[] {
  return traces.map((t) => ({ ...t, marks: t.marks.map((m) => ({ ...m })) }));
}

/** Solo para pruebas. */
export function resetIntercomTraces(): void {
  traces.length = 0;
}

const debugEnabled = (): boolean => {
  try {
    if (import.meta.env?.DEV) return true;
    return typeof localStorage !== 'undefined' && localStorage.getItem('havita:intercom-debug') === '1';
  } catch {
    return false;
  }
};

/** Al terminar la llamada, publica el resumen en la consola, solo en desarrollo o con el modo diagnóstico activado. */
export function reportIntercomTrace(trace: IntercomTrace | undefined): void {
  try {
    if (!trace) return;
    // P8-A5: con VITE_INTERCOM_WEBRTC_DIAGNOSTICS, el resumen de red (sin IP, tokens ni SDP) se publica siempre.
    const network = summarizeWebrtcDiagnostics(trace);
    if (network) console.info('[IntercomWebRTC]', JSON.stringify({ traceId: trace.traceId, role: trace.role, ...network }));
    if (!debugEnabled()) return;
    console.info('[IntercomMetrics]', JSON.stringify(summarizeIntercomTrace(trace)));
  } catch {
    /* nunca interrumpe */
  }
}

// Acceso de diagnóstico desde la consola, sin datos sensibles: window.__havitaIntercomMetrics.list()
try {
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__havitaIntercomMetrics = {
      list: listIntercomTraces,
      summary: () => traces.map(summarizeIntercomTrace),
      // P8-A5: diagnóstico de red de cada traza (null si la bandera estaba desactivada en esa llamada).
      webrtc: () => traces.map((t) => ({ traceId: t.traceId, role: t.role, network: summarizeWebrtcDiagnostics(t) })),
    };
  }
} catch {
  /* sin window */
}
