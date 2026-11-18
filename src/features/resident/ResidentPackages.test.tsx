/**
 * «Ya lo reclamé»: usa el endpoint del residente y solo confirma si el servidor lo acepta (antes se ignoraba el 403
 * del endpoint de portería y el paquete volvía a «Por reclamar» al recargar).
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const data = vi.hoisted(() => ({ packages: [] as any[], confirmPackagePickup: vi.fn() }));
const notify = vi.hoisted(() => ({ showConfirm: vi.fn(), showToast: vi.fn() }));
vi.mock('../../contexts/DataContext', () => ({ useData: () => data }));
vi.mock('../../hooks/useActiveUnit', () => ({ useActiveUnit: () => ({ activeUnitId: 'unit-1' }) }));
vi.mock('../../services/notificationService', () => ({ notificationService: notify }));

import { ResidentPackages } from './ResidentPackages';

beforeEach(() => {
  data.packages = [{ id: 'pkg-1', propertyId: 'unit-1', company: 'Servientrega', recipientName: 'Ana', status: 'RECEIVED', receivedAt: 'Hoy' }];
  data.confirmPackagePickup.mockReset();
  notify.showConfirm.mockReset().mockResolvedValue(true);
  notify.showToast.mockReset();
});
afterEach(() => cleanup());

describe('ResidentPackages — Ya lo reclamé', () => {
  it('confirma con el endpoint del residente y avisa del éxito', async () => {
    data.confirmPackagePickup.mockResolvedValue(undefined);
    render(<ResidentPackages />);
    fireEvent.click(screen.getByText('Ya lo reclamé'));
    await waitFor(() => expect(data.confirmPackagePickup).toHaveBeenCalledWith('pkg-1'));
    expect(notify.showToast).toHaveBeenCalledWith('Entrega confirmada', 'success');
  });

  it('si el servidor lo rechaza, muestra el error y no dice «confirmada»', async () => {
    data.confirmPackagePickup.mockRejectedValue({ data: { message: 'Este paquete ya figura como entregado.' } });
    render(<ResidentPackages />);
    fireEvent.click(screen.getByText('Ya lo reclamé'));
    await waitFor(() => expect(notify.showToast).toHaveBeenCalledWith('Este paquete ya figura como entregado.', 'error'));
    expect(notify.showToast).not.toHaveBeenCalledWith('Entrega confirmada', 'success');
  });

  it('si el residente cancela, no se llama al servidor', async () => {
    notify.showConfirm.mockResolvedValue(false);
    render(<ResidentPackages />);
    fireEvent.click(screen.getByText('Ya lo reclamé'));
    await waitFor(() => expect(notify.showConfirm).toHaveBeenCalled());
    expect(data.confirmPackagePickup).not.toHaveBeenCalled();
  });
});
