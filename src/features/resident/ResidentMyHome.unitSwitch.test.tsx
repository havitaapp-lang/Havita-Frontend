import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const self = vi.hoisted(() => ({
  getMyPeople: vi.fn(),
  getMyVehicles: vi.fn(),
  getMyPets: vi.fn(),
}));
const auth = vi.hoisted(() => ({
  value: {
    user: { email: 'ana@example.test', role: 'RESIDENT' },
    activePropertyId: 'UNIT-A' as string,
    userProperties: [
      { propertyId: 'UNIT-A', number: 'A', name: 'Apto A', type: 'Propietario', status: 'OCCUPIED' },
      { propertyId: 'UNIT-B', number: 'B', name: 'Apto B', type: 'Propietario', status: 'OCCUPIED' },
    ],
    unitStatus: 'ready',
  },
}));

vi.mock('../../services/residentSelfService', () => ({ residentSelfService: self }));
vi.mock('../../services/notificationService', () => ({ notificationService: { showToast: vi.fn(), showError: vi.fn(), showConfirm: vi.fn() } }));
vi.mock('../../services/votingDelegationService', () => ({ getActiveDelegation: vi.fn().mockResolvedValue(null) }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth.value }));

import { ResidentMyHome } from './ResidentMyHome';

afterEach(() => cleanup());

describe('ResidentMyHome · caché por unidad (Fase 2 / E2)', () => {
  it('15 · al cambiar de unidad no se muestran datos de la anterior y cada consulta pide su unidad', async () => {
    self.getMyPeople.mockResolvedValue([]);
    self.getMyPets.mockResolvedValue([]);
    // La respuesta de A llega TARDE (después de cambiar a B): no debe pintarse en B.
    let resolveA!: (v: unknown) => void;
    self.getMyVehicles.mockImplementation((unitId: string) =>
      unitId === 'UNIT-A'
        ? new Promise((r) => { resolveA = r; })
        : Promise.resolve([{ id: 'vb', plate: 'BBB222', type: 'Automóvil' }]));

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(<QueryClientProvider client={client}><ResidentMyHome /></QueryClientProvider>);
    await waitFor(() => expect(self.getMyVehicles).toHaveBeenCalledWith('UNIT-A'));

    // Cambio de unidad: ResidentLayout reinicia la página (key por unidad); aquí se simula con un nuevo montaje.
    auth.value = { ...auth.value, activePropertyId: 'UNIT-B' };
    view.unmount();
    render(<QueryClientProvider client={client}><ResidentMyHome /></QueryClientProvider>);
    await waitFor(() => expect(self.getMyVehicles).toHaveBeenCalledWith('UNIT-B'));
    await waitFor(() => expect(screen.getByText('BBB222')).toBeTruthy());

    resolveA([{ id: 'va', plate: 'AAA111', type: 'Automóvil' }]);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText('AAA111')).toBeNull(); // la respuesta tardía de A queda en la caché de A
    expect(client.getQueryData(['myVehicles', 'UNIT-A'])).toEqual([{ id: 'va', plate: 'AAA111', type: 'Automóvil' }]);
    expect(self.getMyPeople).toHaveBeenCalledWith('UNIT-B');
    expect(self.getMyPets).toHaveBeenCalledWith('UNIT-B');
  });
});
