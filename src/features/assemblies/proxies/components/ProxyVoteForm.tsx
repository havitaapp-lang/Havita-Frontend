import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Vote } from 'lucide-react';
import { proxyService } from '../proxyService';
import { proxyErrorMessage } from '../proxyErrors';
import type { ParticipationResult } from '../proxyTypes';
import type { Poll } from '../../types/assembly.types';
import { notificationService } from '../../../../services/notificationService';

interface Props {
  poll: Poll;
  proxyId: string;
  unitLabel: string;
}

/**
 * Fase 2 / P6-E — voto del apoderado CON CUENTA por la unidad de su poder utilizado. La unidad la fija el poder (no se
 * puede elegir otra) y el backend comprueba membresía, poder USED, asistencia, pregunta, asamblea y voto previo.
 */
export const ProxyVoteForm = ({ poll, proxyId, unitLabel }: Props) => {
  const qc = useQueryClient();
  const single = poll.type !== 'MULTIPLE_CHOICE';
  const [options, setOptions] = useState<string[]>([]);
  const [done, setDone] = useState<ParticipationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const vote = useMutation({
    mutationFn: () => proxyService.proxyVote(poll.id, proxyId, options),
    onSuccess: (r) => { setDone(r); qc.invalidateQueries({ queryKey: ['polls'] }); },
    onError: (e) => setError(proxyErrorMessage(e)),
    onSettled: () => { busy.current = false; },
  });

  const toggle = (id: string) => setOptions((cur) => (single ? [id] : cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const submit = async () => {
    setError(null);
    if (options.length === 0) return setError('Elige una opción.');
    if (busy.current) return;
    const ok = await notificationService.showConfirm('¿Confirmar el voto?',
      `Votarás como apoderado de la unidad ${unitLabel}. Un voto registrado no se puede cambiar.`, 'Sí, votar');
    if (!ok) return;
    busy.current = true;
    vote.mutate();
  };

  if (done) {
    return <p role="status" className="text-xs text-emerald-800 flex items-center gap-1" data-testid="proxy-vote-done">
      <CheckCircle2 className="w-4 h-4" /> Voto registrado por la unidad {unitLabel} · {new Date(done.castAt).toLocaleString('es-CO')}
    </p>;
  }
  return (
    <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2" data-testid="proxy-vote-form">
      <p className="text-xs font-bold text-slate-900 flex items-center gap-1"><Vote className="w-4 h-4" /> {poll.question}</p>
      <fieldset className="space-y-1">
        <legend className="sr-only">Opciones</legend>
        {poll.options.map((o) => (
          <label key={o.id} className="text-xs flex items-center gap-2">
            <input type={single ? 'radio' : 'checkbox'} name={`proxy-vote-${poll.id}-${proxyId}`} checked={options.includes(o.id)} onChange={() => toggle(o.id)} />
            {o.text}
          </label>
        ))}
      </fieldset>
      {error && <p role="alert" className="text-[11px] text-rose-600">{error}</p>}
      <button type="button" onClick={submit} disabled={vote.isPending}
              className="px-3 py-1.5 bg-[var(--tenant-primary)] text-white rounded-lg text-xs font-bold disabled:opacity-60 flex items-center gap-1">
        {vote.isPending && <Loader2 className="w-3 h-3 animate-spin" />} Votar por la unidad {unitLabel}
      </button>
    </div>
  );
};
