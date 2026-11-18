/**
 * Activar / desactivar personal va al SERVIDOR (POST /staff/{id}/status) con los valores del backend; si el servidor lo
 * rechaza, el error se propaga (antes solo se guardaba en el navegador y el acceso seguía vigente).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock('../../../api/apiClient', () => ({ apiClient: api }));

import { personalService } from './personalService';

beforeEach(() => { api.post.mockReset(); });

describe('personalService.updateStatus', () => {
  it('desactivar envía INACTIVE y devuelve el estado que confirma el servidor', async () => {
    api.post.mockResolvedValue({ id: 'm1', status: 'INACTIVE' });
    await expect(personalService.updateStatus('m1', 'INACTIVO')).resolves.toBe('INACTIVO');
    expect(api.post).toHaveBeenCalledWith('/staff/m1/status', { status: 'INACTIVE' });
  });

  it('activar envía ACTIVE', async () => {
    api.post.mockResolvedValue({ id: 'm1', status: 'ACTIVE' });
    await expect(personalService.updateStatus('m1', 'ACTIVO')).resolves.toBe('ACTIVO');
    expect(api.post).toHaveBeenCalledWith('/staff/m1/status', { status: 'ACTIVE' });
  });

  it('si el servidor lo rechaza, lanza el error (no se da por hecho)', async () => {
    api.post.mockRejectedValue({ status: 403, data: { message: 'Acceso denegado' } });
    await expect(personalService.updateStatus('m1', 'INACTIVO')).rejects.toMatchObject({ status: 403 });
  });
});

describe('personalService.updateSystemAccess / updatePersonal', () => {
  const api2 = api as any;
  beforeEach(() => { api2.put = vi.fn(); });

  it('acceso: PUT /staff/{id}/access y el resultado nunca trae contraseña', async () => {
    api2.put.mockResolvedValue({ id: 'm1', firstName: 'A', lastName: 'B', status: 'ACTIVE',
      systemAccess: { enabled: true, loginEmail: 'a@example.test', role: 'SECURITY', status: 'ACTIVE', shared: false } });
    const m = await personalService.updateSystemAccess('m1', { enabled: true, loginEmail: 'a@example.test', password: 'Clave-Segura-1', role: 'SECURITY' });
    expect(api2.put).toHaveBeenCalledWith('/staff/m1/access', { enabled: true, loginEmail: 'a@example.test', password: 'Clave-Segura-1', systemRole: 'SECURITY' });
    expect(m.systemAccess).toMatchObject({ enabled: true, role: 'SECURITY', status: 'ACTIVO', shared: false });
    expect(m.systemAccess && 'password' in m.systemAccess).toBe(false);
  });

  it('datos: PUT /staff/{id} con la ficha completa', async () => {
    api2.put.mockResolvedValue({ id: 'm1', firstName: 'Ana', lastName: 'B', status: 'ACTIVE' });
    const current = { id: 'm1', firstName: 'A', lastName: 'B', documentNumber: '1', position: 'Guarda', status: 'ACTIVO' } as any;
    await personalService.updatePersonal(current, { firstName: 'Ana' });
    expect(api2.put).toHaveBeenCalledWith('/staff/m1', expect.objectContaining({ firstName: 'Ana', documentNumber: '1', position: 'Guarda' }));
  });
});

describe('localStorage', () => {
  it('nunca guarda contraseñas', async () => {
    api.post.mockResolvedValue({ id: 'm9', tenantId: 't1' });
    vi.spyOn(Storage.prototype, 'setItem');
    await personalService.createPersonal({ firstName: 'A', lastName: 'B', documentType: 'CC', documentNumber: '9', phone: '', email: 'a@example.test',
      position: 'Guarda', area: 'Portería', contractType: 'Empleado', startDate: '2026-01-01', status: 'ACTIVO',
      systemAccess: { enabled: true, username: 'a@example.test', loginEmail: 'a@example.test', password: 'Secreta-123', role: 'SECURITY', status: 'ACTIVO' } } as any);
    const saved = (Storage.prototype.setItem as any).mock.calls.filter((c: any[]) => c[0] === 'havita_community_personal').map((c: any[]) => c[1]).join('');
    expect(saved).not.toContain('Secreta-123');
  });
});
