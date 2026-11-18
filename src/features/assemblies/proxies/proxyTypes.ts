/**
 * Fase 2 / P6 — tipos de los contratos REALES del backend de poderes y voto mediante poder
 * (ver tasks/P6_API_CONTRACT_AUDIT.md). Nada de esto decide permisos: solo evita ofrecer acciones que el backend
 * rechazaría por el estado; el backend vuelve a comprobarlo todo.
 */

export type ProxyStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'REVOKED' | 'EXPIRED' | 'USED';

export const DOCUMENT_TYPES = ['CC', 'CE', 'PASAPORTE', 'PEP'] as const;
export type ProxyDocumentType = (typeof DOCUMENT_TYPES)[number];

export interface AssemblyProxy {
  id: string;
  assemblyId: string;
  propertyId: string;
  grantorResidentId: string;
  proxyUserId: string | null;
  proxyFullName: string;
  proxyDocumentType: ProxyDocumentType;
  proxyDocumentNumber: string;
  status: ProxyStatus;
  createdChannel: string;
  documentContentType: string;
  documentSizeBytes: number;
  documentRegisteredAt: string | null;
  reviewedAt: string | null;
  reviewDecision: string | null;
  rejectionReason: string | null;
  revokedAt: string | null;
  expiredAt: string | null;
  createdAt: string;
  /** Número de la unidad representada (P6; lo devuelve el backend solo a quien ya puede ver el poder). */
  propertyNumber: string | null;
}

export type ProxyRelation = 'GRANTOR' | 'PROXY';

export interface MyAssemblyProxy {
  relation: ProxyRelation;
  proxy: AssemblyProxy;
}

export interface AssemblyProxyEvent {
  action: string;
  result: 'SUCCESS' | 'DENIED';
  actorChannel: string;
  actorUserId: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  reasonCode: string | null;
  occurredAt: string;
}

export type RepresentationType = 'OWNER' | 'CO_OWNER' | 'TENANT_DELEGATE' | 'ACCOUNT_PROXY' | 'ADMIN_ASSISTED_PROXY';

export interface ParticipationResult {
  participationId: string;
  pollId: string;
  assemblyId: string;
  propertyId: string;
  representationType: RepresentationType;
  status: 'VALID' | 'VOIDED';
  castAt: string;
  voidedAt: string | null;
  supersedesParticipationId: string | null;
  poll: unknown;
}

export interface ParticipationAudit {
  participationId: string;
  propertyId: string;
  representationType: RepresentationType;
  status: 'VALID' | 'VOIDED';
  actorUserId: string;
  castAt: string;
  optionIds: string[];
  supersedesParticipationId: string | null;
  identityVerifiedByUserId: string | null;
  identityVerifiedAt: string | null;
  voidedByUserId: string | null;
  voidedAt: string | null;
  voidReason: string | null;
}

export interface ProxyLimitSetting {
  configured: boolean;
  communityLimit: number | null;
  globalLimit: number | null;
  effectiveLimit: number | null;
}

/** P7 (G4): un cambio del límite de la comunidad (historial de solo inserción). */
export interface ProxyLimitHistoryEntry {
  id: string;
  previousConfigured: boolean;
  previousMaxUnits: number | null;
  newMaxUnits: number | null;
  occurredAt: string;
  actorUserId: string;
  actorName: string | null;
  /** El historial actual no guarda motivo: siempre null (se muestra «—»). */
  reason: string | null;
}

export interface ProxyLimitHistoryPage {
  communityId: string;
  communityName: string | null;
  items: ProxyLimitHistoryEntry[];
  page: number;
  size: number;
  total: number;
}

/**
 * P7 (G3): cómo recibió la administración el poder firmado por el otorgante (el archivo adjunto es esa evidencia). Qué
 * tipos son jurídicamente admisibles es una decisión pendiente (P5_LEGAL_REVIEW_CHECKLIST §1); el sistema solo lo
 * registra en la auditoría.
 */
export const EVIDENCE_TYPES = ['SIGNED_DOCUMENT_IN_PERSON', 'SIGNED_DOCUMENT_SENT_BY_GRANTOR', 'AUTHENTICATED_DOCUMENT'] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];
export const EVIDENCE_LABELS: Record<EvidenceType, string> = {
  SIGNED_DOCUMENT_IN_PERSON: 'Poder firmado entregado en persona por el otorgante',
  SIGNED_DOCUMENT_SENT_BY_GRANTOR: 'Poder firmado enviado por el otorgante por un canal de la comunidad',
  AUTHENTICATED_DOCUMENT: 'Poder con firma autenticada o reconocida',
};

/** Texto del valor de un límite en el historial. */
export function limitValueLabel(configured: boolean, value: number | null): string {
  if (!configured) return 'Valor general';
  return value == null ? 'Sin límite' : String(value);
}

/** Texto del código de un evento de poder (P7: tipo de evidencia del registro administrativo). */
export function eventReasonLabel(reasonCode: string | null): string | null {
  if (!reasonCode) return null;
  if (reasonCode.startsWith('EVIDENCE_')) {
    const t = reasonCode.slice('EVIDENCE_'.length) as EvidenceType;
    return EVIDENCE_LABELS[t] ? `Evidencia: ${EVIDENCE_LABELS[t]}` : `Evidencia: ${t}`;
  }
  return reasonCode;
}

export const STATUS_LABELS: Record<ProxyStatus, string> = {
  PENDING_REVIEW: 'En revisión',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  REVOKED: 'Revocado',
  EXPIRED: 'Vencido',
  USED: 'Utilizado',
};

export const STATUS_HINTS: Record<ProxyStatus, string> = {
  PENDING_REVIEW: 'La administración debe revisar el documento.',
  APPROVED: 'Listo para registrar la asistencia del apoderado.',
  REJECTED: 'La administración no lo aceptó.',
  REVOKED: 'Fue revocado antes de usarse.',
  EXPIRED: 'La asamblea terminó sin que se usara.',
  USED: 'El apoderado ya registró la asistencia de la unidad.',
};

export const REPRESENTATION_LABELS: Record<RepresentationType, string> = {
  OWNER: 'Propietario',
  CO_OWNER: 'Copropietario',
  TENANT_DELEGATE: 'Arrendatario delegado',
  ACCOUNT_PROXY: 'Apoderado con cuenta',
  ADMIN_ASSISTED_PROXY: 'Voto asistido (apoderado externo)',
};

export interface ProxyActions {
  canApprove: boolean;
  canReject: boolean;
  canRevoke: boolean;
  canRegisterAttendanceByAdmin: boolean;
  canSelfAttend: boolean;
  canVoteAsProxy: boolean;
}

/**
 * Acciones coherentes con el estado (y con quién mira). El backend aplica además la membresía, la comunidad, la
 * asamblea, el otorgante, la exclusividad con delegaciones y asistencias, y el límite.
 */
export function proxyActions(
  proxy: Pick<AssemblyProxy, 'status' | 'proxyUserId'>,
  viewer: 'ADMIN' | ProxyRelation,
  assemblyStatus: 'SCHEDULED' | 'IN_PROGRESS' | 'ENDED',
): ProxyActions {
  const open = assemblyStatus !== 'ENDED';
  const external = proxy.proxyUserId == null;
  return {
    canApprove: viewer === 'ADMIN' && open && proxy.status === 'PENDING_REVIEW',
    canReject: viewer === 'ADMIN' && proxy.status === 'PENDING_REVIEW',
    canRevoke: (viewer === 'ADMIN' || viewer === 'GRANTOR') && open
      && (proxy.status === 'PENDING_REVIEW' || proxy.status === 'APPROVED'),
    canRegisterAttendanceByAdmin: viewer === 'ADMIN' && open && proxy.status === 'APPROVED',
    canSelfAttend: viewer === 'PROXY' && !external && assemblyStatus === 'IN_PROGRESS' && proxy.status === 'APPROVED',
    canVoteAsProxy: viewer === 'PROXY' && !external && open && proxy.status === 'USED',
  };
}

/** Un voto asistido VIGENTE se puede anular (el backend exige además pregunta abierta y asamblea en curso). */
export function canVoid(p: Pick<ParticipationAudit, 'representationType' | 'status'>, pollLive: boolean): boolean {
  return pollLive && p.status === 'VALID' && p.representationType === 'ADMIN_ASSISTED_PROXY';
}

/**
 * Historial por unidad en orden de la cadena (P1 → anulación → P2 → …). La vigente, si existe, es la única VALID.
 */
export function chainsByUnit(history: ParticipationAudit[]): Map<string, ParticipationAudit[]> {
  const byUnit = new Map<string, ParticipationAudit[]>();
  for (const p of history) {
    const list = byUnit.get(p.propertyId) ?? [];
    list.push(p);
    byUnit.set(p.propertyId, list);
  }
  for (const [unit, list] of byUnit) {
    const byPrev = new Map(list.filter((p) => p.supersedesParticipationId).map((p) => [p.supersedesParticipationId!, p]));
    const root = list.find((p) => !p.supersedesParticipationId);
    if (!root) {
      byUnit.set(unit, [...list].sort((x, y) => x.castAt.localeCompare(y.castAt)));
      continue;
    }
    const ordered: ParticipationAudit[] = [];
    let cur: ParticipationAudit | undefined = root;
    while (cur && ordered.length < list.length) {
      ordered.push(cur);
      cur = byPrev.get(cur.participationId);
    }
    byUnit.set(unit, ordered);
  }
  return byUnit;
}

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

/**
 * Validación previa del archivo (comodidad para el usuario). El backend vuelve a validar por la FIRMA del contenido y
 * por su propio límite; esto no es una barrera de seguridad.
 */
export function documentProblem(file: File | null | undefined, maxBytes: number = MAX_DOCUMENT_BYTES): string | null {
  if (!file) return 'Adjunta el documento del poder (PDF, PNG o JPEG).';
  if (file.size === 0) return 'El archivo está vacío.';
  if (file.size > maxBytes) return `El archivo supera el tamaño máximo (${Math.round(maxBytes / 1024 / 1024)} MB).`;
  if (file.type && !ALLOWED_DOCUMENT_TYPES.includes(file.type)) return 'Solo se admiten documentos PDF, PNG o JPEG.';
  return null;
}

export const DOCUMENT_NUMBER_PATTERN = /^[A-Za-z0-9-]{1,50}$/;

/** Valor del formulario → límite (null = sin límite) o error. Solo enteros ≥ 1; no hay límites jurídicos predefinidos. */
export function parseLimit(raw: string): { value: number | null } | { error: string } {
  const t = raw.trim();
  if (t === '') return { value: null };
  if (!/^\d+$/.test(t)) return { error: 'Escribe un número entero positivo, o déjalo vacío para no limitar.' };
  const n = Number(t);
  if (n < 1 || n > 1_000_000) return { error: 'El límite debe ser un entero entre 1 y 1.000.000.' };
  return { value: n };
}

