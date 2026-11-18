import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../../../api/apiClient';

const asm = vi.hoisted(() => ({ registerAttendee: vi.fn(), getEligibleRepresentatives: vi.fn(), assignRepresentative: vi.fn() }));
const notify = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock('../services/assemblyService', () => ({ assemblyService: asm }));
vi.mock('../../../services/notificationService', () => ({ notificationService: notify }));
vi.mock('../../../api/propertyApi', () => ({ propertyApi: { findAll: vi.fn() } }));

import { ManualRegistrationModal } from './AssemblyAttendanceList';

const property = { propertyId: 'p-101', propertyNumber: '101' };
const candidates = [
  { residentId: 'r-ana', name: 'Ana', type: 'Propietario', eligible: true },
  { residentId: 'r-luis', name: 'Luis', type: 'Propietario', eligible: true },
  { residentId: 'r-beto', name: 'Beto', type: 'Arrendatario', eligible: false, reasonCode: 'VOTING_RIGHT_NOT_DELEGATED', reasonMessage: 'No tienes el derecho de voto delegado por el propietario.' },
];

function renderModal(props: Record<string, unknown> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSuccess = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <ManualRegistrationModal assemblyId="asm-1" property={property} onClose={() => {}} onSuccess={onSuccess} {...props} />
    </QueryClientProvider>,
  );
  return { onSuccess };
}

describe('Registro administrativo de asistencia (cierre E5 / D13-D14)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asm.getEligibleRepresentatives.mockResolvedValue(candidates);
  });
  afterEach(() => cleanup());

  it('D14: no hay representante preseleccionado; sin elegir no se puede guardar; las personas no elegibles no se pueden elegir', async () => {
    renderModal();
    const options = await screen.findAllByTestId('representative-option');
    expect(options).toHaveLength(3);
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radios.some((r) => r.checked)).toBe(false); // no se elige la primera automáticamente
    expect(radios[2].disabled).toBe(true); // arrendatario sin delegación
    expect(screen.getByText('No tienes el derecho de voto delegado por el propietario.')).toBeTruthy();
    expect((screen.getByRole('button', { name: /Registrar Asistencia/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(asm.registerAttendee).not.toHaveBeenCalled();
  });

  it('D14: se registra al copropietario elegido explícitamente', async () => {
    asm.registerAttendee.mockResolvedValue({ id: 'att-1' });
    const user = userEvent.setup();
    const { onSuccess } = renderModal();
    await user.click(await screen.findByRole('radio', { name: /Luis/ }));
    await user.click(screen.getByRole('button', { name: /Registrar Asistencia/ }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(asm.registerAttendee).toHaveBeenCalledWith('asm-1', { propertyId: 'p-101', residentId: 'r-luis', isPowerOfAttorney: false });
    expect(notify.showToast).toHaveBeenCalledWith('Asistencia registrada correctamente', 'success');
  });

  it('D14: «Apoderado» no está disponible: aviso claro y no se puede guardar', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: /Tiene Apoderado/ }));
    expect(screen.getByTestId('power-of-attorney-unavailable')).toBeTruthy();
    expect((screen.getByRole('button', { name: /Registrar Asistencia/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(asm.registerAttendee).not.toHaveBeenCalled();
  });

  it('rechazo del backend: motivo real, sin éxito, sin refrescar el quórum y sin doble envío', async () => {
    let reject!: (e: unknown) => void;
    asm.registerAttendee.mockReturnValue(new Promise((_, r) => { reject = r; }));
    const user = userEvent.setup();
    const { onSuccess } = renderModal();
    await user.click(await screen.findByRole('radio', { name: /Ana/ }));
    const submit = screen.getByRole('button', { name: /Registrar Asistencia|Guardando/ });
    await user.click(submit);
    await user.click(submit); // doble clic mientras la primera petición sigue en curso
    expect(asm.registerAttendee).toHaveBeenCalledTimes(1);
    reject(new ApiError('La asamblea ya finalizó; no se registran más asistencias.', 409, { code: 'ASSEMBLY_ENDED' }));
    await waitFor(() => expect(notify.showToast).toHaveBeenCalledWith('La asamblea ya finalizó; no se registran más asistencias.', 'error'));
    expect(notify.showToast).not.toHaveBeenCalledWith('Asistencia registrada correctamente', 'success');
    expect(onSuccess).not.toHaveBeenCalled();
    expect(asm.registerAttendee).toHaveBeenCalledTimes(1);
    // Tras el rechazo el formulario sigue con la selección y puede reintentarse manualmente (no automáticamente).
    expect((screen.getByRole('radio', { name: /Ana/ }) as HTMLInputElement).checked).toBe(true);
  });

  it('D14: regularizar una asistencia sin persona asigna el representante elegido', async () => {
    asm.assignRepresentative.mockResolvedValue({});
    const user = userEvent.setup();
    const { onSuccess } = renderModal({ attendeeId: 'att-9' });
    await user.click(await screen.findByRole('radio', { name: /Ana/ }));
    await user.click(screen.getByRole('button', { name: /Asignar Representante/ }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(asm.assignRepresentative).toHaveBeenCalledWith('asm-1', 'att-9', 'r-ana');
    expect(asm.registerAttendee).not.toHaveBeenCalled();
  });
});
