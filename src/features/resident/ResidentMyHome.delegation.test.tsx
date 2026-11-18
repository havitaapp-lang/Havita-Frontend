import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../../api/apiClient';

const self = vi.hoisted(() => ({ getMyPeople: vi.fn(), getMyVehicles: vi.fn(), getMyPets: vi.fn() }));
const notify = vi.hoisted(() => ({ showToast: vi.fn(), showError: vi.fn(), showConfirm: vi.fn() }));
const delegation = vi.hoisted(() => ({ getActiveDelegation: vi.fn(), delegateVote: vi.fn(), revokeVote: vi.fn() }));

vi.mock('../../services/residentSelfService', () => ({ residentSelfService: self }));
vi.mock('../../services/notificationService', () => ({ notificationService: notify }));
vi.mock('../../services/votingDelegationService', () => delegation);
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'ana@example.test', role: 'RESIDENT' },
    activePropertyId: 'p-101',
    userProperties: [{ propertyId: 'p-101', number: '101', name: 'Apto 101', type: 'Propietario', status: 'OCCUPIED' }],
    unitStatus: 'ready',
  }),
}));

import { ResidentMyHome } from './ResidentMyHome';

afterEach(() => cleanup());

describe('ResidentMyHome · delegación de voto (cierre E3)', () => {
  it('rechazo por asistencia en curso: mensaje claro, sin éxito, sin cambiar el estado y sin reintentos', async () => {
    self.getMyPeople.mockResolvedValue([
      { id: 'r1', name: 'Ana', email: 'ana@example.test', type: 'Propietario', status: 'ACTIVE', isSelf: true, isPending: false },
      { id: 'r2', name: 'Beto', email: 'beto@example.test', type: 'Arrendatario', status: 'ACTIVE', isSelf: false, isPending: false },
    ]);
    self.getMyVehicles.mockResolvedValue([]);
    self.getMyPets.mockResolvedValue([]);
    delegation.getActiveDelegation.mockResolvedValue(null);
    delegation.delegateVote.mockRejectedValue(new ApiError('bloqueada', 409, { code: 'DELEGATION_BLOCKED_BY_ATTENDANCE' }));
    notify.showConfirm.mockResolvedValue(true);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ResidentMyHome /></QueryClientProvider>);
    const user = userEvent.setup();
    await user.click(await screen.findByText('Delegar voto al arrendatario'));

    await waitFor(() => expect(notify.showToast).toHaveBeenCalledWith(
      'No puedes delegar el voto de esta unidad porque ya tiene asistencia registrada en una asamblea programada o en curso.', 'error'));
    expect(notify.showToast).not.toHaveBeenCalledWith('Derecho de voto delegado exitosamente', 'success');
    expect(delegation.delegateVote).toHaveBeenCalledTimes(1); // sin reintentos automáticos
    expect(delegation.delegateVote).toHaveBeenCalledWith('p-101');
    expect(delegation.getActiveDelegation).toHaveBeenCalledTimes(1); // el estado no se recarga como si se hubiera creado
    expect(screen.getByText('Delegar voto al arrendatario')).toBeTruthy(); // sigue sin delegación
  });

  it('E5 / D9 · revocación bloqueada por asistencia del delegado: mensaje claro, sin éxito, sin cambiar el estado y sin reintentos', async () => {
    vi.clearAllMocks();
    self.getMyPeople.mockResolvedValue([
      { id: 'r1', name: 'Ana', email: 'ana@example.test', type: 'Propietario', status: 'ACTIVE', isSelf: true, isPending: false },
      { id: 'r2', name: 'Beto', email: 'beto@example.test', type: 'Arrendatario', status: 'ACTIVE', isSelf: false, isPending: false },
    ]);
    self.getMyVehicles.mockResolvedValue([]);
    self.getMyPets.mockResolvedValue([]);
    delegation.getActiveDelegation.mockResolvedValue({ id: 'd1', propertyId: 'p-101', delegateUserName: 'Beto', status: 'ACTIVE' });
    delegation.revokeVote.mockRejectedValue(new ApiError('bloqueada', 409, { code: 'DELEGATION_REVOCATION_BLOCKED_BY_ATTENDANCE' }));
    notify.showConfirm.mockResolvedValue(true);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ResidentMyHome /></QueryClientProvider>);
    const user = userEvent.setup();
    const revoke = await screen.findByText('Revocar delegación');
    await user.click(revoke);

    await waitFor(() => expect(notify.showToast).toHaveBeenCalledWith(
      'No puedes revocar esta delegación porque el delegado ya tiene asistencia registrada en una asamblea programada o en curso.', 'error'));
    expect(notify.showToast).not.toHaveBeenCalledWith('Derecho de voto revocado exitosamente', 'success');
    expect(delegation.revokeVote).toHaveBeenCalledTimes(1);
    expect(delegation.revokeVote).toHaveBeenCalledWith('p-101');
    expect(delegation.getActiveDelegation).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Revocar delegación')).toBeTruthy(); // la delegación sigue vigente en pantalla
  });
  it('cierre E5 / D11 · revocar una delegación otorgada por otro copropietario: mensaje real del backend, sin éxito ni cambio de estado', async () => {
    vi.clearAllMocks();
    self.getMyPeople.mockResolvedValue([
      { id: 'r1', name: 'Ana', email: 'ana@example.test', type: 'Propietario', status: 'ACTIVE', isSelf: true, isPending: false },
      { id: 'r2', name: 'Beto', email: 'beto@example.test', type: 'Arrendatario', status: 'ACTIVE', isSelf: false, isPending: false },
    ]);
    self.getMyVehicles.mockResolvedValue([]);
    self.getMyPets.mockResolvedValue([]);
    delegation.getActiveDelegation.mockResolvedValue({ id: 'd1', propertyId: 'p-101', delegateUserName: 'Beto', status: 'ACTIVE' });
    delegation.revokeVote.mockRejectedValue(new ApiError('Solo el copropietario que otorgó esta delegación puede revocarla.', 409, { code: 'DELEGATION_GRANTED_BY_OTHER_OWNER' }));
    notify.showConfirm.mockResolvedValue(true);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ResidentMyHome /></QueryClientProvider>);
    const user = userEvent.setup();
    await user.click(await screen.findByText('Revocar delegación'));
    await waitFor(() => expect(notify.showToast).toHaveBeenCalledWith('Solo el copropietario que otorgó esta delegación puede revocarla.', 'error'));
    expect(notify.showToast).not.toHaveBeenCalledWith('Derecho de voto revocado exitosamente', 'success');
    expect(delegation.revokeVote).toHaveBeenCalledTimes(1);
    expect(delegation.getActiveDelegation).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Revocar delegación')).toBeTruthy();
  });
  it('D14 · revocación excepcional: un copropietario autorizado (el autor ya no es propietario) revoca con éxito y se relee el estado', async () => {
    vi.clearAllMocks();
    self.getMyPeople.mockResolvedValue([
      { id: 'r1', name: 'Ana', email: 'ana@example.test', type: 'Propietario', status: 'ACTIVE', isSelf: true, isPending: false },
      { id: 'r2', name: 'Beto', email: 'beto@example.test', type: 'Arrendatario', status: 'ACTIVE', isSelf: false, isPending: false },
    ]);
    self.getMyVehicles.mockResolvedValue([]);
    self.getMyPets.mockResolvedValue([]);
    delegation.getActiveDelegation
      .mockResolvedValueOnce({ id: 'd1', propertyId: 'p-101', delegateUserName: 'Beto', status: 'ACTIVE' })
      .mockResolvedValue(null);
    delegation.revokeVote.mockResolvedValue({ id: 'd1', status: 'REVOKED' });
    notify.showConfirm.mockResolvedValue(true);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ResidentMyHome /></QueryClientProvider>);
    const user = userEvent.setup();
    await user.click(await screen.findByText('Revocar delegación'));
    await waitFor(() => expect(notify.showToast).toHaveBeenCalledWith('Derecho de voto revocado exitosamente', 'success'));
    expect(delegation.revokeVote).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(delegation.getActiveDelegation).toHaveBeenCalledTimes(2)); // el estado se relee del backend
  });
  it('D14 · delegación vigente sin arrendatario activo: el botón de revocar sigue disponible (antes desaparecía)', async () => {
    vi.clearAllMocks();
    self.getMyPeople.mockResolvedValue([
      { id: 'r1', name: 'Ana', email: 'ana@example.test', type: 'Propietario', status: 'ACTIVE', isSelf: true, isPending: false },
    ]);
    self.getMyVehicles.mockResolvedValue([]);
    self.getMyPets.mockResolvedValue([]);
    delegation.getActiveDelegation.mockResolvedValue({ id: 'd1', propertyId: 'p-101', delegateUserName: 'Beto', status: 'ACTIVE' });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ResidentMyHome /></QueryClientProvider>);
    expect(await screen.findByText('Revocar delegación')).toBeTruthy();
    expect(screen.queryByText('Delegar voto al arrendatario')).toBeNull();
  });
});
