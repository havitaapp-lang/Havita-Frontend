import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, UserCheck } from 'lucide-react';
import { proxyKeys, proxyService } from '../proxyService';
import { proxyErrorMessage } from '../proxyErrors';
import { DOCUMENT_TYPES, type AssemblyProxy, type ParticipationResult, type ProxyDocumentType } from '../proxyTypes';
import { notificationService } from '../../../../services/notificationService';
import type { Poll } from '../../types/assembly.types';
import { ParticipationHistory } from './ParticipationHistory';

interface Props {
  livePolls: Poll[];
  /** Poderes de la asamblea; solo se ofrecen los UTILIZADOS de apoderados EXTERNOS (sin cuenta). */
  proxies: AssemblyProxy[];
  unitLabel: (propertyId: string) => string;
}

/**
 * Fase 2 / P6-F/G — voto asistido: la administración registra el voto que expresa EN PERSONA un apoderado externo.
 * Pide de nuevo el documento en cada emisión (también en una nueva emisión tras una anulación) y la confirmación de que
 * el voto lo expresó el apoderado. El administrador figura como quien registra, nunca como titular. El documento
 * presentado solo se compara en el backend; no se guarda en el navegador.
 */
export const AssistedVotePanel = ({ livePolls, proxies, unitLabel }: Props) => {
  const qc = useQueryClient();
  const external = proxies.filter((p) => p.status === 'USED' && p.proxyUserId == null);
  const [pollId, setPollId] = useState(livePolls[0]?.id ?? '');
  const [proxyId, setProxyId] = useState('');
  const [documentType, setDocumentType] = useState<ProxyDocumentType>('CC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [present, setPresent] = useState(false);
  const [expressed, setExpressed] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [receipt, setReceipt] = useState<ParticipationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const poll = livePolls.find((p) => p.id === pollId);
  const proxy = external.find((p) => p.id === proxyId);
  const single = poll?.type !== 'MULTIPLE_CHOICE';

  const vote = useMutation({
    mutationFn: () => proxyService.assistedVote(pollId, {
      proxyId, documentType, documentNumber, expressedByProxyConfirmed: expressed, optionIds: options,
    }),
    onSuccess: (r) => {
      setReceipt(r);
      setDocumentNumber('');
      setOptions([]);
      setPresent(false);
      setExpressed(false);
      qc.invalidateQueries({ queryKey: proxyKeys.history(pollId) });
      qc.invalidateQueries({ queryKey: ['polls'] });
    },
    onError: (e) => setError(proxyErrorMessage(e)),
    onSettled: () => { busy.current = false; },
  });

  const toggle = (id: string) => setOptions((cur) => (single ? [id] : cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const submit = async () => {
    setError(null);
    setReceipt(null);
    if (!poll || !proxy) return setError('Elige la pregunta y el poder.');
    if (!documentNumber.trim()) return setError('Escribe el número del documento que presenta el apoderado.');
    if (!present || !expressed) return setError('Confirma la verificación presencial y que el voto lo expresó el apoderado.');
    if (options.length === 0 || (single && options.length !== 1)) return setError('Elige la opción expresada por el apoderado.');
    if (busy.current) return;
    const ok = await notificationService.showConfirm('¿Registrar el voto asistido?',
      `Unidad ${unitLabel(proxy.propertyId)} · Apoderado presente: ${proxy.proxyFullName}. Quedarás registrado como quien registra, no como titular.`,
      'Sí, registrar voto');
    if (!ok) return;
    busy.current = true;
    vote.mutate();
  };

  if (livePolls.length === 0) {
    return <p className="text-xs text-slate-500" data-testid="assisted-no-poll">No hay preguntas abiertas: el voto asistido solo se registra con la pregunta abierta y la asamblea en curso.</p>;
  }

  const field = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm';
  return (
    <section className="space-y-4" aria-label="Voto asistido">
      <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2"><UserCheck className="w-4 h-4" /> Voto asistido de apoderado externo</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <label htmlFor="assisted-poll" className="text-xs font-bold text-slate-700">Pregunta abierta</label>
            <select id="assisted-poll" className={field} value={pollId} onChange={(e) => { setPollId(e.target.value); setOptions([]); setReceipt(null); }}>
              {livePolls.map((p) => <option key={p.id} value={p.id}>{p.question}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="assisted-proxy" className="text-xs font-bold text-slate-700">Poder utilizado (apoderado externo)</label>
            <select id="assisted-proxy" className={field} value={proxyId} onChange={(e) => setProxyId(e.target.value)}>
              <option value="">Selecciona…</option>
              {external.map((p) => <option key={p.id} value={p.id}>{unitLabel(p.propertyId)} · {p.proxyFullName}</option>)}
            </select>
            {external.length === 0 && <p className="text-[11px] text-slate-500 mt-1">No hay poderes externos con asistencia registrada.</p>}
          </div>
        </div>
        {proxy && (
          <>
            <p className="text-[11px] text-slate-600">Unidad representada: <b>{unitLabel(proxy.propertyId)}</b>. Pide al apoderado su documento original.</p>
            <div className="grid grid-cols-3 gap-2">
              <select aria-label="Tipo de documento presentado" className={field} value={documentType}
                      onChange={(e) => setDocumentType(e.target.value as ProxyDocumentType)}>
                {DOCUMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <input aria-label="Número del documento presentado" className={`${field} col-span-2`} autoComplete="off"
                     value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
            </div>
            <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={present} onChange={(e) => setPresent(e.target.checked)} />
              Verifiqué en persona la identidad del apoderado con su documento original.</label>
            <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={expressed} onChange={(e) => setExpressed(e.target.checked)} />
              El apoderado expresó personalmente la opción que registro.</label>
            {poll && (
              <fieldset className="space-y-1">
                <legend className="text-xs font-bold text-slate-700">{single ? 'Opción expresada' : 'Opciones expresadas'}</legend>
                {poll.options.map((o) => (
                  <label key={o.id} className="text-xs flex items-center gap-2">
                    <input type={single ? 'radio' : 'checkbox'} name="assisted-option" checked={options.includes(o.id)} onChange={() => toggle(o.id)} />
                    {o.text}
                  </label>
                ))}
              </fieldset>
            )}
            <button type="button" onClick={submit} disabled={vote.isPending}
                    className="px-4 py-2 bg-[var(--tenant-primary)] text-white font-bold rounded-xl text-xs disabled:opacity-60 flex items-center gap-1.5">
              {vote.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Registrar voto asistido
            </button>
          </>
        )}
        {error && <p role="alert" className="text-xs text-rose-600" data-testid="assisted-error">{error}</p>}
        {receipt && (
          <div role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900" data-testid="assisted-receipt">
            <p className="font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />
              {receipt.supersedesParticipationId ? 'Nueva emisión registrada' : 'Voto asistido registrado'}</p>
            <p>Comprobante interno: <span className="font-mono">{receipt.participationId}</span> · {new Date(receipt.castAt).toLocaleString('es-CO')}</p>
            {receipt.supersedesParticipationId && <p>Sustituye al voto anulado <span className="font-mono">{receipt.supersedesParticipationId}</span>.</p>}
          </div>
        )}
      </div>
      {poll && (
        <ParticipationHistory pollId={poll.id} pollLive={poll.status === 'LIVE'} unitLabel={unitLabel}
                              optionText={(id) => poll.options.find((o) => o.id === id)?.text ?? 'Opción'} />
      )}
    </section>
  );
};
