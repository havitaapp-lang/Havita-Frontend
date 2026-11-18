import type { RequestPQRS } from '../types';

/** Prioridad del formulario de administración. */
export type PqrsFormPriority = 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';

/**
 * El residente envía LOW/MEDIUM/HIGH/URGENT y la administración enviaba «Media», «Alta»…: se aceptan todas las
 * variantes y se unifican.
 */
export const pqrsFormPriority = (raw?: string | null): PqrsFormPriority => {
  switch ((raw || '').trim().toUpperCase()) {
    case 'LOW': case 'BAJA': return 'BAJA';
    case 'HIGH': case 'ALTA': return 'ALTA';
    case 'URGENT': case 'URGENTE': case 'CRÍTICA': case 'CRITICA': return 'URGENTE';
    default: return 'MEDIA';
  }
};

/** Valor que se guarda en el servidor (el mismo que envía la página del residente). */
export const pqrsApiPriority = (p: PqrsFormPriority): string =>
  ({ BAJA: 'LOW', MEDIA: 'MEDIUM', ALTA: 'HIGH', URGENTE: 'URGENT' })[p];

/** Etiqueta visible de la prioridad. */
const PRIORITY_LABEL: Record<PqrsFormPriority, RequestPQRS['priority']> = {
  BAJA: 'Baja', MEDIA: 'Media', ALTA: 'Alta', URGENTE: 'Crítica',
};

const day = (iso?: string) => (iso ? iso.split('T')[0] : new Date().toISOString().split('T')[0]);

/** PQRS del API → modelo de la pantalla. {@code propertyId} es la etiqueta visible; el UUID va en propertyUuid. */
export const mapPqrsFromApi = (item: any, fallbackTenantId?: string | null): RequestPQRS => ({
  id: item.id,
  tenantId: item.tenantId || fallbackTenantId || '',
  propertyId: item.propertyName || item.propertyNumber || item.propertyId || '',
  propertyUuid: item.propertyId || undefined,
  residentId: item.residentId || undefined,
  residentName: item.residentName || '',
  category: item.category || 'Otro',
  priority: PRIORITY_LABEL[pqrsFormPriority(item.priority)],
  status: item.status || 'NEW',
  title: item.title || 'Solicitud',
  description: item.description || '',
  createdAt: day(item.createdAt),
  updatedAt: day(item.updatedAt),
  responseNotes: item.responseNotes || undefined,
});
