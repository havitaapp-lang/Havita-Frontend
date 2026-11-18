import { useQuery } from '@tanstack/react-query';
import { pollService, myVotingUnitsKey } from '../../assemblies/services/pollService';
import { summarizeVotingUnits, type VotingSummary } from './votingStatus';

/**
 * Fase 2 / E5: estado de voto de las unidades del residente en una pregunta, leído del backend
 * (GET /assemblies/polls/{id}/my-voting-units). Una consulta por pregunta visible, con caché de React Query por
 * pregunta (la comparten el listado, el banner y la recarga tras votar). Sin respaldo en localStorage: si la consulta
 * falla se informa el error, no un estado supuesto.
 */
export function useVotingSummary(pollId: string, pollIsLive: boolean) {
  const query = useQuery({
    queryKey: myVotingUnitsKey(pollId),
    queryFn: () => pollService.getMyVotingUnits(pollId),
    enabled: !!pollId,
    retry: false,
  });
  const summary: VotingSummary | null = query.data ? summarizeVotingUnits(query.data, pollIsLive) : null;
  return { summary, isLoading: query.isLoading, isError: query.isError };
}
