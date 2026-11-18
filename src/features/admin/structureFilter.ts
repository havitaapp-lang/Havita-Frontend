/**
 * Fase 2 / E4 (D7) — Filtro administrativo por estructura (torre, bloque o manzana).
 *
 * Siempre por IDENTIFICADOR de estructura (nunca por nombre ni por coincidencia parcial: "Torre 1" no incluye
 * "Torre 10"). Las unidades sin estructura (casas) siguen accesibles con «Todas» y con «Sin estructura». En comunidades
 * sin estructuras el filtro no se muestra: no se obliga a elegir una torre inexistente.
 */

export const ALL_STRUCTURES = 'ALL';
export const WITHOUT_STRUCTURE = 'NONE';

export interface StructureOption {
  id: string;
  label: string;
}

export interface UnitWithStructure {
  structureId?: string | null;
  structureName?: string | null;
  structureType?: string | null;
}

const natural = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

/** Estructuras presentes en las unidades (una por id, orden natural) y si hay unidades sin estructura. */
export function structureOptions(units: UnitWithStructure[]): { options: StructureOption[]; hasUnitsWithoutStructure: boolean } {
  const byId = new Map<string, StructureOption>();
  let hasUnitsWithoutStructure = false;
  for (const u of units) {
    if (!u.structureId) {
      hasUnitsWithoutStructure = true;
      continue;
    }
    if (!byId.has(u.structureId)) {
      byId.set(u.structureId, { id: u.structureId, label: u.structureName || 'Estructura' });
    }
  }
  const options = Array.from(byId.values()).sort((a, b) => natural.compare(a.label, b.label) || a.id.localeCompare(b.id));
  return { options, hasUnitsWithoutStructure };
}

/** ¿La unidad pertenece a la estructura elegida? Comparación exacta por id. */
export function matchesStructure(unit: UnitWithStructure, filter: string): boolean {
  if (!filter || filter === ALL_STRUCTURES) return true;
  if (filter === WITHOUT_STRUCTURE) return !unit.structureId;
  return unit.structureId === filter;
}

/** Valor del parámetro `structureId` de GET /residents (contrato E4): ausente, "none" o el UUID. */
export function structureQueryParam(filter: string): string | undefined {
  if (!filter || filter === ALL_STRUCTURES) return undefined;
  if (filter === WITHOUT_STRUCTURE) return 'none';
  return filter;
}
