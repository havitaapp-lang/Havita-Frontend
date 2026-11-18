/**
 * Etiquetas visibles de los estados y tipos que envía el backend.
 *
 * La traducción es SOLO visual: los valores internos (PENDING, IN_PROGRESS…) se siguen usando tal cual para filtrar,
 * guardar y enviar al API. No uses estas etiquetas como valores de un formulario.
 */
export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
  CANCELED: 'Cancelado',
  ENDED: 'Finalizado',
  OPEN: 'Abierto',
  CLOSED: 'Cerrado',
  IN_PROGRESS: 'En proceso',
  RESOLVED: 'Resuelto',
  DRAFT: 'Borrador',
  LIVE: 'En vivo',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
  DELIVERED: 'Entregado',
  OCCUPIED: 'Ocupado',
  VACANT: 'Desocupado',
  MAINTENANCE: 'Mantenimiento',
  TRIAL: 'Prueba',
  PAST_DUE: 'Vencido',
  SUSPENDED: 'Suspendido',
  PENDING_REVIEW: 'En revisión',
  PENDING_APPROVAL: 'Pendiente de aprobación',
  HIDDEN: 'Oculto',
  DISMISSED: 'Descartado',
  INVALIDATED: 'Invalidado',

  // Access & Packages
  RECEIVED: 'Recibido',
  NOTIFIED: 'Notificado',
  AUTHORIZED: 'Autorizado',
  ENTERED: 'Ingresó',
  EXITED: 'Salió',
  EXPIRED: 'Expirado',

  // Citofonía
  INITIATING: 'Iniciando',
  RINGING: 'Timbrando',
  ACCEPTED: 'Aceptada',
  MISSED: 'No contestó',
  FAILED: 'Fallida',

  // Staff & Shifts & Attendance
  COMPLETED: 'Completado',
  PRESENT: 'Presente',
  LATE: 'Tardanza',
  ABSENT: 'Ausente',
  INCOMPLETE: 'Incompleto',

  // Legacy / Fallback labels
  RECIBIDO: 'Recibido',
  NOTIFICADO: 'Notificado',
  ENTREGADO: 'Entregado',
  AUTORIZADO: 'Autorizado',
  INGRESO: 'Ingresó',
  SALIO: 'Salió',
  EXPIRADO: 'Expirado',
  PAID: 'Pagado',
  PARTIALLY_PAID: 'Pago parcial',
  OVERDUE: 'Atrasado',
  PENDING_VERIFICATION: 'Verificando',
  CONFIRMED: 'Confirmado',
  PROGRAMADA: 'Programada',
  EN_CURSO: 'En curso',
  FINALIZADA: 'Finalizada',
  SCHEDULED: 'Programado',
  PUBLICADO: 'Publicado',
  BORRADOR: 'Borrador',
  NEW: 'Nuevo',
  OCUPADO: 'Ocupado',
  ACKNOWLEDGED: 'Reconocido',
  FALSE_ALARM: 'Falsa alarma',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
  RECHAZADA: 'Rechazada',
  COMPLETADA: 'Completada',
  USED: 'Usado',
  REVOKED: 'Revocado',
  PRESENTE: 'Presente',
  TARDANZA: 'Tardanza',
  AUSENTE: 'Ausente',
  INCOMPLETO: 'Incompleto',
  PROGRAMADO: 'Programado',
  COMPLETADO: 'Completado',
  CANCELADO: 'Cancelado',
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
  SUSPENDIDO: 'Suspendido',
  FINALIZADO: 'Finalizado',
  VOIDED: 'Anulado'
};

/**
 * Etiquetas que dependen del contexto (género, vocabulario del módulo). Si un valor no está aquí, se usa
 * {@link STATUS_LABELS}.
 */
export const DOMAIN_STATUS_LABELS = {
  /** Asambleas (la asamblea): AssemblyStatus. */
  assembly: { SCHEDULED: 'Programada', IN_PROGRESS: 'En curso', ENDED: 'Finalizada' },
  /** Tipo de asamblea. */
  assemblyType: { ORDINARIA: 'Ordinaria', EXTRAORDINARIA: 'Extraordinaria', ORDINARY: 'Ordinaria', EXTRAORDINARY: 'Extraordinaria' },
  /** Modalidad de asamblea. */
  assemblyModality: { PRESENCIAL: 'Presencial', VIRTUAL: 'Virtual', MIXTA: 'Mixta', IN_PERSON: 'Presencial', HYBRID: 'Mixta' },
  /** Visitantes (vocabulario de portería): VisitorStatus. */
  visitor: {
    AUTHORIZED: 'Esperado', APPROVED: 'Esperado', PENDING: 'Pendiente', ENTERED: 'Adentro', EXITED: 'Salió',
    EXPIRED: 'Expirado', CANCELLED: 'Cancelado',
  },
  /** Paquetes: PackageStatus. */
  package: { RECEIVED: 'Recibido', NOTIFIED: 'Notificado', DELIVERED: 'Entregado' },
  /** PQRS (la solicitud): PqrsRequestStatus. */
  pqrs: { NEW: 'Nueva', IN_PROGRESS: 'En proceso', RESOLVED: 'Resuelta', CLOSED: 'Cerrada' },
  /** Personal: StaffMemberStatus (backend) y códigos locales del módulo de personal. */
  staff: {
    ACTIVE: 'Activo', INACTIVE: 'Inactivo', ACTIVO: 'Activo', INACTIVO: 'Inactivo', SUSPENDIDO: 'Suspendido',
    FINALIZADO: 'Finalizado',
  },
  /** Rol de acceso al sistema del personal. */
  staffRole: {
    COMMUNITY_ADMIN: 'Administración', SECURITY: 'Portería', STAFF: 'Personal', RESIDENT: 'Residente',
    ACCOUNTANT: 'Contabilidad', READ_ONLY: 'Solo lectura', SUPER_ADMIN: 'Superadministrador',
    PLATFORM_ADMIN: 'Administrador de plataforma', 'PORTERÍA': 'Portería', SEGURIDAD: 'Seguridad',
    ADMINISTRADOR: 'Administración', MANTENIMIENTO: 'Mantenimiento', SOLO_LECTURA: 'Solo lectura',
  },
  /** Turnos (el turno): ShiftStatus y códigos locales. */
  shift: {
    SCHEDULED: 'Programado', IN_PROGRESS: 'En curso', COMPLETED: 'Completado', ABSENT: 'Ausente', CANCELLED: 'Cancelado',
    PROGRAMADO: 'Programado', EN_CURSO: 'En curso', COMPLETADO: 'Completado', AUSENTE: 'Ausente', CANCELADO: 'Cancelado',
  },
  /** Asistencia: AttendanceRecordStatus y códigos locales. */
  attendance: {
    PRESENT: 'A tiempo', LATE: 'Tardanza', ABSENT: 'Ausente', INCOMPLETE: 'Incompleto',
    PRESENTE: 'A tiempo', TARDANZA: 'Tardanza', AUSENTE: 'Ausente', INCOMPLETO: 'Incompleto',
  },
  /** Llamadas de citofonía (la llamada): IntercomCallStatus. */
  intercomCall: {
    INITIATING: 'Iniciando', RINGING: 'Timbrando', ACCEPTED: 'Finalizada', ENDED: 'Finalizada', REJECTED: 'Rechazada',
    MISSED: 'No contestó', FAILED: 'Fallida', CANCELLED: 'Cancelada',
  },
} as const satisfies Record<string, Record<string, string>>;

export type StatusDomain = keyof typeof DOMAIN_STATUS_LABELS;

const missing = new Set<string>();

/** Estados que se mostraron sin traducción (para pruebas y diagnóstico). */
export const getMissingStatusLabels = (): string[] => [...missing];
export const clearMissingStatusLabels = () => missing.clear();

const isDev = (): boolean => {
  try {
    return Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
};

const reportMissing = (domain: string, status: string) => {
  const key = `${domain}:${status}`;
  if (missing.has(key)) return;
  missing.add(key);
  // No se oculta: se avisa para añadir la traducción (solo en desarrollo, sin datos personales).
  if (isDev()) console.warn(`[i18n] Estado sin traducción: ${key}`);
};

const humanize = (status: string) => status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, ' ');

export const getStatusLabel = (status: string | undefined | null, fallback?: string): string => {
  if (!status) return fallback || 'Desconocido';
  if (STATUS_LABELS[status]) return STATUS_LABELS[status];
  const upper = status.toUpperCase();
  if (STATUS_LABELS[upper]) return STATUS_LABELS[upper];

  reportMissing('general', status);
  return humanize(status);
};

/**
 * Etiqueta de un estado según el módulo (p. ej. `statusLabelFor('assembly', 'SCHEDULED')` → «Programada»).
 * Valor vacío → `fallback` (por defecto «—»).
 */
export const statusLabelFor = (domain: StatusDomain, status: string | undefined | null, fallback = '—'): string => {
  if (!status) return fallback;
  const labels = DOMAIN_STATUS_LABELS[domain] as Record<string, string>;
  const value = String(status).trim();
  const hit = labels[value] ?? labels[value.toUpperCase()];
  if (hit) return hit;
  if (STATUS_LABELS[value] || STATUS_LABELS[value.toUpperCase()]) return getStatusLabel(value);
  reportMissing(domain, value);
  return humanize(value);
};

export const getGenderedStatusLabel = (status: string | undefined | null, gender: 'M' | 'F' = 'M'): string => {
  const label = getStatusLabel(status);
  if (gender === 'F') {
    if (label.endsWith('o')) {
       // Safe replace of last 'o' to 'a'
       return label.slice(0, -1) + 'a';
    }
  }
  return label;
};
