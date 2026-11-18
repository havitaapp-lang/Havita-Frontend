/**
 * P8-B — Llamada entrante del residente: recuperación sin SSE (al abrir, al volver a primer plano, al reconectar),
 * apertura desde el aviso push (`?intercomCall=` y mensaje del service worker), llamada ya terminada, varios
 * dispositivos y deduplicación. Servicios SIMULADOS; no hay audio ni push reales.
 */
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CALL = '3f2a1c9e-1111-4222-8333-444455556666';
const OTHER = '9b8a7c6d-1111-4222-8333-444455556666';

const auth = vi.hoisted(() => ({ user: { id: 'u-1', role: 'RESIDENT', name: 'Residente sintético' } as any }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }));

const svc = vi.hoisted(() => ({
  getIncomingCall: vi.fn(),
  getCallDetail: vi.fn(),
  acceptCall: vi.fn(),
  rejectCall: vi.fn(),
  prepareCall: vi.fn(),
}));
vi.mock('../../services/intercomService', () => ({ intercomService: svc }));

const push = vi.hoisted(() => ({
  getCurrentEndpoint: vi.fn(async () => 'https://push.example.test/ep-1'),
  closeCallNotifications: vi.fn(async () => {}),
}));
vi.mock('../../services/pushNotificationService', () => ({ pushNotificationService: push }));

const ring = vi.hoisted(() => ({ startIncomingRingtone: vi.fn(), startOutgoingRingback: vi.fn(), stop: vi.fn() }));
vi.mock('./ringtone', () => ({ ringtoneAudio: ring }));
vi.mock('./IntercomActiveCallModal', () => ({ IntercomActiveCallModal: () => <div data-testid="active-call">EN LLAMADA</div> }));
vi.mock('./fastConnect', () => ({
  preconnectRealtime: vi.fn(), prepareMicrophoneForCall: vi.fn(() => false),
  releasePreparedMicrophone: vi.fn(async () => {}), removePreconnect: vi.fn(),
}));
vi.mock('./earlyPrepare', () => ({
  discardPreInitialized: vi.fn(async () => {}), earlyPrepareEnabled: () => false, preInitializeForCall: vi.fn(),
}));

import { ResidentIncomingCallModal, SSE_OPEN_EVENT } from './ResidentIncomingCallModal';

const ringingCall = (id = CALL) => ({
  callId: id, status: 'RINGING', callerName: 'Portería Principal', recipientUserId: 'u-1',
  propertyNumber: '101', propertyTower: 'Torre 1',
});

const sw = new EventTarget();

beforeEach(() => {
  Object.values(svc).forEach((f) => f.mockReset());
  push.getCurrentEndpoint.mockClear();
  push.closeCallNotifications.mockClear();
  Object.values(ring).forEach((f) => f.mockClear());
  auth.user = { id: 'u-1', role: 'RESIDENT', name: 'Residente sintético' };
  svc.getIncomingCall.mockResolvedValue(null);
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: sw });
  window.history.replaceState(null, '', '/resident');
});

afterEach(() => {
  cleanup();
});

const contestar = () => screen.queryByRole('button', { name: 'Contestar' });

describe('ResidentIncomingCallModal — recuperación y aviso push (P8-B)', () => {
  it('al abrir la app recupera la llamada que timbra (sin SSE) y contesta con el endpoint de este dispositivo', async () => {
    svc.getIncomingCall.mockResolvedValue(ringingCall());
    svc.acceptCall.mockResolvedValue({ ...ringingCall(), status: 'ACCEPTED', participantToken: 'tok-synthetic' });
    render(<ResidentIncomingCallModal />);
    await waitFor(() => expect(contestar()).not.toBeNull());
    await waitFor(() => expect(push.getCurrentEndpoint).toHaveBeenCalled());
    expect(ring.startIncomingRingtone).toHaveBeenCalledTimes(1);
    await act(async () => { fireEvent.click(contestar()!); });
    expect(svc.acceptCall).toHaveBeenCalledWith(CALL, 'https://push.example.test/ep-1');
    await waitFor(() => expect(screen.getByTestId('active-call')).toBeTruthy());
  });

  it('enlace del aviso (?intercomCall=) con la llamada timbrando: la muestra y retira el parámetro de la URL', async () => {
    window.history.replaceState(null, '', `/resident?intercomCall=${CALL}`);
    svc.getCallDetail.mockResolvedValue(ringingCall());
    render(<ResidentIncomingCallModal />);
    await waitFor(() => expect(contestar()).not.toBeNull());
    expect(svc.getCallDetail).toHaveBeenCalledWith(CALL);
    expect(window.location.search).toBe('');
  });

  it('enlace de una llamada que YA terminó: aviso «ya terminó», nunca se ofrece contestar ni se acepta', async () => {
    window.history.replaceState(null, '', `/resident?intercomCall=${CALL}`);
    svc.getCallDetail.mockResolvedValue({ ...ringingCall(), status: 'CANCELLED' });
    render(<ResidentIncomingCallModal />);
    await waitFor(() => expect(screen.getByTestId('intercom-call-ended-notice')).toBeTruthy());
    expect(screen.getByText('La llamada de portería ya terminó.')).toBeTruthy();
    expect(contestar()).toBeNull();
    expect(svc.acceptCall).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));
    expect(screen.queryByTestId('intercom-call-ended-notice')).toBeNull();
  });

  it('StrictMode (efectos dobles en desarrollo): el enlace de una llamada terminada NO se pierde', async () => {
    window.history.replaceState(null, '', `/resident?intercomCall=${CALL}`);
    svc.getCallDetail.mockResolvedValue({ ...ringingCall(), status: 'MISSED' });
    render(<React.StrictMode><ResidentIncomingCallModal /></React.StrictMode>);
    await waitFor(() => expect(screen.getByTestId('intercom-call-ended-notice')).toBeTruthy());
    expect(contestar()).toBeNull();
    expect(window.location.search).toBe('');
  });

  it('enlace de una llamada ajena o inexistente (403/404): el mismo aviso genérico, sin contestar', async () => {
    window.history.replaceState(null, '', `/resident?intercomCall=${CALL}`);
    svc.getCallDetail.mockRejectedValue(Object.assign(new Error('forbidden'), { status: 403 }));
    render(<ResidentIncomingCallModal />);
    await waitFor(() => expect(screen.getByTestId('intercom-call-ended-notice')).toBeTruthy());
    expect(contestar()).toBeNull();
  });

  it('mensaje del service worker (aviso pulsado con la app abierta) abre esa llamada', async () => {
    svc.getCallDetail.mockResolvedValue(ringingCall());
    render(<ResidentIncomingCallModal />);
    await act(async () => { sw.dispatchEvent(new MessageEvent('message', { data: { type: 'INTERCOM_OPEN_CALL', callId: CALL } })); });
    await waitFor(() => expect(contestar()).not.toBeNull());
  });

  it('deduplicación: SSE y recuperación de la MISMA llamada muestran un solo modal y un solo tono', async () => {
    render(<ResidentIncomingCallModal />);
    await act(async () => {
      window.dispatchEvent(new CustomEvent('INTERCOM_CALL_RINGING', { detail: ringingCall() }));
    });
    svc.getIncomingCall.mockResolvedValue(ringingCall());
    await act(async () => { window.dispatchEvent(new Event(SSE_OPEN_EVENT)); });
    await act(async () => { sw.dispatchEvent(new MessageEvent('message', { data: { type: 'INTERCOM_PUSH', kind: 'RINGING', callId: CALL } })); });
    expect(screen.getAllByRole('button', { name: 'Contestar' })).toHaveLength(1);
    expect(ring.startIncomingRingtone).toHaveBeenCalledTimes(1);
  });

  it('reconexión del SSE y vuelta a primer plano recuperan una llamada perdida', async () => {
    render(<ResidentIncomingCallModal />);
    await waitFor(() => expect(svc.getIncomingCall).toHaveBeenCalledTimes(1));
    svc.getIncomingCall.mockResolvedValue(ringingCall());
    await act(async () => { window.dispatchEvent(new Event(SSE_OPEN_EVENT)); });
    await waitFor(() => expect(contestar()).not.toBeNull());
  });

  it('varios dispositivos: si se contesta en otro, este deja de timbrar e informa', async () => {
    svc.getIncomingCall.mockResolvedValue(ringingCall());
    render(<ResidentIncomingCallModal />);
    await waitFor(() => expect(contestar()).not.toBeNull());
    await act(async () => {
      window.dispatchEvent(new CustomEvent('INTERCOM_CALL_ACCEPTED', { detail: { callId: CALL, status: 'ACCEPTED' } }));
    });
    expect(contestar()).toBeNull();
    expect(ring.stop).toHaveBeenCalled();
    expect(screen.getByText('La llamada se atendió en otro dispositivo.')).toBeTruthy();
  });

  it('un evento de OTRA llamada no cierra la actual; cancelar la actual la cierra', async () => {
    svc.getIncomingCall.mockResolvedValue(ringingCall());
    render(<ResidentIncomingCallModal />);
    await waitFor(() => expect(contestar()).not.toBeNull());
    await act(async () => { window.dispatchEvent(new CustomEvent('INTERCOM_CALL_CANCELLED', { detail: { callId: OTHER } })); });
    expect(contestar()).not.toBeNull();
    await act(async () => { window.dispatchEvent(new CustomEvent('INTERCOM_CALL_CANCELLED', { detail: { callId: CALL } })); });
    expect(contestar()).toBeNull();
  });

  it('SIN SSE: el aviso de cancelación que llega por push (mensaje del SW) cierra la llamada mostrada', async () => {
    svc.getIncomingCall.mockResolvedValue(ringingCall());
    render(<ResidentIncomingCallModal />);
    await waitFor(() => expect(contestar()).not.toBeNull());
    // Otra llamada: no afecta.
    await act(async () => { sw.dispatchEvent(new MessageEvent('message', { data: { type: 'INTERCOM_PUSH', kind: 'CANCELLED', callId: OTHER } })); });
    expect(contestar()).not.toBeNull();
    await act(async () => { sw.dispatchEvent(new MessageEvent('message', { data: { type: 'INTERCOM_PUSH', kind: 'CANCELLED', callId: CALL } })); });
    expect(contestar()).toBeNull();
    expect(ring.stop).toHaveBeenCalled();
  });

  it('SIN SSE: perdida (MISSED) por push cierra; contestada en otro dispositivo por push cierra con aviso', async () => {
    svc.getIncomingCall.mockResolvedValue(ringingCall());
    render(<ResidentIncomingCallModal />);
    await waitFor(() => expect(contestar()).not.toBeNull());
    await act(async () => { sw.dispatchEvent(new MessageEvent('message', { data: { type: 'INTERCOM_PUSH', kind: 'ANSWERED', callId: CALL } })); });
    expect(contestar()).toBeNull();
    expect(screen.getByText('La llamada se atendió en otro dispositivo.')).toBeTruthy();
    cleanup();
    render(<ResidentIncomingCallModal />);
    await waitFor(() => expect(contestar()).not.toBeNull());
    await act(async () => { sw.dispatchEvent(new MessageEvent('message', { data: { type: 'INTERCOM_PUSH', kind: 'MISSED', callId: CALL } })); });
    expect(contestar()).toBeNull();
  });

  it('SIN SSE: al volver a primer plano se revalida la llamada mostrada; si ya no timbra, deja de ofrecer «Contestar»', async () => {
    svc.getIncomingCall.mockResolvedValue(ringingCall());
    svc.getCallDetail.mockResolvedValue(ringingCall());
    render(<ResidentIncomingCallModal />);
    await waitFor(() => expect(contestar()).not.toBeNull());
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(svc.getCallDetail).toHaveBeenCalledWith(CALL);
    expect(contestar()).not.toBeNull(); // sigue timbrando
    svc.getCallDetail.mockResolvedValue({ ...ringingCall(), status: 'CANCELLED' });
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    await waitFor(() => expect(contestar()).toBeNull());
  });

  it('F3 (iPhone): pulsar el aviso de una llamada YA mostrada la revalida; si fue cancelada, deja de ofrecer «Contestar»', async () => {
    svc.getIncomingCall.mockResolvedValue(ringingCall());
    render(<ResidentIncomingCallModal />);
    await waitFor(() => expect(contestar()).not.toBeNull());
    svc.getCallDetail.mockResolvedValue({ ...ringingCall(), status: 'CANCELLED' });
    await act(async () => { sw.dispatchEvent(new MessageEvent('message', { data: { type: 'INTERCOM_OPEN_CALL', callId: CALL } })); });
    await waitFor(() => expect(contestar()).toBeNull());
    expect(svc.getCallDetail).toHaveBeenCalledWith(CALL);
    expect(screen.getByText('La llamada de portería ya terminó.')).toBeTruthy();
  });

  it('F3: pulsar un aviso de FIN (sin callId) con la llamada aún en pantalla también la revalida y la cierra', async () => {
    svc.getIncomingCall.mockResolvedValue(ringingCall());
    render(<ResidentIncomingCallModal />);
    await waitFor(() => expect(contestar()).not.toBeNull());
    svc.getCallDetail.mockResolvedValue({ ...ringingCall(), status: 'CANCELLED' });
    await act(async () => { sw.dispatchEvent(new MessageEvent('message', { data: { type: 'INTERCOM_OPEN_CALL', callId: null } })); });
    await waitFor(() => expect(contestar()).toBeNull());
  });

  it('F3: si al pulsar la llamada mostrada SIGUE timbrando, se mantiene «Contestar»', async () => {
    svc.getIncomingCall.mockResolvedValue(ringingCall());
    svc.getCallDetail.mockResolvedValue(ringingCall());
    render(<ResidentIncomingCallModal />);
    await waitFor(() => expect(contestar()).not.toBeNull());
    await act(async () => { sw.dispatchEvent(new MessageEvent('message', { data: { type: 'INTERCOM_OPEN_CALL', callId: CALL } })); });
    expect(contestar()).not.toBeNull();
    expect(screen.queryByTestId('intercom-call-ended-notice')).toBeNull();
  });

  it('aceptar una llamada que dejó de timbrar (409): informa en vez de conectar', async () => {
    svc.getIncomingCall.mockResolvedValue(ringingCall());
    svc.acceptCall.mockRejectedValue(Object.assign(new Error('CALL_NOT_RINGING'), { status: 409 }));
    render(<ResidentIncomingCallModal />);
    await waitFor(() => expect(contestar()).not.toBeNull());
    await waitFor(() => expect(push.getCurrentEndpoint).toHaveBeenCalled());
    await act(async () => { fireEvent.click(contestar()!); });
    await waitFor(() => expect(screen.getByTestId('intercom-call-ended-notice')).toBeTruthy());
    expect(screen.queryByTestId('active-call')).toBeNull();
  });

  it('una llamada para OTRO usuario (por SSE) se ignora; un usuario que no es residente no consulta nada', async () => {
    render(<ResidentIncomingCallModal />);
    await act(async () => {
      window.dispatchEvent(new CustomEvent('INTERCOM_CALL_RINGING', { detail: { ...ringingCall(), recipientUserId: 'otro' } }));
    });
    expect(contestar()).toBeNull();
    cleanup();
    svc.getIncomingCall.mockClear();
    auth.user = { id: 'g-1', role: 'SECURITY', name: 'Portería' };
    render(<ResidentIncomingCallModal />);
    await act(async () => { await Promise.resolve(); });
    expect(svc.getIncomingCall).not.toHaveBeenCalled();
  });
});
