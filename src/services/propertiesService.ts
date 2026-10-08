import type { PropertyUnit } from '../types';
import type { 
  CommunityStructureStats, 
  StructureSummary, 
  PropertyUnitExtended 
} from '../types/property.types';

export const propertiesService = {
  calculateCommunityStats(properties: PropertyUnit[]): CommunityStructureStats {
    const totalProperties = properties.length;
    let occupiedCount = 0;
    let vacantCount = 0;
    let maintenanceCount = 0;
    let inactiveCount = 0;

    const structureSet = new Set<string>();
    let detectedType = 'Torres';

    properties.forEach((p) => {
      const sName = p.structureName || (p.path ? p.path.split('->')[0].trim() : 'Estructura 1');
      structureSet.add(sName);

      if (p.structureType === 'Bloque') detectedType = 'Bloques';
      else if (p.structureType === 'Manzana') detectedType = 'Manzanas';
      else if (p.structureType === 'Etapa') detectedType = 'Etapas';
      else if (p.structureType === 'Sector') detectedType = 'Sectores';

      if (p.status === 'OCCUPIED') occupiedCount++;
      else if (p.status === 'VACANT') vacantCount++;
      else if (p.status === 'MAINTENANCE') maintenanceCount++;
      else if (p.status === 'INACTIVE') inactiveCount++;
    });

    const occupancyRate = totalProperties > 0 ? Math.round((occupiedCount / totalProperties) * 100) : 0;

    return {
      totalProperties,
      totalStructures: structureSet.size,
      structureTypeLabel: detectedType,
      occupiedCount,
      vacantCount,
      maintenanceCount,
      inactiveCount,
      occupancyRate,
    };
  },

  getStructuresSummary(properties: PropertyUnit[]): StructureSummary[] {
    const map = new Map<string, {
      name: string;
      structureType: string;
      levels: Set<string | number>;
      total: number;
      occupied: number;
      vacant: number;
      maintenance: number;
      inactive: number;
    }>();

    properties.forEach((p) => {
      const sName = p.structureName || (p.path ? p.path.split('->')[0].trim() : 'Estructura General');
      const sType = p.structureType || 'Torre';
      const level = p.level ?? 1;

      if (!map.has(sName)) {
        map.set(sName, {
          name: sName,
          structureType: sType,
          levels: new Set(),
          total: 0,
          occupied: 0,
          vacant: 0,
          maintenance: 0,
          inactive: 0,
        });
      }

      const item = map.get(sName)!;
      item.total++;
      item.levels.add(level);

      if (p.status === 'OCCUPIED') item.occupied++;
      else if (p.status === 'VACANT') item.vacant++;
      else if (p.status === 'MAINTENANCE') item.maintenance++;
      else if (p.status === 'INACTIVE') item.inactive++;
    });

    const sorted = Array.from(map.values()).sort((a, b) => {
      const numA = parseInt(a.name.replace(/\D/g, ''), 10);
      const numB = parseInt(b.name.replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });

    return sorted.map((s) => ({
      name: s.name,
      structureType: s.structureType,
      levelsCount: s.levels.size || 1,
      totalUnits: s.total,
      occupiedUnits: s.occupied,
      vacantUnits: s.vacant,
      maintenanceUnits: s.maintenance,
      inactiveUnits: s.inactive,
      occupancyRate: s.total > 0 ? Math.round((s.occupied / s.total) * 100) : 0,
    }));
  },

  getLevelsForStructure(properties: PropertyUnit[], structureName: string): { level: string | number; units: PropertyUnit[] }[] {
    const matching = properties.filter((p) => {
      const sName = p.structureName || (p.path ? p.path.split('->')[0].trim() : '');
      return sName.toLowerCase() === structureName.toLowerCase();
    });

    const levelMap = new Map<string | number, PropertyUnit[]>();

    matching.forEach((p) => {
      const lvl = p.level ?? 1;
      if (!levelMap.has(lvl)) {
        levelMap.set(lvl, []);
      }
      levelMap.get(lvl)!.push(p);
    });

    const sortedLevels = Array.from(levelMap.entries()).sort((a, b) => {
      const numA = typeof a[0] === 'number' ? a[0] : parseInt(String(a[0]).replace(/\D/g, ''), 10);
      const numB = typeof b[0] === 'number' ? b[0] : parseInt(String(b[0]).replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
      return String(b[0]).localeCompare(String(a[0]), undefined, { numeric: true });
    });

    return sortedLevels.map(([level, units]) => ({
      level,
      units: units.sort((u1, u2) => u1.name.localeCompare(u2.name, undefined, { numeric: true })),
    }));
  },

  enrichPropertyDetail(p: PropertyUnit): PropertyUnitExtended {
    const sName = p.structureName || (p.path ? p.path.split('->')[0].trim() : 'Estructura 1');
    const sType = (p.structureType as any) || (sName.startsWith('Casa') ? 'Etapa' : 'Torre');
    const num = p.number || p.name.replace(/\D/g, '') || '101';

    const occupants = p.residentName
      ? [
          {
            name: p.residentName,
            type: 'Propietario' as const,
            phone: (p as any).residentPhone || 'Sin registrar',
            email: (p as any).residentEmail || 'Sin registrar',
            isMainContact: true,
          },
        ]
      : [];

    const vehicles = p.vehiclesCount && p.vehiclesCount > 0
      ? [
          {
            plate: 'ABC' + (Math.floor(Math.random() * 899) + 100),
            type: 'Carro' as const,
            brandModel: 'Mazda CX-30',
            parkingSpot: 'Sótano 1 - P' + (Math.floor(Math.random() * 80) + 1),
          },
        ]
      : [];

    const pets = p.petsCount && p.petsCount > 0
      ? [
          {
            name: 'Max',
            type: 'Perro' as const,
            breed: 'Golden Retriever',
          },
        ]
      : [];

    return {
      id: p.id,
      tenantId: p.tenantId,
      name: p.name,
      path: p.path,
      type: p.type as any,
      status: p.status,
      structureName: sName,
      structureType: sType,
      level: p.level ?? 1,
      number: num,
      area: p.area,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      residentName: p.residentName,
      occupants,
      vehicles,
      pets,
      lastUpdated: '14/09/2026',
    };
  },

  exportToCsv(properties: PropertyUnit[]): string {
    const headers = ['ID', 'Nomenclatura', 'Ubicacion', 'Tipo', 'Estado', 'Area_m2', 'Residente'];
    const rows = properties.map((p) => [
      '"' + p.id + '"',
      '"' + p.name + '"',
      '"' + (p.path || '') + '"',
      '"' + p.type + '"',
      '"' + p.status + '"',
      '"' + (p.area || 0) + '"',
      '"' + (p.residentName || 'Sin asignar') + '"',
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },
  
  async generateBulkProperties(payload: any): Promise<any> {
    const token = localStorage.getItem('havita_access_token');
    let tenantId = '';
    try {
      const savedTenant = localStorage.getItem('havita_tenant');
      if (savedTenant) {
        tenantId = JSON.parse(savedTenant).id || '';
      }
    } catch {}

    const res = await fetch('/api/v1/properties/bulk/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': tenantId
      },
      body: JSON.stringify(payload)
    });
    
    // The filter might return 401/403 with empty body, check response ok first
    if (!res.ok) {
        let msg = 'Error al generar propiedades';
        try {
            const errJson = await res.json();
            msg = errJson.message || msg;
        } catch {}
        throw new Error(msg);
    }
    return res.json();
  },

  async importPropertiesExcel(file: File): Promise<any> {
    const token = localStorage.getItem('havita_access_token');
    let tenantId = '';
    try {
      const savedTenant = localStorage.getItem('havita_tenant');
      if (savedTenant) {
        tenantId = JSON.parse(savedTenant).id || '';
      }
    } catch {}

    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch('/api/v1/properties/bulk/import', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': tenantId
      },
      body: formData
    });
    
    if (!res.ok) {
        let msg = 'Error al importar propiedades';
        try {
            const errJson = await res.json();
            msg = errJson.message || msg;
        } catch {}
        throw new Error(msg);
    }
    return res.json();
  }
};

