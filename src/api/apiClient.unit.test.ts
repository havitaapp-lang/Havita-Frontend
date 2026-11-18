import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, ApiError, apiErrorCode } from './apiClient';
import { activeUnitStore } from '../features/resident/unit/activeUnitStore';

type Call = { url: string; headers: Record<string, string>; method: string };

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

let calls: Call[] = [];

function mockFetch(handler: (c: Call, n: number) => Response | Promise<Response>) {
  calls = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    const c: Call = { url: String(url), headers: { ...(init.headers as Record<string, string>) }, method: init.method || 'GET' };
    calls.push(c);
    return handler(c, calls.length);
  }));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('havita_access_token', 'token-sintetico');
  activeUnitStore.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiClient · cabecera X-Property-Id (Fase 2 / E2)', () => {
  it('no se envía en peticiones que no declaran unidad (administración, portería, globales)', async () => {
    activeUnitStore.setScope({ userId: 'u1', tenantId: 't1' });
    activeUnitStore.setActiveUnitId('UNIT-A');
    localStorage.setItem('havita_active_property', 'LEGADO');
    mockFetch(() => json(200, { success: true, data: [] }));
    await apiClient.get('/properties');
    await apiClient.post('/access/visitors', { a: 1 });
    expect(calls.every((c) => !('X-Property-Id' in c.headers))).toBe(true);
  });

  it('se envía solo cuando la petición declara su unidad', async () => {
    mockFetch(() => json(200, { success: true, data: [] }));
    await apiClient.get('/resident/me/vehicles', undefined, { unitId: 'UNIT-A' });
    expect(calls[0].headers['X-Property-Id']).toBe('UNIT-A');
  });

  it('una petición iniciada para A no sale con B: el reintento tras refrescar el token conserva A', async () => {
    localStorage.setItem('havita_refresh_token', 'refresh-sintetico');
    mockFetch((c, n) => {
      if (c.url.endsWith('/auth/refresh')) {
        // Mientras se refresca, el usuario cambia de unidad en esta pestaña.
        activeUnitStore.setScope({ userId: 'u1', tenantId: 't1' });
        activeUnitStore.setActiveUnitId('UNIT-B');
        return json(200, { data: { accessToken: 'nuevo', refreshToken: 'r2' } });
      }
      return n === 1 ? json(401, { code: 'UNAUTHORIZED' }) : json(200, { success: true, data: [] });
    });
    await apiClient.get('/resident/me/pets', undefined, { unitId: 'UNIT-A' });
    const unitCalls = calls.filter((c) => c.url.includes('/resident/me/pets'));
    expect(unitCalls).toHaveLength(2);
    expect(unitCalls.map((c) => c.headers['X-Property-Id'])).toEqual(['UNIT-A', 'UNIT-A']);
  });
});

describe('apiClient · errores diferenciados', () => {
  it('12 · 409 UNIT_NOT_AVAILABLE: evento de unidad, error controlado, sin cerrar sesión ni reintentar', async () => {
    const unavailable = vi.fn();
    const revoked = vi.fn();
    window.addEventListener('havita:unit_unavailable', unavailable);
    window.addEventListener('auth:access_revoked', revoked);
    mockFetch(() => json(409, { code: 'UNIT_NOT_AVAILABLE', message: 'La unidad seleccionada no está disponible' }));

    const err = await apiClient.post('/resident/me/vehicles', { plate: 'X' }, { unitId: 'UNIT-A' }).catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(apiErrorCode(err)).toBe('UNIT_NOT_AVAILABLE');
    expect(calls).toHaveLength(1); // no se reintenta con otra unidad
    expect(unavailable).toHaveBeenCalledTimes(1);
    expect((unavailable.mock.calls[0][0] as CustomEvent).detail).toEqual({ unitId: 'UNIT-A' });
    expect(revoked).not.toHaveBeenCalled();
    expect(localStorage.getItem('havita_access_token')).toBe('token-sintetico');
    window.removeEventListener('havita:unit_unavailable', unavailable);
    window.removeEventListener('auth:access_revoked', revoked);
  });

  it('409 UNIT_SELECTION_REQUIRED: evento propio y la sesión sigue', async () => {
    const required = vi.fn();
    window.addEventListener('havita:unit_selection_required', required);
    mockFetch(() => json(409, { code: 'UNIT_SELECTION_REQUIRED' }));
    const err = await apiClient.get('/resident/me/vehicles').catch((e) => e);
    expect(apiErrorCode(err)).toBe('UNIT_SELECTION_REQUIRED');
    expect(required).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('havita_access_token')).toBe('token-sintetico');
    window.removeEventListener('havita:unit_selection_required', required);
  });

  it('13 · acceso revocado (sin ninguna unidad): sí cierra la sesión y limpia la unidad', async () => {
    const revoked = vi.fn();
    window.addEventListener('auth:access_revoked', revoked);
    activeUnitStore.setScope({ userId: 'u1', tenantId: 't1' });
    activeUnitStore.setActiveUnitId('UNIT-A');
    mockFetch(() => json(409, { code: 'ACCESS_REVOKED' }));
    await apiClient.get('/resident/me/vehicles', undefined, { unitId: 'UNIT-A' });
    expect(revoked).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('havita_access_token')).toBeNull();
    expect(activeUnitStore.getActiveUnitId()).toBeNull();
    window.removeEventListener('auth:access_revoked', revoked);
  });

  it('14 · sesión expirada (401 sin refresco posible): evento de sesión expirada, no de unidad', async () => {
    const expired = vi.fn();
    const unavailable = vi.fn();
    window.addEventListener('auth:session_expired', expired);
    window.addEventListener('havita:unit_unavailable', unavailable);
    mockFetch(() => json(401, { code: 'UNAUTHORIZED' }));
    await apiClient.get('/resident/me/vehicles', undefined, { unitId: 'UNIT-A' });
    expect(expired).toHaveBeenCalledTimes(1);
    expect(unavailable).not.toHaveBeenCalled();
    window.removeEventListener('auth:session_expired', expired);
    window.removeEventListener('havita:unit_unavailable', unavailable);
  });
});
