/**
 * Visitas del residente en tiempo real: la visita recién creada debe quedar con el UUID de la unidad
 * (la vista filtra por `activeUnitId`) aunque el SSE VISITOR_CREATED llegue antes que la respuesta del POST.
 */
import { describe, expect, it } from 'vitest';
import type { Visitor } from '../types';
import { mergeCreatedVisitors, sseVisitorPropertyKey } from './visitorSync';

const UNIT = '11111111-1111-4111-8111-111111111111';
const sse = { propertyId: UNIT, propertyNumber: '101', propertyName: 'Torre 1 - 101' };

describe('sseVisitorPropertyKey', () => {
  it('residente: usa el UUID de la unidad, no el número', () => {
    expect(sseVisitorPropertyKey(sse, true)).toBe(UNIT);
  });

  it('administración/portería: conserva el número de unidad', () => {
    expect(sseVisitorPropertyKey(sse, false)).toBe('101');
  });

  it('sin datos de unidad → undefined', () => {
    expect(sseVisitorPropertyKey({}, true)).toBeUndefined();
    expect(sseVisitorPropertyKey(null, false)).toBeUndefined();
  });
});

describe('mergeCreatedVisitors', () => {
  const saved = { id: 'v-1', propertyId: UNIT, status: 'APPROVED', name: 'Ana' } as Visitor;

  it('la respuesta del servidor sustituye la entrada que dejó el SSE', () => {
    const fromSse = { id: 'V-1', propertyId: 'wrong', status: 'APPROVED', name: 'Ana' } as Visitor;
    const other = { id: 'v-0', propertyId: UNIT, status: 'EXITED' } as Visitor;
    const out = mergeCreatedVisitors([fromSse, other], [saved]);
    expect(out).toHaveLength(2);
    expect(out[0].propertyId).toBe(UNIT);
    expect(out[1].id).toBe('v-0');
  });

  it('sin SSE previo, añade al principio', () => {
    const other = { id: 'v-0', propertyId: UNIT, status: 'EXITED' } as Visitor;
    const out = mergeCreatedVisitors([other], [saved]);
    expect(out.map(v => v.id)).toEqual(['v-1', 'v-0']);
  });
});
