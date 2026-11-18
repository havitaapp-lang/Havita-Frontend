import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const self = vi.hoisted(() => ({
  getMyPeople: vi.fn(),
  getMyVehicles: vi.fn(),
  getMyPets: vi.fn(),
  deleteMyVehicle: vi.fn(),
  deleteMyPet: vi.fn(),
  regenerateInvitation: vi.fn(),
  cancelInvitation: vi.fn(),
}));
const notify = vi.hoisted(() => ({ showToast: vi.fn(), showError: vi.fn(), showConfirm: vi.fn() }));

vi.mock('../../services/residentSelfService', () => ({ residentSelfService: self }));
vi.mock('../../services/notificationService', () => ({ notificationService: notify }));
vi.mock('../../services/votingDelegationService', () => ({ getActiveDelegation: vi.fn().mockResolvedValue(null) }));
vi.mock('../../contexts/AuthContext', () => ({
  // Fase 2 / E2: la unidad activa solo cuenta si está en la lista autorizada (useActiveUnit).
  useAuth: () => ({
    user: { email: 'ana@example.test', role: 'RESIDENT' },
    activePropertyId: 'p-101',
    userProperties: [{ propertyId: 'p-101', number: '101', name: 'Apto 101', type: 'Propietario', status: 'OCCUPIED' }],
    unitStatus: 'ready',
  }),
}));

import { ResidentMyHome } from './ResidentMyHome';

const vehicle = { id: 'v-1', plate: 'TST123', type: 'Automóvil', brand: 'Marca', model: 'Modelo', color: 'Gris' };
const pet = { id: 'pet-1', name: 'Firulais', type: 'Perro', breed: 'Criollo', color: 'Café', isDangerousBreed: false };

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><ResidentMyHome /></QueryClientProvider>);
}

/** Simula el servidor: la lista devuelve lo que sigue persistido después de cada DELETE. */
function serverList<T extends { id: string }>(initial: T[], list: typeof self.getMyVehicles, del: typeof self.deleteMyVehicle) {
  let rows = [...initial];
  list.mockImplementation(() => Promise.resolve([...rows]));
  del.mockImplementation((id: string) => { rows = rows.filter((r) => r.id !== id); return Promise.resolve(); });
}

beforeEach(() => {
  vi.clearAllMocks();
  self.getMyPeople.mockResolvedValue([]);
  self.getMyVehicles.mockResolvedValue([]);
  self.getMyPets.mockResolvedValue([]);
  notify.showConfirm.mockResolvedValue(true);
});
afterEach(() => cleanup());

describe('ResidentMyHome · eliminar (TASK-011)', () => {
  it('#1: el vehículo eliminado desaparece de la lista sin recargar', async () => {
    serverList([vehicle], self.getMyVehicles, self.deleteMyVehicle);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('TST123');
    await user.click(screen.getByTitle('Eliminar vehículo'));

    await waitFor(() => expect(self.deleteMyVehicle).toHaveBeenCalledWith('v-1', 'p-101'));
    await waitFor(() => expect(screen.queryByText('TST123')).toBeNull());
    expect(notify.showToast).toHaveBeenCalledWith('Vehículo eliminado', 'success');
  });

  it('#2: la mascota eliminada desaparece de la lista sin recargar', async () => {
    serverList([pet], self.getMyPets, self.deleteMyPet);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Firulais');
    await user.click(screen.getByTitle('Eliminar mascota'));

    await waitFor(() => expect(self.deleteMyPet).toHaveBeenCalledWith('pet-1', 'p-101'));
    await waitFor(() => expect(screen.queryByText('Firulais')).toBeNull());
    expect(notify.showToast).toHaveBeenCalledWith('Mascota eliminada', 'success');
  });

  it('si el backend rechaza la eliminación el vehículo sigue en la lista', async () => {
    self.getMyVehicles.mockResolvedValue([vehicle]);
    self.deleteMyVehicle.mockRejectedValue(new Error('403'));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('TST123');
    await user.click(screen.getByTitle('Eliminar vehículo'));

    await waitFor(() => expect(notify.showError).toHaveBeenCalledWith('Error', 'No se pudo eliminar el vehículo'));
    expect(screen.getByText('TST123')).toBeTruthy();
  });

  it('cancelar la confirmación no elimina', async () => {
    self.getMyPets.mockResolvedValue([pet]);
    notify.showConfirm.mockResolvedValue(false);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Firulais');
    await user.click(screen.getByTitle('Eliminar mascota'));

    await waitFor(() => expect(notify.showConfirm).toHaveBeenCalled());
    expect(self.deleteMyPet).not.toHaveBeenCalled();
    expect(screen.getByText('Firulais')).toBeTruthy();
  });
});

describe('ResidentMyHome · invitaciones pendientes (SEC-7)', () => {
  const owner = { id: 'r-self', name: 'Ana Gómez', type: 'Propietario', status: 'ACTIVE', isSelf: true, isPending: false };
  const pending = (over: Record<string, unknown> = {}) => ({
    id: 'inv-1', name: 'Invitado', email: '', type: 'Arrendatario', status: 'PENDING', isPending: true,
    canRemove: true, canRegenerate: true, ...over,
  });

  it('no muestra ni copia enlaces desde el listado; el emisor genera uno nuevo tras confirmar', async () => {
    self.getMyPeople.mockResolvedValue([owner, pending()]);
    self.regenerateInvitation.mockResolvedValue({ id: 'inv-2', link: 'http://c1.localhost:5173/register/invite/nuevo' });
    const user = userEvent.setup();
    renderPage();
    const button = await screen.findByTitle('Generar nuevo enlace');
    expect(screen.queryByTitle('Copiar enlace')).toBeNull();
    expect(screen.queryByTitle('Ver Código QR')).toBeNull();

    await user.click(button);
    expect(notify.showConfirm).toHaveBeenCalled();
    await waitFor(() => expect(self.regenerateInvitation).toHaveBeenCalledWith('inv-1', 'p-101'));
    expect(await screen.findByText('¡Enlace Generado!')).toBeTruthy();
    expect(notify.showToast).toHaveBeenCalledWith('Nuevo enlace generado', 'success');
  });

  it('si no la emitió, no ofrece regenerar; cancelar la confirmación no regenera', async () => {
    self.getMyPeople.mockResolvedValue([owner, pending({ id: 'ajena', canRegenerate: false, canRemove: false }), pending()]);
    notify.showConfirm.mockResolvedValue(false);
    const user = userEvent.setup();
    renderPage();
    const buttons = await screen.findAllByTitle('Generar nuevo enlace');
    expect(buttons).toHaveLength(1);
    expect(screen.getAllByTitle('Cancelar invitación')).toHaveLength(1);
    await user.click(buttons[0]);
    await waitFor(() => expect(notify.showConfirm).toHaveBeenCalled());
    expect(self.regenerateInvitation).not.toHaveBeenCalled();
  });
});
