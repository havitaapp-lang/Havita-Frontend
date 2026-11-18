/**
 * P8-A5 — Diagnóstico WebRTC (VITE_INTERCOM_WEBRTC_DIAGNOSTICS). RTCPeerConnection, WebSocket y SDK SIMULADOS:
 * se comprueban la bandera, la extracción y el saneamiento de getStats(), y que nada de esto bloquea ni cambia la
 * llamada. La forma real de getStats() en Chromium, Firefox y WebKit se valida aparte (P8A5 §6, prueba de navegador).
 */
import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createIntercomTrace, markIntercom, reportIntercomTrace, resetIntercomTraces } from './callMetrics';
import {
  addressFamily,
  attachWebrtcDiagnostics,
  beginWebrtcDiagnostics,
  diagnosticsOf,
  endpointName,
  endWebrtcDiagnostics,
  iceServerLabel,
  parseStats,
  resetWebrtcDiagnostics,
  sampleOnce,
  summarizeWebrtcDiagnostics,
} from './webrtcDiagnostics';
import type { IntercomCallResponse } from '../../services/intercomService';

// ---- dobles de RTCPeerConnection y WebSocket -------------------------------------------------------------------
class FakePC extends EventTarget {
  static created: { args: unknown[] }[] = [];
  static report: Map<string, any> = new Map();
  static getStatsImpl: (() => Promise<Map<string, any>>) | null = null;
  signalingState = 'stable';
  iceGatheringState = 'new';
  iceConnectionState = 'new';
  connectionState = 'new';
  constructor(...args: unknown[]) {
    super();
    FakePC.created.push({ args });
  }
  getStats() {
    return FakePC.getStatsImpl ? FakePC.getStatsImpl() : Promise.resolve(FakePC.report);
  }
  set(prop: 'iceGatheringState' | 'iceConnectionState' | 'connectionState' | 'signalingState', value: string, event: string) {
    (this as any)[prop] = value;
    this.dispatchEvent(new Event(event));
  }
}
class FakeWS extends EventTarget {
  static created: unknown[] = [];
  constructor(...args: unknown[]) {
    super();
    FakeWS.created.push(args[0]);
  }
}

// Informe con la forma de Chrome (campos sensibles incluidos a propósito para comprobar que se descartan).
const chromeReport = () => new Map<string, any>([
  ['T01', { id: 'T01', type: 'transport', selectedCandidatePairId: 'CP1', iceState: 'connected', dtlsState: 'connected', iceRole: 'controlling', dtlsRole: 'client', tlsVersion: 'FEFD', dtlsCipher: 'TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256', srtpCipher: 'AES_CM_128_HMAC_SHA1_80', selectedCandidatePairChanges: 1, localCertificateId: 'CERT' }],
  ['CP1', { id: 'CP1', type: 'candidate-pair', localCandidateId: 'L1', remoteCandidateId: 'R1', state: 'succeeded', nominated: true, currentRoundTripTime: 0.042, totalRoundTripTime: 0.12, responsesReceived: 3, requestsSent: 3, availableOutgoingBitrate: 300000 }],
  ['CP2', { id: 'CP2', type: 'candidate-pair', localCandidateId: 'L2', remoteCandidateId: 'R1', state: 'failed' }],
  ['L1', { id: 'L1', type: 'local-candidate', candidateType: 'relay', protocol: 'udp', relayProtocol: 'tls', address: '192.168.1.20', port: 50000, url: 'turns:turn.cloudflare.com:443?transport=tcp', networkType: 'wifi', usernameFragment: 'ufragSECRET', foundation: '1' }],
  ['L2', { id: 'L2', type: 'local-candidate', candidateType: 'host', protocol: 'udp', address: 'a1b2c3d4-0000.local', port: 1 }],
  ['R1', { id: 'R1', type: 'remote-candidate', candidateType: 'host', protocol: 'udp', address: '2606:4700:abcd::1', port: 3478 }],
  ['OUT', { id: 'OUT', type: 'outbound-rtp', kind: 'audio', packetsSent: 50, codecId: 'C1' }],
  ['RIN', { id: 'RIN', type: 'remote-inbound-rtp', kind: 'audio', localId: 'OUT', roundTripTime: 0.04, fractionLost: 0 }],
  ['C1', { id: 'C1', type: 'codec', mimeType: 'audio/opus', sdpFmtpLine: 'minptime=10;useinbandfec=1' }],
  ['CERT', { id: 'CERT', type: 'certificate', fingerprint: 'AB:CD:EF:01', base64Certificate: 'MIIBsecretcert' }],
]);
const recvReport = (packets: number) => new Map<string, any>([
  ['T', { id: 'T', type: 'transport', selectedCandidatePairId: 'P', dtlsState: 'connected' }],
  // Forma de Firefox: sin selectedCandidatePairId en el transporte, con `selected` en el par.
  ['P', { id: 'P', type: 'candidate-pair', selected: true, state: 'succeeded', localCandidateId: 'L', remoteCandidateId: 'R', currentRoundTripTime: 0.02 }],
  ['L', { id: 'L', type: 'local-candidate', candidateType: 'srflx', protocol: 'udp', address: '203.0.113.7' }],
  ['R', { id: 'R', type: 'remote-candidate', candidateType: 'host', protocol: 'udp', address: '198.51.100.9' }],
  ['IN', { id: 'IN', type: 'inbound-rtp', kind: 'audio', packetsReceived: packets, packetsLost: 0, jitter: 0.003, jitterBufferDelay: 2, jitterBufferEmittedCount: 40, codecId: 'C' }],
  ['C', { id: 'C', type: 'codec', mimeType: 'audio/opus' }],
]);

const SENSITIVE = [/192\.168/, /2606:4700/, /203\.0\.113/, /198\.51\.100/, /\.local\b/, /ufragSECRET/, /turn\.cloudflare\.com/, /AB:CD/, /MIIB/, /"port"/, /credential/i, /username/i, /tok-synthetic/];
const expectSanitized = (value: unknown) => {
  const json = JSON.stringify(value);
  for (const re of SENSITIVE) expect(json).not.toMatch(re);
};

const win = window as unknown as Record<string, unknown>;
const originalPC = win.RTCPeerConnection;
const originalWS = win.WebSocket;

beforeEach(() => {
  resetIntercomTraces();
  resetWebrtcDiagnostics();
  FakePC.created = [];
  FakePC.report = chromeReport();
  FakePC.getStatsImpl = null;
  FakeWS.created = [];
  win.RTCPeerConnection = FakePC;
  win.WebSocket = FakeWS;
});

afterEach(() => {
  cleanup();
  resetWebrtcDiagnostics();
  win.RTCPeerConnection = originalPC;
  win.WebSocket = originalWS;
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

const fakeMeta = () => {
  const handlers = new Map<string, (...a: any[]) => void>();
  return {
    handlers,
    on: vi.fn((e: string, h: any) => handlers.set(e, h)),
    off: vi.fn((e: string) => handlers.delete(e)),
  };
};

// ---- bandera desactivada ---------------------------------------------------------------------------------------
describe('webrtcDiagnostics con la bandera DESACTIVADA (por defecto)', () => {
  it('no sustituye RTCPeerConnection ni WebSocket, no se suscribe y no produce resumen', () => {
    const trace = createIntercomTrace('RECIPIENT');
    beginWebrtcDiagnostics(trace);
    expect(win.RTCPeerConnection).toBe(FakePC);
    expect(win.WebSocket).toBe(FakeWS);
    const meta = fakeMeta();
    const off = attachWebrtcDiagnostics({ meta }, trace);
    expect(meta.on).not.toHaveBeenCalled();
    off();
    expect(diagnosticsOf(trace)).toBeUndefined();
    expect(summarizeWebrtcDiagnostics(trace)).toBeNull();
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    reportIntercomTrace(trace);
    expect(info.mock.calls.some((c) => c[0] === '[IntercomWebRTC]')).toBe(false);
  });
});

// ---- bandera activada ------------------------------------------------------------------------------------------
describe('webrtcDiagnostics con VITE_INTERCOM_WEBRTC_DIAGNOSTICS=true', () => {
  beforeEach(() => vi.stubEnv('VITE_INTERCOM_WEBRTC_DIAGNOSTICS', 'true'));

  it('la subclase llama al constructor nativo con LOS MISMOS argumentos y registra el ciclo de vida', () => {
    const trace = createIntercomTrace('RECIPIENT');
    markIntercom(trace, 'SDK_INITIALIZATION_STARTED');
    beginWebrtcDiagnostics(trace);
    expect(win.RTCPeerConnection).not.toBe(FakePC);

    const config = { iceServers: [{ urls: ['stun:stun.cloudflare.com:3478', 'turn:turn.cloudflare.com:3478?transport=udp', 'turns:turn.cloudflare.com:443?transport=tcp'], username: 'user-secret', credential: 'cred-secret' }] };
    const constraints = { optional: [{ googDscp: true }] };
    const Ctor = win.RTCPeerConnection as any;
    const pc = new Ctor(config, constraints);
    expect(pc).toBeInstanceOf(FakePC);
    expect(FakePC.created[0].args).toEqual([config, constraints]);

    pc.set('signalingState', 'have-local-offer', 'signalingstatechange');
    pc.set('iceGatheringState', 'gathering', 'icegatheringstatechange');
    pc.dispatchEvent(Object.assign(new Event('icecandidate'), { candidate: { type: 'host', protocol: 'udp', address: '10.0.0.5', candidate: 'candidate:1 1 udp 1 10.0.0.5 5000 typ host' } }));
    pc.dispatchEvent(Object.assign(new Event('icecandidate'), { candidate: { type: 'host', protocol: 'udp' } }));
    pc.dispatchEvent(Object.assign(new Event('icecandidate'), { candidate: { type: 'relay', protocol: 'udp' } }));
    pc.dispatchEvent(Object.assign(new Event('icecandidate'), { candidate: null }));
    pc.set('iceConnectionState', 'checking', 'iceconnectionstatechange');
    pc.set('iceConnectionState', 'connected', 'iceconnectionstatechange');
    pc.set('connectionState', 'connected', 'connectionstatechange');

    const tl = diagnosticsOf(trace)!.peerConnections[0];
    expect(tl.iceServers).toEqual(['stun:3478', 'turn:3478/udp', 'turns:443/tcp']);
    expect(tl.events.map((e) => e.event)).toEqual([
      'signaling:have-local-offer', 'gathering:gathering', 'candidate:host/udp', 'candidate:relay/udp', 'candidate:end',
      'ice:checking', 'ice:connected', 'connection:connected',
    ]);
    expectSanitized(diagnosticsOf(trace));
    expect(JSON.stringify(diagnosticsOf(trace))).not.toMatch(/10\.0\.0\.5|secret/);
  });

  it('las conexiones creadas fuera de una llamada diagnosticada no se asocian a ninguna traza', () => {
    const trace = createIntercomTrace('CALLER');
    beginWebrtcDiagnostics(trace);
    endWebrtcDiagnostics(trace);
    new (win.RTCPeerConnection as any)({});
    expect(diagnosticsOf(trace)!.peerConnections).toHaveLength(0);
    expect(FakePC.created).toHaveLength(1);
  });

  it('parseStats (forma Chrome): par seleccionado, tipos, RTT y DTLS, SIN direcciones, puertos, ufrag, huellas ni host TURN', () => {
    const snap = parseStats(chromeReport(), 100);
    expect(snap.direction).toBe('send');
    expect(snap.local).toEqual({ candidateType: 'relay', protocol: 'udp', relayProtocol: 'tls', addressFamily: 'ipv4', networkType: 'wifi', turn: 'turns:443/tcp' });
    expect(snap.remote).toMatchObject({ candidateType: 'host', protocol: 'udp', addressFamily: 'ipv6' });
    expect(snap.pair).toMatchObject({ state: 'succeeded', currentRoundTripTimeMs: 42, avgRoundTripTimeMs: 40, availableOutgoingBitrateKbps: 300 });
    expect(snap).toMatchObject({ dtlsState: 'connected', dtlsRole: 'client', iceRole: 'controlling' });
    expect(snap.localCandidates).toEqual({ 'relay/udp': 1, 'host/udp': 1 });
    expect(snap.candidatePairs).toEqual({ total: 2, succeeded: 1, failed: 1 });
    expect(snap.audioOut).toEqual({ packetsSent: 50, roundTripTimeMs: 40, fractionLost: 0, codec: 'audio/opus' });
    // La lista permitida no deja pasar los campos sensibles (el texto «port» tampoco: no hay ningún campo port).
    expectSanitized(snap);
  });

  it('parseStats: con varios outbound-rtp de audio toma el que lleva paquetes (caso observado en la llamada real 1)', () => {
    const report = chromeReport();
    report.set('OUT0', { id: 'OUT0', type: 'outbound-rtp', kind: 'audio', packetsSent: 0, codecId: 'C1' });
    const reordered = new Map([['OUT0', report.get('OUT0')], ...[...report].filter(([k]) => k !== 'OUT0')]);
    expect(parseStats(reordered, 1).audioOut?.packetsSent).toBe(50);
  });

  it('parseStats (forma Firefox): usa candidate-pair.selected y detecta el sentido de recepción', () => {
    const snap = parseStats(recvReport(12), 5);
    expect(snap.direction).toBe('recv');
    expect(snap.local?.candidateType).toBe('srflx');
    expect(snap.pair?.currentRoundTripTimeMs).toBe(20);
    expect(snap.audioIn).toMatchObject({ packetsReceived: 12, jitterMs: 3, jitterBufferMs: 50, codec: 'audio/opus' });
    expectSanitized(snap);
  });

  it('resumen: intervalos desde init/join, primer paquete por sentido y par de candidatos', async () => {
    const trace = createIntercomTrace('RECIPIENT');
    markIntercom(trace, 'SDK_INITIALIZATION_STARTED');
    beginWebrtcDiagnostics(trace);
    const Ctor = win.RTCPeerConnection as any;
    const send = new Ctor({ iceServers: [] });
    const recv = new Ctor({ iceServers: [] });
    markIntercom(trace, 'SDK_INITIALIZATION_COMPLETED');
    markIntercom(trace, 'JOIN_STARTED');
    send.set('iceConnectionState', 'checking', 'iceconnectionstatechange');
    send.set('iceConnectionState', 'connected', 'iceconnectionstatechange');
    let n = 0;
    send.getStats = () => Promise.resolve(chromeReport());
    recv.getStats = () => Promise.resolve(recvReport(n));
    await sampleOnce(trace);
    n = 7;
    await sampleOnce(trace);
    markIntercom(trace, 'REMOTE_AUDIO_PLAYBACK_STARTED');

    const s = summarizeWebrtcDiagnostics(trace)!;
    expect(s.send?.pc).toBe('pc1');
    expect(s.recv?.pc).toBe('pc2');
    expect(s.send?.selected?.local?.candidateType).toBe('relay');
    expect(s.recv?.selected?.local?.candidateType).toBe('srflx');
    expect(s.intervals.sdkInit).not.toBeNull();
    expect(s.intervals.joinStartToIceChecking).not.toBeNull();
    expect(s.intervals.joinStartToFirstLocalAudioPacket).not.toBeNull();
    expect(s.intervals.joinStartToFirstRemoteAudioPacket).not.toBeNull();
    expect(s.intervals.firstRemoteAudioPacketToPlayback).not.toBeNull();
    expect(s.send?.iceMs).not.toBeUndefined();
    expectSanitized(s);
  });

  it('un getStats() que falla se cuenta y no lanza; uno que no termina no bloquea attach ni la desconexión', async () => {
    vi.useFakeTimers();
    const trace = createIntercomTrace('CALLER');
    beginWebrtcDiagnostics(trace);
    new (win.RTCPeerConnection as any)({});
    FakePC.getStatsImpl = () => Promise.reject(new Error('closed'));
    await expect(sampleOnce(trace)).resolves.toBeUndefined();
    expect(diagnosticsOf(trace)!.samplingErrors).toBe(1);

    let calls = 0;
    FakePC.getStatsImpl = () => { calls += 1; return new Promise(() => {}); };
    const meta = fakeMeta();
    const off = attachWebrtcDiagnostics({ meta }, trace); // síncrono
    expect(meta.on).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(2000);
    expect(calls).toBe(1); // sin solapar muestras mientras la anterior sigue en curso
    off();
    expect(meta.off).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('eventos públicos del SDK: mediaConnectionUpdate, socketConnectionUpdate y poorConnection', () => {
    const trace = createIntercomTrace('CALLER');
    markIntercom(trace, 'JOIN_STARTED');
    beginWebrtcDiagnostics(trace);
    const meta = fakeMeta();
    const off = attachWebrtcDiagnostics({ meta }, trace);
    meta.handlers.get('socketConnectionUpdate')!({ state: 'connected', reconnected: false, reconnectionAttempt: 0 });
    meta.handlers.get('mediaConnectionUpdate')!({ transport: 'send', state: 'connected', sfuSessionId: 'sfu-id-not-logged' });
    meta.handlers.get('mediaConnectionUpdate')!({ transport: 'recv', state: 'connected' });
    meta.handlers.get('poorConnection')!({ score: 3 });
    off();
    const d = diagnosticsOf(trace)!;
    expect(d.sdkEvents.map((e) => e.event)).toEqual(['socket:connected', 'media:send:connected', 'media:recv:connected', 'poorConnection:3']);
    expect(JSON.stringify(d)).not.toContain('sfu-id-not-logged');
    expect(summarizeWebrtcDiagnostics(trace)!.intervals.joinStartToMediaConnected).not.toBeNull();
  });

  it('WebSocket: solo registra hosts de RealtimeKit, sin ruta ni consulta (pueden llevar el token)', () => {
    const trace = createIntercomTrace('RECIPIENT');
    beginWebrtcDiagnostics(trace);
    const WS = win.WebSocket as any;
    const ws = new WS('wss://socket-edge.realtime.cloudflare.com/ws?authToken=tok-synthetic-not-real');
    new WS('ws://localhost:5173/vite-hmr');
    expect(FakeWS.created).toHaveLength(2);
    ws.dispatchEvent(new Event('open'));
    const d = diagnosticsOf(trace)!;
    expect(d.sockets).toHaveLength(1);
    expect(d.sockets[0]).toMatchObject({ host: 'socket-edge.realtime.cloudflare.com' });
    expect(d.sockets[0].openAt).toBeDefined();
    expectSanitized(d);
  });

  it('utilidades de saneamiento', () => {
    expect(addressFamily('192.168.0.1')).toBe('ipv4');
    expect(addressFamily('fe80::1')).toBe('ipv6');
    expect(addressFamily('x.local')).toBe('mdns');
    expect(addressFamily(undefined)).toBe('hidden');
    expect(iceServerLabel('turn:user:pass@turn.example.com:80?transport=tcp')).toBe('turn:80/tcp');
    expect(iceServerLabel('stun:stun.cloudflare.com:3478')).toBe('stun:3478');
    expect(iceServerLabel('https://x')).toBeUndefined();
    expect(endpointName('https://api.realtime.cloudflare.com/v2/internals/participant-details?token=abc'))
      .toBe('api.realtime.cloudflare.com/v2/internals/participant-details');
    expect(endpointName('https://api.realtime.cloudflare.com/v2/meetings/3f2a1c9e-1111-2222-3333-444455556666/iceservers'))
      .toBe('api.realtime.cloudflare.com/v2/meetings/:id/iceservers');
  });

  it('reportIntercomTrace publica [IntercomWebRTC] sanitizado al terminar', () => {
    const trace = createIntercomTrace('RECIPIENT');
    beginWebrtcDiagnostics(trace);
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    reportIntercomTrace(trace);
    const call = info.mock.calls.find((c) => c[0] === '[IntercomWebRTC]');
    expect(call).toBeDefined();
    expectSanitized(JSON.parse(call![1] as string));
  });
});

// ---- integración con el modal (SDK simulado) ------------------------------------------------------------------
const hook = vi.hoisted(() => ({ client: null as any, initCalls: [] as any[], pcAtInit: null as unknown }));

vi.mock('@cloudflare/realtimekit-react', async () => {
  const ReactActual = await vi.importActual<typeof import('react')>('react');
  return {
    initRTKMedia: vi.fn(async () => null),
    useRealtimeKitClient: () => {
      const [meeting, setMeeting] = ReactActual.useState<any>();
      const init = ReactActual.useCallback(async (opts: any) => {
        hook.initCalls.push(opts);
        hook.pcAtInit = (window as any).RTCPeerConnection;
        // Como el SDK real: crea sus transportes durante init, por referencia global.
        new (window as any).RTCPeerConnection({ iceServers: [] });
        setMeeting(hook.client);
        return hook.client;
      }, []);
      return [meeting, init];
    },
  };
});
const service = vi.hoisted(() => ({
  markConnected: vi.fn(), endCall: vi.fn(), cancelCall: vi.fn(), rejectCall: vi.fn(), getCallDetail: vi.fn(),
}));
vi.mock('../../services/intercomService', () => ({ intercomService: service }));
vi.mock('./ringtone', () => ({ ringtoneAudio: { startOutgoingRingback: vi.fn(), startIncomingRingtone: vi.fn(), stop: vi.fn() } }));

import { IntercomActiveCallModal } from './IntercomActiveCallModal';

const makeClient = () => {
  const emitter = () => {
    const h = new Map<string, Set<(...a: any[]) => void>>();
    return {
      on: (e: string, f: any) => { if (!h.has(e)) h.set(e, new Set()); h.get(e)!.add(f); },
      off: (e: string, f: any) => { h.get(e)?.delete(f); },
      emit: (e: string, ...a: any[]) => [...(h.get(e) ?? [])].forEach((f) => f(...a)),
    };
  };
  const joined = Object.assign(new Map(), emitter());
  return {
    self: Object.assign(emitter(), { audioEnabled: true, audioTrack: { id: 'local' }, enableAudio: vi.fn(), disableAudio: vi.fn(), producers: [] }),
    meta: emitter(),
    participants: { joined },
    join: vi.fn(async () => {}),
    leave: vi.fn(async () => {}),
  };
};

const acceptedCall = (): IntercomCallResponse => ({
  callId: 'call-diag', callerName: 'Portería', recipientName: 'Residente sintético', propertyId: 'prop-1',
  status: 'ACCEPTED', participantToken: 'tok-synthetic-not-real', meetingId: 'meeting-1',
});

describe('IntercomActiveCallModal con el diagnóstico', () => {
  beforeEach(() => {
    hook.client = makeClient();
    hook.initCalls = [];
    hook.pcAtInit = null;
    Object.values(service).forEach((f) => f.mockReset());
    service.markConnected.mockResolvedValue({});
    service.endCall.mockResolvedValue({});
    service.getCallDetail.mockReturnValue(new Promise(() => {}));
    Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: vi.fn(() => Promise.resolve()) });
    (globalThis as any).MediaStream = class { getAudioTracks() { return []; } getTracks() { return []; } };
  });

  it('DESACTIVADO: sin panel, sin sustituir RTCPeerConnection; init y join como siempre', async () => {
    render(<IntercomActiveCallModal call={acceptedCall()} isCaller={false} onClose={() => {}} />);
    await waitFor(() => expect(hook.client.join).toHaveBeenCalledTimes(1));
    expect(hook.pcAtInit).toBe(FakePC);
    expect(screen.queryByTestId('intercom-webrtc-diagnostics')).toBeNull();
    expect(hook.initCalls[0].defaults).toEqual({ video: false, audio: true });
  });

  it('ACTIVADO: observa las conexiones creadas en init, muestra el panel y NO cambia las opciones de init ni el join', async () => {
    vi.stubEnv('VITE_INTERCOM_WEBRTC_DIAGNOSTICS', 'true');
    FakePC.getStatsImpl = () => new Promise(() => {}); // getStats que nunca responde: la llamada no debe esperarlo
    render(<IntercomActiveCallModal call={acceptedCall()} isCaller={false} onClose={() => {}} />);
    await waitFor(() => expect(hook.client.join).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(service.markConnected).toHaveBeenCalledTimes(1));
    expect(hook.pcAtInit).not.toBe(FakePC); // instalado ANTES de init
    expect(hook.initCalls).toHaveLength(1);
    expect(hook.initCalls[0].authToken).toBe('tok-synthetic-not-real');
    expect(hook.initCalls[0].defaults).toEqual({ video: false, audio: true });
    expect(screen.getByTestId('intercom-webrtc-diagnostics')).toBeTruthy();
    expect(screen.getByTestId('intercom-webrtc-diagnostics').textContent).not.toContain('tok-synthetic');

    act(() => hook.client.meta.emit('mediaConnectionUpdate', { transport: 'recv', state: 'connected' }));
    // Se mantiene el marcado existente (ICE_CONNECTED) y además se registra en el diagnóstico.
    const { listIntercomTraces } = await import('./callMetrics');
    const trace = listIntercomTraces().find((t) => t.callId === 'call-diag')!;
    expect(trace.marks.map((m) => m.event)).toContain('ICE_CONNECTED');
    expect((trace as any).webrtc.peerConnections).toHaveLength(1);
    expect((trace as any).webrtc.sdkEvents.map((e: any) => e.event)).toContain('media:recv:connected');
  });
});
