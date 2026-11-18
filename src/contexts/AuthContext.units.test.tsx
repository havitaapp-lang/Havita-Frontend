import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { act, render, screen, waitFor, cleanup } from '@testing-library/react';
import { AuthProvider } from './AuthContext';
import { useActiveUnit } from '../hooks/useActiveUnit';
import { useAuth } from './AuthContext';
import { apiClient } from '../api/apiClient';

const U = (id: string, extra: Record<string, unknown> = {}) => ({
  propertyId: id, number: id, name: `Apto ${id}`, type: 'Propietario', status: 'OCCUPIED',
  label: `Torre 1 · Apto ${id}`, relations: ['Propietario'], ...extra,
});

let unitsByUser: Record<string, unknown[]> = {};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function installFetch() {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    const u = String(url);
    if (u.endsWith('/api/v1/auth/login')) {
      const { email } = JSON.parse(String(init.body));
      return json(200, { data: { accessToken: `tok-${email}`, refreshToken: 'r', user: { id: email, tenantId: 't1', fullName: email, email, role: 'RESIDENT' } } });
    }
    if (u.includes('/resident/me/properties')) {
      const auth = (init.headers as Record<string, string>)?.Authorization || '';
      const who = auth.replace('Bearer tok-', '');
      return json(200, { success: true, data: unitsByUser[who] ?? [] });
    }
    return json(200, { success: true, data: [] });
  }));
}

/** Muestra el estado del hook para inspeccionarlo. */
function Probe() {
  const unit = useActiveUnit();
  const { login, logout, user } = useAuth();
  return (
    <div>
      <span data-testid="status">{unit.status}</span>
      <span data-testid="active">{unit.activeUnitId ?? 'none'}</span>
      <span data-testid="label">{unit.activeLabel}</span>
      <span data-testid="count">{unit.units.length}</span>
      <span data-testid="notice">{unit.notice ?? ''}</span>
      <span data-testid="user">{user?.id ?? 'anon'}</span>
      <button onClick={() => login('ana', 'x', '00000000-0000-0000-0000-000000000001')}>login-ana</button>
      <button onClick={() => login('beto', 'x', '00000000-0000-0000-0000-000000000001')}>login-beto</button>
      <button onClick={() => logout()}>logout</button>
      {unit.units.map((u) => (
        <button key={u.propertyId} onClick={() => unit.select(u.propertyId)}>select-{u.propertyId}</button>
      ))}
      <button onClick={() => unit.select('AJENA')}>select-ajena</button>
    </div>
  );
}

const text = (id: string) => screen.getByTestId(id).textContent;

async function loginAs(who: 'ana' | 'beto') {
  await act(async () => { screen.getByText(`login-${who}`).click(); });
  await waitFor(() => expect(text('user')).toBe(who));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.cookie.split(';').forEach((c) => { document.cookie = c.replace(/=.*/, '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'); });
  unitsByUser = {};
  installFetch();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AuthContext + useActiveUnit (Fase 2 / E2)', () => {
  it('1 · una sola unidad: queda activa automáticamente', async () => {
    unitsByUser.ana = [U('A')];
    render(<AuthProvider><Probe /></AuthProvider>);
    await loginAs('ana');
    await waitFor(() => expect(text('status')).toBe('ready'));
    expect(text('active')).toBe('A');
    expect(text('label')).toBe('Torre 1 · Apto A');
  });

  it('2-3 · varias unidades y ninguna guardada: exige elegir y NO selecciona la primera', async () => {
    unitsByUser.ana = [U('A'), U('B')];
    render(<AuthProvider><Probe /></AuthProvider>);
    await loginAs('ana');
    await waitFor(() => expect(text('status')).toBe('selection-required'));
    expect(text('active')).toBe('none');
    // Elegir explícitamente activa esa unidad.
    await act(async () => { screen.getByText('select-B').click(); });
    expect(text('active')).toBe('B');
    expect(text('status')).toBe('ready');
    // Una unidad que no está en la lista autorizada no se puede seleccionar.
    await act(async () => { screen.getByText('select-ajena').click(); });
    expect(text('active')).toBe('B');
  });

  it('4 · restaura la preferencia guardada para esa cuenta y comunidad si sigue siendo válida', async () => {
    unitsByUser.ana = [U('A'), U('B')];
    localStorage.setItem('havita_unit_pref:ana:t1', 'B');
    render(<AuthProvider><Probe /></AuthProvider>);
    await loginAs('ana');
    await waitFor(() => expect(text('active')).toBe('B'));
  });

  it('5 · preferencia guardada revocada: se descarta y se pide elegir', async () => {
    unitsByUser.ana = [U('A'), U('B')];
    localStorage.setItem('havita_unit_pref:ana:t1', 'C');
    render(<AuthProvider><Probe /></AuthProvider>);
    await loginAs('ana');
    await waitFor(() => expect(text('status')).toBe('selection-required'));
    expect(localStorage.getItem('havita_unit_pref:ana:t1')).toBeNull();
  });

  it('12 · 409 UNIT_NOT_AVAILABLE: invalida la unidad, refresca la lista, avisa y NO cierra la sesión', async () => {
    unitsByUser.ana = [U('A'), U('B')];
    render(<AuthProvider><Probe /></AuthProvider>);
    await loginAs('ana');
    await act(async () => { screen.getByText('select-A').click(); });
    expect(text('active')).toBe('A');

    // El backend revoca A; queda solo B.
    unitsByUser.ana = [U('B')];
    const realFetch = globalThis.fetch;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
      if (String(url).includes('/resident/me/vehicles')) {
        return json(409, { code: 'UNIT_NOT_AVAILABLE', message: 'no disponible' });
      }
      return (realFetch as typeof fetch)(url, init);
    }));
    await act(async () => {
      await apiClient.get('/resident/me/vehicles', undefined, { unitId: 'A' }).catch(() => undefined);
    });

    await waitFor(() => expect(text('active')).toBe('B')); // la única que queda, sin ambigüedad
    expect(text('notice')).toMatch(/ya no está disponible/);
    expect(text('user')).toBe('ana'); // la sesión sigue
    expect(localStorage.getItem('havita_access_token')).toBe('tok-ana');
  });

  it('5b · revocación detectada al refrescar la lista (SSE o recarga): avisa y sigue con la que queda', async () => {
    unitsByUser.ana = [U('A'), U('B')];
    let refresh!: () => void;
    function Grab() {
      const r = useActiveUnit().refresh;
      useEffect(() => { refresh = r; });
      return null;
    }
    render(<AuthProvider><Probe /><Grab /></AuthProvider>);
    await loginAs('ana');
    await act(async () => { screen.getByText('select-B').click(); });
    unitsByUser.ana = [U('A')]; // la administración dio de baja la relación con B
    await act(async () => { refresh(); });
    await waitFor(() => expect(text('active')).toBe('A'));
    expect(text('notice')).toMatch(/ya no está disponible/);
    expect(text('user')).toBe('ana');
  });

  it('8 · cambio de usuario: la segunda cuenta no hereda la unidad de la primera', async () => {
    unitsByUser.ana = [U('A'), U('B')];
    unitsByUser.beto = [U('B'), U('C')];
    render(<AuthProvider><Probe /></AuthProvider>);
    await loginAs('ana');
    await act(async () => { screen.getByText('select-B').click(); });
    expect(text('active')).toBe('B');
    await act(async () => { screen.getByText('logout').click(); });
    expect(text('active')).toBe('none');
    expect(localStorage.getItem('havita_active_property')).toBeNull();
    await loginAs('beto');
    await waitFor(() => expect(text('status')).toBe('selection-required'));
    expect(text('active')).toBe('none'); // aunque B también sea suya, no hereda la elección de otra cuenta
  });
});
