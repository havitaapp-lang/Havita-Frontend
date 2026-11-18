/**
 * P8-A9 — Pruebas del modal de llamada con un cliente RealtimeKit SIMULADO.
 * Comprueban el orden y la lógica (listeners, audio remoto, autoplay, limpieza). NO miden latencia real de WebRTC.
 */
import React, { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IntercomCallResponse } from '../../services/intercomService';
import { listIntercomTraces, resetIntercomTraces } from './callMetrics';
import { prepareMicrophoneForCall, resetFastConnectState } from './fastConnect';

// ---- cliente simulado ------------------------------------------------------------------------------------------
type Handler = (...args: any[]) => void;
class FakeEmitter {
  handlers = new Map<string, Set<Handler>>();
  on(event: string, h: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(h);
    return this;
  }
  off(event: string, h: Handler) {
    this.handlers.get(event)?.delete(h);
    return this;
  }
  emit(event: string, ...args: any[]) {
    [...(this.handlers.get(event) ?? [])].forEach((h) => h(...args));
  }
  count() {
    let n = 0;
    this.handlers.forEach((s) => (n += s.size));
    return n;
  }
}
class FakeJoinedMap extends Map<string, any> {
  emitter = new FakeEmitter();
  on(e: string, h: Handler) { this.emitter.on(e, h); return this; }
  off(e: string, h: Handler) { this.emitter.off(e, h); return this; }
  emit(e: string, ...a: any[]) { this.emitter.emit(e, ...a); }
}

function makeClient() {
  const self = Object.assign(new FakeEmitter(), {
    audioEnabled: true,
    audioTrack: { id: 'local-track' },
    enableAudio: vi.fn(),
    disableAudio: vi.fn(),
  });
  const joined = new FakeJoinedMap();
  const meta = new FakeEmitter();
  const order: string[] = [];
  const client = {
    self,
    meta,
    participants: { joined },
    join: vi.fn(async () => {
      order.push(`join(listeners=${self.count() + joined.emitter.count() + meta.count()})`);
    }),
    leave: vi.fn(async () => {}),
    order,
  };
  return client;
}

const hook = vi.hoisted(() => ({
  client: null as any,
  initCalls: [] as any[],
  initError: null as Error | null,
  initGate: null as Promise<void> | null,
  initRTKMedia: null as any,
}));

vi.mock('@cloudflare/realtimekit-react', async () => {
  const ReactActual = await vi.importActual<typeof import('react')>('react');
  return {
    initRTKMedia: (...args: any[]) => hook.initRTKMedia(...args),
    useRealtimeKitClient: () => {
      const [meeting, setMeeting] = ReactActual.useState<any>();
      const init = ReactActual.useCallback(async (opts: any) => {
        hook.initCalls.push(opts);
        if (hook.initGate) await hook.initGate;
        if (hook.initError) throw hook.initError;
        setMeeting(hook.client);
        return hook.client;
      }, []);
      return [meeting, init];
    },
  };
});

const service = vi.hoisted(() => ({
  markConnected: vi.fn(),
  endCall: vi.fn(),
  cancelCall: vi.fn(),
  rejectCall: vi.fn(),
  getCallDetail: vi.fn(),
}));
vi.mock('../../services/intercomService', () => ({ intercomService: service }));
vi.mock('./ringtone', () => ({
  ringtoneAudio: { startOutgoingRingback: vi.fn(), startIncomingRingtone: vi.fn(), stop: vi.fn() },
}));

import { IntercomActiveCallModal, NO_REMOTE_AUDIO_WARNING_MS } from './IntercomActiveCallModal';

// ---- utilidades -------------------------------------------------------------------------------------------------
class FakeMediaStream {
  private tracks: any[];
  constructor(tracks: any[]) { this.tracks = tracks; }
  getAudioTracks() { return this.tracks; }
  getTracks() { return this.tracks; }
}

const baseCall = (over: Partial<IntercomCallResponse> = {}): IntercomCallResponse => ({
  callId: 'call-1',
  callerName: 'Portería',
  recipientName: 'Residente sintético',
  propertyId: 'prop-1',
  status: 'ACCEPTED',
  participantToken: 'tok-synthetic-not-real',
  meetingId: 'meeting-1',
  ...over,
});

const remoteTrack = { id: 'remote-audio-1', kind: 'audio' };
let playMock: ReturnType<typeof vi.fn>;

const events = (callId = 'call-1') => listIntercomTraces().find((t) => t.callId === callId)?.marks.map((m) => m.event) ?? [];
const statusText = () => screen.getAllByTestId('intercom-status').map((e) => e.textContent).join(' ');

beforeEach(() => {
  resetIntercomTraces();
  resetFastConnectState();
  hook.initRTKMedia = vi.fn(async () => null);
  hook.client = makeClient();
  hook.initCalls = [];
  hook.initError = null;
  hook.initGate = null;
  (globalThis as any).MediaStream = FakeMediaStream;
  playMock = vi.fn(() => Promise.resolve());
  Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: playMock });
  Object.values(service).forEach((f) => f.mockReset());
  service.markConnected.mockResolvedValue({});
  service.endCall.mockResolvedValue({});
  service.cancelCall.mockResolvedValue({});
  service.rejectCall.mockResolvedValue({});
  service.getCallDetail.mockReturnValue(new Promise(() => {}));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const joinedAndReady = async () => {
  await waitFor(() => expect(hook.client.join).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(service.markConnected).toHaveBeenCalledTimes(1));
};

// ---- pruebas ----------------------------------------------------------------------------------------------------
describe('IntercomActiveCallModal (SDK simulado)', () => {
  it('portería: NO inicializa el SDK ni se une mientras timbra; lo hace una sola vez al recibir ACCEPTED', async () => {
    render(<IntercomActiveCallModal call={baseCall({ status: 'RINGING' })} isCaller onClose={() => {}} />);
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(hook.initCalls).toHaveLength(0);
    expect(hook.client.join).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(new CustomEvent('INTERCOM_CALL_ACCEPTED', { detail: { callId: 'call-1', status: 'ACCEPTED' } }));
    });
    await joinedAndReady();
    expect(hook.initCalls).toHaveLength(1);
    expect(hook.initCalls[0].defaults).toEqual({ video: false, audio: true });
    expect(events()).toEqual(expect.arrayContaining(['RESIDENT_ACCEPTED', 'SDK_INITIALIZATION_STARTED', 'JOIN_COMPLETED']));
  });

  it('StrictMode: un solo init y un solo join para el mismo token', async () => {
    render(<StrictMode><IntercomActiveCallModal call={baseCall()} isCaller={false} onClose={() => {}} /></StrictMode>);
    await joinedAndReady();
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(hook.initCalls).toHaveLength(1);
    expect(hook.client.join).toHaveBeenCalledTimes(1);
  });

  it('registra los listeners del SDK ANTES de join() (antes nunca se registraban)', async () => {
    render(<IntercomActiveCallModal call={baseCall()} isCaller={false} onClose={() => {}} />);
    await joinedAndReady();
    const joinEntry = hook.client.order[0] as string;
    const listeners = Number(joinEntry.match(/listeners=(\d+)/)![1]);
    expect(listeners).toBeGreaterThanOrEqual(8);
  });

  it('audio remoto por evento audioUpdate: adjunta la pista, reproduce y solo entonces muestra «Conectado»', async () => {
    render(<IntercomActiveCallModal call={baseCall()} isCaller={false} onClose={() => {}} />);
    await joinedAndReady();
    expect(statusText()).toContain('Esperando audio del interlocutor');

    act(() => {
      hook.client.participants.joined.emit('audioUpdate', { id: 'peer' }, { audioEnabled: true, audioTrack: remoteTrack });
    });
    await waitFor(() => expect(statusText()).toContain('Conectado en tiempo real'));
    expect(playMock).toHaveBeenCalled();
    const audio = document.querySelector('audio') as any;
    expect(audio.srcObject.getAudioTracks()[0].id).toBe('remote-audio-1');
    expect(events()).toEqual(expect.arrayContaining(['REMOTE_AUDIO_TRACK_RECEIVED', 'REMOTE_AUDIO_PLAYBACK_STARTED', 'AUDIO_READY']));
  });

  it('pista ya publicada cuando se une (participantJoined con audio) también se reproduce', async () => {
    render(<IntercomActiveCallModal call={baseCall()} isCaller onClose={() => {}} />);
    await joinedAndReady();
    act(() => {
      hook.client.participants.joined.emit('participantJoined', { id: 'peer', audioEnabled: true, audioTrack: remoteTrack });
    });
    await waitFor(() => expect(statusText()).toContain('Conectado en tiempo real'));
    expect(events()).toContain('REMOTE_PARTICIPANT_JOINED');
  });

  it('sin audio remoto NO se finge la conexión: tras el plazo solo se avisa', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<IntercomActiveCallModal call={baseCall()} isCaller={false} onClose={() => {}} />);
    await joinedAndReady();
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(statusText()).toContain('Esperando audio del interlocutor');
    expect(statusText()).not.toContain('Conectado');
    await act(async () => { await vi.advanceTimersByTimeAsync(NO_REMOTE_AUDIO_WARNING_MS); });
    expect(statusText()).toContain('Sin audio del interlocutor todavía');
    expect(events()).toContain('NO_REMOTE_AUDIO_WARNING');
    expect(events()).not.toContain('AUDIO_READY');
  });

  it('autoplay bloqueado: se muestra «Activar audio» y el gesto del usuario reproduce el audio', async () => {
    playMock.mockImplementationOnce(() => Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' })));
    render(<IntercomActiveCallModal call={baseCall()} isCaller={false} onClose={() => {}} />);
    await joinedAndReady();
    act(() => {
      hook.client.participants.joined.emit('audioUpdate', { id: 'peer' }, { audioEnabled: true, audioTrack: remoteTrack });
    });
    const button = await screen.findByTestId('intercom-enable-audio');
    await waitFor(() => expect(statusText()).toContain('Activar audio'));
    const callsBefore = playMock.mock.calls.length;
    await act(async () => { await new Promise((r) => setTimeout(r, 450)); });
    expect(playMock.mock.calls.length).toBe(callsBefore); // sin reintentos automáticos en bucle

    fireEvent.click(button);
    await waitFor(() => expect(statusText()).toContain('Conectado en tiempo real'));
    expect(screen.queryByTestId('intercom-enable-audio')).toBeNull();
    expect(events()).toEqual(expect.arrayContaining(['AUTOPLAY_BLOCKED', 'AUDIO_READY']));
  });

  it('el interlocutor sale: tras el margen de reconexión se cuelga y se registra el fin en el backend', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<IntercomActiveCallModal call={baseCall()} isCaller onClose={() => {}} />);
    await joinedAndReady();
    act(() => { hook.client.participants.joined.emit('participantLeft', { id: 'peer' }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(service.endCall).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    await waitFor(() => expect(service.endCall).toHaveBeenCalledWith('call-1'));
    expect(hook.client.leave).toHaveBeenCalledTimes(1);
  });

  it('el interlocutor vuelve dentro del margen: no se cuelga', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<IntercomActiveCallModal call={baseCall()} isCaller onClose={() => {}} />);
    await joinedAndReady();
    act(() => { hook.client.participants.joined.emit('participantLeft', { id: 'peer' }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    act(() => { hook.client.participants.joined.emit('participantJoined', { id: 'peer' }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(service.endCall).not.toHaveBeenCalled();
  });

  it('INTERCOM_CALL_ENDED: sale de la sala una vez, suelta el audio y quita los listeners', async () => {
    render(<IntercomActiveCallModal call={baseCall()} isCaller onClose={() => {}} />);
    await joinedAndReady();
    act(() => {
      window.dispatchEvent(new CustomEvent('INTERCOM_CALL_ENDED', { detail: { callId: 'call-1', durationSeconds: 12 } }));
    });
    await waitFor(() => expect(statusText()).toContain('Llamada finalizada'));
    expect(hook.client.leave).toHaveBeenCalledTimes(1);
    expect(hook.client.self.count() + hook.client.participants.joined.emitter.count() + hook.client.meta.count()).toBe(0);
    expect((document.querySelector('audio') as any).srcObject).toBeNull();
    expect(events()).toEqual(expect.arrayContaining(['CALL_ENDED', 'MEETING_CLOSED']));
  });

  it('desmontaje: sale de la sala y quita todos los listeners', async () => {
    const { unmount } = render(<IntercomActiveCallModal call={baseCall()} isCaller={false} onClose={() => {}} />);
    await joinedAndReady();
    unmount();
    expect(hook.client.leave).toHaveBeenCalledTimes(1);
    expect(hook.client.self.count() + hook.client.participants.joined.emitter.count() + hook.client.meta.count()).toBe(0);
  });

  it('fallo del SDK al inicializar: muestra el error en vez de quedarse en «Conectando»', async () => {
    hook.initError = Object.assign(new Error('network'), { name: 'NetworkError' });
    render(<IntercomActiveCallModal call={baseCall()} isCaller={false} onClose={() => {}} />);
    await waitFor(() => expect(statusText()).toContain('No se pudo conectar el audio'));
    expect(hook.client.join).not.toHaveBeenCalled();
    expect(events()).toContain('MEDIA_ERROR');
  });

  it('colgar durante la inicialización: no entra en la sala y libera el SDK', async () => {
    let release!: () => void;
    hook.initGate = new Promise<void>((r) => { release = r; });
    render(<IntercomActiveCallModal call={baseCall()} isCaller={false} onClose={() => {}} />);
    await waitFor(() => expect(hook.initCalls).toHaveLength(1));
    fireEvent.click(screen.getByTitle('Colgar llamada'));
    await waitFor(() => expect(service.endCall).toHaveBeenCalledWith('call-1'));
    await act(async () => { release(); await new Promise((r) => setTimeout(r, 20)); });
    expect(hook.client.join).not.toHaveBeenCalled();
    expect(hook.client.leave).toHaveBeenCalled();
  });

  it('transporte WebRTC conectado: se registra como ICE_CONNECTED y LOCAL_AUDIO_PUBLISHED', async () => {
    render(<IntercomActiveCallModal call={baseCall()} isCaller={false} onClose={() => {}} />);
    await joinedAndReady();
    act(() => { hook.client.meta.emit('mediaConnectionUpdate', { transport: 'send', state: 'connected' }); });
    expect(events()).toEqual(expect.arrayContaining(['ICE_CONNECTED', 'LOCAL_AUDIO_PUBLISHED']));
  });

  it('markConnected se reintenta ante un fallo pasajero (el backend cierra las aceptadas que no conectan)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    service.markConnected.mockRejectedValueOnce(new Error('red')).mockResolvedValue({});
    render(<IntercomActiveCallModal call={baseCall()} isCaller={false} onClose={() => {}} />);
    await waitFor(() => expect(hook.client.join).toHaveBeenCalledTimes(1));
    await act(async () => { await vi.advanceTimersByTimeAsync(1200); });
    expect(service.markConnected).toHaveBeenCalledTimes(2);
  });

  it('las métricas nunca contienen el token del participante', async () => {
    render(<IntercomActiveCallModal call={baseCall()} isCaller={false} onClose={() => {}} />);
    await joinedAndReady();
    expect(JSON.stringify(listIntercomTraces())).not.toContain('tok-synthetic-not-real');
  });
});

describe('IntercomActiveCallModal con VITE_INTERCOM_FAST_CONNECT=true (SDK simulado)', () => {
  beforeEach(() => vi.stubEnv('VITE_INTERCOM_FAST_CONNECT', 'true'));
  afterEach(() => vi.unstubAllEnvs());

  it('usa el micrófono preparado al contestar como defaults.mediaHandler y no repite la petición de permiso', async () => {
    const media = { audioTrack: { id: 'mic', stop: vi.fn() }, rawAudioTrack: { stop: vi.fn() }, disableAudio: vi.fn(async () => {}) };
    hook.initRTKMedia = vi.fn(async () => media);
    const query = vi.fn(async () => ({ state: 'prompt' }));
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query } });
    expect(prepareMicrophoneForCall('call-1')).toBe(true);
    render(<IntercomActiveCallModal call={baseCall()} isCaller={false} onClose={() => {}} />);
    await joinedAndReady();
    expect(hook.initCalls[0].defaults.mediaHandler).toBe(media);
    expect(hook.initCalls[0].defaults.video).toBe(false);
    expect(query).not.toHaveBeenCalled();
    expect(media.disableAudio).not.toHaveBeenCalled();
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: undefined });
  });

  it('sin micrófono preparado (p. ej. la portería) sigue el camino normal sin mediaHandler', async () => {
    render(<IntercomActiveCallModal call={baseCall()} isCaller onClose={() => {}} />);
    await joinedAndReady();
    expect(hook.initCalls[0].defaults.mediaHandler).toBeUndefined();
  });

  it('si la llamada termina mientras se prepara el micrófono: se libera y no hay init ni join', async () => {
    const media = { audioTrack: { stop: vi.fn() }, rawAudioTrack: { stop: vi.fn() }, disableAudio: vi.fn(async () => {}) };
    let resolveMedia!: (m: unknown) => void;
    hook.initRTKMedia = vi.fn(() => new Promise((r) => { resolveMedia = r; }));
    prepareMicrophoneForCall('call-1');
    render(<IntercomActiveCallModal call={baseCall()} isCaller={false} onClose={() => {}} />);
    act(() => {
      window.dispatchEvent(new CustomEvent('INTERCOM_CALL_ENDED', { detail: { callId: 'call-1', durationSeconds: 0 } }));
    });
    await act(async () => { resolveMedia(media); await new Promise((r) => setTimeout(r, 20)); });
    expect(media.disableAudio).toHaveBeenCalled();
    expect(media.audioTrack.stop).toHaveBeenCalled();
    expect(hook.initCalls).toHaveLength(0);
    expect(hook.client.join).not.toHaveBeenCalled();
  });
});
