import { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import type { Poll } from '../../assemblies/types/assembly.types';
import { pollService } from '../../assemblies/services/pollService';
import { livePollService } from '../../assemblies/services/livePollService';
import { ResidentVoteModal } from './ResidentVoteModal';

export const ResidentLivePollBanner = () => {
  const { user, activePropertyId } = useAuth() as any;
  const [livePoll, setLivePoll] = useState<Poll | null>(null);
  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
  const propertyUnit = user?.propertyUnit || 'Mi Apartamento';
  const residentName = user?.name || 'Residente';
  const propertyId = activePropertyId || '';

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

  const hasVoted = pollService.hasPropertyVoted(livePoll.id, propertyId);

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
              {hasVoted ? (
                <span className="inline-flex items-center gap-1 font-bold text-white bg-black/20 px-2 py-0.5 rounded-md text-[11px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-300" /> Ya votaste
                </span>
              ) : (
                <span className="font-bold text-yellow-200">¡Tu voto está pendiente!</span>
              )}
            </p>
          </div>

          <button
            type="button"
            className="px-4 py-2.5 bg-white text-red-700 font-black rounded-2xl text-xs flex items-center gap-2 shadow-md group-hover:bg-red-50 transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
          >
            {hasVoted ? 'Ver Resultados' : 'Votar Ahora'}
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
      />
    </>
  );
};

