import { describe, expect, it } from 'vitest';
import { statusLabel, unitLabel } from './residentFormat';

describe('unitLabel (TASK-007 #8)', () => {
  it('usa el número completo de la unidad, que es único', () => {
    expect(unitLabel({ number: 'Torre 1-Piso 5-Apto 2', name: 'Apto 2' })).toBe('Torre 1-Piso 5-Apto 2 · Apto 2');
  });
  it('no repite el nombre cuando coincide con el número', () => {
    expect(unitLabel({ number: 'E2E-FIX-RES-01', name: 'E2E-FIX-RES-01' })).toBe('E2E-FIX-RES-01');
  });
  it('tolera datos incompletos', () => {
    expect(unitLabel({ name: 'Local 3' })).toBe('Local 3');
    expect(unitLabel({})).toBe('');
  });
});

describe('statusLabel (TASK-007 #3)', () => {
  it('traduce los valores del enum del backend', () => {
    expect(statusLabel('ACTIVE')).toBe('Activo');
    expect(statusLabel('INACTIVE')).toBe('Inactivo');
  });
  it('deja intactos valores desconocidos', () => {
    expect(statusLabel('PENDIENTE')).toBe('PENDIENTE');
    expect(statusLabel(undefined)).toBe('');
  });
});
