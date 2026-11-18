/**
 * P8-A5 — Diagnóstico de red WebRTC de la citofonía.
 *
 * Bandera: VITE_INTERCOM_WEBRTC_DIAGNOSTICS = 'true'. Desactivada por defecto; sin ella, ninguna función de este módulo
 * hace nada.
 *
 * Qué mide, solo con APIs públicas del navegador y del SDK:
 * - Ciclo de vida de cada RTCPeerConnection que crea el SDK durante la llamada: creación, recolección de candidatos,
 *   ICE, DTLS y señalización. Se registra con `addEventListener`, sin tocar los manejadores del SDK.
 * - `getStats()` de cada conexión:
 *   - par de candidatos seleccionado: tipo host/srflx/prflx/relay, protocolo UDP/TCP y protocolo hacia TURN;
 *   - RTT, estado DTLS y primeros paquetes de audio enviados y recibidos.
 * - Eventos públicos del SDK `meta.mediaConnectionUpdate`, `socketConnectionUpdate` y `poorConnection`.
 * - Resource Timing de las peticiones HTTP a RealtimeKit (`participant-details`, `iceservers`…) y apertura del
 *   WebSocket de señalización.
 *
 * Para observar las conexiones del SDK sin cambiar su código, mientras la bandera está activa
 * `window.RTCPeerConnection` y `window.WebSocket` se sustituyen por SUBCLASES que llaman al constructor nativo con los
 * mismos argumentos y solo añaden escuchas pasivas. El SDK las crea por referencia global (`new RTCPeerConnection(...)`,
 * index.es.js l. 22198 y 22389).
 *
 * Privacidad: nunca se guardan direcciones IP, puertos de cliente, usuarios ni credenciales TURN, SDP, `ufrag`,
 * huellas DTLS, tokens ni URL con consulta. De cada candidato solo se derivan el tipo, el protocolo y la familia de
 * dirección (ipv4/ipv6/mdns), sin la dirección.
 *
 * Rendimiento: nada de esto se espera desde el flujo de la llamada. `getStats()` es asíncrono, se muestrea cada 100 ms
 * hasta ver audio en ambos sentidos (máximo 20 s) y después cada 5 s. Todo error se atrapa y se cuenta.
 */
import type { IntercomMetricEvent, IntercomTrace } from './callMetrics';

export const webrtcDiagnosticsEnabled = (): boolean => {
  try {
    return import.meta.env.VITE_INTERCOM_WEBRTC_DIAGNOSTICS === 'true';
  } catch {
    return false;
  }
};

// ---- tipos -----------------------------------------------------------------------------------------------------

export type PcDirection = 'send' | 'recv' | 'unknown';
export type AddressFamily = 'ipv4' | 'ipv6' | 'mdns' | 'hidden';

export interface CandidateInfo {
  candidateType?: string;
  protocol?: string;
  /** Solo en candidatos relay locales: protocolo entre el navegador y el servidor TURN (udp, tcp o tls). */
  relayProtocol?: string;
  addressFamily?: AddressFamily;
  /** Chrome: wifi, cellular, ethernet… (no estándar; puede faltar). */
  networkType?: string;
  /** Relay local: esquema (turn o turns), puerto y transporte del servidor TURN usado, sin el host ni credenciales. */
  turn?: string;
}

export interface PcSnapshot {
  t: number;
  direction: PcDirection;
  iceState?: string;
  dtlsState?: string;
  iceRole?: string;
  dtlsRole?: string;
  tlsVersion?: string;
  dtlsCipher?: string;
  srtpCipher?: string;
  selectedCandidatePairChanges?: number;
  pair?: {
    state?: string;
    nominated?: boolean;
    currentRoundTripTimeMs?: number;
    avgRoundTripTimeMs?: number;
    requestsSent?: number;
    responsesReceived?: number;
    availableOutgoingBitrateKbps?: number;
  };
  local?: CandidateInfo;
  remote?: CandidateInfo;
  /** Recuento por «tipo/protocolo», p. ej. {"host/udp": 2, "relay/udp": 1}. */
  localCandidates: Record<string, number>;
  remoteCandidates: Record<string, number>;
  candidatePairs: { total: number; succeeded: number; failed: number };
  audioIn?: { packetsReceived?: number; packetsLost?: number; jitterMs?: number; jitterBufferMs?: number; codec?: string };
  audioOut?: { packetsSent?: number; roundTripTimeMs?: number; fractionLost?: number; codec?: string };
}

export interface PcTimeline {
  id: string;
  createdAt: number;
  /** Servidores ofrecidos al crearla, solo como «esquema:puerto/transporte» (sin host, usuario ni credencial). */
  iceServers: string[];
  events: { t: number; event: string }[];
  firstInboundAudioPacketAt?: number;
  firstOutboundAudioPacketAt?: number;
  snapshot?: PcSnapshot;
}

export interface SocketTimeline {
  host: string;
  createdAt: number;
  openAt?: number;
  closedAt?: number;
  closeCode?: number;
}

export interface HttpTiming {
  endpoint: string;
  startAt: number;
  durationMs: number;
  /** Fases de conexión; solo si el servidor envía Timing-Allow-Origin (si no, el navegador da 0 y se omiten). */
  dnsMs?: number;
  connectMs?: number;
  tlsMs?: number;
  ttfbMs?: number;
  protocol?: string;
}

export interface DiagnosticsEnvironment {
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  browser: 'chrome' | 'safari' | 'firefox' | 'edge' | 'samsung' | 'other';
  /** Network Information API: solo Chrome o Android; en iOS y Firefox, undefined. */
  connectionType?: string;
  effectiveType?: string;
  downlinkMbps?: number;
  rttMs?: number;
}

export interface WebrtcDiagnostics {
  environment: DiagnosticsEnvironment;
  peerConnections: PcTimeline[];
  sockets: SocketTimeline[];
  sdkEvents: { t: number; event: string }[];
  http: HttpTiming[];
  samplingErrors: number;
}

// ---- utilidades ------------------------------------------------------------------------------------------------

const now = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
const round = (n: number): number => Math.round(n * 10) / 10;
const rel = (trace: IntercomTrace, at: number = now()): number => round(at - trace.origin);
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 && v.length <= 40 ? v : undefined);
const MAX_EVENTS = 80;

const pushEvent = (list: { t: number; event: string }[], trace: IntercomTrace, event: string): void => {
  if (list.length < MAX_EVENTS) list.push({ t: rel(trace), event });
};

/** Familia de una dirección de candidato SIN conservarla. */
export function addressFamily(address: unknown): AddressFamily {
  if (typeof address !== 'string' || address === '') return 'hidden';
  if (address.endsWith('.local')) return 'mdns';
  if (address.includes(':')) return 'ipv6';
  return 'ipv4';
}

/** Resume una URL de servidor ICE como «esquema:puerto/transporte», sin host, usuario ni credencial. */
export function iceServerLabel(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined;
  const m = /^(stuns?|turns?):(?:\/\/)?(?:[^@/?]*@)?(\[[^\]]*\]|[^:/?]*)(?::(\d+))?(?:\?transport=(udp|tcp))?/i.exec(url.trim());
  if (!m) return undefined;
  const scheme = m[1].toLowerCase();
  const port = m[3] ?? (scheme === 'turns' || scheme === 'stuns' ? '5349' : '3478');
  const transport = m[4]?.toLowerCase() ?? (scheme === 'turns' ? 'tcp' : scheme === 'turn' ? 'udp' : undefined);
  return transport ? `${scheme}:${port}/${transport}` : `${scheme}:${port}`;
}

/** Nombre del recurso HTTP sin consulta y con los identificadores sustituidos: «host/v2/meetings/:id/…». */
export function endpointName(url: string): string | undefined {
  try {
    const u = new URL(url);
    const path = u.pathname
      .split('/')
      .map((seg) => (/^[0-9a-f-]{16,}$/i.test(seg) || /^\d+$/.test(seg) || /^[A-Za-z0-9_-]{24,}$/.test(seg) ? ':id' : seg))
      .join('/');
    return `${u.hostname}${path}`.slice(0, 120);
  } catch {
    return undefined;
  }
}

const isRealtimeHost = (host: string): boolean => /(^|\.)realtime\.cloudflare\.com$/i.test(host);

export function detectEnvironment(): DiagnosticsEnvironment {
  const env: DiagnosticsEnvironment = { platform: 'unknown', browser: 'other' };
  try {
    const ua = navigator.userAgent || '';
    const iPadOs = /Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1;
    env.platform = /iPhone|iPad|iPod/.test(ua) || iPadOs ? 'ios' : /Android/.test(ua) ? 'android' : ua ? 'desktop' : 'unknown';
    env.browser = /SamsungBrowser/.test(ua) ? 'samsung'
      : /Edg(A|iOS)?\//.test(ua) ? 'edge'
      : /FxiOS|Firefox\//.test(ua) ? 'firefox'
      : /CriOS|Chrome\//.test(ua) ? 'chrome'
      : /Safari\//.test(ua) ? 'safari' : 'other';
    const c = (navigator as unknown as { connection?: Record<string, unknown> }).connection;
    if (c) {
      env.connectionType = str(c.type);
      env.effectiveType = str(c.effectiveType);
      env.downlinkMbps = num(c.downlink);
      env.rttMs = num(c.rtt);
    }
  } catch {
    /* entorno no disponible */
  }
  return env;
}

// ---- estado ----------------------------------------------------------------------------------------------------

type Diagnosed = IntercomTrace & { webrtc?: WebrtcDiagnostics };

let activeTrace: Diagnosed | null = null;
const livePcs = new Map<Diagnosed, { pc: RTCPeerConnection; timeline: PcTimeline }[]>();
let natives: { pc?: typeof RTCPeerConnection; ws?: typeof WebSocket } | null = null;
let resourceObserver: PerformanceObserver | null = null;

export function diagnosticsOf(trace: IntercomTrace | null | undefined): WebrtcDiagnostics | undefined {
  return (trace as Diagnosed | null | undefined)?.webrtc;
}

const ensureDiagnostics = (trace: Diagnosed): WebrtcDiagnostics => {
  if (!trace.webrtc) {
    trace.webrtc = { environment: detectEnvironment(), peerConnections: [], sockets: [], sdkEvents: [], http: [], samplingErrors: 0 };
  }
  return trace.webrtc;
};

function trackPeerConnection(pc: RTCPeerConnection, config: RTCConfiguration | undefined): void {
  const trace = activeTrace;
  if (!trace) return; // conexión ajena a una llamada diagnosticada
  const diag = ensureDiagnostics(trace);
  const labels = new Set<string>();
  for (const server of config?.iceServers ?? []) {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    for (const u of urls) {
      const label = iceServerLabel(u);
      if (label) labels.add(label);
    }
  }
  const timeline: PcTimeline = {
    id: `pc${diag.peerConnections.length + 1}`,
    createdAt: rel(trace),
    iceServers: [...labels].sort(),
    events: [],
  };
  diag.peerConnections.push(timeline);
  const list = livePcs.get(trace) ?? [];
  list.push({ pc, timeline });
  livePcs.set(trace, list);

  const seenCandidates = new Set<string>();
  const on = (type: string, fn: (e: Event) => void) => {
    try {
      pc.addEventListener(type, fn);
    } catch {
      /* evento no soportado */
    }
  };
  on('signalingstatechange', () => pushEvent(timeline.events, trace, `signaling:${pc.signalingState}`));
  on('icegatheringstatechange', () => pushEvent(timeline.events, trace, `gathering:${pc.iceGatheringState}`));
  on('iceconnectionstatechange', () => pushEvent(timeline.events, trace, `ice:${pc.iceConnectionState}`));
  on('connectionstatechange', () => pushEvent(timeline.events, trace, `connection:${pc.connectionState}`));
  on('icecandidate', (e) => {
    const c = (e as RTCPeerConnectionIceEvent).candidate;
    const key = c ? `candidate:${c.type ?? '?'}/${c.protocol ?? '?'}` : 'candidate:end';
    if (seenCandidates.has(key)) return; // solo el primero de cada tipo
    seenCandidates.add(key);
    pushEvent(timeline.events, trace, key);
  });
}

function trackSocket(ws: WebSocket, url: unknown): void {
  const trace = activeTrace;
  if (!trace) return;
  let host = '';
  try {
    host = new URL(String(url)).hostname;
  } catch {
    return;
  }
  if (!isRealtimeHost(host)) return;
  const diag = ensureDiagnostics(trace);
  if (diag.sockets.length >= 10) return;
  const entry: SocketTimeline = { host, createdAt: rel(trace) };
  diag.sockets.push(entry);
  ws.addEventListener('open', () => { entry.openAt = rel(trace); });
  ws.addEventListener('close', (e) => {
    entry.closedAt = rel(trace);
    entry.closeCode = (e as CloseEvent).code;
  });
}

function installGlobals(): void {
  if (natives || typeof window === 'undefined') return;
  natives = {};
  const w = window as unknown as Record<string, unknown>;
  const NativePC = w.RTCPeerConnection as typeof RTCPeerConnection | undefined;
  if (typeof NativePC === 'function') {
    class TrackedPeerConnection extends NativePC {
      constructor(...args: unknown[]) {
        // Mismos argumentos, incluido el segundo heredado (restricciones propietarias) que pasa el SDK.
        super(...(args as [RTCConfiguration?]));
        try {
          trackPeerConnection(this, args[0] as RTCConfiguration | undefined);
        } catch {
          /* el diagnóstico nunca afecta a la conexión */
        }
      }
    }
    natives.pc = NativePC;
    w.RTCPeerConnection = TrackedPeerConnection;
  }
  const NativeWS = w.WebSocket as typeof WebSocket | undefined;
  if (typeof NativeWS === 'function') {
    class TrackedWebSocket extends NativeWS {
      constructor(...args: unknown[]) {
        super(...(args as [string | URL, (string | string[])?]));
        try {
          trackSocket(this, args[0]);
        } catch {
          /* idem */
        }
      }
    }
    natives.ws = NativeWS;
    w.WebSocket = TrackedWebSocket;
  }
}

function recordResource(trace: Diagnosed, entry: PerformanceResourceTiming): void {
  let host = '';
  try {
    host = new URL(entry.name).hostname;
  } catch {
    return;
  }
  if (!isRealtimeHost(host) || entry.startTime < trace.origin) return;
  const diag = ensureDiagnostics(trace);
  if (diag.http.length >= 60) return;
  const endpoint = endpointName(entry.name);
  if (!endpoint) return;
  const phase = (a: number, b: number) => (a > 0 && b > 0 && b >= a ? round(b - a) : undefined);
  diag.http.push({
    endpoint,
    startAt: rel(trace, entry.startTime),
    durationMs: round(entry.duration),
    dnsMs: phase(entry.domainLookupStart, entry.domainLookupEnd),
    connectMs: phase(entry.connectStart, entry.connectEnd),
    tlsMs: phase(entry.secureConnectionStart, entry.connectEnd),
    ttfbMs: phase(entry.requestStart, entry.responseStart),
    protocol: str(entry.nextHopProtocol),
  });
}

function startResourceObserver(trace: Diagnosed): void {
  try {
    resourceObserver?.disconnect();
    if (typeof PerformanceObserver === 'undefined') return;
    resourceObserver = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) recordResource(trace, e as PerformanceResourceTiming);
    });
    resourceObserver.observe({ type: 'resource', buffered: true });
  } catch {
    resourceObserver = null;
  }
}

// ---- API usada por el modal ------------------------------------------------------------------------------------

/**
 * Llamar justo antes de `RealtimeKitClient.init`. Con la bandera desactivada no hace nada (ni sustituye globales).
 * Es síncrono y no hace E/S.
 */
export function beginWebrtcDiagnostics(trace: IntercomTrace | null | undefined): void {
  if (!trace || !webrtcDiagnosticsEnabled()) return;
  try {
    ensureDiagnostics(trace as Diagnosed);
    activeTrace = trace as Diagnosed;
    installGlobals();
    startResourceObserver(trace as Diagnosed);
  } catch {
    /* sin diagnóstico */
  }
}

/** Termina la recogida de esta traza: no se asocian más conexiones y se sueltan las referencias. */
export function endWebrtcDiagnostics(trace: IntercomTrace | null | undefined): void {
  try {
    if (!trace) return;
    if (activeTrace === trace) {
      activeTrace = null;
      resourceObserver?.disconnect();
      resourceObserver = null;
    }
    livePcs.delete(trace as Diagnosed);
  } catch {
    /* nada */
  }
}

type Unsubscribe = () => void;
const subscribe = (target: any, event: string, handler: (...args: any[]) => void): Unsubscribe => {
  if (!target || typeof target.on !== 'function') return () => {};
  target.on(event, handler);
  return () => {
    try {
      if (typeof target.off === 'function') target.off(event, handler);
      else target.removeListener?.(event, handler);
    } catch {
      /* emisor cerrado */
    }
  };
};

const FAST_SAMPLE_MS = 100;
const FAST_PHASE_MAX_MS = 20_000;
const SLOW_SAMPLE_MS = 5_000;

/**
 * Tras `init`, con el cliente del SDK: escucha eventos públicos y muestrea `getStats()`. Devuelve la función que lo
 * detiene. Con la bandera desactivada devuelve una función vacía sin suscribirse a nada.
 */
export function attachWebrtcDiagnostics(client: any, trace: IntercomTrace | null | undefined): Unsubscribe {
  if (!trace || !client || !webrtcDiagnosticsEnabled()) return () => {};
  const t = trace as Diagnosed;
  const diag = ensureDiagnostics(t);
  const offs: Unsubscribe[] = [];
  const meta = client?.meta;
  offs.push(subscribe(meta, 'mediaConnectionUpdate', (u: any) => {
    pushEvent(diag.sdkEvents, t, `media:${str(u?.transport) ?? '?'}:${str(u?.state) ?? '?'}`);
  }));
  offs.push(subscribe(meta, 'socketConnectionUpdate', (u: any) => {
    pushEvent(diag.sdkEvents, t, `socket:${str(u?.state) ?? '?'}`);
  }));
  offs.push(subscribe(meta, 'poorConnection', (u: any) => {
    pushEvent(diag.sdkEvents, t, `poorConnection:${num(u?.score) ?? '?'}`);
  }));

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight = false;
  const startedAt = now();

  const schedule = () => {
    if (stopped) return;
    const done = audioSeenBothWays(diag);
    const fast = !done && now() - startedAt < FAST_PHASE_MAX_MS;
    timer = setTimeout(tick, fast ? FAST_SAMPLE_MS : SLOW_SAMPLE_MS);
  };
  const tick = () => {
    if (stopped) return;
    if (inFlight) return schedule();
    inFlight = true;
    sampleOnce(t, client)
      .catch(() => { diag.samplingErrors += 1; })
      .finally(() => {
        inFlight = false;
        schedule();
      });
  };
  timer = setTimeout(tick, 0);

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    offs.forEach((off) => off());
  };
}

const audioSeenBothWays = (diag: WebrtcDiagnostics): boolean =>
  diag.peerConnections.some((p) => p.firstInboundAudioPacketAt !== undefined) &&
  diag.peerConnections.some((p) => p.firstOutboundAudioPacketAt !== undefined);

/** Una ronda de `getStats()` sobre las conexiones vivas de la traza. Exportada para las pruebas. */
export async function sampleOnce(trace: IntercomTrace, client?: any): Promise<void> {
  const t = trace as Diagnosed;
  const diag = ensureDiagnostics(t);
  const list = livePcs.get(t) ?? [];
  if (list.length === 0) {
    await sampleProducersFallback(t, diag, client);
    return;
  }
  await Promise.all(list.map(async ({ pc, timeline }) => {
    if (pc.signalingState === 'closed') return;
    try {
      const report = await pc.getStats();
      applySnapshot(t, timeline, parseStats(report, rel(t)));
    } catch {
      diag.samplingErrors += 1;
    }
  }));
}

/**
 * Sin conexiones observadas (p. ej. si el SDK se cargó con otra referencia): API pública tipada
 * `client.self.producers[i].getStats()`, que solo cubre el sentido de envío.
 */
async function sampleProducersFallback(trace: Diagnosed, diag: WebrtcDiagnostics, client: any): Promise<void> {
  const producers: any[] = Array.isArray(client?.self?.producers) ? client.self.producers : [];
  const producer = producers.find((p) => p?.kind === 'audio' && typeof p.getStats === 'function');
  if (!producer) return;
  let timeline = diag.peerConnections.find((p) => p.id === 'producer-send');
  if (!timeline) {
    timeline = { id: 'producer-send', createdAt: rel(trace), iceServers: [], events: [] };
    diag.peerConnections.push(timeline);
  }
  applySnapshot(trace, timeline, parseStats(await producer.getStats(), rel(trace)));
}

function applySnapshot(trace: Diagnosed, timeline: PcTimeline, snap: PcSnapshot): void {
  timeline.snapshot = snap;
  if (timeline.firstInboundAudioPacketAt === undefined && (snap.audioIn?.packetsReceived ?? 0) > 0) {
    timeline.firstInboundAudioPacketAt = snap.t;
  }
  if (timeline.firstOutboundAudioPacketAt === undefined && (snap.audioOut?.packetsSent ?? 0) > 0) {
    timeline.firstOutboundAudioPacketAt = snap.t;
  }
}

const candidateKey = (s: any): string => `${str(s?.candidateType) ?? '?'}/${str(s?.protocol) ?? '?'}`;

function candidateInfo(s: any): CandidateInfo | undefined {
  if (!s) return undefined;
  return {
    candidateType: str(s.candidateType),
    protocol: str(s.protocol),
    relayProtocol: str(s.relayProtocol),
    addressFamily: addressFamily(s.address ?? s.ip),
    networkType: str(s.networkType),
    turn: s.candidateType === 'relay' ? iceServerLabel(s.url) : undefined,
  };
}

/** Extrae SOLO campos de la lista permitida de un RTCStatsReport. Exportada para las pruebas. */
export function parseStats(report: RTCStatsReport | Map<string, any>, t: number): PcSnapshot {
  const byId = new Map<string, any>();
  (report as Map<string, any>).forEach((value: any, key: string) => byId.set(key, value));
  const all = [...byId.values()];
  const snap: PcSnapshot = {
    t,
    direction: 'unknown',
    localCandidates: {},
    remoteCandidates: {},
    candidatePairs: { total: 0, succeeded: 0, failed: 0 },
  };

  const transport = all.find((s) => s.type === 'transport' && s.selectedCandidatePairId) ?? all.find((s) => s.type === 'transport');
  if (transport) {
    snap.iceState = str(transport.iceState);
    snap.dtlsState = str(transport.dtlsState);
    snap.iceRole = str(transport.iceRole);
    snap.dtlsRole = str(transport.dtlsRole);
    snap.tlsVersion = str(transport.tlsVersion);
    snap.dtlsCipher = str(transport.dtlsCipher);
    snap.srtpCipher = str(transport.srtpCipher);
    snap.selectedCandidatePairChanges = num(transport.selectedCandidatePairChanges);
  }

  const pairs = all.filter((s) => s.type === 'candidate-pair');
  snap.candidatePairs.total = pairs.length;
  snap.candidatePairs.succeeded = pairs.filter((p) => p.state === 'succeeded').length;
  snap.candidatePairs.failed = pairs.filter((p) => p.state === 'failed').length;
  // Chrome/Safari: transport.selectedCandidatePairId. Firefox: candidate-pair.selected.
  const pair = (transport?.selectedCandidatePairId && byId.get(transport.selectedCandidatePairId))
    || pairs.find((p) => p.selected === true)
    || pairs.find((p) => p.nominated === true && p.state === 'succeeded');
  if (pair) {
    const rtts = num(pair.totalRoundTripTime);
    const responses = num(pair.responsesReceived);
    snap.pair = {
      state: str(pair.state),
      nominated: typeof pair.nominated === 'boolean' ? pair.nominated : undefined,
      currentRoundTripTimeMs: num(pair.currentRoundTripTime) !== undefined ? round(pair.currentRoundTripTime * 1000) : undefined,
      avgRoundTripTimeMs: rtts !== undefined && responses ? round((rtts / responses) * 1000) : undefined,
      requestsSent: num(pair.requestsSent),
      responsesReceived: responses,
      availableOutgoingBitrateKbps: num(pair.availableOutgoingBitrate) !== undefined ? Math.round(pair.availableOutgoingBitrate / 1000) : undefined,
    };
    snap.local = candidateInfo(byId.get(pair.localCandidateId));
    snap.remote = candidateInfo(byId.get(pair.remoteCandidateId));
  }

  for (const s of all) {
    if (s.type === 'local-candidate') snap.localCandidates[candidateKey(s)] = (snap.localCandidates[candidateKey(s)] ?? 0) + 1;
    if (s.type === 'remote-candidate') snap.remoteCandidates[candidateKey(s)] = (snap.remoteCandidates[candidateKey(s)] ?? 0) + 1;
  }

  const codecOf = (s: any) => str(byId.get(s?.codecId)?.mimeType);
  const isAudio = (s: any) => s.kind === 'audio' || s.mediaType === 'audio';
  // El SDK puede tener varios RTP de audio en una conexión (transceptores reutilizados o inactivos): se toma el que más
  // paquetes lleva (observado en la llamada real 1 de P8-A5: el primer outbound-rtp tenía 0 paquetes).
  const busiest = (type: string, field: string) => all
    .filter((s) => s.type === type && isAudio(s))
    .sort((a, b) => (num(b[field]) ?? 0) - (num(a[field]) ?? 0))[0];
  const inbound = busiest('inbound-rtp', 'packetsReceived');
  const outbound = busiest('outbound-rtp', 'packetsSent');
  if (inbound) {
    const delay = num(inbound.jitterBufferDelay);
    const emitted = num(inbound.jitterBufferEmittedCount);
    snap.audioIn = {
      packetsReceived: num(inbound.packetsReceived),
      packetsLost: num(inbound.packetsLost),
      jitterMs: num(inbound.jitter) !== undefined ? round(inbound.jitter * 1000) : undefined,
      jitterBufferMs: delay !== undefined && emitted ? round((delay / emitted) * 1000) : undefined,
      codec: codecOf(inbound),
    };
  }
  if (outbound) {
    const remoteIn = all.find((s) => s.type === 'remote-inbound-rtp' && s.localId === outbound.id)
      ?? all.find((s) => s.type === 'remote-inbound-rtp' && isAudio(s));
    snap.audioOut = {
      packetsSent: num(outbound.packetsSent),
      roundTripTimeMs: num(remoteIn?.roundTripTime) !== undefined ? round(remoteIn.roundTripTime * 1000) : undefined,
      fractionLost: num(remoteIn?.fractionLost),
      codec: codecOf(outbound),
    };
  }
  snap.direction = outbound && !inbound ? 'send' : inbound && !outbound ? 'recv' : outbound && inbound ? 'unknown' : 'unknown';
  return snap;
}

// ---- resumen ---------------------------------------------------------------------------------------------------

export interface WebrtcDirectionSummary {
  pc: string;
  /** Todos los tiempos en ms desde el inicio de `init` en este dispositivo (negativo = antes). */
  createdAt: number;
  firstCandidateAt?: number;
  gatheringCompleteAt?: number;
  iceCheckingAt?: number;
  iceConnectedAt?: number;
  dtlsConnectedAt?: number;
  firstAudioPacketAt?: number;
  /** checking → connected (ICE) y ICE conectado → connectionState «connected» (DTLS). */
  iceMs?: number;
  dtlsMs?: number;
  iceServers: string[];
  selected?: { local?: CandidateInfo; remote?: CandidateInfo; rttMs?: number; dtlsState?: string; tlsVersion?: string };
  candidates?: { local: Record<string, number>; remote: Record<string, number>; pairs: PcSnapshot['candidatePairs'] };
  audio?: PcSnapshot['audioIn'] | PcSnapshot['audioOut'];
}

export interface WebrtcDiagnosticsSummary {
  environment: DiagnosticsEnvironment;
  /** Intervalos en ms, todos en este dispositivo; null si falta un extremo. */
  intervals: {
    sdkInit: number | null;
    initStartToSocketOpen: number | null;
    initStartToFirstPeerConnection: number | null;
    joinStartToIceChecking: number | null;
    joinStartToMediaConnected: number | null;
    joinStartToFirstRemoteAudioPacket: number | null;
    firstRemoteAudioPacketToPlayback: number | null;
    joinStartToFirstLocalAudioPacket: number | null;
  };
  send?: WebrtcDirectionSummary;
  recv?: WebrtcDirectionSummary;
  others: number;
  http: HttpTiming[];
  sockets: SocketTimeline[];
  sdkEvents: { t: number; event: string }[];
  samplingErrors: number;
  /** Precisión del muestreo de «primer paquete»: hasta este margen de retraso. */
  packetDetectionResolutionMs: number;
}

const markAt = (trace: IntercomTrace, e: IntercomMetricEvent): number | undefined => trace.marks.find((m) => m.event === e)?.t;
const diff = (a?: number, b?: number): number | null => (a === undefined || b === undefined ? null : round(b - a));
const firstEvent = (p: PcTimeline, ...names: string[]): number | undefined => p.events.find((e) => names.includes(e.event))?.t;

export function summarizeWebrtcDiagnostics(trace: IntercomTrace | null | undefined): WebrtcDiagnosticsSummary | null {
  const diag = diagnosticsOf(trace);
  if (!trace || !diag) return null;
  const initStart = markAt(trace, 'SDK_INITIALIZATION_STARTED');
  const base = initStart ?? 0;
  const joinStart = markAt(trace, 'JOIN_STARTED');
  const playback = markAt(trace, 'REMOTE_AUDIO_PLAYBACK_STARTED');
  const r = (v?: number) => (v === undefined ? undefined : round(v - base));

  const direction = (p: PcTimeline): WebrtcDirectionSummary => {
    const checking = firstEvent(p, 'ice:checking');
    const connected = firstEvent(p, 'ice:connected', 'ice:completed');
    const dtls = firstEvent(p, 'connection:connected');
    const snap = p.snapshot;
    return {
      pc: p.id,
      createdAt: r(p.createdAt)!,
      firstCandidateAt: r(p.events.find((e) => e.event.startsWith('candidate:') && e.event !== 'candidate:end')?.t),
      gatheringCompleteAt: r(firstEvent(p, 'gathering:complete')),
      iceCheckingAt: r(checking),
      iceConnectedAt: r(connected),
      dtlsConnectedAt: r(dtls),
      firstAudioPacketAt: r(p.firstInboundAudioPacketAt ?? p.firstOutboundAudioPacketAt),
      iceMs: diff(checking, connected) ?? undefined,
      dtlsMs: diff(connected, dtls) ?? undefined,
      iceServers: p.iceServers,
      selected: snap ? { local: snap.local, remote: snap.remote, rttMs: snap.pair?.currentRoundTripTimeMs ?? snap.pair?.avgRoundTripTimeMs, dtlsState: snap.dtlsState, tlsVersion: snap.tlsVersion } : undefined,
      candidates: snap ? { local: snap.localCandidates, remote: snap.remoteCandidates, pairs: snap.candidatePairs } : undefined,
      audio: snap ? snap.audioIn ?? snap.audioOut : undefined,
    };
  };

  const pcs = diag.peerConnections;
  const send = pcs.find((p) => p.snapshot?.direction === 'send' || p.firstOutboundAudioPacketAt !== undefined);
  const recv = pcs.find((p) => p !== send && (p.snapshot?.direction === 'recv' || p.firstInboundAudioPacketAt !== undefined));
  const firstPc = pcs.length ? Math.min(...pcs.filter((p) => p.id !== 'producer-send').map((p) => p.createdAt)) : undefined;
  const mediaConnected = ['send', 'recv'].map((d) => diag.sdkEvents.find((e) => e.event === `media:${d}:connected`)?.t);
  const bothConnected = mediaConnected.every((v) => v !== undefined) ? Math.max(...(mediaConnected as number[])) : undefined;
  const checkingTimes = pcs.map((p) => firstEvent(p, 'ice:checking')).filter((v): v is number => v !== undefined);
  const socket = diag.sockets[0];

  return {
    environment: diag.environment,
    intervals: {
      sdkInit: diff(initStart, markAt(trace, 'SDK_INITIALIZATION_COMPLETED')),
      initStartToSocketOpen: diff(initStart, socket?.openAt),
      initStartToFirstPeerConnection: diff(initStart, Number.isFinite(firstPc) ? firstPc : undefined),
      joinStartToIceChecking: diff(joinStart, checkingTimes.length ? Math.min(...checkingTimes) : undefined),
      joinStartToMediaConnected: diff(joinStart, bothConnected),
      joinStartToFirstRemoteAudioPacket: diff(joinStart, recv?.firstInboundAudioPacketAt),
      firstRemoteAudioPacketToPlayback: diff(recv?.firstInboundAudioPacketAt, playback),
      joinStartToFirstLocalAudioPacket: diff(joinStart, send?.firstOutboundAudioPacketAt),
    },
    send: send ? direction(send) : undefined,
    recv: recv ? direction(recv) : undefined,
    others: pcs.filter((p) => p !== send && p !== recv).length,
    http: diag.http,
    sockets: diag.sockets,
    sdkEvents: diag.sdkEvents,
    samplingErrors: diag.samplingErrors,
    packetDetectionResolutionMs: FAST_SAMPLE_MS,
  };
}

/** Solo para pruebas: restaura las clases nativas y limpia el estado. */
export function resetWebrtcDiagnostics(): void {
  try {
    if (natives && typeof window !== 'undefined') {
      const w = window as unknown as Record<string, unknown>;
      if (natives.pc) w.RTCPeerConnection = natives.pc;
      if (natives.ws) w.WebSocket = natives.ws;
    }
  } catch {
    /* nada */
  }
  natives = null;
  activeTrace = null;
  livePcs.clear();
  resourceObserver?.disconnect();
  resourceObserver = null;
}
