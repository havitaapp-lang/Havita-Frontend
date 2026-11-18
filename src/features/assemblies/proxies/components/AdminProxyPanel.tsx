import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Download, FileText, ListTree, Loader2, Undo2, UserCheck, X } from 'lucide-react';
import { proxyKeys, proxyService, type ProxyRequestData } from '../proxyService';
import { isFeatureUnavailable, proxyErrorMessage } from '../proxyErrors';
import {
  DOCUMENT_TYPES, EVIDENCE_LABELS, STATUS_LABELS, eventReasonLabel, proxyActions, type AssemblyProxy, type ProxyDocumentType, type ProxyStatus,
} from '../proxyTypes';
import { ProxyStatusBadge } from './ProxyStatusBadge';
import { ProxyRequestForm } from './ProxyRequestForm';
import { AssistedVotePanel } from './AssistedVotePanel';
import { ProxyLimitSettings } from './ProxyLimitSettings';
import { notificationService } from '../../../../services/notificationService';
import { assemblyService } from '../../services/assemblyService';
import { residentService } from '../../../../services/residentService';
import type { Assembly, Poll } from '../../types/assembly.types';

interface Props {
  assembly: Assembly;
  polls: Poll[];
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es-CO') : '—');

/**
 * Fase 2 / P6-C/D/F/H — gestión de poderes de una asamblea (administración). Cada acción la vuelve a validar el backend
 * (estado actual, comunidad, otorgante, límites); la interfaz solo evita ofrecer lo incompatible con el estado visible y
 * protege del doble envío. Tras cada cambio se recargan los datos.
 */
export const AdminProxyPanel = ({ assembly, polls }: Props) => {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'ALL' | ProxyStatus>('ALL');
  const [unitFilter, setUnitFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [eventsFor, setEventsFor] = useState<AssemblyProxy | null>(null);
  const [attendFor, setAttendFor] = useState<AssemblyProxy | null>(null);
  const [docType, setDocType] = useState<ProxyDocumentType>('CC');
  const [docNumber, setDocNumber] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const proxiesQuery = useQuery({ queryKey: proxyKeys.admin(assembly.id), queryFn: () => proxyService.listForAdmin(assembly.id) });
  const { data: rights = [] } = useQuery({ queryKey: ['votingRights', assembly.id], queryFn: () => assemblyService.getVotingRights(assembly.id) });
  const { data: residentsPage } = useQuery({
    queryKey: ['residents', 'proxyChoices'], queryFn: () => residentService.getAll(undefined, { size: 500, status: 'ACTIVE' } as never),
    enabled: showForm,
  });
  const eventsQuery = useQuery({
    queryKey: eventsFor ? proxyKeys.events(eventsFor.id) : ['proxies', 'events', 'none'],
    queryFn: () => proxyService.events(assembly.id, eventsFor!.id), enabled: !!eventsFor,
  });

  const unitLabel = useMemo(() => {
    const m = new Map<string, string>(rights.map((r: { propertyId: string; propertyNumber: string }) => [r.propertyId, r.propertyNumber]));
    for (const p of proxiesQuery.data ?? []) if (p.propertyNumber && !m.has(p.propertyId)) m.set(p.propertyId, p.propertyNumber);
    return (id: string) => m.get(id) ?? 'Unidad';
  }, [rights, proxiesQuery.data]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: proxyKeys.admin(assembly.id) });
    qc.invalidateQueries({ queryKey: ['assemblyAttendees', assembly.id] });
  };

  const act = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => refresh(),
    onError: (e) => { notificationService.showError('No se pudo completar', proxyErrorMessage(e)); refresh(); },
    onSettled: () => setBusyId(null),
  });

  const run = (p: AssemblyProxy, label: string, fn: () => Promise<unknown>) => {
    if (busyId) return;
    setBusyId(p.id);
    act.mutate(fn, { onSuccess: () => notificationService.showToast(label, 'success') });
  };

  const approve = async (p: AssemblyProxy) => {
    if (await notificationService.showConfirm('¿Aprobar el poder?', `Unidad ${unitLabel(p.propertyId)} · Apoderado: ${p.proxyFullName}. Revisa antes el documento.`, 'Sí, aprobar')) {
      run(p, 'Poder aprobado', () => proxyService.approve(assembly.id, p.id));
    }
  };
  const reject = async (p: AssemblyProxy) => {
    const reason = await notificationService.showPrompt('Rechazar el poder', 'Indica el motivo (obligatorio; lo verá el propietario).', 'Motivo del rechazo', 'Rechazar');
    if (reason === null) return;
    if (!reason.trim()) return notificationService.showError('Motivo obligatorio', 'Indica por qué se rechaza el poder.');
    run(p, 'Poder rechazado', () => proxyService.reject(assembly.id, p.id, reason.trim()));
  };
  const revoke = async (p: AssemblyProxy) => {
    if (await notificationService.showConfirm('¿Revocar el poder?', 'Un poder revocado no se puede reactivar; habría que solicitar otro.', 'Sí, revocar')) {
      run(p, 'Poder revocado', () => proxyService.revoke(assembly.id, p.id));
    }
  };
  const attend = async () => {
    if (!attendFor || !docNumber.trim()) return;
    const p = attendFor;
    run(p, 'Asistencia del apoderado registrada', async () => {
      await proxyService.attendByAdmin(assembly.id, p.id, docType, docNumber);
      setAttendFor(null);
      setDocNumber('');
    });
  };
  const download = async (p: AssemblyProxy) => {
    try {
      await proxyService.downloadDocument(assembly.id, p);
    } catch (e) {
      notificationService.showError('No se pudo descargar el documento', proxyErrorMessage(e, 'El documento no está disponible o no supera la verificación de integridad.'));
    }
  };

  const register = useMutation({
    mutationFn: ({ data, file }: { data: ProxyRequestData; file: File }) => proxyService.registerByAdmin(assembly.id, data, file),
    onSuccess: () => { notificationService.showToast('Poder registrado (en revisión)', 'success'); setShowForm(false); refresh(); },
    onError: (e) => notificationService.showError('No se pudo registrar el poder', proxyErrorMessage(e)),
  });

  if (proxiesQuery.isLoading) return <p className="text-xs text-slate-500">Cargando poderes…</p>;
  if (proxiesQuery.error) {
    return <p className="text-xs text-rose-600" data-testid="proxies-unavailable">
      {isFeatureUnavailable(proxiesQuery.error) ? 'La gestión de poderes no está disponible en este entorno.' : proxyErrorMessage(proxiesQuery.error)}
    </p>;
  }

  const all = proxiesQuery.data ?? [];
  const list = all.filter((p) => (statusFilter === 'ALL' || p.status === statusFilter)
    && (!unitFilter || unitLabel(p.propertyId).toLowerCase().includes(unitFilter.toLowerCase())));
  const residents = (residentsPage?.content ?? []) as Array<{ id: string; userId?: string; propertyId: string; name: string; type: string; status: string }>;
  const livePolls = polls.filter((p) => p.status === 'LIVE');

  return (
    <div className="space-y-6" data-testid="admin-proxy-panel">
      <section className="space-y-3">
        <div className="flex flex-wrap items-end gap-2 justify-between">
          <h2 className="text-sm font-black text-slate-900">Gestión de poderes</h2>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Filtrar por estado" className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs" value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'ALL' | ProxyStatus)}>
              <option value="ALL">Todos los estados</option>
              {(Object.keys(STATUS_LABELS) as ProxyStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <input aria-label="Filtrar por unidad" placeholder="Unidad…" className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs w-28"
                   value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} />
            {assembly.status !== 'ENDED' && (
              <button type="button" onClick={() => setShowForm((v) => !v)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700">
                {showForm ? 'Cerrar' : 'Registrar poder'}
              </button>
            )}
          </div>
        </div>

        {showForm && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <ProxyRequestForm
              units={rights.map((r: { propertyId: string; propertyNumber: string }) => ({ propertyId: r.propertyId, label: r.propertyNumber }))}
              grantors={residents.filter((r) => r.type === 'Propietario' && r.status === 'ACTIVE')
                .map((r) => ({ residentId: r.id, propertyId: r.propertyId, label: r.name }))}
              accounts={residents.filter((r) => r.userId && r.status === 'ACTIVE')
                .map((r) => ({ userId: r.userId!, label: `${r.name} (${unitLabel(r.propertyId)})` }))
                .filter((a, i, arr) => arr.findIndex((x) => x.userId === a.userId) === i)}
              submitting={register.isPending}
              onSubmit={async (data, file) => {
                // P7 (G3): confirmación explícita antes de registrar en nombre del propietario.
                const grantor = residents.find((r) => r.id === data.grantorResidentId);
                const ok = await notificationService.showConfirm('¿Registrar el poder en nombre del propietario?',
                  `Unidad ${unitLabel(data.propertyId)} · Otorgante: ${grantor?.name ?? '—'} · Apoderado: ${data.proxyFullName.trim()}. `
                  + `Evidencia: ${data.evidenceType ? EVIDENCE_LABELS[data.evidenceType] : '—'}. Quedará en revisión y auditado.`,
                  'Sí, registrar');
                if (ok) await register.mutateAsync({ data, file });
              }}
            />
          </div>
        )}

        {list.length === 0 ? (
          <p className="text-xs text-slate-500 p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl" data-testid="proxies-empty">
            {all.length === 0 ? 'Esta asamblea no tiene poderes registrados.' : 'Ningún poder coincide con el filtro.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {list.map((p) => {
              const a = proxyActions(p, 'ADMIN', assembly.status);
              const busy = busyId === p.id;
              return (
                <li key={p.id} className="p-3 bg-white rounded-2xl border border-slate-200 space-y-2" data-testid="admin-proxy-row" data-proxy-id={p.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-slate-800">
                      <p className="font-bold">Unidad {unitLabel(p.propertyId)} <ProxyStatusBadge status={p.status} /></p>
                      <p>Apoderado: {p.proxyFullName} · {p.proxyDocumentType} {p.proxyDocumentNumber} · {p.proxyUserId ? 'con cuenta' : 'externo'}</p>
                      <p className="text-slate-500">Solicitado {fmt(p.createdAt)}{p.reviewedAt && ` · Revisado ${fmt(p.reviewedAt)}`}</p>
                      {p.rejectionReason && <p className="text-rose-700">Motivo del rechazo: {p.rejectionReason}</p>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => download(p)} className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 flex items-center gap-1"><Download className="w-3 h-3" /> Documento</button>
                      <button type="button" onClick={() => setEventsFor(p)} className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 flex items-center gap-1"><ListTree className="w-3 h-3" /> Eventos</button>
                      {a.canApprove && <button type="button" disabled={busy} onClick={() => approve(p)} className="px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 flex items-center gap-1"><Check className="w-3 h-3" /> Aprobar</button>}
                      {a.canReject && <button type="button" disabled={busy} onClick={() => reject(p)} className="px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 flex items-center gap-1"><X className="w-3 h-3" /> Rechazar</button>}
                      {a.canRevoke && <button type="button" disabled={busy} onClick={() => revoke(p)} className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 flex items-center gap-1"><Undo2 className="w-3 h-3" /> Revocar</button>}
                      {a.canRegisterAttendanceByAdmin && p.proxyUserId == null && (
                        <button type="button" disabled={busy} onClick={() => setAttendFor(p)} className="px-2 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 flex items-center gap-1"><UserCheck className="w-3 h-3" /> Registrar asistencia</button>
                      )}
                      {busy && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                    </div>
                  </div>
                  {attendFor?.id === p.id && (
                    <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 space-y-2" data-testid="attend-form">
                      <p className="text-[11px] text-blue-900">Verifica en persona el documento original del apoderado. Debe coincidir con el del poder.</p>
                      <div className="flex flex-wrap gap-2">
                        <select aria-label="Tipo de documento presentado" className="px-2 py-1.5 rounded-lg border text-xs" value={docType}
                                onChange={(e) => setDocType(e.target.value as ProxyDocumentType)}>
                          {DOCUMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                        </select>
                        <input aria-label="Número del documento presentado" className="px-2 py-1.5 rounded-lg border text-xs" autoComplete="off"
                               value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
                        <button type="button" onClick={attend} disabled={!docNumber.trim() || busy} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white disabled:opacity-60">Confirmar asistencia</button>
                        <button type="button" onClick={() => { setAttendFor(null); setDocNumber(''); }} className="px-3 py-1.5 rounded-lg text-xs">Cancelar</button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {eventsFor && (
        <section className="p-4 bg-white rounded-2xl border border-slate-200" aria-label="Eventos del poder" data-testid="proxy-events">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-black flex items-center gap-1"><FileText className="w-4 h-4" /> Eventos · Unidad {unitLabel(eventsFor.propertyId)}</h3>
            <button type="button" onClick={() => setEventsFor(null)} className="text-xs text-slate-500">Cerrar</button>
          </div>
          {eventsQuery.isLoading ? <p className="text-xs">Cargando…</p> : eventsQuery.error ? <p className="text-xs text-rose-600">{proxyErrorMessage(eventsQuery.error)}</p> : (
            <ul className="text-[11px] text-slate-700 space-y-1">
              {(eventsQuery.data ?? []).map((e, i) => (
                <li key={i} data-testid="proxy-event">{fmt(e.occurredAt)} · <b>{e.action}</b> · {e.result === 'DENIED' ? `rechazado (${e.reasonCode})` : 'ok'}{e.toStatus ? ` → ${e.toStatus}` : ''}{e.result !== 'DENIED' && e.reasonCode ? ` · ${eventReasonLabel(e.reasonCode)}` : ''}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      <AssistedVotePanel livePolls={livePolls} proxies={all} unitLabel={unitLabel} />
      <ProxyLimitSettings />
    </div>
  );
};
