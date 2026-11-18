/**
 * P8-A2 — bandera VITE_INTERCOM_FAST_CONNECT (SDK SIMULADO).
 * - Sin bandera no cambia nada.
 * - Con ella, el micrófono solo se prepara tras «Contestar», nunca mientras timbra, en paralelo con POST /accept.
 * - Si la aceptación falla, se libera.
 * - La preconexión no lleva token y se retira al terminar.
 */
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({ initRTKMedia: vi.fn() }));
vi.mock('@cloudflare/realtimekit-react', () => ({ initRTKMedia: sdk.initRTKMedia, useRealtimeKitClient: () => [undefined, vi.fn()] }));
const service = vi.hoisted(() => ({ acceptCall: vi.fn(), rejectCall: vi.fn() }));
vi.mock('../../services/intercomService', () => ({ intercomService: service }));
vi.mock('./ringtone', () => ({ ringtoneAudio: { startIncomingRingtone: vi.fn(), startOutgoingRingback: vi.fn(), stop: vi.fn() } }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'resident-1', role: 'RESIDENT', name: 'Residente' } }) }));
vi.mock('./IntercomActiveCallModal', () => ({ IntercomActiveCallModal: () => <div data-testid="active-call" /> }));

import {
  fastConnectEnabled,
  prepareMicrophoneForCall,
  releasePreparedMicrophone,
  REALTIMEKIT_PRECONNECT_ORIGINS,
  resetFastConnectState,
  takePreparedMicrophone,
} from './fastConnect';
import { ResidentIncomingCallModal } from './ResidentIncomingCallModal';
import { listIntercomTraces, resetIntercomTraces } from './callMetrics';

const fakeMedia = () => {
  const audioTrack = { stop: vi.fn() };
  const rawAudioTrack = { stop: vi.fn() };
  return { audioTrack, rawAudioTrack, disableAudio: vi.fn(async () => {}) };
};
const preconnects = () => Array.from(document.head.querySelectorAll('link[rel="preconnect"]')).map((l) => (l as HTMLLinkElement).href.replace(/\/$/, ''));
const ring = (callId = 'call-1') =>
  act(() => {
    window.dispatchEvent(new CustomEvent('INTERCOM_CALL_RINGING', { detail: { callId, recipientUserId: 'resident-1', callerName: 'Portería' } }));
  });

beforeEach(() => {
  resetFastConnectState();
  resetIntercomTraces();
  Object.values(sdk).forEach((f) => f.mockReset());
  Object.values(service).forEach((f) => f.mockReset());
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('fastConnect sin bandera (por defecto)', () => {
  it('no prepara micrófono ni preconecta', async () => {
    expect(fastConnectEnabled()).toBe(false);
    expect(prepareMicrophoneForCall('call-1')).toBe(false);
    expect(sdk.initRTKMedia).not.toHaveBeenCalled();
    render(<ResidentIncomingCallModal />);
    ring();
    expect(preconnects()).toEqual([]);
  });
});

describe('fastConnect con VITE_INTERCOM_FAST_CONNECT=true', () => {
  beforeEach(() => vi.stubEnv('VITE_INTERCOM_FAST_CONNECT', 'true'));

  it('mientras timbra: solo preconexión (sin micrófono); al rechazar se retira', async () => {
    render(<ResidentIncomingCallModal />);
    ring();
    expect(await screen.findByText('Llamada de Citofonía')).toBeTruthy();
    expect(preconnects()).toEqual([...REALTIMEKIT_PRECONNECT_ORIGINS]);
    expect(document.head.querySelector('link[rel="preconnect"]')!.getAttribute('crossorigin')).toBe('anonymous');
    expect(sdk.initRTKMedia).not.toHaveBeenCalled();
    service.rejectCall.mockResolvedValue({});
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    expect(preconnects()).toEqual([]);
    expect(sdk.initRTKMedia).not.toHaveBeenCalled();
  });

  it('al pulsar «Contestar»: micrófono EN PARALELO con POST /accept y entregado a la llamada', async () => {
    const media = fakeMedia();
    let resolveAccept!: (v: unknown) => void;
    service.acceptCall.mockReturnValue(new Promise((r) => { resolveAccept = r; }));
    sdk.initRTKMedia.mockResolvedValue(media);
    render(<ResidentIncomingCallModal />);
    ring();
    fireEvent.click(await screen.findByRole('button', { name: 'Contestar' }));
    // La aceptación aún no ha respondido y el micrófono ya se está preparando.
    expect(sdk.initRTKMedia).toHaveBeenCalledWith({ audio: true, video: false });
    expect(service.acceptCall).toHaveBeenCalledWith('call-1');
    await act(async () => { resolveAccept({ callId: 'call-1', status: 'ACCEPTED', participantToken: 'tok-sintetico' }); });
    expect(await screen.findByTestId('active-call')).toBeTruthy();
    await expect(takePreparedMicrophone('call-1')).resolves.toBe(media);
    const ev = listIntercomTraces().find((t) => t.callId === 'call-1')!.marks.map((m) => m.event);
    expect(ev.indexOf('ACCEPT_REQUESTED')).toBeLessThan(ev.indexOf('MICROPHONE_REQUEST_STARTED'));
    expect(ev.indexOf('MICROPHONE_REQUEST_STARTED')).toBeLessThan(ev.indexOf('RESIDENT_ACCEPTED'));
  });

  it('si la aceptación falla (la llamada ya no timbra), el micrófono preparado se libera', async () => {
    const media = fakeMedia();
    sdk.initRTKMedia.mockResolvedValue(media);
    service.acceptCall.mockRejectedValue(Object.assign(new Error('409'), { code: 'CALL_NOT_RINGING' }));
    render(<ResidentIncomingCallModal />);
    ring();
    fireEvent.click(await screen.findByRole('button', { name: 'Contestar' }));
    await waitFor(() => expect(media.disableAudio).toHaveBeenCalled());
    expect(media.audioTrack.stop).toHaveBeenCalled();
    expect(media.rawAudioTrack.stop).toHaveBeenCalled();
    expect(takePreparedMicrophone('call-1')).toBeUndefined();
    expect(preconnects()).toEqual([]);
  });

  it('si el SDK no puede preparar el micrófono, no se rompe (init lo intentará por su cuenta)', async () => {
    sdk.initRTKMedia.mockRejectedValue(new Error('NotAllowedError'));
    expect(prepareMicrophoneForCall('call-9')).toBe(true);
    await expect(takePreparedMicrophone('call-9')).resolves.toBeNull();
    await expect(releasePreparedMicrophone('call-9')).resolves.toBeUndefined();
  });

  it('un mismo callId no prepara el micrófono dos veces', () => {
    sdk.initRTKMedia.mockResolvedValue(fakeMedia());
    expect(prepareMicrophoneForCall('call-2')).toBe(true);
    expect(prepareMicrophoneForCall('call-2')).toBe(false);
    expect(sdk.initRTKMedia).toHaveBeenCalledTimes(1);
  });
});
