import { describe, expect, it } from 'vitest';
import { assemblyStatusAction } from './assemblyStatusAction';

describe('assemblyStatusAction (P5-D)', () => {
  it('una asamblea programada solo puede iniciarse', () => {
    expect(assemblyStatusAction('SCHEDULED')).toEqual({ nextStatus: 'IN_PROGRESS', label: 'Iniciar Sesión' });
  });

  it('una asamblea en curso solo puede finalizarse', () => {
    expect(assemblyStatusAction('IN_PROGRESS')).toEqual({ nextStatus: 'ENDED', label: 'Finalizar Sesión' });
  });

  it('una asamblea finalizada no ofrece ninguna acción (nunca se intenta reabrir)', () => {
    expect(assemblyStatusAction('ENDED')).toBeNull();
  });
});
