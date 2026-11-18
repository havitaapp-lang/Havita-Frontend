import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { useActiveUnit } from '../../../hooks/useActiveUnit';
import type { Poll } from '../../assemblies/types/assembly.types';
import { pollService, myVotingUnitsKey } from '../../assemblies/services/pollService';
import { livePollService } from '../../assemblies/services/livePollService';
import { ResidentVoteModal } from './ResidentVoteModal';
import { ResidentPollVoteStatus } from './ResidentPollVoteStatus';
import { useVotingSummary } from './useVotingSummary';

export const ResidentLivePollBanner = () => {
  const { user } = useAuth() as any;
  const { activeUnitId: activePropertyId, activeLabel } = useActiveUnit();
  const [livePoll, setLivePoll] = useState<Poll | null>(null);
  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
  const propertyUnit = activeLabel || 'Mi unidad';
  const residentName = user?.name || 'Residente';
  const propertyId = activePropertyId || '';
  const queryClient = useQueryClient();

  const { data: initialPoll } = useQuery({
    queryKey: ['activeLivePoll'],
    queryFn: () => pollService.getActiveLivePoll(),
    retry: false
  });

  useEffect(() => {
    if (initialPoll !== undefined) {
      setLivePoll(initialPoll || null);
    }
  }, [initialPoll]);

  useEffect(() => {
    // Subscribe to live poll changes
    const unsubscribe = livePollService.subscribeToLivePoll((poll) => {
      setLivePoll(poll);
    });

    return () => unsubscribe();
  }, []);

  if (!livePoll) return null;

  return (
    <>
      <div
        onClick={() => setIsVoteModalOpen(true)}
        className="p-4 sm:p-5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-3xl shadow-lg shadow-red-500/15 cursor-pointer hover:scale-[1.01] transition-all border border-red-400/40 relative overflow-hidden group animate-fade-in"
      >
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-xl" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white text-red-700 uppercase tracking-wider shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                Votación en Vivo
              </span>
              <span className="text-xs text-red-100 font-semibold">{livePoll.assemblyTitle}</span>
            </div>

            <h3 className="text-sm sm:text-base font-black text-white leading-snug line-clamp-2">
              "{livePoll.question}"
            </h3>

            <p className="text-xs text-red-100/90 flex items-center gap-2 pt-0.5">
              <span>{livePoll.totalVotes} copropietarios participando</span>
              <span>•</span>
              {/* Fase 2 / E5: estado por unidad desde el backend (p. ej. «Votaste por 1 de 2 unidades · 1 pendiente»). */}
              <ResidentPollVoteStatus pollId={livePoll.id} pollIsLive={livePoll.status === 'LIVE'} tone="banner" />
            </p>
          </div>

          <button
            type="button"
            className="px-4 py-2.5 bg-white text-red-700 font-black rounded-2xl text-xs flex items-center gap-2 shadow-md group-hover:bg-red-50 transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
          >
            <LivePollCta pollId={livePoll.id} />
            <ArrowRight className="w-3.5 h-3.5 text-red-700 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      <ResidentVoteModal
        poll={livePoll}
        isOpen={isVoteModalOpen}
        onClose={() => setIsVoteModalOpen(false)}
        propertyId={propertyId}
        propertyUnit={propertyUnit}
        residentName={residentName}
        onVoted={(id) => queryClient.invalidateQueries({ queryKey: myVotingUnitsKey(id) })}
      />
    </>
  );
};


/** Texto del botón según el estado de voto real (backend): «Votar Ahora» solo si alguna unidad puede votar. */
function LivePollCta({ pollId }: { pollId: string }) {
  const { summary } = useVotingSummary(pollId, true);
  return <>{summary?.canVote ? 'Votar Ahora' : 'Ver Resultados'}</>;
}
