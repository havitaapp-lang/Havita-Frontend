import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const polls = vi.hoisted(() => ({ getMyVotingUnits: vi.fn(), submitVote: vi.fn(), getPropertyVote: vi.fn(() => null) }));
const notify = vi.hoisted(() => ({ showToast: vi.fn() }));
const select = vi.hoisted(() => vi.fn());

vi.mock('../../assemblies/services/pollService', () => ({ pollService: polls }));
vi.mock('../../assemblies/services/livePollService', () => ({ livePollService: { subscribe: () => () => {} } }));
vi.mock('../../../services/notificationService', () => ({ notificationService: notify }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Ana' } }) }));
vi.mock('../../../hooks/useActiveUnit', () => ({
  useActiveUnit: () => ({ activeUnitId: 'U1', activeLabel: 'Torre 1 · Apto 101', select }),
}));

import { ResidentVoteModal } from './ResidentVoteModal';

const poll = {
  id: 'P1', question: '¿Aprueba el presupuesto?', status: 'LIVE', assemblyTitle: 'Ordinaria', totalVotes: 0,
  participationRate: 0, showResultsToResidents: true,
  options: [{ id: 'O1', text: 'Sí', percentage: 0 }, { id: 'O2', text: 'No', percentage: 0 }],
} as any;

const unit = (id: string, label: string, status: string) => ({
  propertyId: id, label, number: id, relations: ['Propietario'], status,
  hasVoted: status === 'VOTED', canVote: status === 'PENDING',
  reasonCode: status === 'NOT_ELIGIBLE' ? 'VOTING_RIGHT_DELEGATED' : null,
  reasonMessage: status === 'NOT_ELIGIBLE' ? 'El derecho de voto de esta unidad está delegado al arrendatario.' : null,
});

beforeEach(() => {
  polls.getMyVotingUnits.mockReset();
  polls.submitVote.mockReset();
  notify.showToast.mockReset();
  select.mockReset();
});
afterEach(() => cleanup());

describe('ResidentVoteModal (Fase 2 / E3, D5)', () => {
  it('una sola unidad habilitada: sin pasos extra; vota por esa unidad y confirma tras el backend', async () => {
    polls.getMyVotingUnits.mockResolvedValueOnce([unit('U1', 'Torre 1 · Apto 101', 'PENDING')])
      .mockResolvedValueOnce([unit('U1', 'Torre 1 · Apto 101', 'VOTED')]);
    let resolve!: (v: unknown) => void;
    polls.submitVote.mockReturnValue(new Promise((r) => { resolve = r; }));
    const user = userEvent.setup();
    render(<ResidentVoteModal poll={poll} isOpen onClose={() => {}} />);

    await screen.findByText('Selecciona tu opción:');
    await user.click(screen.getByText('Sí'));
    await user.click(screen.getByText('Emitir Mi Voto'));
    expect(polls.submitVote).toHaveBeenCalledWith('P1', 'O1', 'U1', 'Ana');
    expect(notify.showToast).not.toHaveBeenCalled(); // aún sin respuesta
    await act(async () => { resolve({ success: true, poll }); });
    await waitFor(() => expect(notify.showToast).toHaveBeenCalledWith(expect.stringMatching(/Voto registrado/), 'success'));
    await waitFor(() => expect(screen.getByText('¡Tu voto está registrado!')).toBeTruthy());
  });

  it('varias unidades: muestra estado de cada una, exige elegir y vota por la elegida sin cambiar la unidad activa', async () => {
    polls.getMyVotingUnits.mockResolvedValue([
      unit('U1', 'Torre 1 · Apto 101', 'VOTED'),
      unit('U2', 'Torre 2 · Apto 202', 'PENDING'),
      unit('U3', 'Torre 3 · Apto 303', 'PENDING'),
      unit('U4', 'Casa 4', 'NOT_ELIGIBLE'),
    ]);
    polls.submitVote.mockResolvedValue({ success: true, poll });
    const user = userEvent.setup();
    render(<ResidentVoteModal poll={poll} isOpen onClose={() => {}} />);

    const rows = await screen.findAllByTestId('vote-unit');
    expect(rows).toHaveLength(4);
    expect(rows[0].textContent).toContain('Ya votó');
    expect(rows[1].textContent).toContain('Pendiente');
    expect(rows[3].textContent).toContain('No habilitada');
    expect((rows[0].querySelector('input') as HTMLInputElement).disabled).toBe(true);
    expect((rows[3].querySelector('input') as HTMLInputElement).disabled).toBe(true);
    // Dos pendientes y la activa (U1) ya votó: no se elige ninguna por defecto.
    expect(screen.queryByText('Emitir Mi Voto')).toBeNull();

    await user.click(screen.getByText('Torre 3 · Apto 303'));
    await screen.findByText('Selecciona tu opción:');
    await user.click(screen.getByText('No'));
    await user.click(screen.getByText('Emitir Mi Voto'));
    expect(polls.submitVote).toHaveBeenCalledWith('P1', 'O2', 'U3', 'Ana');
    expect(select).not.toHaveBeenCalled(); // la unidad activa del portal no cambia
  });

  it('varios clics seguidos: un solo voto', async () => {
    polls.getMyVotingUnits.mockResolvedValue([unit('U1', 'Torre 1 · Apto 101', 'PENDING')]);
    let resolve!: (v: unknown) => void;
    polls.submitVote.mockReturnValue(new Promise((r) => { resolve = r; }));
    const user = userEvent.setup();
    render(<ResidentVoteModal poll={poll} isOpen onClose={() => {}} />);
    await screen.findByText('Selecciona tu opción:');
    await user.click(screen.getByText('Sí'));
    const send = screen.getByText('Emitir Mi Voto');
    act(() => { send.click(); send.click(); send.click(); });
    expect(polls.submitVote).toHaveBeenCalledTimes(1);
    await act(async () => { resolve({ success: true, poll }); });
  });

  it('voto rechazado por el backend: muestra el error y no da por registrado el voto', async () => {
    polls.getMyVotingUnits.mockResolvedValue([unit('U1', 'Torre 1 · Apto 101', 'PENDING')]);
    polls.submitVote.mockRejectedValue(new Error('El inmueble ya ha ejercido su voto en esta votación.'));
    const user = userEvent.setup();
    render(<ResidentVoteModal poll={poll} isOpen onClose={() => {}} />);
    await screen.findByText('Selecciona tu opción:');
    await user.click(screen.getByText('Sí'));
    await user.click(screen.getByText('Emitir Mi Voto'));
    await waitFor(() => expect(notify.showToast).toHaveBeenCalledWith('El inmueble ya ha ejercido su voto en esta votación.', 'error'));
    expect(screen.queryByText('¡Tu voto está registrado!')).toBeNull();
  });

  it('unidad delegada (única): explica el motivo y no permite votar', async () => {
    polls.getMyVotingUnits.mockResolvedValue([unit('U1', 'Torre 1 · Apto 101', 'NOT_ELIGIBLE')]);
    render(<ResidentVoteModal poll={poll} isOpen onClose={() => {}} />);
    expect(await screen.findByText(/delegado al arrendatario/)).toBeTruthy();
    expect(screen.queryByText('Emitir Mi Voto')).toBeNull();
  });
});
