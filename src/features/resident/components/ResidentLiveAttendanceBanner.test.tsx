import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../../../api/apiClient';
import type { MyAttendanceUnit } from '../../assemblies/services/assemblyService';

const asm = vi.hoisted(() => ({ getActiveAssembly: vi.fn(), getMyAttendanceUnits: vi.fn(), selfRegisterAttendee: vi.fn() }));
const notify = vi.hoisted(() => ({ showToast: vi.fn() }));
const activeUnit = vi.hoisted(() => ({ select: vi.fn() }));
vi.mock('../../assemblies/services/assemblyService', () => ({
  assemblyService: asm,
  myAttendanceUnitsKey: (id: string) => ['myAttendanceUnits', id],
}));
vi.mock('../../../services/notificationService', () => ({ notificationService: notify }));
// Si el banner intentara cambiar la unidad activa, lo veríamos aquí (no debe usarlo).
vi.mock('../../../hooks/useActiveUnit', () => ({ useActiveUnit: () => ({ activeUnitId: 'p-101', selectUnit: activeUnit.select }) }));

import { ResidentLiveAttendanceBanner } from './ResidentLiveAttendanceBanner';

const unit = (id: string, status: MyAttendanceUnit['status'], extra: Partial<MyAttendanceUnit> = {}): MyAttendanceUnit => ({
  propertyId: id, label: `Apto ${id}`, number: id, relations: ['Propietario'], status,
  registered: status === 'REGISTERED', registeredByMe: status === 'REGISTERED', canRegister: status === 'PENDING', ...extra,
});

function renderBanner() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><ResidentLiveAttendanceBanner /></QueryClientProvider>);
}

describe('ResidentLiveAttendanceBanner · asistencia por varias unidades (Fase 2 / E5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asm.getActiveAssembly.mockResolvedValue({ id: 'asm-1', title: 'Asamblea ordinaria', status: 'IN_PROGRESS' });
  });
  afterEach(() => cleanup());

  it('lista cada unidad con su estado y registra la elegida con su propio id, sin tocar la unidad activa', async () => {
    asm.getMyAttendanceUnits
      .mockResolvedValueOnce([
        unit('p-101', 'PENDING'),
        unit('p-102', 'PENDING'),
        unit('p-103', 'NOT_ELIGIBLE', { reasonCode: 'VOTING_RIGHT_DELEGATED', reasonMessage: 'El derecho de voto está delegado al arrendatario.' }),
      ])
      .mockResolvedValue([unit('p-101', 'PENDING'), unit('p-102', 'REGISTERED'), unit('p-103', 'NOT_ELIGIBLE')]);
    asm.selfRegisterAttendee.mockResolvedValue({});
    const user = userEvent.setup();
    renderBanner();

    const rows = await screen.findAllByTestId('attendance-unit');
    expect(rows.map((r) => r.getAttribute('data-status'))).toEqual(['PENDING', 'PENDING', 'NOT_ELIGIBLE']);
    expect(within(rows[2]).getByText('El derecho de voto está delegado al arrendatario.')).toBeTruthy();
    expect(within(rows[2]).queryByTestId('attendance-register')).toBeNull();

    await user.click(within(rows[1]).getByTestId('attendance-register'));
    await waitFor(() => expect(asm.selfRegisterAttendee).toHaveBeenCalledWith('asm-1', 'p-102'));
    expect(notify.showToast).toHaveBeenCalledWith('Asistencia registrada para Apto p-102', 'success');
    await waitFor(() => expect(screen.getAllByTestId('attendance-unit')[1].getAttribute('data-status')).toBe('REGISTERED'));
    expect(activeUnit.select).not.toHaveBeenCalled();
  });

  it('rechazo del backend: muestra el motivo, sin reintentar ni registrar otra unidad', async () => {
    asm.getMyAttendanceUnits.mockResolvedValue([unit('p-101', 'PENDING'), unit('p-102', 'PENDING')]);
    asm.selfRegisterAttendee.mockRejectedValue(new ApiError('El derecho de voto está delegado al arrendatario.', 409, { code: 'VOTING_RIGHT_DELEGATED' }));
    const user = userEvent.setup();
    renderBanner();
    const rows = await screen.findAllByTestId('attendance-unit');
    await user.click(within(rows[0]).getByTestId('attendance-register'));
    await waitFor(() => expect(notify.showToast).toHaveBeenCalledWith('El derecho de voto está delegado al arrendatario.', 'error'));
    expect(asm.selfRegisterAttendee).toHaveBeenCalledTimes(1);
    expect(asm.selfRegisterAttendee).toHaveBeenCalledWith('asm-1', 'p-101');
  });

  it('una sola unidad habilitada: un solo botón «Presente», sin pasos extra', async () => {
    asm.getMyAttendanceUnits.mockResolvedValue([unit('p-101', 'PENDING')]);
    asm.selfRegisterAttendee.mockResolvedValue({});
    const user = userEvent.setup();
    renderBanner();
    await user.click(await screen.findByRole('button', { name: /Presente/ }));
    await waitFor(() => expect(asm.selfRegisterAttendee).toHaveBeenCalledWith('asm-1', 'p-101'));
    expect(screen.queryAllByTestId('attendance-unit')).toHaveLength(0);
  });

  it('copropietarios (D11): la unidad ya representada por otro copropietario se muestra registrada y sin botón; la propia sigue pendiente', async () => {
    asm.getMyAttendanceUnits.mockResolvedValue([
      unit('p-101', 'REGISTERED', { registeredByMe: false, representativeName: 'Luis Pérez' }),
      unit('p-102', 'PENDING'),
    ]);
    renderBanner();
    const rows = await screen.findAllByTestId('attendance-unit');
    expect(rows[0].getAttribute('data-status')).toBe('REGISTERED');
    expect(within(rows[0]).getByText('La unidad está representada por Luis Pérez.')).toBeTruthy(); // D14: representante visible
    expect(within(rows[0]).queryByTestId('attendance-register')).toBeNull(); // no se puede sustituir al representante
    expect(within(rows[1]).getByTestId('attendance-register')).toBeTruthy();
  });

  it('copropietario sin asistencia: puede registrarla; si otro copropietario se adelanta, se muestra el rechazo y el estado real', async () => {
    asm.getMyAttendanceUnits
      .mockResolvedValueOnce([unit('p-101', 'PENDING')])
      .mockResolvedValue([unit('p-101', 'REGISTERED', { registeredByMe: false })]);
    asm.selfRegisterAttendee.mockRejectedValue(new ApiError('El inmueble ya ha sido registrado en la lista de asistencia.', 409, { code: 'ALREADY_REGISTERED' }));
    const user = userEvent.setup();
    renderBanner();
    await user.click(await screen.findByRole('button', { name: /Presente/ }));
    await waitFor(() => expect(notify.showToast).toHaveBeenCalledWith('El inmueble ya ha sido registrado en la lista de asistencia.', 'error'));
    expect(notify.showToast).not.toHaveBeenCalledWith(expect.stringContaining('Asistencia registrada para'), 'success');
    expect(asm.selfRegisterAttendee).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId('attendance-done')).toBeTruthy(); // estado releído: la unidad ya está representada
  });

  it('error al consultar: aviso de error y ningún botón de registro', async () => {
    asm.getMyAttendanceUnits.mockRejectedValue(new Error('boom'));
    renderBanner();
    expect(await screen.findByTestId('attendance-error')).toBeTruthy();
    expect(screen.queryByTestId('attendance-register')).toBeNull();
  });
});
