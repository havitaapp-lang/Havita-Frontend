/**
 * «Gestionar acceso» guarda en el SERVIDOR (antes solo en el navegador, contraseña incluida), solo ofrece los roles
 * Portería y Personal operativo, nunca precarga la contraseña y bloquea correo y contraseña de una cuenta compartida.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const svc = vi.hoisted(() => ({ updateSystemAccess: vi.fn(), updatePersonal: vi.fn() }));
const notify = vi.hoisted(() => ({ showToast: vi.fn(), showError: vi.fn() }));
vi.mock('../services/personalService', () => ({ personalService: svc }));
vi.mock('../../../services/notificationService', () => ({ notificationService: notify }));

import { ManageAccessModal } from './ManageAccessModal';

const member = (access?: any) => ({
  id: 'm1', tenantId: 't1', firstName: 'Ana', lastName: 'Sintética', documentType: 'CC', documentNumber: '1',
  phone: '3000000000', email: 'ana@example.test', position: 'Guarda', area: 'Portería', contractType: 'Empleado',
  startDate: '2026-01-01', status: 'ACTIVO', systemAccess: access,
}) as any;

beforeEach(() => {
  svc.updateSystemAccess.mockReset().mockResolvedValue(member({ enabled: true, role: 'SECURITY', status: 'ACTIVO', username: 'x' }));
  svc.updatePersonal.mockReset().mockResolvedValue(member());
  notify.showToast.mockReset();
  notify.showError.mockReset();
});
afterEach(() => cleanup());

const open = (m: any) => render(<ManageAccessModal member={m} isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);

describe('ManageAccessModal', () => {
  it('solo ofrece Portería y Personal operativo (no Administrador)', () => {
    open(member({ enabled: true, loginEmail: 'ana@example.test', username: 'ana@example.test', role: 'SECURITY', status: 'ACTIVO' }));
    const values = [...(document.getElementById('access-role') as HTMLSelectElement).options].map((o) => o.value);
    expect(values).toEqual(['SECURITY', 'STAFF']);
  });

  it('nunca precarga la contraseña aunque el miembro la traiga de versiones anteriores', () => {
    open(member({ enabled: true, loginEmail: 'ana@example.test', username: 'ana@example.test', password: 'vieja-en-claro', role: 'SECURITY', status: 'ACTIVO' }));
    expect((document.getElementById('access-password') as HTMLInputElement).value).toBe('');
  });

  it('crear acceso sin contraseña no llama al servidor', async () => {
    open(member(undefined));
    fireEvent.click(screen.getByLabelText('Acceso al sistema habilitado'));
    fireEvent.click(screen.getByText('Guardar Cambios'));
    await waitFor(() => expect(notify.showToast).toHaveBeenCalledWith('Asigna una contraseña para crear el acceso', 'warning'));
    expect(svc.updateSystemAccess).not.toHaveBeenCalled();
  });

  it('crear acceso envía correo, contraseña y rol al servidor', async () => {
    open(member(undefined));
    fireEvent.click(screen.getByLabelText('Acceso al sistema habilitado'));
    fireEvent.change(document.getElementById('access-password')!, { target: { value: 'Clave-Segura-1' } });
    fireEvent.change(document.getElementById('access-role')!, { target: { value: 'STAFF' } });
    fireEvent.click(screen.getByText('Guardar Cambios'));
    await waitFor(() => expect(svc.updateSystemAccess).toHaveBeenCalledWith('m1', {
      enabled: true, loginEmail: 'ana@example.test', password: 'Clave-Segura-1', role: 'STAFF',
    }));
  });

  it('cuenta compartida: correo bloqueado, sin campo de contraseña y no se envían credenciales', async () => {
    open(member({ enabled: true, loginEmail: 'ana@example.test', username: 'ana@example.test', role: 'SECURITY', status: 'ACTIVO', shared: true }));
    expect(screen.getByText(/también tiene acceso en otra comunidad/)).toBeTruthy();
    expect((document.getElementById('access-email') as HTMLInputElement).disabled).toBe(true);
    expect(document.getElementById('access-password')).toBeNull();
    fireEvent.click(screen.getByText('Guardar Cambios'));
    await waitFor(() => expect(svc.updateSystemAccess).toHaveBeenCalledWith('m1', {
      enabled: true, loginEmail: undefined, password: undefined, role: 'SECURITY',
    }));
  });

  it('si el servidor lo rechaza, muestra su mensaje y no dice «actualizado»', async () => {
    svc.updateSystemAccess.mockRejectedValue({ data: { message: 'Solo puedes asignar los roles STAFF o SECURITY al personal.' } });
    open(member({ enabled: true, loginEmail: 'ana@example.test', username: 'ana@example.test', role: 'SECURITY', status: 'ACTIVO' }));
    fireEvent.click(screen.getByText('Guardar Cambios'));
    await waitFor(() => expect(notify.showError).toHaveBeenCalledWith('No se pudo actualizar el acceso',
      'Solo puedes asignar los roles STAFF o SECURITY al personal.'));
    expect(notify.showToast).not.toHaveBeenCalledWith(expect.stringContaining('Acceso actualizado'), 'success');
  });
});
