export type PropertyStatus = 'OCCUPIED' | 'VACANT' | 'MAINTENANCE' | 'INACTIVE';
export type PropertyType = 'Apartamento' | 'Casa' | 'Local' | 'Parqueadero' | 'Depósito';

export interface VehicleInfo {
  plate: string;
  type: 'Carro' | 'Moto' | 'Bicicleta';
  brandModel?: string;
  parkingSpot?: string;
}

export interface PetInfo {
  name: string;
  type: 'Perro' | 'Gato' | 'Otro';
  breed?: string;
}

export interface ResidentOccupant {
  id?: string;
  name: string;
  type: 'Propietario' | 'Arrendatario' | 'Familiar';
  phone?: string;
  email?: string;
  isMainContact?: boolean;
}

export interface PropertyUnitExtended {
  id: string;
  tenantId: string;
  name: string; // e.g. 'Apto 2003', 'Casa 15'
  path: string; // e.g. 'Torre 7 -> Piso 20 -> Apto 2003'
  type: PropertyType;
  status: PropertyStatus;
  structureName: string; // e.g. 'Torre 7', 'Bloque A', 'Manzana 4'
  structureType: 'Torre' | 'Bloque' | 'Manzana' | 'Sector' | 'Etapa';
  level?: string | number; // e.g. 20 (piso), 'Planta 1'
  number: string; // e.g. '2003', '15'
  area?: number; // m²
  bedrooms?: number;
  bathrooms?: number;
  residentName?: string;
  occupants?: ResidentOccupant[];
  vehicles?: VehicleInfo[];
  pets?: PetInfo[];
  notes?: string;
  lastUpdated?: string;
}

export interface StructureSummary {
  name: string; // e.g. 'Torre 1'
  structureType: string; // 'Torre', 'Bloque', 'Manzana'
  levelsCount: number; // e.g. 20
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  maintenanceUnits: number;
  inactiveUnits: number;
  occupancyRate: number; // e.g. 91
}

export interface CommunityStructureStats {
  totalProperties: number;
  totalStructures: number;
  structureTypeLabel: string; // e.g. 'Torres', 'Bloques', 'Manzanas'
  occupiedCount: number;
  vacantCount: number;
  maintenanceCount: number;
  inactiveCount: number;
  occupancyRate: number;
}
