import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../../api/apiClient';

const panic = vi.hoisted(() => ({ createAlert: vi.fn() }));
const unitState = vi.hoisted(() => ({ activeUnitId: 'UNIT-A' as string | null, activeLabel: 'Torre 2 · Apto 402' }));

vi.mock('../../../services/panicService', () => ({ panicService: panic }));
vi.mock('../../../hooks/useActiveUnit', () => ({ useActiveUnit: () => unitState }));

import SosButton from './SosButton';

async function openAndConfirm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Botón de emergencia SOS/i }));
  await user.click(screen.getByText('Emergencia médica'));
}

beforeEach(() => {
  panic.createAlert.mockReset();
  unitState.activeUnitId = 'UNIT-A';
  unitState.activeLabel = 'Torre 2 · Apto 402';
});

afterEach(() => cleanup());

describe('SosButton (Fase 2 / E2, D6)', () => {
  it('16/19 · con unidad válida: envía para ESA unidad y muestra éxito solo tras la confirmación del backend', async () => {
    let resolve!: (v: unknown) => void;
    panic.createAlert.mockReturnValue(new Promise((r) => { resolve = r; }));
    const user = userEvent.setup();
    render(<SosButton />);
    await openAndConfirm(user);
    expect(screen.getByTestId('sos-unit').textContent).toContain('Torre 2 · Apto 402'); // sin segunda confirmación
    await user.click(screen.getByText('Enviar alerta'));

    expect(panic.createAlert).toHaveBeenCalledWith('MEDICAL', undefined, 'UNIT-A');
    expect(screen.queryByText('Alerta enviada con éxito')).toBeNull(); // aún no confirmada
    expect(screen.getByText('Enviando alerta de emergencia...')).toBeTruthy();

    await act(async () => { resolve({ id: 'alert-1' }); });
    await waitFor(() => expect(screen.getByText('Alerta enviada con éxito')).toBeTruthy());
  });

  it('17 · sin unidad seleccionada: avisa, no permite enviar y no llama al backend', async () => {
    unitState.activeUnitId = null;
    unitState.activeLabel = '';
    const user = userEvent.setup();
    render(<SosButton />);
    await user.click(screen.getByRole('button', { name: /Botón de emergencia SOS/i }));
    expect(screen.getByTestId('sos-no-unit').textContent).toMatch(/Selecciona tu unidad/);
    await user.click(screen.getByText('Emergencia médica'));
    const send = screen.getByText('Enviar alerta') as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    await user.click(send);
    expect(panic.createAlert).not.toHaveBeenCalled();
  });

  it('18 · alerta rechazada (unidad no disponible): muestra el motivo, nunca éxito, y no reintenta con otra unidad', async () => {
    panic.createAlert.mockRejectedValue(new ApiError('no disponible', 409, { code: 'UNIT_NOT_AVAILABLE' }));
    const user = userEvent.setup();
    render(<SosButton />);
    await openAndConfirm(user);
    await user.click(screen.getByText('Enviar alerta'));

    await waitFor(() => expect(screen.getByTestId('sos-error')).toBeTruthy());
    expect(screen.getByText('La alerta no fue enviada')).toBeTruthy();
    expect(screen.getByTestId('sos-error').textContent).toMatch(/ya no está disponible/);
    expect(screen.queryByText('Alerta enviada con éxito')).toBeNull();
    expect(panic.createAlert).toHaveBeenCalledTimes(1);
  });

  it('error de red: mensaje de que NO se envió', async () => {
    panic.createAlert.mockRejectedValue(new ApiError('sin conexión', 0));
    const user = userEvent.setup();
    render(<SosButton />);
    await openAndConfirm(user);
    await user.click(screen.getByText('Enviar alerta'));
    await waitFor(() => expect(screen.getByTestId('sos-error').textContent).toMatch(/NO se pudo enviar/));
  });

  it('20 · varios clics seguidos: una sola alerta', async () => {
    let resolve!: (v: unknown) => void;
    panic.createAlert.mockReturnValue(new Promise((r) => { resolve = r; }));
    const user = userEvent.setup();
    render(<SosButton />);
    await openAndConfirm(user);
    const send = screen.getByText('Enviar alerta');
    // Dos clics en el mismo instante (antes de que React vuelva a pintar).
    act(() => { send.click(); send.click(); });
    expect(panic.createAlert).toHaveBeenCalledTimes(1);
    await act(async () => { resolve({ id: 'alert-1' }); });
    await waitFor(() => expect(screen.getByText('Alerta enviada con éxito')).toBeTruthy());
    expect(panic.createAlert).toHaveBeenCalledTimes(1);
  });
});
