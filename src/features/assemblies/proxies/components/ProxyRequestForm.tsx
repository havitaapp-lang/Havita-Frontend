import { useRef, useState, type FormEvent } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import {
  DOCUMENT_NUMBER_PATTERN, DOCUMENT_TYPES, EVIDENCE_LABELS, EVIDENCE_TYPES, documentProblem, type EvidenceType, type ProxyDocumentType,
} from '../proxyTypes';
import type { ProxyRequestData } from '../proxyService';

export interface UnitChoice {
  propertyId: string;
  label: string;
}

export interface AccountChoice {
  userId: string;
  label: string;
}

export interface GrantorChoice {
  residentId: string;
  propertyId: string;
  label: string;
}

interface Props {
  /** Unidades que el usuario puede representar (residente: las suyas como propietario; administración: todas). */
  units: UnitChoice[];
  /**
   * Solo administración: propietarios activos (otorgante) y cuentas de la comunidad para un apoderado con cuenta. El
   * residente no puede elegir cuentas (no existe un buscador de usuarios para residentes: ver P6_API_CONTRACT_AUDIT G3).
   */
  grantors?: GrantorChoice[];
  accounts?: AccountChoice[];
  submitting?: boolean;
  onSubmit: (data: ProxyRequestData, document: File) => Promise<void> | void;
}

/**
 * Fase 2 / P6-B — solicitud o registro de un poder. Valida en el navegador solo por comodidad (campos, tamaño y tipo
 * declarado); el backend valida la firma del archivo, la unidad, el otorgante, el apoderado y el estado de la asamblea.
 * El documento no se guarda en el navegador: se envía directamente.
 */
export const ProxyRequestForm = ({ units, grantors, accounts, submitting, onSubmit }: Props) => {
  const admin = grantors !== undefined;
  const [propertyId, setPropertyId] = useState(units.length === 1 ? units[0].propertyId : '');
  const [grantorResidentId, setGrantorResidentId] = useState('');
  const [kind, setKind] = useState<'EXTERNAL' | 'ACCOUNT'>('EXTERNAL');
  const [proxyUserId, setProxyUserId] = useState('');
  const [proxyFullName, setProxyFullName] = useState('');
  const [proxyDocumentType, setProxyDocumentType] = useState<ProxyDocumentType>('CC');
  const [proxyDocumentNumber, setProxyDocumentNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);
  // P7 (G3): solo administración. La administración no crea consentimiento: registra cómo recibió el poder firmado.
  const [evidenceType, setEvidenceType] = useState<EvidenceType | ''>('');
  const [attested, setAttested] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const busy = useRef(false);

  const unitGrantors = (grantors ?? []).filter((g) => g.propertyId === propertyId);

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!propertyId) e.propertyId = 'Elige la unidad.';
    if (admin && !grantorResidentId) e.grantor = 'Elige el propietario que otorga el poder.';
    if (kind === 'ACCOUNT' && !proxyUserId) e.proxyUserId = 'Elige la cuenta del apoderado.';
    if (!proxyFullName.trim()) e.proxyFullName = 'Escribe el nombre completo del apoderado.';
    else if (proxyFullName.trim().length > 150) e.proxyFullName = 'Máximo 150 caracteres.';
    if (!DOCUMENT_NUMBER_PATTERN.test(proxyDocumentNumber.trim())) {
      e.proxyDocumentNumber = 'Número de documento: solo letras, números y guiones (máximo 50).';
    }
    const fileError = documentProblem(file);
    if (fileError) e.document = fileError;
    if (admin && !evidenceType) e.evidenceType = 'Indica cómo se recibió el poder firmado por el otorgante.';
    if (admin && !attested) e.attested = 'Confirma que el documento adjunto es el poder firmado por el otorgante.';
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (busy.current || submitting) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0 || !file) return;
    busy.current = true;
    try {
      await onSubmit({
        propertyId,
        proxyFullName,
        proxyDocumentType,
        proxyDocumentNumber,
        proxyUserId: kind === 'ACCOUNT' ? proxyUserId : null,
        grantorResidentId: admin ? grantorResidentId : null,
        ...(admin ? { evidenceType: evidenceType || null, grantorConsentAttested: attested } : {}),
      }, file);
    } finally {
      busy.current = false;
    }
  };

  const field = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200';
  const errorText = (k: string) => errors[k] ? <p role="alert" className="text-[11px] text-rose-600 mt-1">{errors[k]}</p> : null;

  return (
    <form onSubmit={submit} noValidate className="space-y-3" aria-label="Solicitud de poder">
      <div>
        <label htmlFor="proxy-unit" className="text-xs font-bold text-slate-700">Unidad</label>
        <select id="proxy-unit" className={field} value={propertyId}
                onChange={(e) => { setPropertyId(e.target.value); setGrantorResidentId(''); }}>
          <option value="">Selecciona…</option>
          {units.map((u) => <option key={u.propertyId} value={u.propertyId}>{u.label}</option>)}
        </select>
        {errorText('propertyId')}
      </div>

      {admin && (
        <div>
          <label htmlFor="proxy-grantor" className="text-xs font-bold text-slate-700">Propietario que otorga</label>
          <select id="proxy-grantor" className={field} value={grantorResidentId} onChange={(e) => setGrantorResidentId(e.target.value)}>
            <option value="">Selecciona…</option>
            {unitGrantors.map((g) => <option key={g.residentId} value={g.residentId}>{g.label}</option>)}
          </select>
          {errorText('grantor')}
        </div>
      )}

      {admin && accounts && (
        <fieldset className="space-y-1">
          <legend className="text-xs font-bold text-slate-700">Apoderado</legend>
          <label className="mr-4 text-xs"><input type="radio" name="proxy-kind" checked={kind === 'EXTERNAL'}
                 onChange={() => setKind('EXTERNAL')} /> Externo (sin cuenta)</label>
          <label className="text-xs"><input type="radio" name="proxy-kind" checked={kind === 'ACCOUNT'}
                 onChange={() => setKind('ACCOUNT')} /> Con cuenta Havita</label>
          {kind === 'ACCOUNT' && (
            <>
              <select aria-label="Cuenta del apoderado" className={field} value={proxyUserId} onChange={(e) => setProxyUserId(e.target.value)}>
                <option value="">Selecciona…</option>
                {accounts.map((a) => <option key={a.userId} value={a.userId}>{a.label}</option>)}
              </select>
              {errorText('proxyUserId')}
            </>
          )}
        </fieldset>
      )}

      <div>
        <label htmlFor="proxy-name" className="text-xs font-bold text-slate-700">Nombre completo del apoderado</label>
        <input id="proxy-name" className={field} value={proxyFullName} maxLength={150} autoComplete="off"
               onChange={(e) => setProxyFullName(e.target.value)} />
        {errorText('proxyFullName')}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label htmlFor="proxy-doc-type" className="text-xs font-bold text-slate-700">Tipo</label>
          <select id="proxy-doc-type" className={field} value={proxyDocumentType}
                  onChange={(e) => setProxyDocumentType(e.target.value as ProxyDocumentType)}>
            {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label htmlFor="proxy-doc-number" className="text-xs font-bold text-slate-700">Número de documento</label>
          <input id="proxy-doc-number" className={field} value={proxyDocumentNumber} maxLength={50} autoComplete="off"
                 onChange={(e) => setProxyDocumentNumber(e.target.value)} />
          {errorText('proxyDocumentNumber')}
        </div>
      </div>
      <div>
        <label htmlFor="proxy-document" className="text-xs font-bold text-slate-700 flex items-center gap-1">
          <FileUp className="w-3.5 h-3.5" /> Documento del poder (PDF, PNG o JPEG; máx. 5 MB)
        </label>
        <input id="proxy-document" type="file" accept="application/pdf,image/png,image/jpeg" className="text-xs"
               onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {errorText('document')}
      </div>
      {admin && (
        <fieldset className="space-y-2 p-3 rounded-xl border border-amber-200 bg-amber-50/60" aria-label="Evidencia del otorgante">
          <legend className="text-xs font-bold text-amber-900 px-1">Evidencia del otorgante</legend>
          <div>
            <label htmlFor="proxy-evidence" className="text-xs font-bold text-slate-700">¿Cómo se recibió el poder firmado?</label>
            <select id="proxy-evidence" className={field} value={evidenceType} onChange={(e) => setEvidenceType(e.target.value as EvidenceType | '')}>
              <option value="">Selecciona…</option>
              {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{EVIDENCE_LABELS[t]}</option>)}
            </select>
            {errorText('evidenceType')}
          </div>
          <label className="flex items-start gap-2 text-xs text-slate-800">
            <input id="proxy-attested" type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} className="mt-0.5" />
            <span>Declaro que el documento adjunto es el poder firmado por el propietario que lo otorga. La administración no puede otorgar un poder por su cuenta.</span>
          </label>
          {errorText('attested')}
          <p className="text-[11px] text-amber-900">El poder queda en revisión y debe aprobarse aparte. El tipo de evidencia queda en el historial de auditoría.</p>
        </fieldset>
      )}

      <p className="text-[11px] text-slate-500">
        El poder solo permite representar la unidad en esta asamblea. No crea propietarios ni da permisos permanentes.
      </p>
      <button type="submit" disabled={submitting}
              className="px-4 py-2 bg-[var(--tenant-primary)] text-white font-bold rounded-xl text-xs disabled:opacity-60 flex items-center gap-1.5">
        {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {admin ? 'Registrar poder' : 'Enviar solicitud'}
      </button>
    </form>
  );
};
