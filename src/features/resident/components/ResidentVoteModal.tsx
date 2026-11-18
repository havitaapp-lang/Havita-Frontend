import { useState, useEffect, useRef, useCallback } from 'react';
import { X, CheckCircle2, Send, BarChart3 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useActiveUnit } from '../../../hooks/useActiveUnit';
import type { Poll } from '../../assemblies/types/assembly.types';
import { pollService } from '../../assemblies/services/pollService';
import type { MyVotingUnit } from '../../assemblies/services/pollService';
import { livePollService } from '../../assemblies/services/livePollService';
import { notificationService } from '../../../services/notificationService';

interface ResidentVoteModalProps {
  poll: Poll | null;
  isOpen: boolean;
  onClose: () => void;
  propertyId?: string;
  propertyUnit?: string;
  residentName?: string;
  /** Fase 2 / E5: tras un voto aceptado, para que el listado relea del backend el estado de voto de esta pregunta. */
  onVoted?: (pollId: string) => void;
}

export const ResidentVoteModal: React.FC<ResidentVoteModalProps> = ({
  poll: initialPoll,
  isOpen,
  onClose,
  propertyId: propId,
  propertyUnit: propUnit,
  residentName: propName,
  onVoted,
}) => {
  const { user } = useAuth();
  const { activeUnitId: activePropertyId, activeLabel } = useActiveUnit();
  const residentName = propName || user?.name || 'Residente';
  const [poll, setPoll] = useState<Poll | null>(initialPoll);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Fase 2 / E3 (D5): las unidades y su estado de voto vienen del backend (no de localStorage). La unidad que vota se
  // elige DENTRO del modal y no cambia la unidad activa del portal.
  const [units, setUnits] = useState<MyVotingUnit[] | null>(null);
  const [unitsError, setUnitsError] = useState(false);
  const [votingUnitId, setVotingUnitId] = useState<string>('');

  const loadUnits = useCallback(async (pollId: string) => {
    try {
      const list = await pollService.getMyVotingUnits(pollId);
      setUnits(list);
      setUnitsError(false);
      setVotingUnitId((current) => {
        if (current && list.some((u) => u.propertyId === current && u.canVote)) return current;
        const pending = list.filter((u) => u.canVote);
        if (pending.length === 1) return pending[0].propertyId; // una sola habilitada: sin pasos extra
        const preferred = propId || activePropertyId;
        return pending.some((u) => u.propertyId === preferred) ? (preferred as string) : '';
      });
    } catch {
      setUnitsError(true);
    }
  }, [propId, activePropertyId]);

  // Sync when initialPoll changes
  const [prevPollId, setPrevPollId] = useState(initialPoll?.id);
  if (initialPoll && initialPoll.id !== prevPollId) {
    setPrevPollId(initialPoll.id);
    setPoll(initialPoll);
    setSelectedOptionId('');
    setUnits(null);
    setVotingUnitId('');
  }

  useEffect(() => {
    if (!isOpen || !initialPoll) return;
    // Carga asíncrona del estado de voto de cada unidad (el estado se fija cuando responde el backend).
    void Promise.resolve().then(() => loadUnits(initialPoll.id));
  }, [isOpen, initialPoll, loadUnits]);

  const votingUnit = units?.find((u) => u.propertyId === votingUnitId) ?? null;
  const pendingUnits = units?.filter((u) => u.canVote) ?? [];
  const votedUnits = units?.filter((u) => u.hasVoted) ?? [];
  const hasVoted = !!units && units.length > 0 && pendingUnits.length === 0 && votedUnits.length > 0;
  const propertyUnit = votingUnit?.label || propUnit || activeLabel || 'Mi unidad';

  useEffect(() => {
    if (!initialPoll) return;
    const unsubscribe = livePollService.subscribe(initialPoll.id, (updated) => {
      setPoll(updated);
    });
    return () => unsubscribe();
  }, [initialPoll]);

  if (!isOpen || !poll) return null;

  const handleVote = async () => {
    if (submittingRef.current) return; // evita envíos duplicados
    if (!votingUnitId) {
      notificationService.showToast('Selecciona la unidad con la que vas a votar', 'warning');
      return;
    }
    if (!selectedOptionId) {
      notificationService.showToast('Por favor selecciona una opción para votar', 'warning');
      return;
    }
    const unitId = votingUnitId; // fijada al enviar
    submittingRef.current = true;
    try {
      setSubmitting(true);
      const { poll: updatedPoll } = await pollService.submitVote(poll.id, selectedOptionId, unitId, residentName);
      setPoll(updatedPoll);
      setSelectedOptionId('');
      // Confirmación solo tras la respuesta del backend; el estado de cada unidad se vuelve a leer del servidor.
      notificationService.showToast(`¡Voto registrado para ${units?.find((u) => u.propertyId === unitId)?.label ?? 'tu unidad'}!`, 'success');
      onVoted?.(poll.id);
    } catch (err: any) {
      notificationService.showToast(err.message || 'Error al emitir voto', 'error');
    } finally {
      await loadUnits(poll.id);
      submittingRef.current = false;
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

          {/* Fase 2 / E3: unidades del residente y su estado de voto */}
          {units && units.length > 1 && (
            <fieldset className="space-y-2" data-testid="vote-units">
              <legend className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tus unidades</legend>
              {units.map((u) => {
                const selectable = u.canVote && isLive;
                const checked = votingUnitId === u.propertyId;
                return (
                  <label
                    key={u.propertyId}
                    data-testid="vote-unit"
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-2 min-h-[48px] ${
                      selectable ? 'cursor-pointer hover:bg-slate-50' : 'opacity-80'
                    } ${checked ? 'border-[var(--tenant-primary)] ring-2 ring-blue-100' : 'border-slate-200'}`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="votingUnit"
                        value={u.propertyId}
                        checked={checked}
                        disabled={!selectable}
                        onChange={() => { setVotingUnitId(u.propertyId); setSelectedOptionId(''); }}
                      />
                      <span className="text-xs font-bold text-slate-800">{u.label}</span>
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                      u.hasVoted ? 'bg-emerald-100 text-emerald-800' : u.canVote ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                    }`} title={u.reasonMessage ?? undefined}>
                      {u.hasVoted ? 'Ya votó' : u.canVote ? 'Pendiente' : u.status === 'CLOSED' ? 'Cerrada' : 'No habilitada'}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          )}
          {units && units.length === 1 && !units[0].canVote && !units[0].hasVoted && units[0].reasonMessage && (
            <p role="status" className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600">{units[0].reasonMessage}</p>
          )}
          {unitsError && (
            <p role="alert" className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800">
              No pudimos consultar el estado de tus unidades. Cierra y vuelve a abrir la votación.
            </p>
          )}

          {/* If there is a unit pending and poll is LIVE: Voting Radios */}
          {!hasVoted && isLive && votingUnit?.canVote ? (
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
                    <p className="font-bold">{votedUnits.length > 1 ? '¡Tus votos están registrados!' : '¡Tu voto está registrado!'}</p>
                    <p className="text-[11px] text-emerald-700">
                      Emitido desde {votedUnits.map((u) => u.label).join(', ') || propertyUnit}.
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
                      // Fase 2 / E5: sin resaltar «Tu voto»: la opción elegida se leía de localStorage (no es fuente de verdad).
                      return (
                        <div
                          key={opt.id}
                          className="p-3.5 rounded-2xl border bg-slate-50/60 border-slate-200/80"
                        >
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{opt.text}</span>
                            </div>
                            <span className="font-black font-mono text-slate-900 text-sm">
                              {opt.percentage}%
                            </span>
                          </div>

                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full transition-all duration-500 bg-slate-500"
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

          {!hasVoted && isLive && votingUnit?.canVote && (
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
