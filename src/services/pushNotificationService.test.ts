/**
 * P8-B — pushNotificationService con el navegador SIMULADO (service worker, PushManager, Notification).
 * Sin servicios de push reales ni claves VAPID reales.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock('../api/apiClient', () => ({ apiClient: api }));

const TENANT = '11111111-2222-4333-8444-555555555555';
const ENDPOINT = 'https://push.example.test/ep-1';

function installBrowser({ permission = 'granted', existing = true }: { permission?: NotificationPermission; existing?: boolean } = {}) {
  const subscription = {
    endpoint: ENDPOINT,
    toJSON: () => ({ endpoint: ENDPOINT, keys: { p256dh: 'BSynthetic', auth: 'synthetic' } }),
    unsubscribe: vi.fn(async () => true),
  };
  const pushManager = {
    getSubscription: vi.fn(async () => (existing ? subscription : null)),
    subscribe: vi.fn(async () => subscription),
  };
  const closeA = vi.fn();
  const registration = {
    pushManager,
    active: { postMessage: vi.fn() },
    getNotifications: vi.fn(async () => [{ close: closeA }]),
  };
  const register = vi.fn();
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: Object.assign(new EventTarget(), { ready: Promise.resolve(registration), register }),
  });
  (window as any).PushManager = function PushManager() {};
  (window as any).Notification = { permission, requestPermission: vi.fn(async () => permission) };
  return { subscription, pushManager, registration, register, closeA };
}

beforeEach(() => {
  vi.resetModules();
  Object.values(api).forEach((f) => f.mockReset());
  api.get.mockResolvedValue({ publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U', configured: 'true' });
  api.post.mockResolvedValue({});
  localStorage.clear();
  localStorage.setItem('havita_user', JSON.stringify({ id: 'u-1', tenantId: TENANT, role: 'RESIDENT' }));
  localStorage.setItem('havita_access_token', 'synthetic-access-token');
  globalThis.fetch = vi.fn(async () => ({ ok: true })) as any;
});

afterEach(() => {
  delete (window as any).PushManager;
});

const load = async () => (await import('./pushNotificationService')).pushNotificationService;

describe('pushNotificationService (P8-B)', () => {
  it('suscribirse usa el service worker de la PWA (no registra /sw-push.js) y recuerda la activación de ESTE usuario', async () => {
    const b = installBrowser({ existing: false });
    const s = await load();
    const res = await s.subscribe();
    expect(res.success).toBe(true);
    expect(b.register).not.toHaveBeenCalled();
    expect(b.pushManager.subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
    expect(api.post).toHaveBeenCalledWith('/push-subscriptions', expect.objectContaining({ endpoint: ENDPOINT }));
    expect(localStorage.getItem('havita:push-optin:u-1')).toBe('1');
  });

  it('sincronizar al iniciar sesión: solo si ESE usuario lo activó y el permiso sigue concedido; nunca pide permiso', async () => {
    const b = installBrowser();
    const s = await load();
    expect(await s.syncSubscription('u-1')).toBe('skipped'); // sin activación previa
    expect(api.post).not.toHaveBeenCalled();
    localStorage.setItem('havita:push-optin:u-1', '1');
    expect(await s.syncSubscription('u-1')).toBe('synced');
    expect(api.post).toHaveBeenCalledWith('/push-subscriptions', expect.objectContaining({ endpoint: ENDPOINT }));
    expect(await s.syncSubscription('otro-usuario')).toBe('skipped');
    expect((window as any).Notification.requestPermission).not.toHaveBeenCalled();
    // Configura el SW con la base de la API.
    expect(b.registration.active.postMessage).toHaveBeenCalledWith({ type: 'HAVITA_SW_CONFIG', apiBase: `${window.location.origin}/api/v1` });
  });

  it('sincronizar con permiso denegado: no hace nada', async () => {
    installBrowser({ permission: 'denied' });
    localStorage.setItem('havita:push-optin:u-1', '1');
    const s = await load();
    expect(await s.syncSubscription('u-1')).toBe('skipped');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('cerrar sesión: revoca ESTE dispositivo en el backend con las credenciales capturadas y se da de baja en el navegador', async () => {
    const b = installBrowser();
    const s = await load();
    const captured = s.captureAuth();
    expect(captured).toEqual({ accessToken: 'synthetic-access-token', tenantId: TENANT });
    localStorage.clear(); // el cierre de sesión borra las credenciales enseguida
    await s.revokeCurrentDevice(captured);
    const [url, init] = (globalThis.fetch as any).mock.calls[0];
    expect(url).toBe(`${window.location.origin}/api/v1/push-subscriptions/unsubscribe`);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer synthetic-access-token');
    expect(init.headers['X-Tenant-ID']).toBe(TENANT);
    expect(JSON.parse(init.body)).toEqual({ endpoint: ENDPOINT });
    expect(b.subscription.unsubscribe).toHaveBeenCalled();
  });

  it('cerrar sesión sin red: igualmente se da de baja en el navegador y no lanza', async () => {
    const b = installBrowser();
    globalThis.fetch = vi.fn(async () => { throw new TypeError('offline'); }) as any;
    const s = await load();
    await expect(s.revokeCurrentDevice({ accessToken: 'synthetic-access-token', tenantId: TENANT })).resolves.toBeUndefined();
    expect(b.subscription.unsubscribe).toHaveBeenCalled();
  });

  it('endpoint de este dispositivo y cierre de los avisos de una llamada mostrada en la app', async () => {
    const b = installBrowser();
    const s = await load();
    expect(await s.getCurrentEndpoint()).toBe(ENDPOINT);
    await s.closeCallNotifications('call-1');
    expect(b.registration.getNotifications).toHaveBeenCalledWith({ tag: 'intercom-call-1' });
    expect(b.closeA).toHaveBeenCalled();
  });

  it('cambio de usuario en el mismo dispositivo SIN cerrar sesión: la suscripción del anterior se retira y sus avisos se cierran', async () => {
    const b = installBrowser();
    localStorage.setItem('havita:push-owner', 'u-1');
    localStorage.setItem('havita:push-optin:u-1', '1');
    localStorage.setItem('havita_user', JSON.stringify({ id: 'u-2', tenantId: TENANT, role: 'RESIDENT' }));
    const s = await load();
    expect(await s.syncSubscription('u-2')).toBe('skipped'); // u-2 no activó los avisos en este dispositivo
    expect(b.closeA).toHaveBeenCalled();
    expect(b.subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('havita:push-owner')).toBeNull();
    expect(api.post).not.toHaveBeenCalled(); // nunca se registra a nombre de u-2 sin su activación
  });

  it('cambio de usuario y el nuevo SÍ activó los avisos: suscripción NUEVA a su nombre (no reutiliza la del anterior)', async () => {
    const b = installBrowser();
    localStorage.setItem('havita:push-owner', 'u-1');
    localStorage.setItem('havita:push-optin:u-2', '1');
    const s = await load();
    expect(await s.syncSubscription('u-2')).toBe('synced');
    expect(b.subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(b.pushManager.subscribe).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('havita:push-owner')).toBe('u-2');
  });

  it('mismo usuario: no rota la suscripción', async () => {
    const b = installBrowser();
    localStorage.setItem('havita:push-owner', 'u-1');
    localStorage.setItem('havita:push-optin:u-1', '1');
    const s = await load();
    expect(await s.syncSubscription('u-1')).toBe('synced');
    expect(b.subscription.unsubscribe).not.toHaveBeenCalled();
    expect(b.pushManager.subscribe).not.toHaveBeenCalled();
    expect(b.closeA).not.toHaveBeenCalled();
  });

  it('cerrar sesión cierra TODOS los avisos mostrados y olvida al dueño de la suscripción', async () => {
    const b = installBrowser();
    localStorage.setItem('havita:push-owner', 'u-1');
    const s = await load();
    await s.revokeCurrentDevice({ accessToken: 'synthetic-access-token', tenantId: TENANT });
    expect(b.registration.getNotifications).toHaveBeenCalledWith();
    expect(b.closeA).toHaveBeenCalled();
    expect(localStorage.getItem('havita:push-owner')).toBeNull();
  });

  it('suscripción renovada por el navegador: solo se re-registra si pertenece al usuario con sesión', async () => {
    installBrowser();
    await load();
    const msg = { type: 'PUSH_SUBSCRIPTION_CHANGED', subscription: { endpoint: ENDPOINT, keys: { p256dh: 'BSynthetic', auth: 'synthetic' } } };
    localStorage.setItem('havita:push-owner', 'u-9');
    navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: msg }));
    await new Promise((r) => setTimeout(r, 0));
    expect(api.post).not.toHaveBeenCalled();
    localStorage.setItem('havita:push-owner', 'u-1');
    navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: msg }));
    await new Promise((r) => setTimeout(r, 0));
    expect(api.post).toHaveBeenCalledWith('/push-subscriptions', expect.objectContaining({ endpoint: ENDPOINT }));
  });

  it('sin service worker (p. ej. desarrollo): suscribirse informa del problema en vez de quedarse esperando', async () => {
    installBrowser({ existing: false });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: Object.assign(new EventTarget(), { ready: new Promise(() => {}), register: vi.fn() }),
    });
    vi.useFakeTimers();
    try {
      const s = await load();
      const pending = s.subscribe();
      await vi.advanceTimersByTimeAsync(10_001);
      const res = await pending;
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/no está disponible/);
    } finally {
      vi.useRealTimers();
    }
  });
});
