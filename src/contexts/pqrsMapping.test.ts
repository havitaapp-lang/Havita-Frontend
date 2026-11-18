import { describe, expect, it } from 'vitest';
import { mapPqrsFromApi, pqrsApiPriority, pqrsFormPriority } from './pqrsMapping';

describe('pqrsMapping', () => {
  it('unifica las prioridades del residente (inglés) y de la administración (español)', () => {
    expect(['LOW', 'Baja', 'BAJA'].map(pqrsFormPriority)).toEqual(['BAJA', 'BAJA', 'BAJA']);
    expect(['MEDIUM', 'Media', undefined].map(pqrsFormPriority)).toEqual(['MEDIA', 'MEDIA', 'MEDIA']);
    expect(['HIGH', 'Alta'].map(pqrsFormPriority)).toEqual(['ALTA', 'ALTA']);
    expect(['URGENT', 'Urgente', 'Crítica'].map(pqrsFormPriority)).toEqual(['URGENTE', 'URGENTE', 'URGENTE']);
    expect(pqrsApiPriority('ALTA')).toBe('HIGH');
  });

  it('usa el título real, el solicitante y la etiqueta de la unidad; guarda los UUID aparte', () => {
    const m = mapPqrsFromApi({
      id: 'p1', tenantId: 't1', propertyId: 'uuid-101', propertyName: 'Torre 1 - 101', residentId: 'r1',
      residentName: 'Ana', title: 'Fuga', description: 'Detalle', status: 'RESOLVED', priority: 'HIGH',
      responseNotes: 'Listo', createdAt: '2026-11-17T10:00:00Z', updatedAt: '2026-11-17T11:00:00Z',
    });
    expect(m).toMatchObject({
      title: 'Fuga', propertyId: 'Torre 1 - 101', propertyUuid: 'uuid-101', residentId: 'r1', residentName: 'Ana',
      priority: 'Alta', status: 'RESOLVED', responseNotes: 'Listo', createdAt: '2026-11-17',
    });
  });
});
