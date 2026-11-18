/**
 * Mapeo de estados del backend a los códigos del módulo de personal (solo lectura: estos estados no se envían).
 */
import { describe, expect, it } from 'vitest';
import { staffStatusFromBackend } from './personalService';
import { backendAttendanceToFrontend } from './attendanceService';

describe('staffStatusFromBackend', () => {
  it('ACTIVE/INACTIVE del backend → ACTIVO/INACTIVO (filtro «Activos» y colores)', () => {
    expect(staffStatusFromBackend('ACTIVE')).toBe('ACTIVO');
    expect(staffStatusFromBackend('INACTIVE')).toBe('INACTIVO');
    expect(staffStatusFromBackend('ACTIVO')).toBe('ACTIVO');
  });

  it('un valor desconocido se conserva (no se convierte en «Inactivo» sin avisar)', () => {
    expect(staffStatusFromBackend('ON_LEAVE')).toBe('ON_LEAVE');
  });
});

describe('backendAttendanceToFrontend', () => {
  const rec = (status: string) => backendAttendanceToFrontend({ id: 'a1', status, staffMemberId: 'm1' });

  it('PRESENT, LATE, ABSENT e INCOMPLETE tienen su código', () => {
    expect(rec('PRESENT').status).toBe('PRESENTE');
    expect(rec('LATE').status).toBe('TARDANZA');
    expect(rec('ABSENT').status).toBe('AUSENTE');
    // Antes INCOMPLETE se mostraba como «A tiempo» y contaba como presente.
    expect(rec('INCOMPLETE').status).toBe('INCOMPLETO');
  });
});
