/**
 * P8-B — arranque de la PWA instalada (`start_url: /app`): portal del rol con sesión, inicio de sesión sin ella.
 * También comprueba que el manifiesto del build apunta a /app (no a «/», la página comercial).
 */
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import viteConfigSource from '../../vite.config.ts?raw';

const auth = vi.hoisted(() => ({ user: null as any }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }));

import { AppLaunch } from './AppLaunch';
import { APP_LAUNCH_PATH, portalForRole } from './appLaunchPaths';

function renderAt() {
  render(
    <MemoryRouter initialEntries={[APP_LAUNCH_PATH]}>
      <Routes>
        <Route path={APP_LAUNCH_PATH} element={<AppLaunch />} />
        {['/login', '/resident', '/security', '/admin', '/super-admin'].map((p) => (
          <Route key={p} path={p} element={<div data-testid="at">{p}</div>} />
        ))}
      </Routes>
    </MemoryRouter>,
  );
  return screen.getByTestId('at').textContent;
}

afterEach(() => cleanup());

beforeEach(() => {
  auth.user = null;
});

describe('AppLaunch (start_url de la PWA)', () => {
  it('sin sesión lleva al inicio de sesión', () => {
    expect(renderAt()).toBe('/login');
  });

  it.each([
    ['RESIDENT', '/resident'],
    ['SECURITY', '/security'],
    ['COMMUNITY_ADMIN', '/admin'],
    ['SUPER_ADMIN', '/super-admin'],
  ])('con sesión de %s lleva a %s', (role, path) => {
    auth.user = { id: 'u-1', role };
    expect(renderAt()).toBe(path);
  });

  it('mismo reparto por rol que tras iniciar sesión', () => {
    expect(portalForRole('ACCOUNTANT')).toBe('/admin');
    expect(portalForRole(undefined)).toBe('/admin');
  });

  it('el manifiesto de la PWA arranca en /app', () => {
    expect(viteConfigSource).toMatch(/start_url:\s*'\/app'/);
    expect(viteConfigSource).toMatch(/display:\s*'standalone'/);
  });
});
