/**
 * P8-B — `public/sw-push.js` (manejadores de push del service worker) ejecutado en un ámbito de SW SIMULADO.
 * Comprueba el aviso de llamada (texto fijo sin datos personales), la sustitución por tag, el aviso tardío, los
 * recibos y la apertura de la llamada al pulsar. No comprueba la entrega real del sistema operativo.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Contenido literal del archivo servido en /sw-push.js (importación «?raw» de Vite).
import SOURCE from '../../../public/sw-push.js?raw';
const ORIGIN = 'https://p6a.havita.test';

type Handler = (event: any) => void;

function makeScope(windowClients: any[] = []) {
  const handlers: Record<string, Handler> = {};
  const shown: { title: string; options: any }[] = [];
  const fetches: { url: string; body: any }[] = [];
  const cacheStore = new Map<string, any>();
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, h: Handler) => { handlers[type] = h; },
    registration: {
      showNotification: vi.fn(async (title: string, options: any) => { shown.push({ title, options }); }),
      pushManager: { subscribe: vi.fn() },
    },
    clients: {
      matchAll: vi.fn(async () => windowClients),
      openWindow: vi.fn(async () => null),
    },
  };
  const caches = {
    open: async () => ({
      match: async (k: string) => (cacheStore.has(k) ? { json: async () => cacheStore.get(k) } : undefined),
      put: async (k: string, res: any) => { cacheStore.set(k, JSON.parse(await res.text())); },
    }),
  };
  const fetchMock = vi.fn(async (url: string, init: any) => {
    fetches.push({ url, body: JSON.parse(init.body) });
    return { ok: true };
  });
  // eslint-disable-next-line no-new-func
  new Function('self', 'caches', 'fetch', 'Response', 'URL', SOURCE)(self, caches, fetchMock, Response, URL);
  const dispatch = async (type: string, event: any) => {
    let pending: Promise<unknown> = Promise.resolve();
    handlers[type]({ ...event, waitUntil: (p: Promise<unknown>) => { pending = p; } });
    await pending;
  };
  return { self, handlers, shown, fetches, dispatch, cacheStore };
}

const pushEvent = (payload: unknown) => ({ data: { json: () => payload, text: () => JSON.stringify(payload) } });
const CALL = '3f2a1c9e-1111-4222-8333-444455556666';
const ringing = (over: Record<string, unknown> = {}) => ({
  v: 1, type: 'INTERCOM_CALL', kind: 'RINGING', callId: CALL, title: 'Havita', body: 'Llamada de portería',
  detail: 'Toca para abrir y contestar', url: `/resident?intercomCall=${CALL}`, tag: `intercom-${CALL}`,
  receipt: 'AbCdEfGhIjKlMnOpQrStUv', expiresAt: Date.now() + 40_000, ...over,
});

describe('sw-push.js (service worker simulado)', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('aviso de llamada: «Havita» / «Llamada de portería» / «Toca para abrir y contestar», tag por llamada, persistente', async () => {
    const s = makeScope();
    await s.dispatch('push', pushEvent(ringing()));
    expect(s.shown).toHaveLength(1);
    const { title, options } = s.shown[0];
    expect(title).toBe('Havita');
    expect(options.body).toBe('Llamada de portería\nToca para abrir y contestar');
    expect(options.tag).toBe(`intercom-${CALL}`);
    expect(options.requireInteraction).toBe(true);
    expect(options.renotify).toBe(true);
    expect(options.icon).toBe('/pwa-192x192.png');
    expect(options.badge).toBe('/notification-badge-96x96.png');
    expect(options.data).toMatchObject({ type: 'INTERCOM_CALL', kind: 'RINGING', callId: CALL, url: `/resident?intercomCall=${CALL}` });
  });

  it('recibos RECEIVED y DISPLAYED con el nonce, sin credenciales y a la base de la API configurada', async () => {
    const s = makeScope();
    await s.dispatch('message', { data: { type: 'HAVITA_SW_CONFIG', apiBase: 'https://p6a.havita.test/api/v1' } });
    await s.dispatch('push', pushEvent(ringing()));
    expect(s.fetches.map((f) => f.body)).toEqual([
      { r: 'AbCdEfGhIjKlMnOpQrStUv', s: 'RECEIVED' },
      { r: 'AbCdEfGhIjKlMnOpQrStUv', s: 'DISPLAYED' },
    ]);
    expect(s.fetches.every((f) => f.url === 'https://p6a.havita.test/api/v1/intercom/push-receipts')).toBe(true);
    // Una base no http(s) se ignora.
    await s.dispatch('message', { data: { type: 'HAVITA_SW_CONFIG', apiBase: 'javascript:alert(1)' } });
    expect(s.cacheStore.get('/__havita_sw_config__')).toEqual({ apiBase: 'https://p6a.havita.test/api/v1' });
  });

  it('aviso de timbre que llega tarde (llamada expirada): «perdida», sin ofrecer contestar', async () => {
    const s = makeScope();
    await s.dispatch('push', pushEvent(ringing({ expiresAt: Date.now() - 60_000 })));
    const { options } = s.shown[0];
    expect(options.body).toBe('Llamada de portería perdida');
    expect(options.requireInteraction).toBe(false);
    expect(options.data.kind).toBe('MISSED');
    expect(options.data.url).toBe('/resident');
  });

  it('aviso de fin (cancelada): MISMO tag (sustituye al de timbre), silencioso, sin enlace a contestar', async () => {
    const s = makeScope();
    await s.dispatch('push', pushEvent({ ...ringing(), kind: 'CANCELLED', body: 'Llamada de portería cancelada', detail: undefined, url: '/resident' }));
    const { options } = s.shown[0];
    expect(options.tag).toBe(`intercom-${CALL}`);
    expect(options.body).toBe('Llamada de portería cancelada');
    expect(options.silent).toBe(true);
    expect(options.renotify).toBe(false);
    expect(options.data.url).toBe('/resident');
  });

  it('F2 (iPhone): antes de mostrar el aviso de fin se CIERRA explícitamente el de timbre con el mismo tag', async () => {
    const s = makeScope();
    const order: string[] = [];
    const previous = { close: vi.fn(() => order.push('close')) };
    (s.self.registration as any).getNotifications = vi.fn(async () => [previous]);
    s.self.registration.showNotification.mockImplementation(async (title: string, options: any) => {
      order.push('show');
      s.shown.push({ title, options });
    });
    await s.dispatch('push', pushEvent({ ...ringing(), kind: 'CANCELLED', body: 'Llamada de portería cancelada', detail: undefined }));
    expect((s.self.registration as any).getNotifications).toHaveBeenCalledWith({ tag: `intercom-${CALL}` });
    expect(previous.close).toHaveBeenCalled();
    expect(order).toEqual(['close', 'show']);
    expect(s.shown).toHaveLength(1);
  });

  it('sin getNotifications (navegadores antiguos) el aviso se muestra igual', async () => {
    const s = makeScope();
    await s.dispatch('push', pushEvent(ringing()));
    expect(s.shown).toHaveLength(1);
  });

  it('con la app abierta, avisa a la ventana para que sincronice (deduplica por callId)', async () => {
    const client = { url: `${ORIGIN}/resident`, postMessage: vi.fn(), focus: vi.fn() };
    const s = makeScope([client]);
    await s.dispatch('push', pushEvent(ringing()));
    expect(client.postMessage).toHaveBeenCalledWith({ type: 'INTERCOM_PUSH', kind: 'RINGING', callId: CALL });
  });

  it('pulsar con la app en el portal del residente: recibo CLICKED, foco y mensaje para abrir la llamada (sin recargar)', async () => {
    const client = { url: `${ORIGIN}/resident/packages`, postMessage: vi.fn(), focus: vi.fn(async () => client), navigate: vi.fn() };
    const s = makeScope([client]);
    const notification = { close: vi.fn(), data: { type: 'INTERCOM_CALL', kind: 'RINGING', callId: CALL, url: `/resident?intercomCall=${CALL}`, receipt: 'AbCdEfGhIjKlMnOpQrStUv' } };
    await s.dispatch('notificationclick', { notification, action: '' });
    expect(notification.close).toHaveBeenCalled();
    expect(client.postMessage).toHaveBeenCalledWith({ type: 'INTERCOM_OPEN_CALL', callId: CALL });
    expect(client.focus).toHaveBeenCalled();
    expect(client.navigate).not.toHaveBeenCalled();
    expect(s.fetches.map((f) => f.body.s)).toEqual(['CLICKED']);
  });

  it('pulsar sin ventana abierta: abre la URL del mismo origen; una URL externa en el aviso se reduce a una ruta propia', async () => {
    const s = makeScope([]);
    await s.dispatch('notificationclick', {
      notification: { close: vi.fn(), data: { type: 'INTERCOM_CALL', kind: 'RINGING', callId: CALL, url: `/resident?intercomCall=${CALL}` } },
      action: '',
    });
    expect(s.self.clients.openWindow).toHaveBeenCalledWith(`${ORIGIN}/resident?intercomCall=${CALL}`);
    await s.dispatch('notificationclick', {
      notification: { close: vi.fn(), data: { type: 'INTERCOM_CALL', kind: 'CANCELLED', callId: CALL, url: 'https://evil.example/phish' } },
      action: '',
    });
    expect(s.self.clients.openWindow).toHaveBeenLastCalledWith(`${ORIGIN}/`);
  });

  it('avisos de fin pulsados no envían recibo CLICKED ni abren la llamada', async () => {
    const client = { url: `${ORIGIN}/resident`, postMessage: vi.fn(), focus: vi.fn() };
    const s = makeScope([client]);
    await s.dispatch('notificationclick', {
      notification: { close: vi.fn(), data: { type: 'INTERCOM_CALL', kind: 'MISSED', callId: CALL, url: '/resident', receipt: 'x' } },
      action: '',
    });
    expect(s.fetches).toHaveLength(0);
    expect(client.postMessage).toHaveBeenCalledWith({ type: 'INTERCOM_OPEN_CALL', callId: null });
  });

  it('notificaciones generales: comportamiento previo (título, cuerpo, tag por tipo, acciones Ver/Cerrar), icono corregido', async () => {
    const s = makeScope();
    await s.dispatch('push', pushEvent({ title: 'Paquete', body: 'Tienes un paquete', type: 'PACKAGE_RECEIVED', url: '/packages' }));
    const { title, options } = s.shown[0];
    expect(title).toBe('Paquete');
    expect(options.tag).toBe('PACKAGE_RECEIVED');
    expect(options.actions.map((a: any) => a.action)).toEqual(['open', 'dismiss']);
    expect(options.icon).toBe('/pwa-192x192.png');
    expect(s.fetches).toHaveLength(0);
  });
});
