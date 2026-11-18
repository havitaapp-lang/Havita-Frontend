import { describe, expect, it } from 'vitest';
import { propertiesService } from './propertiesService';
import type { PropertyUnit } from '../types';

const unit = (id: string, extra: Partial<PropertyUnit>): PropertyUnit =>
  ({ id, tenantId: 't', name: id, path: id, type: 'Apartamento', status: 'VACANT', ...extra }) as PropertyUnit;

const units = [
  unit('a', { structureId: 'S1', structureName: 'Torre 1' }),
  unit('b', { structureId: 'S1', structureName: 'Torre 1' }),
  unit('c', { structureId: 'S10', structureName: 'Torre 10' }),
  unit('casa-1', { structureId: null }),
  unit('casa-2', { structureId: null }),
];

describe('estructuras en la vista de unidades (Fase 2 / E4)', () => {
  it('cuenta estructuras reales por id: las casas sin estructura no son "torres"', () => {
    expect(propertiesService.calculateCommunityStats(units).totalStructures).toBe(2);
    expect(propertiesService.calculateCommunityStats([unit('x', { structureId: null })]).totalStructures).toBe(0);
  });

  it('el resumen agrupa las unidades sin estructura en "Sin estructura" (no una torre por unidad)', () => {
    const names = propertiesService.getStructuresSummary(units).map((s) => s.name).sort();
    expect(names).toEqual(['Sin estructura', 'Torre 1', 'Torre 10']);
  });
});
