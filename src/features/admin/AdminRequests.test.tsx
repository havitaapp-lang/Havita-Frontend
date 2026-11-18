/**
 * /admin/requests — «Resolver»: espera al servidor (antes solo cambiaba la pantalla y al recargar la PQRS volvía a su
 * estado anterior). Si el servidor lo rechaza, muestra el error y el modal sigue abierto.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const data = vi.hoisted(() => ({
  pqrsList: [] as any[],
  properties: [] as any[],
  residents: [] as any[],
  createPQRS: vi.fn(),
  updatePQRS: vi.fn(),
  deletePQRS: vi.fn(),
  resolvePQRS: vi.fn(),
}));
const notify = vi.hoisted(() => ({ showConfirm: vi.fn(), showToast: vi.fn(), showError: vi.fn() }));
vi.mock('../../contexts/DataContext', () => ({ useData: () => data }));
vi.mock('../../contexts/TenantContext', () => ({ useTenant: () => ({ currentTenant: { id: 'tenant-1' } }) }));
vi.mock('../../services/notificationService', () => ({ notificationService: notify }));

import { AdminRequests } from './AdminRequests';

const NOTE = 'Se cambió el empaque de la válvula';

beforeEach(() => {
  data.pqrsList = [{
    id: 'pqrs-1', tenantId: 'tenant-1', propertyId: 'Torre 1 - 101', residentName: 'Residente Sintético',
    category: 'Plomería', title: 'Fuga en el baño', description: 'Gotea el lavamanos', status: 'NEW',
    priority: 'Alta', createdAt: '2026-11-17', updatedAt: '2026-11-17',
    propertyUuid: 'unit-101', residentId: 'res-ana',
  }];
  data.properties = [
    { id: 'unit-101', tenantId: 'tenant-1', name: 'Torre 1 - 101' },
    { id: 'unit-102', tenantId: 'tenant-1', name: 'Torre 1 - 102' },
  ];
  data.residents = [
    { id: 'res-ana', propertyUuid: 'unit-101', name: 'Ana Sintética', type: 'Propietario', status: 'ACTIVE' },
    { id: 'res-old', propertyUuid: 'unit-101', name: 'Antiguo Inquilino', type: 'Arrendatario', status: 'INACTIVE' },
    { id: 'res-luis', propertyUuid: 'unit-102', name: 'Luis Vecino', type: 'Propietario', status: 'ACTIVE' },
  ];
  data.createPQRS.mockReset();
  data.updatePQRS.mockReset();
  data.resolvePQRS.mockReset();
  data.deletePQRS.mockReset();
  notify.showConfirm.mockReset().mockResolvedValue(true);
  notify.showToast.mockReset();
  notify.showError.mockReset();
});
afterEach(() => cleanup());

const openAndSubmit = () => {
  fireEvent.click(screen.getAllByText('Resolver')[0]);
  fireEvent.change(screen.getByPlaceholderText(/Técnico envió informe/), { target: { value: NOTE } });
  fireEvent.click(screen.getByText('Confirmar Solución'));
};

describe('AdminRequests — Resolver', () => {
  it('guarda en el servidor con la nota y cierra el modal', async () => {
    data.resolvePQRS.mockResolvedValue(undefined);
    render(<AdminRequests />);
    openAndSubmit();
    await waitFor(() => expect(data.resolvePQRS).toHaveBeenCalledWith('pqrs-1', NOTE));
    await waitFor(() => expect(notify.showToast).toHaveBeenCalledWith('Caso marcado como resuelto', 'success'));
    expect(screen.queryByText('Marcar Caso como Resuelto')).toBeNull();
  });

  it('si el servidor lo rechaza, muestra el error y el modal sigue abierto', async () => {
    data.resolvePQRS.mockRejectedValue({ data: { message: 'La nota de la solución no puede exceder 1000 caracteres.' } });
    render(<AdminRequests />);
    openAndSubmit();
    await waitFor(() => expect(notify.showError).toHaveBeenCalledWith('No se pudo resolver',
      'La nota de la solución no puede exceder 1000 caracteres.'));
    expect(notify.showToast).not.toHaveBeenCalledWith('Caso marcado como resuelto', 'success');
    expect(screen.getByText('Marcar Caso como Resuelto')).toBeTruthy();
  });

  it('eliminar: si el servidor lo rechaza, no dice «eliminado»', async () => {
    data.deletePQRS.mockRejectedValue({ data: { message: 'Acceso denegado' } });
    render(<AdminRequests />);
    fireEvent.click(screen.getAllByTitle(/Eliminar/i)[0]);
    await waitFor(() => expect(notify.showError).toHaveBeenCalledWith('No se pudo eliminar', 'Acceso denegado'));
    expect(notify.showToast).not.toHaveBeenCalledWith('Reporte eliminado', 'success');
  });
});

describe('AdminRequests — Crear y editar', () => {
  const fill = (id: string, value: string) =>
    fireEvent.change(document.getElementById(id) as HTMLElement, { target: { value } });

  it('crear: solo ofrece residentes ACTIVOS de la unidad elegida y envía los UUID al servidor', async () => {
    data.createPQRS.mockResolvedValue({});
    render(<AdminRequests />);
    fireEvent.click(screen.getByText('Nueva Solicitud'));

    const resident = document.getElementById('admin-req-resident') as HTMLSelectElement;
    expect(resident.disabled).toBe(true);
    fill('admin-req-property', 'unit-101');
    const options = Array.from(resident.options).map(o => o.textContent);
    expect(options).toEqual(['Sin solicitante (administración)', 'Ana Sintética (Propietario)']);

    fill('admin-req-resident', 'res-ana');
    fill('admin-req-title', 'Fuga en el parqueadero');
    fill('admin-req-description', 'Hay agua acumulada junto a la columna 12');
    fireEvent.click(screen.getByText('Registrar Solicitud'));

    await waitFor(() => expect(data.createPQRS).toHaveBeenCalledWith({
      propertyUuid: 'unit-101', residentId: 'res-ana', title: 'Fuga en el parqueadero',
      description: 'Hay agua acumulada junto a la columna 12', category: 'Plomería', priority: 'MEDIUM',
    }));
    expect(notify.showToast).toHaveBeenCalledWith('Solicitud registrada exitosamente', 'success');
  });

  it('crear: si el servidor rechaza al solicitante, muestra su mensaje', async () => {
    data.createPQRS.mockRejectedValue({ data: { message: 'El residente indicado no pertenece a la unidad seleccionada.' } });
    render(<AdminRequests />);
    fireEvent.click(screen.getByText('Nueva Solicitud'));
    fill('admin-req-property', 'unit-102');
    fill('admin-req-title', 'Ruido en la noche');
    fill('admin-req-description', 'Música alta después de las 11 pm');
    fireEvent.click(screen.getByText('Registrar Solicitud'));
    await waitFor(() => expect(notify.showError).toHaveBeenCalledWith('Error al guardar',
      'El residente indicado no pertenece a la unidad seleccionada.'));
    expect(screen.getByText('Registrar Nueva PQRS')).toBeTruthy();
  });

  it('editar: conserva la prioridad («Alta» → HIGH) y guarda estado y nota en el servidor', async () => {
    data.updatePQRS.mockResolvedValue(undefined);
    render(<AdminRequests />);
    fireEvent.click(screen.getAllByTitle('Editar')[0]);
    expect((document.getElementById('admin-req-priority') as HTMLSelectElement).value).toBe('ALTA');
    fill('admin-req-status', 'RESOLVED');
    fill('admin-req-response', 'Se cambió el sifón');
    fireEvent.click(screen.getByText('Guardar Cambios'));
    await waitFor(() => expect(data.updatePQRS).toHaveBeenCalledWith('pqrs-1', {
      title: 'Fuga en el baño', description: 'Gotea el lavamanos', category: 'Plomería', priority: 'HIGH',
      status: 'RESOLVED', responseNotes: 'Se cambió el sifón',
    }));
  });
});
