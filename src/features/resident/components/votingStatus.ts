import type { MyVotingUnit } from '../../assemblies/services/pollService';

/**
 * Fase 2 / E5: resumen del estado de voto de las unidades del residente en una pregunta, a partir de
 * GET /assemblies/polls/{id}/my-voting-units (PostgreSQL vía backend; nunca localStorage).
 *
 * - ALL_VOTED: votó por todas sus unidades habilitadas (al menos una).
 * - PARTIAL: votó por alguna y aún tiene otra pendiente.
 * - PENDING: tiene unidades habilitadas y todavía no votó por ninguna.
 * - NOT_ELIGIBLE: pregunta abierta, pero ninguna de sus unidades está habilitada (y no votó).
 * - CLOSED: pregunta cerrada sin votos de sus unidades.
 * - NO_UNITS: no tiene unidades en la comunidad.
 */
export type VotingSummaryState = 'ALL_VOTED' | 'PARTIAL' | 'PENDING' | 'NOT_ELIGIBLE' | 'CLOSED' | 'NO_UNITS';

export interface VotingSummary {
  state: VotingSummaryState;
  total: number;
  voted: number;
  pending: number;
  /** Texto corto para la insignia. */
  label: string;
  /** true si hay al menos una unidad que puede votar ahora. */
  canVote: boolean;
}

const units = (n: number) => (n === 1 ? 'unidad' : 'unidades');

export function summarizeVotingUnits(list: MyVotingUnit[], pollIsLive: boolean): VotingSummary {
  const total = list.length;
  const voted = list.filter((u) => u.hasVoted).length;
  const pending = list.filter((u) => u.canVote).length;
  const base = { total, voted, pending, canVote: pending > 0 };
  if (total === 0) return { ...base, state: 'NO_UNITS', label: 'Sin unidades en esta comunidad' };
  if (voted > 0 && pending > 0) {
    return { ...base, state: 'PARTIAL', label: `Votaste por ${voted} de ${voted + pending} ${units(voted + pending)} · ${pending} pendiente${pending === 1 ? '' : 's'}` };
  }
  if (voted > 0) {
    return { ...base, state: 'ALL_VOTED', label: voted === 1 && total === 1 ? 'Ya emitiste tu voto' : `Votaste por ${voted} ${units(voted)}` };
  }
  if (pending > 0) {
    return { ...base, state: 'PENDING', label: pending === 1 ? 'Tu voto está pendiente' : `${pending} ${units(pending)} pendientes de votar` };
  }
  if (!pollIsLive || list.every((u) => u.status === 'CLOSED')) {
    return { ...base, state: 'CLOSED', label: 'Votación concluida' };
  }
  return { ...base, state: 'NOT_ELIGIBLE', label: 'Ninguna de tus unidades está habilitada para votar' };
}
