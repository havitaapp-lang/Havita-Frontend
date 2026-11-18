/**
 * /admin/reservations: el backend no permite editar ni borrar reservas, solo confirmar, rechazar y cancelar. La
 * pantalla ofrece solo esas acciones según el estado, envía los valores internos (CONFIRMED, REJECTED, CANCELLED) y no
 * da el cambio por hecho si el servidor lo rechaza.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const data = vi.hoisted(() => ({
  reservations: [] as any[], commonZones: [] as any[], properties: [] as any[],
  createReservation: vi.fn(), changeReservationStatus: vi.fn(),
}));
const notify = vi.hoisted(() => ({ showConfirm: vi.fn(), showPrompt: vi.fn(), showToast: vi.fn(), showError: vi.fn() }));
vi.mock('../../contexts/DataContext', () => ({ useData: () => data }));
vi.mock('../../contexts/TenantContext', () => ({ useTenant: () => ({ currentTenant: { id: 'tenant-1' } }) }));
vi.mock('../../services/notificationService', () => ({ notificationService: notify }));
vi.mock('./AdminCommonZonesTab', () => ({ AdminCommonZonesTab: () => null }));

import { AdminReservations } from './AdminReservations';

const resv = (id: string, status: string, residentName: string) => ({
  id, tenantId: 'tenant-1', propertyId: 'Apto 101', residentName, zone: 'Zona BBQ', date: '2026-12-01',
  startTime: '14:00', endTime: '18:00', guestsCount: 10, status,
});

// Tabla de escritorio: la fila del residente.
const row = (name: string) => screen.getAllByText(name).map((el) => el.closest('tr')).find(Boolean) as HTMLElement;

beforeEach(() => {
  data.reservations = [resv('r1', 'PENDING', 'Ana Pendiente'), resv('r2', 'CONFIRMED', 'Luis Confirmado'), resv('r3', 'REJECTED', 'Eva Rechazada')];
  data.changeReservationStatus.mockReset();
  notify.showConfirm.mockReset().mockResolvedValue(true);
  notify.showPrompt.mockReset().mockResolvedValue('Nota sintética');
  notify.showToast.mockReset();
  notify.showError.mockReset();
});
afterEach(() => cleanup());

describe('AdminReservations — acciones según el estado', () => {
  it('ya no ofrece Editar ni Eliminar (el backend no los permite)', () => {
    render(<AdminReservations />);
    expect(screen.queryByTitle('Editar')).toBeNull();
    expect(screen.queryByTitle('Eliminar')).toBeNull();
    expect(screen.queryByText('Eliminar')).toBeNull();
  });

  it('pendiente: Aprobar, Rechazar y Cancelar; confirmada: solo Cancelar; rechazada: ninguna', () => {
    render(<AdminReservations />);
    const pending = within(row('Ana Pendiente'));
    expect(pending.getByText('Aprobar')).toBeTruthy();
    expect(pending.getByText('Rechazar')).toBeTruthy();
    expect(pending.getByTitle('Cancelar reserva')).toBeTruthy();
    const confirmed = within(row('Luis Confirmado'));
    expect(confirmed.queryByText('Aprobar')).toBeNull();
    expect(confirmed.getByTitle('Cancelar reserva')).toBeTruthy();
    expect(within(row('Eva Rechazada')).queryByTitle('Cancelar reserva')).toBeNull();
  });

  it('Aprobar envía CONFIRMED con la nota y solo entonces avisa', async () => {
    data.changeReservationStatus.mockResolvedValue(undefined);
    render(<AdminReservations />);
    fireEvent.click(within(row('Ana Pendiente')).getByText('Aprobar'));
    await waitFor(() => expect(data.changeReservationStatus).toHaveBeenCalledWith('r1', 'CONFIRMED', 'Nota sintética'));
    expect(notify.showToast).toHaveBeenCalledWith('Reserva confirmada', 'success');
  });

  it('Cancelar envía CANCELLED tras confirmar', async () => {
    data.changeReservationStatus.mockResolvedValue(undefined);
    render(<AdminReservations />);
    fireEvent.click(within(row('Luis Confirmado')).getByTitle('Cancelar reserva'));
    await waitFor(() => expect(data.changeReservationStatus).toHaveBeenCalledWith('r2', 'CANCELLED', 'Cancelada por la administración'));
    expect(notify.showToast).toHaveBeenCalledWith('Reserva cancelada', 'success');
  });

  it('si el servidor lo rechaza, muestra su error y no dice «confirmada»', async () => {
    data.changeReservationStatus.mockRejectedValue({ data: { message: 'Acceso denegado' } });
    render(<AdminReservations />);
    fireEvent.click(within(row('Ana Pendiente')).getByText('Rechazar'));
    await waitFor(() => expect(notify.showError).toHaveBeenCalledWith('No se pudo actualizar la reserva', 'Acceso denegado'));
    expect(data.changeReservationStatus).toHaveBeenCalledWith('r1', 'REJECTED', 'Nota sintética');
    expect(notify.showToast).not.toHaveBeenCalled();
  });
});
