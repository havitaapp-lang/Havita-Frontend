import type { AssemblyStatus } from '../types/assembly.types';

/**
 * Fase 2 / P5-D: única transición de estado que la administración puede pedir desde el detalle de una asamblea.
 * - SCHEDULED → IN_PROGRESS ("Iniciar sesión")
 * - IN_PROGRESS → ENDED ("Finalizar sesión")
 * - ENDED → ninguna: una asamblea finalizada no se reabre (el backend responde 409 ASSEMBLY_ALREADY_ENDED).
 */
export interface AssemblyStatusAction {
  nextStatus: Extract<AssemblyStatus, 'IN_PROGRESS' | 'ENDED'>;
  label: string;
}

export function assemblyStatusAction(status: AssemblyStatus): AssemblyStatusAction | null {
  switch (status) {
    case 'SCHEDULED':
      return { nextStatus: 'IN_PROGRESS', label: 'Iniciar Sesión' };
    case 'IN_PROGRESS':
      return { nextStatus: 'ENDED', label: 'Finalizar Sesión' };
    default:
      return null;
  }
}
