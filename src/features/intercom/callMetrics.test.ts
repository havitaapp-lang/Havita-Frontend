import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bindIntercomTrace,
  createIntercomTrace,
  listIntercomTraces,
  markIntercom,
  resetIntercomTraces,
  sanitizeDetail,
  summarizeIntercomTrace,
  traceForCall,
} from './callMetrics';

describe('callMetrics (P8-A2)', () => {
  beforeEach(() => resetIntercomTraces());

  it('intervalos con el reloj monotónico del mismo proceso', () => {
    let t = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => t);
    const trace = createIntercomTrace('RECIPIENT');
    markIntercom(trace, 'RESIDENT_ACCEPTED');
    t = 1250; markIntercom(trace, 'SDK_INITIALIZATION_STARTED');
    t = 2250; markIntercom(trace, 'SDK_INITIALIZATION_COMPLETED');
    t = 2300; markIntercom(trace, 'JOIN_STARTED');
    t = 3100; markIntercom(trace, 'JOIN_COMPLETED');
    t = 3600; markIntercom(trace, 'REMOTE_AUDIO_TRACK_RECEIVED');
    t = 3650; markIntercom(trace, 'REMOTE_AUDIO_PLAYBACK_STARTED');
    markIntercom(trace, 'AUDIO_READY');
    const s = summarizeIntercomTrace(trace).intervals;
    expect(s).toMatchObject({ acceptToSdkInitStart: 250, sdkInit: 1000, join: 800, joinToRemoteAudio: 550, remoteTrackToPlayback: 50, acceptToAudioReady: 2650 });
    expect(s.microphone).toBeNull();
  });

  it('los eventos únicos no se duplican; los repetibles sí', () => {
    const trace = createIntercomTrace('CALLER');
    markIntercom(trace, 'JOIN_COMPLETED');
    markIntercom(trace, 'JOIN_COMPLETED');
    markIntercom(trace, 'REMOTE_PARTICIPANT_LEFT');
    markIntercom(trace, 'REMOTE_PARTICIPANT_LEFT');
    expect(trace.marks.map((m) => m.event)).toEqual(['JOIN_COMPLETED', 'REMOTE_PARTICIPANT_LEFT', 'REMOTE_PARTICIPANT_LEFT']);
  });

  it('una traza por llamada y rol; se reutiliza al asociar el callId', () => {
    const trace = createIntercomTrace('CALLER');
    bindIntercomTrace(trace, 'call-9', 'meet-9');
    expect(traceForCall('call-9', 'CALLER')).toBe(trace);
    expect(traceForCall('call-9', 'RECIPIENT')).not.toBe(trace);
    expect(listIntercomTraces()).toHaveLength(2);
  });

  it('el detalle nunca incluye tokens, JWT, SDP ni direcciones IP', () => {
    expect(sanitizeDetail('token abcdefghijklmnopqrstuvwxyz0123456789ABCDEF')).not.toMatch(/abcdefghijklmnop/);
    expect(sanitizeDetail('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig')).not.toContain('eyJ');
    expect(sanitizeDetail('v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\na=candidate:1')).toBe('[sdp-redacted]');
    expect(sanitizeDetail('host 192.168.1.20 failed')).toBe('host [ip] failed');
    expect(sanitizeDetail('x'.repeat(200))!.length).toBeLessThanOrEqual(80);
  });

  it('medir nunca lanza excepciones', () => {
    expect(() => markIntercom(undefined, 'CALL_ENDED')).not.toThrow();
  });

  it('conserva como máximo 20 trazas', () => {
    for (let i = 0; i < 25; i++) createIntercomTrace('CALLER');
    expect(listIntercomTraces()).toHaveLength(20);
  });
});
