import type { ResidentUnit } from './activeUnitStore';

const norm = (s: string | null | undefined) => (s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Fase 2 / E3: ¿un destino de la audiencia "visual" de un comunicado alcanza a esta unidad? Comparación EXACTA (sin
 * distinguir mayúsculas), igual que el backend (CommunicationService): "Torre 1" ya no alcanza a "Torre 10".
 *
 * Destinos posibles (VisualAudienceSelector): el nombre de la estructura ("Torre 1", o "Sin Torre"), o la ruta de una
 * unidad ("Torre 1 -> Piso 2 -> Apto 3") o su nombre si no tiene ruta.
 */
export function audienceTargetMatchesUnit(target: string, unit: ResidentUnit | null | undefined): boolean {
  if (!unit) return false;
  const t = norm(target);
  if (!t) return false;
  const structure = norm(unit.structureName ?? 'Sin Torre');
  if (t === structure || t === norm(unit.name) || t === norm(unit.number)) return true;
  if (t.includes('->')) {
    const segments = t.split('->').map((s) => s.trim());
    const first = segments[0];
    const last = segments[segments.length - 1];
    return first === structure && last === norm(unit.name);
  }
  return false;
}

/** ¿Alguno de los destinos (separados por coma) alcanza a la unidad? */
export function audienceMatchesUnit(audience: string, unit: ResidentUnit | null | undefined): boolean {
  return audience.split(',').some((t) => audienceTargetMatchesUnit(t, unit));
}
