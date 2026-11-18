import { CheckCircle2, Loader2 } from 'lucide-react';
import { useVotingSummary } from './useVotingSummary';

/** Pie de la tarjeta del listado de votaciones: estado de voto (backend) y llamada a la acción coherente con él. */
export function ResidentPollCardFooter({ pollId, pollIsLive }: { pollId: string; pollIsLive: boolean }) {
  const { summary } = useVotingSummary(pollId, pollIsLive);
  const cta = pollIsLive ? (summary?.canVote ? 'Votar ahora →' : 'Ver detalle →') : 'Ver resultados →';
  return (
    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
      <ResidentPollVoteStatus pollId={pollId} pollIsLive={pollIsLive} />
      <span className="text-[var(--tenant-primary)] font-bold shrink-0">{cta}</span>
    </div>
  );
}

interface Props {
  pollId: string;
  pollIsLive: boolean;
  /** Estilo del banner en vivo (texto claro sobre fondo rojo) en lugar del de la tarjeta del listado. */
  tone?: 'card' | 'banner';
}

export function ResidentPollVoteStatus({ pollId, pollIsLive, tone = 'card' }: Props) {
  const { summary, isLoading, isError } = useVotingSummary(pollId, pollIsLive);
  const banner = tone === 'banner';

  if (isLoading) {
    return (
      <span data-testid="poll-vote-status" data-state="LOADING" className={`inline-flex items-center gap-1 ${banner ? 'text-red-100' : 'text-slate-400'}`}>
        <Loader2 className="w-3 h-3 animate-spin" /> Consultando tu voto…
      </span>
    );
  }
  if (isError || !summary) {
    return (
      <span data-testid="poll-vote-status" data-state="ERROR" className={banner ? 'text-yellow-100 font-bold' : 'text-amber-700 font-semibold'}>
        No se pudo consultar el estado de tu voto
      </span>
    );
  }
  const done = summary.state === 'ALL_VOTED';
  const attention = summary.state === 'PENDING' || summary.state === 'PARTIAL';
  const cls = banner
    ? done
      ? 'inline-flex items-center gap-1 font-bold text-white bg-black/20 px-2 py-0.5 rounded-md text-[11px]'
      : attention ? 'font-bold text-yellow-200' : 'text-red-100'
    : done
      ? 'text-emerald-700 font-bold flex items-center gap-1'
      : attention ? 'text-red-600 font-bold' : 'text-slate-400';
  return (
    <span data-testid="poll-vote-status" data-state={summary.state} className={cls}>
      {done && <CheckCircle2 className={`w-3.5 h-3.5 ${banner ? 'text-emerald-300' : 'text-emerald-600'}`} />}
      {summary.label}
    </span>
  );
}
