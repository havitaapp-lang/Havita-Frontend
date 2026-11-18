/**
 * Editar un visitante desde administración guarda en el servidor (antes solo cambiaba la pantalla): envía solo los datos
 * del visitante, no deja cambiar la unidad ni el estado y muestra el error del servidor si lo rechaza.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const data = vi.hoisted(() => ({
  visitors: [] as any[], properties: [] as any[],
  createVisitor: vi.fn(), updateVisitor: vi.fn(), deleteVisitor: vi.fn(), recordVisitorEntry: vi.fn(), recordVisitorExit: vi.fn(),
}));
const notify = vi.hoisted(() => ({ showConfirm: vi.fn(), showToast: vi.fn(), showError: vi.fn() }));
vi.mock('../../contexts/DataContext', () => ({ useData: () => data }));
vi.mock('../../contexts/TenantContext', () => ({ useTenant: () => ({ currentTenant: { id: 'tenant-1' } }) }));
vi.mock('../../services/notificationService', () => ({ notificationService: notify }));
vi.mock('./components/VisitorScheduleSettings', () => ({ VisitorScheduleSettings: () => null }));

import { AdminVisitors } from './AdminVisitors';

beforeEach(() => {
  data.properties = [{ id: 'p1', tenantId: 'tenant-1', name: 'Apto 101' }];
  data.visitors = [{ id: 'v1', tenantId: 'tenant-1', propertyId: 'Apto 101', propertyName: 'Apto 101', name: 'Visita Uno',
    documentId: 'CC1', status: 'APPROVED', expectedAt: 'Hoy' }];
  data.updateVisitor.mockReset();
  notify.showToast.mockReset();
  notify.showError.mockReset();
});
afterEach(() => cleanup());

const openEdit = () => {
  render(<AdminVisitors />);
  fireEvent.click(screen.getAllByTitle(/Editar/i)[0]);
};

describe('AdminVisitors — editar', () => {
  it('envía solo los datos del visitante; sin estado y con la unidad bloqueada', async () => {
    data.updateVisitor.mockResolvedValue(undefined);
    openEdit();
    expect(document.getElementById('admin-vis-status')).toBeNull();
    expect((document.getElementById('admin-vis-property') as HTMLSelectElement).disabled).toBe(true);
    const name = screen.getByDisplayValue('Visita Uno');
    fireEvent.change(name, { target: { value: 'Visita Corregida' } });
    fireEvent.submit(name.closest('form')!);
    await waitFor(() => expect(data.updateVisitor).toHaveBeenCalledWith('v1', {
      name: 'Visita Corregida', documentId: 'CC1', vehiclePlate: '', observations: '',
    }));
    expect(notify.showToast).toHaveBeenCalledWith('Visita actualizada correctamente', 'success');
  });

  it('si el servidor lo rechaza, muestra su mensaje', async () => {
    data.updateVisitor.mockRejectedValue({ data: { message: 'No se puede modificar una visita que ya salió o fue cancelada.' } });
    openEdit();
    fireEvent.submit(screen.getByDisplayValue('Visita Uno').closest('form')!);
    await waitFor(() => expect(notify.showError).toHaveBeenCalledWith('Error al guardar',
      'No se puede modificar una visita que ya salió o fue cancelada.'));
    expect(notify.showToast).not.toHaveBeenCalledWith('Visita actualizada correctamente', 'success');
  });
});
