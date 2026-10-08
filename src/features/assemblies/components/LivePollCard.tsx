import { useState, useEffect } from 'react';
import { Lock, Plus, Users, CheckCircle2, ArrowRight } from 'lucide-react';
import type { Poll } from '../types/assembly.types';
import { livePollService } from '../services/livePollService';

interface LivePollCardProps {
  poll: Poll;
  onClosePoll: (poll: Poll) => void;
  onCreateNextPoll?: () => void;
}

export const LivePollCard: React.FC<LivePollCardProps> = ({
  poll: initialPoll,
  onClosePoll,
  onCreateNextPoll,
}) => {
  const [poll, setPoll] = useState<Poll>(initialPoll);

  // Subscribe to real-time updates for this poll
  useEffect(() => {
    setPoll(initialPoll);
    const unsubscribe = livePollService.subscribe(initialPoll.id, (updatedPoll) => {
      setPoll(updatedPoll);
    });
    return () => unsubscribe();
  }, [initialPoll]);

  const isLive = poll.status === 'LIVE';

  // Find winner option if closed
  const highestVotes = Math.max(...poll.options.map((o) => o.votesCount), 0);

  return (
    <div
      className={`p-6 rounded-3xl border shadow-sm transition-all ${
        isLive
          ? 'bg-white border-red-200/90 shadow-red-500/5 ring-2 ring-red-50'
          : 'bg-white border-slate-200/80 shadow-2xs'
      }`}
    >
      {/* Top status bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-50 text-red-600 border border-red-200">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
              🔴 EN VIVO — Votación en Tiempo Real
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              ENCUESTA CERRADA — Resultados Definitivos
            </span>
          )}
          <span className="text-xs text-slate-400 font-mono">
            {isLive ? 'Abierta hoy' : `Cerrada ${poll.closedAt || ''}`}
          </span>
        </div>

        {isLive ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Actualización: En vivo
            </span>
            <button
              type="button"
              onClick={() => onClosePoll(poll)}
              className="px-4 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              Cerrar Encuesta
            </button>
          </div>
        ) : (
          onCreateNextPoll && (
            <button
              type="button"
              onClick={onCreateNextPoll}
              className="px-4 py-1.5 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Crear Siguiente Pregunta
            </button>
          )
        )}
      </div>

      {/* Question Headline */}
      <div className="py-4">
        <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
          {poll.question}
        </h3>

        {/* Quorum / Participation Meter */}
        <div className="mt-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-semibold flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" />
              Participación en esta pregunta:
            </span>
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span className="text-sm font-black text-blue-600">
                {poll.totalVotes} de {poll.totalEligible} propiedades
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-black text-xs font-mono">
                {poll.participationRate}%
              </span>
            </div>
          </div>

          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${
                isLive ? 'bg-[var(--tenant-primary)]' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, poll.participationRate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Options Vote Bars */}
      <div className="space-y-3 pt-1">
        {poll.options.map((opt) => {
          const isLeader = !isLive && highestVotes > 0 && opt.votesCount === highestVotes;
          return (
            <div
              key={opt.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                isLeader
                  ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-200'
                  : 'bg-white border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">{opt.text}</span>
                  {isLeader && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Mayoría Aprobada
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-black text-slate-900 text-sm font-mono mr-2">
                    {opt.percentage}%
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    ({opt.votesCount} {opt.votesCount === 1 ? 'voto' : 'votos'})
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    opt.text.toLowerCase().includes('sí') || opt.text.toLowerCase().includes('aprueba')
                      ? 'bg-emerald-500'
                      : opt.text.toLowerCase().includes('no')
                      ? 'bg-rose-500'
                      : 'bg-slate-400'
                  }`}
                  style={{ width: `${opt.percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Next Question Suggestion if closed */}
      {!isLive && onCreateNextPoll && (
        <div className="mt-5 p-3.5 bg-blue-50/60 border border-blue-100 rounded-2xl flex items-center justify-between text-xs">
          <p className="text-blue-950 font-semibold">
            Votación finalizada. Puedes continuar con el siguiente punto del orden del día.
          </p>
          <button
            type="button"
            onClick={onCreateNextPoll}
            className="px-4 py-2 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            Crear Siguiente Pregunta
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
