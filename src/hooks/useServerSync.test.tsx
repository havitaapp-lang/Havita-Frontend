/**
 * P8-A — la conexión SSE (que entrega INTERCOM_CALL_RINGING al residente) debe abrirse al iniciar sesión sin recargar
 * la página. Antes el efecto dependía solo de la comunidad y no se conectaba tras un login sin recarga.
 */
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('../api/apiClient', () => ({ apiClient: api }));
const auth = vi.hoisted(() => ({ user: null as any }));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: auth.user, logout: vi.fn(), refreshProperties: vi.fn() }),
}));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));

import { useServerSync } from './useServerSync';

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  listeners = new Map<string, (e: MessageEvent) => void>();
  closed = false;
  onopen: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  url: string;
  constructor(url: string) { this.url = url; FakeEventSource.instances.push(this); }
  addEventListener(type: string, fn: (e: MessageEvent) => void) { this.listeners.set(type, fn); }
  close() { this.closed = true; }
}

beforeEach(() => {
  FakeEventSource.instances = [];
  (globalThis as any).EventSource = FakeEventSource;
  api.post.mockReset();
  api.post.mockResolvedValue({ ticket: 'ticket-sintetico' });
  auth.user = null;
});
afterEach(() => cleanup());

describe('useServerSync (P8-A)', () => {
  it('sin sesión no se conecta; al iniciar sesión SIN recargar se conecta y escucha la citofonía', async () => {
    const { rerender } = renderHook(({ authed }) => useServerSync('tenant-a', authed), { initialProps: { authed: false } });
    await new Promise((r) => setTimeout(r, 20));
    expect(api.post).not.toHaveBeenCalled();
    expect(FakeEventSource.instances).toHaveLength(0);

    auth.user = { id: 'resident-1', role: 'RESIDENT' };
    rerender({ authed: true });
    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
    expect(api.post).toHaveBeenCalledWith('/sync/stream-ticket');
    const es = FakeEventSource.instances[0];
    for (const type of ['INTERCOM_CALL_RINGING', 'INTERCOM_CALL_ACCEPTED', 'INTERCOM_CALL_CONNECTED', 'INTERCOM_CALL_REJECTED',
      'INTERCOM_CALL_CANCELLED', 'INTERCOM_CALL_ENDED', 'INTERCOM_CALL_MISSED']) {
      expect(es.listeners.has(type), type).toBe(true);
    }
  });

  it('INTERCOM_CALL_CONNECTED llega a la ventana como evento', async () => {
    auth.user = { id: 'resident-1', role: 'RESIDENT' };
    renderHook(() => useServerSync('tenant-a', true));
    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
    const received: any[] = [];
    const handler = (e: Event) => received.push((e as CustomEvent).detail);
    window.addEventListener('INTERCOM_CALL_CONNECTED', handler);
    FakeEventSource.instances[0].listeners.get('INTERCOM_CALL_CONNECTED')!(
      new MessageEvent('INTERCOM_CALL_CONNECTED', { data: JSON.stringify({ type: 'INTERCOM_CALL_CONNECTED', payload: { callId: 'c1' } }) }));
    window.removeEventListener('INTERCOM_CALL_CONNECTED', handler);
    expect(received).toEqual([{ callId: 'c1' }]);
  });

  it('al cerrar sesión cierra la conexión; con otro usuario abre una nueva', async () => {
    auth.user = { id: 'u1', role: 'RESIDENT' };
    const { rerender } = renderHook(({ authed }) => useServerSync('tenant-a', authed), { initialProps: { authed: true } });
    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
    auth.user = null;
    rerender({ authed: false });
    expect(FakeEventSource.instances[0].closed).toBe(true);
    auth.user = { id: 'u2', role: 'SECURITY' };
    rerender({ authed: true });
    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(2));
  });
});
