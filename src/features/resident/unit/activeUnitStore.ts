/**
 * Fase 2 / E2 — Unidad activa del residente (fuente única en el cliente).
 *
 * La unidad seleccionada es una PREFERENCIA DE INTERFAZ, nunca una autorización: el backend (ResidentUnitResolver)
 * valida en cada petición que sea una relación ACTIVE del usuario en la comunidad.
 *
 * Almacenamiento:
 * - Selección activa: `sessionStorage`, una por PESTAÑA (dos pestañas pueden operar sobre unidades distintas sin
 *   interferir). Clave por usuario y comunidad: `havita_active_unit:{userId}:{tenantId}`.
 * - Preferencia (última unidad elegida): `localStorage`, clave `havita_unit_pref:{userId}:{tenantId}`. Solo se usa para
 *   proponer la unidad en una pestaña nueva y únicamente si sigue en la lista autorizada. Nunca se comparte entre
 *   cuentas ni comunidades.
 * - La antigua clave global `havita_active_property` ya no se lee; se elimina al iniciar o cerrar sesión.
 */

export interface ResidentUnit {
  propertyId: string;
  number: string;
  name: string;
  /** Relación principal (Propietario > Arrendatario > Residente). */
  type: string;
  status: string;
  path?: string;
  label?: string;
  tenantId?: string;
  tenantName?: string | null;
  propertyType?: string | null;
  level?: string | null;
  structureId?: string | null;
  structureName?: string | null;
  structureType?: string | null;
  relations?: string[];
  isMainContact?: boolean;
  available?: boolean;
}

export type UnitStatus =
  | 'idle' // no es residente o aún no hay sesión
  | 'loading' // cargando la lista autorizada
  | 'ready' // hay una unidad activa válida
  | 'selection-required' // varias unidades y ninguna selección válida (D1)
  | 'none' // el usuario no tiene unidades
  | 'error'; // no se pudo cargar la lista (no implica revocación)

export interface UnitScope {
  userId: string;
  tenantId: string;
}

const ACTIVE_PREFIX = 'havita_active_unit:';
const PREF_PREFIX = 'havita_unit_pref:';
export const LEGACY_ACTIVE_KEY = 'havita_active_property';

/** Evento que emite apiClient cuando el backend rechaza la unidad enviada (409 UNIT_NOT_AVAILABLE). */
export const UNIT_UNAVAILABLE_EVENT = 'havita:unit_unavailable';
/** Evento que emite apiClient cuando el backend exige elegir unidad (409 UNIT_SELECTION_REQUIRED). */
export const UNIT_SELECTION_REQUIRED_EVENT = 'havita:unit_selection_required';

const keyFor = (prefix: string, scope: UnitScope) => `${prefix}${scope.userId}:${scope.tenantId}`;

function safeGet(storage: Storage | undefined, key: string): string | null {
  try {
    return storage ? storage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSet(storage: Storage | undefined, key: string, value: string | null) {
  try {
    if (!storage) return;
    if (value) storage.setItem(key, value);
    else storage.removeItem(key);
  } catch {
    // almacenamiento no disponible (modo privado, cuota): la selección vive solo en memoria
  }
}

const session = () => (typeof window !== 'undefined' ? window.sessionStorage : undefined);
const local = () => (typeof window !== 'undefined' ? window.localStorage : undefined);

let scope: UnitScope | null = null;
let activeUnitId: string | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((l) => l());

export const activeUnitStore = {
  /** Fija el usuario y la comunidad de esta pestaña y carga su selección (sin validar: la valida `resolveSelection`). */
  setScope(next: UnitScope | null) {
    const same = scope && next && scope.userId === next.userId && scope.tenantId === next.tenantId;
    if (same) return;
    scope = next;
    activeUnitId = next ? safeGet(session(), keyFor(ACTIVE_PREFIX, next)) : null;
    notify();
  },

  getScope(): UnitScope | null {
    return scope;
  },

  /** Unidad activa de ESTA pestaña para el usuario y la comunidad actuales (o null). */
  getActiveUnitId(): string | null {
    return scope ? activeUnitId : null;
  },

  /** Selección guardada en esta pestaña para el ámbito actual (puede no ser válida). */
  getStoredSessionUnitId(): string | null {
    return scope ? safeGet(session(), keyFor(ACTIVE_PREFIX, scope)) : null;
  },

  getPreferredUnitId(): string | null {
    return scope ? safeGet(local(), keyFor(PREF_PREFIX, scope)) : null;
  },

  /** Cambia la unidad activa de esta pestaña. `remember` guarda además la preferencia (elección explícita). */
  setActiveUnitId(id: string | null, remember = false) {
    if (!scope) {
      activeUnitId = null;
      return;
    }
    activeUnitId = id;
    safeSet(session(), keyFor(ACTIVE_PREFIX, scope), id);
    if (remember && id) safeSet(local(), keyFor(PREF_PREFIX, scope), id);
    notify();
  },

  /** Olvida la preferencia del ámbito actual (p. ej. porque la unidad ya no está autorizada). */
  forgetPreference() {
    if (scope) safeSet(local(), keyFor(PREF_PREFIX, scope), null);
  },

  /**
   * Cierre de sesión o cambio de cuenta: vacía la selección en memoria y en esta pestaña, y elimina la clave global
   * antigua. Las preferencias quedan por usuario y comunidad, así que la siguiente cuenta no hereda nada.
   */
  clear() {
    scope = null;
    activeUnitId = null;
    try {
      const s = session();
      if (s) {
        Object.keys(s).filter((k) => k.startsWith(ACTIVE_PREFIX)).forEach((k) => s.removeItem(k));
      }
    } catch {
      // ignore
    }
    safeSet(local(), LEGACY_ACTIVE_KEY, null);
    notify();
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/**
 * Decide la unidad activa a partir de la lista AUTORIZADA (D1):
 * 1. la selección de esta pestaña, si sigue en la lista;
 * 2. si hay una sola unidad, esa;
 * 3. la preferencia guardada para esta cuenta y comunidad, si sigue en la lista;
 * 4. si no, ninguna: con varias unidades se exige elegir. Nunca la primera de la lista.
 */
export function resolveSelection(
  units: ResidentUnit[],
  sessionUnitId: string | null,
  preferredUnitId: string | null,
): { unitId: string | null; status: UnitStatus } {
  if (units.length === 0) return { unitId: null, status: 'none' };
  const has = (id: string | null) => !!id && units.some((u) => u.propertyId === id);
  if (has(sessionUnitId)) return { unitId: sessionUnitId, status: 'ready' };
  if (units.length === 1) return { unitId: units[0].propertyId, status: 'ready' };
  if (has(preferredUnitId)) return { unitId: preferredUnitId, status: 'ready' };
  return { unitId: null, status: 'selection-required' };
}

/** Etiqueta visible de una unidad: la del backend o, si falta, torre · unidad, sin inventar torres. */
export function unitLabel(u: ResidentUnit | null | undefined): string {
  if (!u) return '';
  if (u.label) return u.label;
  const unit = u.name || u.number || 'Unidad';
  return u.structureName ? `${u.structureName} · ${unit}` : unit;
}

/** Relaciones del usuario con la unidad, sin duplicados ("Propietario · Residente"). */
export function unitRelations(u: ResidentUnit | null | undefined): string {
  if (!u) return '';
  const list = u.relations && u.relations.length > 0 ? u.relations : u.type ? [u.type] : [];
  return Array.from(new Set(list)).join(' · ');
}

/** Una entrada por unidad aunque el servidor (o una versión anterior) devuelva relaciones repetidas. */
export function dedupeUnits(units: ResidentUnit[]): ResidentUnit[] {
  const byId = new Map<string, ResidentUnit>();
  for (const u of units) {
    const prev = byId.get(u.propertyId);
    if (!prev) {
      byId.set(u.propertyId, { ...u, relations: u.relations ?? (u.type ? [u.type] : []) });
    } else {
      const rel = new Set([...(prev.relations ?? []), ...(u.relations ?? (u.type ? [u.type] : []))]);
      byId.set(u.propertyId, { ...prev, relations: Array.from(rel) });
    }
  }
  return Array.from(byId.values());
}
