export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
  ENDED: 'Finalizado',
  OPEN: 'Abierto',
  CLOSED: 'Cerrado',
  IN_PROGRESS: 'En Progreso',
  RESOLVED: 'Resuelto',
  DRAFT: 'Borrador',
  LIVE: 'En Vivo',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
  DELIVERED: 'Entregado',
  OCCUPIED: 'Ocupado',
  VACANT: 'Desocupado',
  MAINTENANCE: 'Mantenimiento',
  TRIAL: 'Prueba',
  PAST_DUE: 'Vencido',
  SUSPENDED: 'Suspendido',
  
  // Access & Packages
  RECEIVED: 'Recibido',
  NOTIFIED: 'Notificado',
  AUTHORIZED: 'Autorizado',
  ENTERED: 'Ingresó',
  EXITED: 'Salió',
  EXPIRED: 'Expirado',

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
  PARTIALLY_PAID: 'Pago Parcial',
  OVERDUE: 'Atrasado',
  PENDING_VERIFICATION: 'Verificando',
  CONFIRMED: 'Confirmado',
  PROGRAMADA: 'Programada',
  EN_CURSO: 'En Curso',
  FINALIZADA: 'Finalizada',
  SCHEDULED: 'Programado',
  PUBLICADO: 'Publicado',
  BORRADOR: 'Borrador',
  NEW: 'Nuevo',
  OCUPADO: 'Ocupado',
  ACKNOWLEDGED: 'Reconocido',
  FALSE_ALARM: 'Falsa Alarma',
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
  VOIDED: 'Anulado'
};

export const getStatusLabel = (status: string | undefined | null, fallback?: string): string => {
  if (!status) return fallback || 'Desconocido';
  if (STATUS_LABELS[status]) return STATUS_LABELS[status];
  const upper = status.toUpperCase();
  if (STATUS_LABELS[upper]) return STATUS_LABELS[upper];
  
  // Capitalize format fallback
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, ' ');
};

export const getGenderedStatusLabel = (status: string | undefined | null, gender: 'M' | 'F' = 'M'): string => {
  let label = getStatusLabel(status);
  if (gender === 'F') {
    if (label.endsWith('o')) {
       // Safe replace of last 'o' to 'a'
       return label.slice(0, -1) + 'a';
    }
  }
  return label;
};



