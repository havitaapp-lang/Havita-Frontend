import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../../api/apiClient';

const residentApi = vi.hoisted(() => ({
  findAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  assignProperties: vi.fn(),
  generateInvitation: vi.fn(),
}));
const notify = vi.hoisted(() => ({ showToast: vi.fn(), showError: vi.fn(), showConfirm: vi.fn() }));

vi.mock('../../api/residentApi', () => ({ residentApi }));
vi.mock('../../api/propertyApi', () => ({
  propertyApi: {
    findAll: vi.fn().mockResolvedValue([
      { id: 'p-302', number: 'Torre 2-Piso 3-Apto 302', name: 'Apto 302', status: 'VACANT' },
      { id: 'p-101', number: 'Torre 1-Piso 1-Apto 101', name: 'Apto 101', status: 'OCCUPIED' },
    ]),
  },
}));
vi.mock('../../contexts/TenantContext', () => ({ useTenant: () => ({ currentTenant: { id: 'tenant-1' } }) }));
vi.mock('../../services/notificationService', () => ({ notificationService: notify }));

import { ResidentsPage } from './ResidentsPage';

const existing = {
  id: 'r-1', tenantId: 'tenant-1', propertyId: 'p-101', propertyNumber: 'Torre 1-Piso 1-Apto 101', propertyName: 'Apto 101',
  name: 'Ana Gómez', type: 'Propietario', phone: '3001234567', email: 'ana@example.test', status: 'INACTIVE',
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><ResidentsPage /></QueryClientProvider>);
}

const field = (id: string) => document.getElementById(id) as HTMLInputElement | HTMLSelectElement;

/**
 * P6 (estabilización): rellena un campo con UN evento de usuario (clic + pegar) en vez de tecla a tecla. Estas pruebas
 * comprueban la validación y lo que se envía, no la escritura carácter a carácter. Con `user.type` cada tecla volvía a
 * renderizar toda la página (estado del formulario en ResidentsPage, directorio incluido): 1,5–3,3 s por prueba en
 * reposo, más de 5 s con la máquina cargada; y en el `<input type="email">` (sin API de selección en jsdom) user-event
 * estima el cursor y, con renders intercalados bajo carga, insertaba caracteres desordenados.
 */
async function fill(user: ReturnType<typeof userEvent.setup>, id: string, value: string) {
  await user.click(field(id));
  await user.paste(value);
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await fill(user, 'name', 'Carlos Ruiz');
  await fill(user, 'email', 'carlos@example.test');
  await fill(user, 'phone', '3109876543');
  await waitFor(() => expect(field('propertyId').querySelectorAll('option').length).toBe(3));
  await user.selectOptions(field('propertyId'), 'p-302');
}

beforeEach(() => {
  residentApi.findAll.mockResolvedValue({ content: [existing], totalPages: 1, totalElements: 1 });
});
afterEach(() => cleanup());

describe('ResidentsPage · formulario (TASK-007)', () => {
  it('#8: el modal es un diálogo accesible y cabe en pantalla (alto máximo con scroll)', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Nuevo Residente/ }));
    const dialog = screen.getByRole('dialog', { name: 'Registrar Nuevo Residente' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.className).toContain('max-h-[90vh]');
    expect(dialog.className).toContain('overflow-y-auto');
  });

  it('#1: selector de una sola unidad con búsqueda; sin unidad muestra el error en español y no llama al backend', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Nuevo Residente/ }));
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);

    await fill(user, 'name', 'Carlos Ruiz');
    await fill(user, 'email', 'carlos@example.test');
    await fill(user, 'phone', '3109876543');
    await user.click(screen.getByRole('button', { name: 'Registrar Residente' }));
    expect(residentApi.create).not.toHaveBeenCalled();
    expect(screen.getAllByText(/propiedad o unidad/i).length).toBeGreaterThan(0);

    await waitFor(() => expect(field('propertyId').querySelectorAll('option').length).toBe(3));
    await user.click(screen.getByRole('searchbox', { name: 'Buscar unidad' }));
    await user.paste('torre 2');
    const options = [...field('propertyId').querySelectorAll('option')].map((o) => o.textContent);
    expect(options).toEqual(['Selecciona una unidad', 'Torre 2-Piso 3-Apto 302 · Apto 302']);
  });

  it('#1/#3/#9: alta válida → POST con una unidad y sin estado; el aviso aparece solo tras la respuesta', async () => {
    let resolveCreate!: (v: unknown) => void;
    residentApi.create.mockImplementation(() => new Promise((r) => { resolveCreate = r; }));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Nuevo Residente/ }));
    expect(document.getElementById('status')).toBeNull();
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Registrar Residente' }));

    await waitFor(() => expect(residentApi.create).toHaveBeenCalledTimes(1));
    expect(residentApi.create).toHaveBeenCalledWith({
      name: 'Carlos Ruiz', email: 'carlos@example.test', phone: expect.any(String), propertyId: 'p-302', type: 'Propietario',
    });
    expect(notify.showToast).not.toHaveBeenCalled();

    resolveCreate({ id: 'r-2' });
    await waitFor(() => expect(notify.showToast).toHaveBeenCalledWith('Residente registrado exitosamente', 'success'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('#9: si el backend rechaza el alta no hay aviso de éxito, se muestra su mensaje y el modal sigue abierto', async () => {
    residentApi.create.mockRejectedValue(new ApiError('El correo electrónico ya está registrado.', 409));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Nuevo Residente/ }));
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Registrar Residente' }));

    await waitFor(() => expect(notify.showError).toHaveBeenCalledWith('No se pudo guardar', 'El correo electrónico ya está registrado.'));
    expect(notify.showToast).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Registrar Nuevo Residente' })).toBeTruthy();
  });

  it('#2/#3: editar usa PUT /residents/{id} con el estado del enum (nunca POST) y precarga el estado real', async () => {
    residentApi.update.mockResolvedValue({ ...existing, status: 'ACTIVE' });
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText('Ana Gómez');
    await user.click(screen.getAllByTitle('Editar residente')[0]);

    const status = field('status') as HTMLSelectElement;
    expect([...status.options].map((o) => o.value)).toEqual(['ACTIVE', 'INACTIVE']);
    expect(status.value).toBe('INACTIVE');
    expect(field('propertyId').value).toBe('p-101');

    await user.selectOptions(status, 'ACTIVE');
    await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

    await waitFor(() => expect(residentApi.update).toHaveBeenCalledTimes(1));
    expect(residentApi.update).toHaveBeenCalledWith('r-1', expect.objectContaining({ propertyId: 'p-101', status: 'ACTIVE', name: 'Ana Gómez' }));
    expect(residentApi.create).not.toHaveBeenCalled();
    await waitFor(() => expect(notify.showToast).toHaveBeenCalledWith('Residente actualizado correctamente', 'success'));
  });

  it('#3: la tabla muestra el estado en español', async () => {
    renderPage();
    expect((await screen.findAllByText('Inactivo')).length).toBeGreaterThan(0);
    expect(screen.queryByText('INACTIVE')).toBeNull();
  });
});

describe('ResidentsPage · directorio (TASK-008)', () => {
  const lastCall = () => residentApi.findAll.mock.calls[residentApi.findAll.mock.calls.length - 1];

  it('D-5: por defecto pide solo residentes ACTIVE, página 0', async () => {
    renderPage();
    await screen.findAllByText('Ana Gómez');
    expect(residentApi.findAll).toHaveBeenCalledWith(0, 8, '', { status: 'ACTIVE', type: undefined });
  });

  it('estado INACTIVE o todos, combinable con el tipo; cambiar un filtro vuelve a la página 1', async () => {
    residentApi.findAll.mockResolvedValue({ content: [existing], totalPages: 3, totalElements: 20 });
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText('Ana Gómez');
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }));
    await waitFor(() => expect(lastCall()[0]).toBe(1));

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar por estado' }), 'INACTIVE');
    await waitFor(() => expect(lastCall()).toEqual([0, 8, '', { status: 'INACTIVE', type: undefined }]));

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar por tipo' }), 'Arrendatario');
    await waitFor(() => expect(lastCall()).toEqual([0, 8, '', { status: 'INACTIVE', type: 'Arrendatario' }]));

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar por estado' }), 'ALL');
    await waitFor(() => expect(lastCall()).toEqual([0, 8, '', { status: undefined, type: 'Arrendatario' }]));
  });

  it('el tipo ofrece los valores del dominio, incluido Residente', async () => {
    renderPage();
    await screen.findAllByText('Ana Gómez');
    const options = [...(screen.getByRole('combobox', { name: 'Filtrar por tipo' }) as HTMLSelectElement).options].map((o) => o.value);
    expect(options).toEqual(['Todos', 'Propietario', 'Arrendatario', 'Residente']);
  });

  it('el resumen usa el total del backend y la unidad se muestra por su número, sin UUID', async () => {
    residentApi.findAll.mockResolvedValue({
      content: [{ ...existing, documentId: '1020304050' }], totalPages: 3, totalElements: 20,
    });
    renderPage();
    expect(await screen.findByText('Mostrando 1 a 8 de 20 residentes')).toBeTruthy();
    expect(screen.getAllByText('Torre 1-Piso 1-Apto 101 · Apto 101').length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toContain('p-101');
    expect(document.body.textContent).not.toMatch(/ID: /);
  });

  it('si la página actual queda fuera de rango vuelve a la última página con datos', async () => {
    residentApi.findAll.mockImplementation((page: number) =>
      Promise.resolve(page === 0
        ? { content: [existing], totalPages: 2, totalElements: 9 }
        : { content: [], totalPages: 1, totalElements: 8 }));
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText('Ana Gómez');
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }));
    await waitFor(() => expect(residentApi.findAll.mock.calls.some((c) => c[0] === 1)).toBe(true));
    await waitFor(() => expect(lastCall()[0]).toBe(0));
    expect((await screen.findAllByText('Ana Gómez')).length).toBeGreaterThan(0);
  });
});
