import type { Visitor } from '../types';

/**
 * Clave de unidad con la que se guarda una visita que llega por SSE.
 *
 * - Residente: la vista filtra por el UUID de la unidad activa (`activeUnitId`), igual que
 *   `visitorService.mapBackendVisitor`. Usar `propertyNumber` («101») hacía que la visita
 *   desapareciera de «Pre-autorizadas» hasta recargar.
 * - Administración y portería: sus listas usan el número de unidad (`propertyNumber || propertyId`).
 */
export function sseVisitorPropertyKey(
  visitor: { propertyId?: string | null; propertyNumber?: string | null; propertyName?: string | null } | null | undefined,
  isResident: boolean,
): string | undefined {
  if (!visitor) return undefined;
  if (isResident) {
    return visitor.propertyId || visitor.propertyNumber || visitor.propertyName || undefined;
  }
  return visitor.propertyNumber || visitor.propertyId || undefined;
}

/**
 * Quién registró el ingreso y la salida. El personal recibe dos eventos por cada ingreso o salida (el de la unidad,
 * sin nombres, y el del personal, con nombres) en cualquier orden: un valor vacío nunca borra uno ya conocido.
 */
export function mergeStaffNames(
  current: Pick<Visitor, 'enteredByName' | 'exitedByName'>,
  incoming: { enteredByName?: string | null; exitedByName?: string | null } | null | undefined,
): Pick<Visitor, 'enteredByName' | 'exitedByName'> {
  return {
    enteredByName: incoming?.enteredByName || current.enteredByName,
    exitedByName: incoming?.exitedByName || current.exitedByName,
  };
}

/**
 * Integra en la lista las visitas devueltas por el backend al crearlas.
 * Si el evento SSE llegó antes que la respuesta, la respuesta del servidor sustituye esa entrada
 * (en lugar de descartarse), conservando la posición.
 */
export function mergeCreatedVisitors(prev: Visitor[], saved: Visitor[]): Visitor[] {
  const savedById = new Map(saved.map(sv => [String(sv.id).toLowerCase(), sv]));
  const replaced = new Set<string>();
  const updated = prev.map(v => {
    const key = String(v.id).toLowerCase();
    const sv = savedById.get(key);
    if (!sv) return v;
    replaced.add(key);
    return { ...v, ...sv };
  });
  const newOnes = saved.filter(sv => !replaced.has(String(sv.id).toLowerCase()));
  return [...newOnes, ...updated];
}
