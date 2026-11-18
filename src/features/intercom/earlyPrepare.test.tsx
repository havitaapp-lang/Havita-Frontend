/**
 * P8-A3 — preparación anticipada (VITE_INTERCOM_EARLY_PREPARE), con el SDK SIMULADO.
 *
 * Qué comprueba: init sin micrófono ni join mientras timbra; micrófono y join solo tras aceptar; descarte al
 * rechazar, cancelar o terminar.
 *
 * Qué NO comprueba: la barrera de seguridad real. La impone Cloudflare (reunión INACTIVE) y se verifica en las llamadas
 * reales, no aquí.
 */
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rtk = vi.hoisted(() => ({ init: vi.fn() }));
vi.mock('@cloudflare/realtimekit', () => ({ default: { init: rtk.init } }));
const hookState = vi.hoisted(() => ({ initMeeting: vi.fn() }));
vi.mock('@cloudflare/realtimekit-react', () => ({
  initRTKMedia: vi.fn(),
  useRealtimeKitClient: () => [undefined, hookState.initMeeting],
}));
const service = vi.hoisted(() => ({
  prepareCall: vi.fn(), acceptCall: vi.fn(), rejectCall: vi.fn(), markConnected: vi.fn(), endCall: vi.fn(),
  cancelCall: vi.fn(), getCallDetail: vi.fn(),
}));
vi.mock('../../services/intercomService', () => ({ intercomService: service }));
vi.mock('./ringtone', () => ({ ringtoneAudio: { startIncomingRingtone: vi.fn(), startOutgoingRingback: vi.fn(), stop: vi.fn() } }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'resident-1', role: 'RESIDENT', name: 'Residente' } }) }));

import {
  discardPreInitialized,
  earlyPrepareEnabled,
  joinWithRetry,
  preInitializeForCall,
  resetEarlyPrepareState,
  takePreInitialized,
} from './earlyPrepare';
import { ResidentIncomingCallModal } from './ResidentIncomingCallModal';
import { IntercomActiveCallModal } from './IntercomActiveCallModal';
import { listIntercomTraces, resetIntercomTraces } from './callMetrics';

type Handler = (...a: any[]) => void;
class Em {
  h = new Map<string, Set<Handler>>();
  on(e: string, f: Handler) { (this.h.get(e) ?? this.h.set(e, new Set()).get(e)!).add(f); return this; }
  off(e: string, f: Handler) { this.h.get(e)?.delete(f); return this; }
}
class Joined extends Map<string, any> { em = new Em(); on(e: string, f: Handler) { this.em.on(e, f); return this; } off(e: string, f: Handler) { this.em.off(e, f); return this; } }
const makeClient = () => {
  const order: string[] = [];
  const self = Object.assign(new Em(), {
    audioEnabled: false,
    enableAudio: vi.fn(async () => { order.push('enableAudio'); }),
    disableAudio: vi.fn(async () => {}),
  });
  return {
    order,
    self,
    meta: new Em(),
    participants: { joined: new Joined() },
    join: vi.fn(async () => { order.push('join'); }),
    leave: vi.fn(async () => { order.push('leave'); }),
  };
};

beforeEach(() => {
  resetEarlyPrepareState();
  resetIntercomTraces();
  rtk.init.mockReset();
  hookState.initMeeting.mockReset();
  Object.values(service).forEach((f) => f.mockReset());
  service.markConnected.mockResolvedValue({});
  service.getCallDetail.mockReturnValue(new Promise(() => {}));
  (globalThis as any).MediaStream = class { t: any[]; constructor(t: any[]) { this.t = t; } getAudioTracks() { return this.t; } };
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('earlyPrepare sin bandera (por defecto)', () => {
  it('no inicializa nada mientras timbra ni pide el token', async () => {
    expect(earlyPrepareEnabled()).toBe(false);
    expect(preInitializeForCall('c1', 'tok')).toBe(false);
    render(<ResidentIncomingCallModal />);
    act(() => { window.dispatchEvent(new CustomEvent('INTERCOM_CALL_RINGING', { detail: { callId: 'c1', recipientUserId: 'resident-1' } })); });
    await screen.findByText('Llamada de Citofonía');
    expect(service.prepareCall).not.toHaveBeenCalled();
    expect(rtk.init).not.toHaveBeenCalled();
  });
});

describe('earlyPrepare con VITE_INTERCOM_EARLY_PREPARE=true', () => {
  beforeEach(() => vi.stubEnv('VITE_INTERCOM_EARLY_PREPARE', 'true'));

  it('RINGING: pide el token al backend e inicializa el SDK SIN micrófono ni join', async () => {
    const client = makeClient();
    rtk.init.mockResolvedValue(client);
    service.prepareCall.mockResolvedValue({ callId: 'c1', participantToken: 'tok-sintetico', status: 'RINGING' });
    render(<ResidentIncomingCallModal />);
    act(() => { window.dispatchEvent(new CustomEvent('INTERCOM_CALL_RINGING', { detail: { callId: 'c1', recipientUserId: 'resident-1' } })); });
    await waitFor(() => expect(rtk.init).toHaveBeenCalledTimes(1));
    expect(service.prepareCall).toHaveBeenCalledWith('c1');
    expect(rtk.init.mock.calls[0][0].authToken).toBe('tok-sintetico');
    expect(rtk.init.mock.calls[0][0].defaults).toEqual({ audio: false, video: false });
    expect(client.join).not.toHaveBeenCalled();
    expect(client.self.enableAudio).not.toHaveBeenCalled();
    // Las métricas nunca guardan el token.
    expect(JSON.stringify(listIntercomTraces())).not.toContain('tok-sintetico');
  });

  it('rechazar descarta el cliente preparado (leave) sin haber abierto micrófono ni sala', async () => {
    const client = makeClient();
    rtk.init.mockResolvedValue(client);
    service.prepareCall.mockResolvedValue({ callId: 'c1', participantToken: 'tok', status: 'RINGING' });
    service.rejectCall.mockResolvedValue({});
    render(<ResidentIncomingCallModal />);
    act(() => { window.dispatchEvent(new CustomEvent('INTERCOM_CALL_RINGING', { detail: { callId: 'c1', recipientUserId: 'resident-1' } })); });
    await waitFor(() => expect(rtk.init).toHaveBeenCalled());
    fireEvent.click(await screen.findByRole('button', { name: 'Rechazar' }));
    await waitFor(() => expect(client.leave).toHaveBeenCalled());
    expect(client.join).not.toHaveBeenCalled();
    expect(client.self.enableAudio).not.toHaveBeenCalled();
  });

  it('cancelación por la portería: también se descarta', async () => {
    const client = makeClient();
    rtk.init.mockResolvedValue(client);
    service.prepareCall.mockResolvedValue({ callId: 'c1', participantToken: 'tok', status: 'RINGING' });
    render(<ResidentIncomingCallModal />);
    act(() => { window.dispatchEvent(new CustomEvent('INTERCOM_CALL_RINGING', { detail: { callId: 'c1', recipientUserId: 'resident-1' } })); });
    await waitFor(() => expect(rtk.init).toHaveBeenCalled());
    act(() => { window.dispatchEvent(new CustomEvent('INTERCOM_CALL_CANCELLED', { detail: { callId: 'c1' } })); });
    await waitFor(() => expect(client.leave).toHaveBeenCalled());
  });

  it('tras aceptar: reutiliza el cliente (sin nuevo init), abre el micrófono y DESPUÉS se une', async () => {
    const client = makeClient();
    rtk.init.mockResolvedValue(client);
    expect(preInitializeForCall('c1', 'tok')).toBe(true);
    render(<IntercomActiveCallModal call={{ callId: 'c1', status: 'ACCEPTED', participantToken: 'tok', callerName: 'P', recipientName: 'R', propertyId: 'p' } as any} isCaller={false} onClose={() => {}} />);
    await waitFor(() => expect(client.join).toHaveBeenCalledTimes(1));
    expect(hookState.initMeeting).not.toHaveBeenCalled();
    expect(client.order).toEqual(['enableAudio', 'join']);
    await waitFor(() => expect(service.markConnected).toHaveBeenCalledWith('c1'));
  });

  it('si la llamada termina antes de usar el cliente preparado: leave y nunca join ni micrófono', async () => {
    const client = makeClient();
    let resolve!: (c: unknown) => void;
    rtk.init.mockReturnValue(new Promise((r) => { resolve = r; }));
    preInitializeForCall('c1', 'tok');
    render(<IntercomActiveCallModal call={{ callId: 'c1', status: 'ACCEPTED', participantToken: 'tok', callerName: 'P', recipientName: 'R', propertyId: 'p' } as any} isCaller onClose={() => {}} />);
    act(() => { window.dispatchEvent(new CustomEvent('INTERCOM_CALL_ENDED', { detail: { callId: 'c1', durationSeconds: 0 } })); });
    await act(async () => { resolve(client); await new Promise((r) => setTimeout(r, 20)); });
    expect(client.leave).toHaveBeenCalled();
    expect(client.join).not.toHaveBeenCalled();
    expect(client.self.enableAudio).not.toHaveBeenCalled();
  });

  it('el init anticipado falla: se usa el flujo normal (init del hook tras aceptar)', async () => {
    rtk.init.mockRejectedValue(Object.assign(new Error('403'), { name: 'ClientError' }));
    const normal = makeClient();
    hookState.initMeeting.mockResolvedValue(normal);
    preInitializeForCall('c1', 'tok');
    render(<IntercomActiveCallModal call={{ callId: 'c1', status: 'ACCEPTED', participantToken: 'tok', callerName: 'P', recipientName: 'R', propertyId: 'p' } as any} isCaller={false} onClose={() => {}} />);
    await waitFor(() => expect(normal.join).toHaveBeenCalled());
    expect(hookState.initMeeting.mock.calls[0][0].defaults).toEqual({ video: false, audio: true });
  });

  it('joinWithRetry reintenta mientras la activación se propaga y falla tras el límite', async () => {
    const c = makeClient();
    c.join.mockRejectedValueOnce(new Error('inactive')).mockResolvedValueOnce(undefined);
    await expect(joinWithRetry(c as any, 3, 5)).resolves.toBe(1);
    const d = makeClient();
    d.join.mockRejectedValue(new Error('inactive'));
    await expect(joinWithRetry(d as any, 3, 5)).rejects.toThrow('inactive');
    expect(d.join).toHaveBeenCalledTimes(3);
  });

  it('un cliente preparado se entrega una sola vez; descartar sin cliente no falla', async () => {
    rtk.init.mockResolvedValue(makeClient());
    preInitializeForCall('c2', 'tok');
    expect(preInitializeForCall('c2', 'tok')).toBe(false);
    expect(takePreInitialized('c2')).toBeDefined();
    expect(takePreInitialized('c2')).toBeUndefined();
    await expect(discardPreInitialized('c-x')).resolves.toBeUndefined();
  });
});
