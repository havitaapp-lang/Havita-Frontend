import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileSignature, Loader2, Undo2, UserCheck } from 'lucide-react';
import { assemblyService } from '../../services/assemblyService';
import { pollService } from '../../services/pollService';
import { proxyKeys, proxyService, type ProxyRequestData } from '../proxyService';
import { isFeatureUnavailable, proxyErrorMessage } from '../proxyErrors';
import { proxyActions, type MyAssemblyProxy } from '../proxyTypes';
import { ProxyStatusBadge } from '../components/ProxyStatusBadge';
import { ProxyRequestForm } from '../components/ProxyRequestForm';
import { ProxyVoteForm } from '../components/ProxyVoteForm';
import { notificationService } from '../../../../services/notificationService';
import type { Assembly } from '../../types/assembly.types';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es-CO') : '—');

/**
 * Fase 2 / P6-B/D/E — poderes del residente: los que otorgó (como propietario activo) y aquellos en que es el apoderado
 * con cuenta. Solicitar (apoderado externo), revocar mientras esté en revisión o aprobado, ver el documento, registrar
 * su asistencia como apoderado y votar por cada unidad representada. Todo lo valida el backend.
 */
export const ResidentProxiesPage = () => {
  const qc = useQueryClient();
  const { data: assemblies = [], isLoading } = useQuery({ queryKey: ['assemblies', 'list'], queryFn: () => assemblyService.getAssemblies() });
  const openAssemblies = assemblies.filter((a) => a.status !== 'ENDED');
  const [assemblyId, setAssemblyId] = useState('');
  const assembly: Assembly | undefined = assemblies.find((a) => a.id === (assemblyId || openAssemblies[0]?.id));
  const aid = assembly?.id ?? '';

  const mine = useQuery({ queryKey: proxyKeys.mine(aid), queryFn: () => proxyService.mine(aid), enabled: !!aid });
  const units = useQuery({ queryKey: ['myAttendanceUnits', aid], queryFn: () => assemblyService.getMyAttendanceUnits(aid), enabled: !!aid });
  const polls = useQuery({ queryKey: ['polls', aid], queryFn: () => pollService.getPolls(aid), enabled: !!aid });
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const ownerUnits = (units.data ?? []).filter((u) => u.relations?.some((r) => r.toLowerCase() === 'propietario'))
    .map((u) => ({ propertyId: u.propertyId, label: u.label || u.number }));
  const unitLabel = useMemo(() => {
    const m = new Map((units.data ?? []).map((u) => [u.propertyId, u.label || u.number]));
    return (id: string) => m.get(id) ?? 'Unidad representada';
  }, [units.data]);
  const livePolls = (polls.data ?? []).filter((p) => p.status === 'LIVE');

  const refresh = () => {
    qc.invalidateQueries({ queryKey: proxyKeys.mine(aid) });
    qc.invalidateQueries({ queryKey: ['myAttendanceUnits', aid] });
  };
  const request = useMutation({
    mutationFn: ({ data, file }: { data: ProxyRequestData; file: File }) => proxyService.request(aid, data, file),
    onSuccess: () => { notificationService.showToast('Solicitud enviada: la administración la revisará', 'success'); setShowForm(false); refresh(); },
    onError: (e) => notificationService.showError('No se pudo enviar la solicitud', proxyErrorMessage(e)),
  });
  const action = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => refresh(),
    onError: (e) => { notificationService.showError('No se pudo completar', proxyErrorMessage(e)); refresh(); },
    onSettled: () => setBusyId(null),
  });

  const revoke = async (m: MyAssemblyProxy) => {
    if (busyId) return;
    if (!(await notificationService.showConfirm('¿Revocar el poder?', 'Ya no podrá usarse. Para otorgar otro, envía una nueva solicitud.', 'Sí, revocar'))) return;
    setBusyId(m.proxy.id);
    action.mutate(() => proxyService.revoke(aid, m.proxy.id), { onSuccess: () => notificationService.showToast('Poder revocado', 'success') });
  };
  const attend = async (m: MyAssemblyProxy) => {
    if (busyId) return;
    if (!(await notificationService.showConfirm('¿Registrar tu asistencia como apoderado?', `Representarás a la unidad ${unitLabel(m.proxy.propertyId)} en esta asamblea.`, 'Sí, registrar'))) return;
    setBusyId(m.proxy.id);
    action.mutate(() => proxyService.attendSelf(aid, m.proxy.id), { onSuccess: () => notificationService.showToast('Asistencia registrada', 'success') });
  };
  const download = async (m: MyAssemblyProxy) => {
    try {
      await proxyService.downloadDocument(aid, m.proxy);
    } catch (e) {
      notificationService.showError('No se pudo descargar el documento', proxyErrorMessage(e, 'El documento no está disponible.'));
    }
  };

  if (isLoading) return <p className="p-6 text-sm text-slate-500">Cargando asambleas…</p>;

  const list = mine.data ?? [];
  const granted = list.filter((m) => m.relation === 'GRANTOR');
  const representing = list.filter((m) => m.relation === 'PROXY');

  return (
    <div className="space-y-5 max-w-3xl mx-auto p-4" data-testid="resident-proxies">
      <header className="space-y-1">
        <h1 className="text-lg font-black text-slate-900 flex items-center gap-2"><FileSignature className="w-5 h-5" /> Poderes para asambleas</h1>
        <p className="text-xs text-slate-500">Un poder permite que otra persona represente a tu unidad en una asamblea concreta. No transfiere la propiedad ni da permisos permanentes.</p>
      </header>

      {assemblies.length === 0 ? (
        <p className="text-xs text-slate-500">No hay asambleas.</p>
      ) : (
        <div>
          <label htmlFor="proxy-assembly" className="text-xs font-bold text-slate-700">Asamblea</label>
          <select id="proxy-assembly" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" value={aid}
                  onChange={(e) => { setAssemblyId(e.target.value); setShowForm(false); }}>
            {assemblies.map((a) => <option key={a.id} value={a.id}>{a.title} · {a.date}{a.status === 'ENDED' ? ' (finalizada)' : ''}</option>)}
          </select>
        </div>
      )}

      {mine.error && (
        <p className="text-xs text-rose-600" data-testid="proxies-unavailable">
          {isFeatureUnavailable(mine.error) ? 'Los poderes no están disponibles en esta comunidad.' : proxyErrorMessage(mine.error)}
        </p>
      )}

      {assembly && !mine.error && (
        <>
          <section className="space-y-2" aria-label="Poderes que otorgué">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-black text-slate-900">Poderes que otorgué</h2>
              {assembly.status !== 'ENDED' && ownerUnits.length > 0 && (
                <button type="button" onClick={() => setShowForm((v) => !v)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700">
                  {showForm ? 'Cerrar' : 'Solicitar poder'}
                </button>
              )}
            </div>
            {assembly.status !== 'ENDED' && ownerUnits.length === 0 && (
              <p className="text-[11px] text-slate-500">Solo un propietario activo de la unidad puede otorgar un poder.</p>
            )}
            {showForm && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <p className="text-[11px] text-slate-600">
                  Indica los datos del apoderado. Si tu apoderado tiene cuenta Havita y debe votar con ella, pídeselo a la administración.
                </p>
                <ProxyRequestForm units={ownerUnits} submitting={request.isPending}
                                  onSubmit={(data, file) => request.mutateAsync({ data, file }).then(() => undefined)} />
              </div>
            )}
            {granted.length === 0 ? <p className="text-xs text-slate-500" data-testid="granted-empty">No has otorgado poderes para esta asamblea.</p> : (
              <ul className="space-y-2">
                {granted.map((m) => {
                  const a = proxyActions(m.proxy, 'GRANTOR', assembly.status);
                  return (
                    <li key={m.proxy.id} className="p-3 bg-white rounded-2xl border border-slate-200 text-xs space-y-1" data-testid="granted-proxy" data-proxy-id={m.proxy.id}>
                      <p className="font-bold">Unidad {m.proxy.propertyNumber ?? unitLabel(m.proxy.propertyId)} <ProxyStatusBadge status={m.proxy.status} /></p>
                      <p>Apoderado: {m.proxy.proxyFullName} ({m.proxy.proxyUserId ? 'con cuenta' : 'externo'})</p>
                      <p className="text-slate-500">Solicitado {fmt(m.proxy.createdAt)}{m.proxy.reviewedAt && ` · Revisado ${fmt(m.proxy.reviewedAt)}`}</p>
                      {m.proxy.rejectionReason && <p className="text-rose-700">Motivo del rechazo: {m.proxy.rejectionReason}</p>}
                      <div className="flex gap-1.5 pt-1">
                        <button type="button" onClick={() => download(m)} className="px-2 py-1 rounded-lg bg-slate-100 font-bold flex items-center gap-1"><Download className="w-3 h-3" /> Documento</button>
                        {a.canRevoke && <button type="button" disabled={busyId === m.proxy.id} onClick={() => revoke(m)} className="px-2 py-1 rounded-lg bg-slate-100 font-bold flex items-center gap-1"><Undo2 className="w-3 h-3" /> Revocar</button>}
                        {busyId === m.proxy.id && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="space-y-2" aria-label="Unidades que represento">
            <h2 className="text-sm font-black text-slate-900">Unidades que represento como apoderado</h2>
            {representing.length === 0 ? <p className="text-xs text-slate-500" data-testid="representing-empty">No eres apoderado de ninguna unidad en esta asamblea.</p> : (
              <ul className="space-y-2">
                {representing.map((m) => {
                  const a = proxyActions(m.proxy, 'PROXY', assembly.status);
                  const label = m.proxy.propertyNumber ?? unitLabel(m.proxy.propertyId);
                  return (
                    <li key={m.proxy.id} className="p-3 bg-white rounded-2xl border border-slate-200 text-xs space-y-2" data-testid="represented-proxy" data-proxy-id={m.proxy.id}>
                      <p className="font-bold">Unidad {label} <ProxyStatusBadge status={m.proxy.status} /></p>
                      {m.proxy.status === 'APPROVED' && assembly.status !== 'IN_PROGRESS' && (
                        <p className="text-slate-500">Podrás registrar tu asistencia cuando la asamblea esté en curso.</p>
                      )}
                      {a.canSelfAttend && (
                        <button type="button" disabled={busyId === m.proxy.id} onClick={() => attend(m)}
                                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> Registrar mi asistencia</button>
                      )}
                      {a.canVoteAsProxy && (livePolls.length === 0
                        ? <p className="text-slate-500">No hay preguntas abiertas ahora.</p>
                        : livePolls.map((p) => <ProxyVoteForm key={p.id} poll={p} proxyId={m.proxy.id} unitLabel={label} />))}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
};
