import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { History, Loader2, Scale } from 'lucide-react';
import { proxyKeys, proxyService } from '../proxyService';
import { proxyErrorMessage } from '../proxyErrors';
import { notificationService } from '../../../../services/notificationService';
import { limitValueLabel, parseLimit } from '../proxyTypes';

const HISTORY_PAGE_SIZE = 10;

/** P7 (G4): historial de cambios del límite de ESTA comunidad (solo lectura, paginado). */
const LimitHistory = () => {
  const [page, setPage] = useState(0);
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: [...proxyKeys.limit, 'history', page],
    queryFn: () => proxyService.limitHistory(page, HISTORY_PAGE_SIZE),
  });
  if (isLoading) return <p className="text-xs text-slate-500">Cargando historial…</p>;
  if (error || !data) return <p className="text-xs text-rose-600" role="alert">{proxyErrorMessage(error)}</p>;
  const pages = Math.max(1, Math.ceil(data.total / HISTORY_PAGE_SIZE));
  return (
    <div className="space-y-2" data-testid="proxy-limit-history">
      <h4 className="text-xs font-black text-slate-800 flex items-center gap-1"><History className="w-3.5 h-3.5" /> Historial de cambios
        {data.communityName && <span className="font-normal text-slate-500"> · {data.communityName}</span>}</h4>
      {data.items.length === 0 ? <p className="text-[11px] text-slate-500">Sin cambios registrados.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-left">
            <thead className="text-slate-500"><tr><th className="py-1 pr-2">Fecha</th><th className="pr-2">Anterior</th><th className="pr-2">Nuevo</th><th className="pr-2">Administrador</th><th>Motivo</th></tr></thead>
            <tbody>
              {data.items.map((h) => (
                <tr key={h.id} className="border-t border-slate-100" data-testid="proxy-limit-history-row">
                  <td className="py-1 pr-2">{new Date(h.occurredAt).toLocaleString('es-CO')}</td>
                  <td className="pr-2">{limitValueLabel(h.previousConfigured, h.previousMaxUnits)}</td>
                  <td className="pr-2">{limitValueLabel(true, h.newMaxUnits)}</td>
                  <td className="pr-2">{h.actorName ?? 'Administrador'}</td>
                  <td>{h.reason ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center gap-2 text-[11px]">
          <button type="button" disabled={page === 0 || isFetching} onClick={() => setPage((p) => p - 1)} className="px-2 py-1 rounded-lg bg-slate-100 disabled:opacity-50">Anterior</button>
          <span>Página {page + 1} de {pages}</span>
          <button type="button" disabled={page + 1 >= pages || isFetching} onClick={() => setPage((p) => p + 1)} className="px-2 py-1 rounded-lg bg-slate-100 disabled:opacity-50">Siguiente</button>
        </div>
      )}
    </div>
  );
};

/**
 * Fase 2 / P6-H — límite de unidades que un mismo apoderado puede representar en una asamblea de ESTA comunidad (la
 * comunidad la pone el backend; no se puede elegir otra). Se aplica al aprobar y al usar un poder; no cambia poderes ya
 * aprobados o utilizados.
 */
export const ProxyLimitSettings = () => {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: proxyKeys.limit, queryFn: proxyService.limit });
  const [draft, setDraft] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: (v: number | null) => proxyService.setLimit(v),
    onSuccess: () => {
      notificationService.showToast('Límite de representación actualizado', 'success');
      setDraft(null);
      qc.invalidateQueries({ queryKey: proxyKeys.limit });
    },
    onError: (e) => setFormError(proxyErrorMessage(e)),
  });

  if (isLoading) return <p className="text-xs text-slate-500">Cargando límite…</p>;
  if (error || !data) return <p className="text-xs text-rose-600">{proxyErrorMessage(error)}</p>;

  const origin = data.configured ? 'Configurado para esta comunidad' : 'Valor general de la plataforma';
  const current = data.effectiveLimit == null ? 'Sin límite' : `${data.effectiveLimit} unidad(es) por apoderado`;
  const value = draft ?? (data.configured && data.communityLimit != null ? String(data.communityLimit) : '');

  const submit = async () => {
    const parsed = parseLimit(value);
    if ('error' in parsed) {
      setFormError(parsed.error);
      return;
    }
    setFormError(null);
    const ok = await notificationService.showConfirm('¿Cambiar el límite de representación?',
      'Se aplicará a las próximas aprobaciones y asistencias por poder. No cambia poderes ya aprobados o utilizados.',
      'Sí, cambiar');
    if (ok) save.mutate(parsed.value);
  };

  return (
    <section className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2" aria-label="Límite de representación">
      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2"><Scale className="w-4 h-4" /> Límite de representación</h3>
      <p className="text-xs text-slate-700" data-testid="proxy-limit-current">{current} · <span className="text-slate-500">{origin}</span></p>
      <p className="text-[11px] text-slate-500">
        Configúralo según el reglamento de la copropiedad. Havita no impone un límite legal; el valor general solo aplica si la comunidad no configura el suyo.
      </p>
      <div className="flex items-end gap-2">
        <div>
          <label htmlFor="proxy-limit" className="text-xs font-bold text-slate-700">Unidades por apoderado (vacío = sin límite)</label>
          <input id="proxy-limit" inputMode="numeric" className="w-40 px-3 py-2 rounded-xl border border-slate-200 text-sm"
                 value={value} onChange={(e) => setDraft(e.target.value)} />
        </div>
        <button type="button" onClick={submit} disabled={save.isPending}
                className="px-3 py-2 bg-[var(--tenant-primary)] text-white rounded-xl text-xs font-bold disabled:opacity-60 flex items-center gap-1">
          {save.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Guardar
        </button>
      </div>
      {formError && <p role="alert" className="text-[11px] text-rose-600">{formError}</p>}
      <LimitHistory />
    </section>
  );
};
