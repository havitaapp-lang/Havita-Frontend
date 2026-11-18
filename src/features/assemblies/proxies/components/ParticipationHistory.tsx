import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, History, Loader2 } from 'lucide-react';
import { proxyKeys, proxyService } from '../proxyService';
import { proxyErrorMessage } from '../proxyErrors';
import { REPRESENTATION_LABELS, canVoid, chainsByUnit, type ParticipationAudit } from '../proxyTypes';
import { notificationService } from '../../../../services/notificationService';

interface Props {
  pollId: string;
  pollLive: boolean;
  optionText: (optionId: string) => string;
  unitLabel: (propertyId: string) => string;
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es-CO') : '—');

/**
 * Fase 2 / P6-G — historial autorizado de una pregunta (solo administración): por unidad, la cadena completa
 * voto → anulación → nueva emisión. Nunca se borra ni se oculta; solo la última participación puede estar vigente y
 * solo un voto asistido vigente ofrece «Anular» (el backend vuelve a comprobarlo: pregunta abierta, asamblea en curso).
 */
export const ParticipationHistory = ({ pollId, pollLive, optionText, unitLabel }: Props) => {
  const qc = useQueryClient();
  const { data = [], isLoading, error } = useQuery({ queryKey: proxyKeys.history(pollId), queryFn: () => proxyService.history(pollId) });
  const chains = useMemo(() => chainsByUnit(data), [data]);
  const voidMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => proxyService.voidParticipation(pollId, id, reason),
    onSuccess: () => {
      notificationService.showToast('Voto asistido anulado. Puedes registrar una nueva emisión.', 'success');
      qc.invalidateQueries({ queryKey: proxyKeys.history(pollId) });
      qc.invalidateQueries({ queryKey: ['polls'] });
    },
    onError: (e) => notificationService.showError('No se pudo anular', proxyErrorMessage(e)),
  });

  const askVoid = async (p: ParticipationAudit) => {
    const reason = await notificationService.showPrompt('Anular voto asistido',
      'El voto se conserva en el historial y deja de contar. Indica el motivo (obligatorio).', 'Motivo de la anulación', 'Anular voto');
    if (reason === null) return;
    if (!reason.trim()) {
      notificationService.showError('Motivo obligatorio', 'Indica por qué se anula el voto.');
      return;
    }
    voidMutation.mutate({ id: p.participationId, reason });
  };

  if (isLoading) return <p className="text-xs text-slate-500">Cargando historial…</p>;
  if (error) return <p className="text-xs text-rose-600">{proxyErrorMessage(error)}</p>;
  if (data.length === 0) return <p className="text-xs text-slate-500" data-testid="history-empty">Aún no hay votos registrados en esta pregunta.</p>;

  return (
    <div className="space-y-3" data-testid="participation-history">
      <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5"><History className="w-4 h-4" /> Historial de votos</h4>
      {[...chains.entries()].map(([unit, chain]) => (
        <div key={unit} className="p-3 rounded-xl border border-slate-200 bg-white" data-testid="history-unit">
          <p className="text-xs font-bold text-slate-900 mb-2">{unitLabel(unit)}</p>
          <ol className="relative border-l border-slate-200 ml-1.5 space-y-2">
            {chain.map((p, i) => (
              <li key={p.participationId} className="ml-3" data-testid="history-entry" data-status={p.status}>
                <span className={`absolute -left-1.5 mt-1 w-3 h-3 rounded-full ${p.status === 'VALID' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <p className="text-xs text-slate-800">
                  <span className="font-bold">{i === 0 ? 'Voto' : 'Nueva emisión'}</span>
                  {' · '}{p.optionIds.map(optionText).join(', ')}
                  {' · '}<span className="text-slate-500">{REPRESENTATION_LABELS[p.representationType]}</span>
                  {' · '}<span className={p.status === 'VALID' ? 'text-emerald-700 font-bold' : 'text-slate-500 line-through'}>
                    {p.status === 'VALID' ? 'Vigente' : 'Anulado'}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Registrado {fmt(p.castAt)}
                  {p.representationType === 'ADMIN_ASSISTED_PROXY' && ' por la administración (expresado en persona por el apoderado)'}
                </p>
                {p.status === 'VOIDED' && (
                  <p className="text-[11px] text-rose-700">Anulado {fmt(p.voidedAt)} · Motivo: {p.voidReason}</p>
                )}
                {canVoid(p, pollLive) && (
                  <button type="button" onClick={() => askVoid(p)} disabled={voidMutation.isPending}
                          className="mt-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                    {voidMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />} Anular voto asistido
                  </button>
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
};
