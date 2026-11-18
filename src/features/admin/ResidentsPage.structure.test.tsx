import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const residentApi = vi.hoisted(() => ({
  findAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), assignProperties: vi.fn(), generateInvitation: vi.fn(),
}));

vi.mock('../../api/residentApi', () => ({ residentApi }));
vi.mock('../../api/propertyApi', () => ({
  propertyApi: {
    findAll: vi.fn().mockResolvedValue([
      { id: 'p-1', number: 'Torre 1-101', name: 'Apto 101', status: 'OCCUPIED', structureId: 'S1', structureName: 'Torre 1' },
      { id: 'p-10', number: 'Torre 10-101', name: 'Apto 101', status: 'OCCUPIED', structureId: 'S10', structureName: 'Torre 10' },
      { id: 'c-15', number: 'C15', name: 'Casa 15', status: 'OCCUPIED', structureId: null, structureName: null },
    ]),
  },
}));
vi.mock('../../contexts/TenantContext', () => ({ useTenant: () => ({ currentTenant: { id: 'tenant-1' } }) }));
vi.mock('../../services/notificationService', () => ({ notificationService: { showToast: vi.fn(), showError: vi.fn(), showConfirm: vi.fn() } }));

import { ResidentsPage } from './ResidentsPage';

afterEach(() => cleanup());

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><ResidentsPage /></QueryClientProvider>);
}

const lastFilters = () => residentApi.findAll.mock.calls[residentApi.findAll.mock.calls.length - 1];

describe('Directorio · filtro por estructura (Fase 2 / E4)', () => {
  it('envía el id de la estructura al backend, junto con la búsqueda, y vuelve a la primera página', async () => {
    const row = {
      id: 'r-1', tenantId: 'tenant-1', propertyId: 'p-10', propertyNumber: 'Torre 10-101', propertyName: 'Apto 101',
      name: 'Ana Gómez', type: 'Propietario', phone: '3001234567', email: 'ana@example.test', status: 'ACTIVE',
    };
    residentApi.findAll.mockResolvedValue({ content: [row], totalPages: 3, totalElements: 25 });
    const user = userEvent.setup();
    renderPage();
    const select = (await screen.findByTestId('structure-filter')) as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.text)).toEqual(['Todas las estructuras', 'Torre 1', 'Torre 10', 'Sin estructura']);

    // Ir a la página 2 y después filtrar: vuelve a la página 0 del backend.
    await user.click(await screen.findByRole('button', { name: 'Página siguiente' }));
    await waitFor(() => expect(lastFilters()[0]).toBe(1)); // página 2 pedida al backend
    await user.selectOptions(select, 'S10');
    await waitFor(() => expect(lastFilters()[3]).toMatchObject({ structureId: 'S10' }));
    expect(lastFilters()[0]).toBe(0);

    await user.type(screen.getByLabelText('Buscar residentes'), 'Ana');
    await waitFor(() => expect(lastFilters()[2]).toBe('Ana'));
    expect(lastFilters()[3]).toMatchObject({ structureId: 'S10' });

    await user.selectOptions(select, 'NONE');
    await waitFor(() => expect(lastFilters()[3]).toMatchObject({ structureId: 'none' }));
    await user.selectOptions(select, 'ALL');
    await waitFor(() => expect(lastFilters()[3].structureId).toBeUndefined());
  });
});
