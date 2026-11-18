import { useAuth } from '../contexts/AuthContext';
import type { ResidentProperty } from '../contexts/AuthContext';
import { unitLabel, unitRelations } from '../features/resident/unit/activeUnitStore';
import type { UnitStatus } from '../features/resident/unit/activeUnitStore';

export interface ActiveUnitState {
  /** Unidades autorizadas por el backend (una entrada por unidad). */
  units: ResidentProperty[];
  /** Unidad activa de esta pestaña, o null si falta elegir (varias unidades) o no hay ninguna. */
  activeUnit: ResidentProperty | null;
  activeUnitId: string | null;
  /** Etiqueta visible ("Torre 2 · Apto 402", "Casa 15"). */
  activeLabel: string;
  /** Relaciones con la unidad activa ("Propietario · Residente"). */
  activeRelations: string;
  status: UnitStatus;
  isLoading: boolean;
  selectionRequired: boolean;
  /** Mensaje cuando la unidad seleccionada dejó de estar disponible (409 UNIT_NOT_AVAILABLE). */
  notice: string | null;
  dismissNotice: () => void;
  select: (propertyId: string) => void;
  refresh: () => void;
  isSwitching: boolean;
}

/**
 * Fase 2 / E2 — Fuente ÚNICA de la unidad activa para el portal del residente. Es una fachada del AuthContext (que
 * guarda la selección por pestaña en activeUnitStore): los componentes no deben calcular la unidad por su cuenta ni
 * usar `user.residentPropertyId`, `user.propertyUnit` o la primera unidad de la lista.
 *
 * La unidad activa no autoriza nada: el backend valida cada petición.
 */
export function useActiveUnit(): ActiveUnitState {
  const auth = useAuth() as ReturnType<typeof useAuth> & Partial<{
    unitStatus: UnitStatus;
    unitNotice: string | null;
    dismissUnitNotice: () => void;
  }>;
  const units: ResidentProperty[] = Array.isArray(auth.userProperties) ? auth.userProperties : [];
  const activeUnitId = auth.activePropertyId ?? null;
  // Solo cuenta como activa una unidad que esté en la lista autorizada.
  const activeUnit = (activeUnitId && units.find((u) => u.propertyId === activeUnitId)) || null;
  const status: UnitStatus = auth.unitStatus ?? (activeUnitId ? 'ready' : 'idle');
  return {
    units,
    activeUnit,
    activeUnitId: activeUnit ? activeUnit.propertyId : null,
    activeLabel: unitLabel(activeUnit),
    activeRelations: unitRelations(activeUnit),
    status,
    isLoading: status === 'loading',
    selectionRequired: status === 'selection-required',
    notice: auth.unitNotice ?? null,
    dismissNotice: auth.dismissUnitNotice ?? (() => {}),
    select: auth.switchProperty,
    refresh: auth.refreshProperties,
    isSwitching: !!auth.isSwitchingProperty,
  };
}
