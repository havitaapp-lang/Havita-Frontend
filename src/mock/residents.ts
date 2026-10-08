import type { Resident } from '../types';

export const residents: Resident[] = [
  {
    id: 'res-1',
    userId: 'u3', // Connected to the mock Resident user
    tenantId: 'tenant-limonar',
    propertyId: 'prop-lim-2-3', // Apto 204
    name: 'Sebastián Residente',
    type: 'Propietario',
    phone: '+57 300 111 2222',
    email: 'sebas@ejemplo.com',
    status: 'ACTIVE'
  },
  {
    id: 'res-2',
    userId: '',
    tenantId: 'tenant-limonar',
    propertyId: 'prop-lim-1-0', // Apto 101
    name: 'María Gómez',
    type: 'Arrendatario',
    phone: '+57 310 222 3333',
    email: 'maria@ejemplo.com',
    status: 'ACTIVE'
  },
  {
    id: 'res-3',
    userId: '',
    tenantId: 'tenant-limonar',
    propertyId: 'prop-lim-1-1', 
    name: 'Carlos Rodríguez',
    type: 'Propietario',
    phone: '+57 315 333 4444',
    email: 'carlos@ejemplo.com',
    status: 'ACTIVE'
  }
];
