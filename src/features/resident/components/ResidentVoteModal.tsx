import { useState, useEffect } from 'react';
import { X, CheckCircle2, Send, BarChart3 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import type { Poll } from '../../assemblies/types/assembly.types';
import { pollService } from '../../assemblies/services/pollService';
import { livePollService } from '../../assemblies/services/livePollService';
import { notificationService } from '../../../services/notificationService';

interface ResidentVoteModalProps {
  poll: Poll | null;
  isOpen: boolean;
  onClose: () => void;
  propertyId?: string;
  propertyUnit?: string;
  residentName?: string;
}

export const ResidentVoteModal: React.FC<ResidentVoteModalProps> = ({
  poll: initialPoll,
  isOpen,
  onClose,
  propertyId: propId,
  propertyUnit: propUnit,
  residentName: propName,
}) => {
  const { user, activePropertyId } = useAuth();
  const propertyId = propId || activePropertyId || '';
  const propertyUnit = propUnit || user?.propertyUnit || 'Mi Apartamento';
  const residentName = propName || user?.name || 'Residente';
  const [poll, setPoll] = useState<Poll | null>(initialPoll);
  const isAlreadyVoted = initialPoll ? pollService.hasPropertyVoted(initialPoll.id, propertyId) : false;
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [hasVoted, setHasVoted] = useState(isAlreadyVoted);
  const [userVotedOptionId, setUserVotedOptionId] = useState<string | null>(
    initialPoll ? pollService.getPropertyVote(initialPoll.id, propertyId) : null
  );
  const [submitting, setSubmitting] = useState(false);

  // Sync when initialPoll changes
  const [prevPollId, setPrevPollId] = useState(initialPoll?.id);
  if (initialPoll && initialPoll.id !== prevPollId) {
    setPrevPollId(initialPoll.id);
    setPoll(initialPoll);
    const voted = pollService.hasPropertyVoted(initialPoll.id, propertyId);
    setHasVoted(voted);
    setUserVotedOptionId(pollService.getPropertyVote(initialPoll.id, propertyId));
    setSelectedOptionId('');
  }

  useEffect(() => {
    if (!initialPoll) return;
    const unsubscribe = livePollService.subscribe(initialPoll.id, (updated) => {
      setPoll(updated);
    });
    return () => unsubscribe();
  }, [initialPoll]);

  if (!isOpen || !poll) return null;

  const handleVote = async () => {
    if (!selectedOptionId) {
      notificationService.showToast('Por favor selecciona una opción para votar', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const { poll: updatedPoll } = await pollService.submitVote(
        poll.id,
        selectedOptionId,
        propertyId,
        residentName
      );
      setPoll(updatedPoll);
      setHasVoted(true);
      setUserVotedOptionId(selectedOptionId);
      notificationService.showToast('¡Tu voto fue registrado exitosamente!', 'success');
    } catch (err: any) {
      notificationService.showToast(err.message || 'Error al emitir voto', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isLive = poll.status === 'LIVE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isLive ? 'bg-red-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-red-600 block">
                {isLive ? 'VOTACIÓN EN VIVO' : 'VOTACIÓN CERRADA'} · {poll.assemblyTitle}
              </span>
              <p className="text-xs text-slate-500 font-semibold">
                Votando como: <span className="text-slate-900 font-bold">{propertyUnit}</span> ({residentName})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Question */}
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
              {poll.question}
            </h3>
            <p className="text-[11px] text-slate-400">
              {poll.totalVotes} copropietarios han participado ({poll.participationRate}% del total)
            </p>
          </div>

          {/* If NOT voted yet and poll is LIVE: Voting Radios */}
          {!hasVoted && isLive ? (
            <div className="space-y-2.5 pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Selecciona tu opción:
              </span>
              {poll.options.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all min-h-[52px] active:scale-[0.99] ${
                      isSelected
                        ? 'bg-blue-50/80 border-[var(--tenant-primary)] ring-2 ring-blue-100 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <span
                        className={`text-xs sm:text-sm font-bold ${
                          isSelected ? 'text-blue-950' : 'text-slate-800'
                        }`}
                      >
                        {opt.text}
                      </span>
                    </div>

                    <input
                      type="radio"
                      name="pollOption"
                      value={opt.id}
                      checked={isSelected}
                      onChange={() => setSelectedOptionId(opt.id)}
                      className="sr-only"
                    />
                  </label>
                );
              })}
            </div>
          ) : (
            /* Already voted OR closed: Results view */
            <div className="space-y-4 pt-1">
              {hasVoted && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-900 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">¡Tu voto está registrado!</p>
                    <p className="text-[11px] text-emerald-700">
                      Emitido desde la unidad {propertyUnit}.
                    </p>
                  </div>
                </div>
              )}

              {poll.showResultsToResidents && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      Resultados Parciales en Tiempo Real
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Actualización en vivo</span>
                  </div>

                  <div className="space-y-2">
                    {poll.options.map((opt) => {
                      const isUserChoice = userVotedOptionId === opt.id;
                      return (
                        <div
                          key={opt.id}
                          className={`p-3.5 rounded-2xl border ${
                            isUserChoice
                              ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-200'
                              : 'bg-slate-50/60 border-slate-200/80'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{opt.text}</span>
                              {isUserChoice && (
                                <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-black text-[10px]">
                                  ✓ Tu voto
                                </span>
                              )}
                            </div>
                            <span className="font-black font-mono text-slate-900 text-sm">
                              {opt.percentage}%
                            </span>
                          </div>

                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                isUserChoice ? 'bg-[var(--tenant-primary)]' : 'bg-slate-500'
                              }`}
                              style={{ width: `${opt.percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-500 hover:bg-slate-200/60 rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            {hasVoted ? 'Cerrar' : 'Cancelar'}
          </button>

          {!hasVoted && isLive && (
            <button
              type="button"
              onClick={handleVote}
              disabled={submitting || !selectedOptionId}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-md shadow-red-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Registrando Voto...' : 'Emitir Mi Voto'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
