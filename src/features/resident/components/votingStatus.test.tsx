import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { MyVotingUnit } from '../../assemblies/services/pollService';
import { summarizeVotingUnits } from './votingStatus';

const polls = vi.hoisted(() => ({ getMyVotingUnits: vi.fn() }));
vi.mock('../../assemblies/services/pollService', () => ({
  pollService: polls,
  myVotingUnitsKey: (id: string) => ['myVotingUnits', id],
}));

import { ResidentPollVoteStatus } from './ResidentPollVoteStatus';

const unit = (id: string, status: MyVotingUnit['status'], extra: Partial<MyVotingUnit> = {}): MyVotingUnit => ({
  propertyId: id, label: `Unidad ${id}`, number: id, relations: ['Propietario'], status,
  hasVoted: status === 'VOTED', canVote: status === 'PENDING', ...extra,
});

describe('summarizeVotingUnits (Fase 2 / E5)', () => {
  it('dos unidades y votó por una: queda claro que tiene otra pendiente', () => {
    const s = summarizeVotingUnits([unit('101', 'VOTED'), unit('102', 'PENDING')], true);
    expect(s.state).toBe('PARTIAL');
    expect(s.label).toBe('Votaste por 1 de 2 unidades · 1 pendiente');
    expect(s.canVote).toBe(true);
  });

  it('todas las habilitadas votaron; una sola unidad: «Ya emitiste tu voto»', () => {
    expect(summarizeVotingUnits([unit('101', 'VOTED'), unit('102', 'VOTED')], true)).toMatchObject({ state: 'ALL_VOTED', label: 'Votaste por 2 unidades' });
    expect(summarizeVotingUnits([unit('101', 'VOTED')], true).label).toBe('Ya emitiste tu voto');
    // Votó por una y la otra no está habilitada (p. ej. delegada): no hay pendientes.
    expect(summarizeVotingUnits([unit('101', 'VOTED'), unit('102', 'NOT_ELIGIBLE')], true).state).toBe('ALL_VOTED');
  });

  it('pendientes, no habilitadas y cerrada se distinguen', () => {
    expect(summarizeVotingUnits([unit('101', 'PENDING'), unit('102', 'PENDING')], true).label).toBe('2 unidades pendientes de votar');
    expect(summarizeVotingUnits([unit('101', 'NOT_ELIGIBLE')], true).state).toBe('NOT_ELIGIBLE');
    expect(summarizeVotingUnits([unit('101', 'CLOSED'), unit('102', 'CLOSED')], false)).toMatchObject({ state: 'CLOSED', canVote: false });
    expect(summarizeVotingUnits([], true).state).toBe('NO_UNITS');
  });
});

describe('ResidentPollVoteStatus · estado de voto desde el backend (Fase 2 / E5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });
  afterEach(() => cleanup());

  const renderStatus = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={client}><ResidentPollVoteStatus pollId="poll-1" pollIsLive /></QueryClientProvider>);
  };

  it('muestra el estado por unidad del backend e ignora cualquier marca antigua de localStorage', async () => {
    localStorage.setItem('havita_voted_poll-1_101', 'opt-1');
    localStorage.setItem('havita_voted_poll-1_102', 'opt-1');
    polls.getMyVotingUnits.mockResolvedValue([unit('101', 'VOTED'), unit('102', 'PENDING')]);
    renderStatus();
    const badge = await screen.findByText('Votaste por 1 de 2 unidades · 1 pendiente');
    expect(badge.getAttribute('data-state')).toBe('PARTIAL');
    expect(polls.getMyVotingUnits).toHaveBeenCalledWith('poll-1');
  });

  it('si la consulta falla muestra un error, no «ya votó» desde localStorage', async () => {
    localStorage.setItem('havita_voted_poll-1_101', 'opt-1');
    polls.getMyVotingUnits.mockRejectedValue(new Error('boom'));
    renderStatus();
    expect(await screen.findByText('No se pudo consultar el estado de tu voto')).toBeTruthy();
    expect(screen.queryByText(/votaste|emitiste/i)).toBeNull();
  });
});
