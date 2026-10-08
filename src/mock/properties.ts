import type { PropertyUnit } from '../types';

const mockResidentsPool = [
  'Carlos Rodríguez', 'María Fernanda López', 'Sebastián Gómez', 'Valentina Ortiz',
  'Andrés Felipe Castro', 'Camila Morales', 'Mateo Henao', 'Daniela Jaramillo',
  'Julián Restrepo', 'Sofía Arango', 'Alejandro Vargas', 'Isabella Montoya',
  'Santiago Betancur', 'Mariana Quintero', 'Nicolás Echeverri', 'Laura Giraldo',
  'Esteban Osorio', 'Paula Salazar', 'David Rincón', 'Natalia Cardona'
];

export const generateMockProperties = (): PropertyUnit[] => {
  const result: PropertyUnit[] = [];

  // 1. Limonar (30 torres)
  let aptoGlobalIdx = 0;
  for (let t = 1; t <= 30; t++) {
    const towerName = 'Torre ' + t;
    const floorsCount = t <= 10 ? 4 : t <= 25 ? 4 : 3;
    const aptsPerFloor = 4;

    for (let f = 1; f <= floorsCount; f++) {
      for (let a = 1; a <= aptsPerFloor; a++) {
        aptoGlobalIdx++;
        if (aptoGlobalIdx > 428) break;

        const num = String(f) + (a < 10 ? '0' + a : String(a));
        const name = 'Apto ' + num;
        const path = towerName + ' -> Piso ' + f + ' -> ' + name;

        let status: PropertyUnit['status'] = 'OCCUPIED';
        if (aptoGlobalIdx % 19 === 0) status = 'MAINTENANCE';
        else if (aptoGlobalIdx % 11 === 0) status = 'VACANT';
        else if (aptoGlobalIdx % 87 === 0) status = 'INACTIVE';

        const residentName = status === 'OCCUPIED'
          ? mockResidentsPool[aptoGlobalIdx % mockResidentsPool.length]
          : undefined;

        result.push({
          id: 'prop-lim-' + t + '-' + f + '-' + a,
          tenantId: 'tenant-limonar',
          name,
          path,
          type: 'Apartamento',
          status,
          structureName: towerName,
          structureType: 'Torre',
          level: f,
          number: num,
          area: 72 + (f % 4) * 12,
          bedrooms: 2 + (f % 2),
          bathrooms: 2,
          residentName,
          vehiclesCount: status === 'OCCUPIED' ? (aptoGlobalIdx % 3 === 0 ? 2 : 1) : 0,
          petsCount: status === 'OCCUPIED' && aptoGlobalIdx % 4 === 0 ? 1 : 0
        });
      }
      if (aptoGlobalIdx > 428) break;
    }
  }

  // 2. Altos del Río (12 torres)
  let altosIdx = 0;
  for (let t = 1; t <= 12; t++) {
    const towerName = 'Torre ' + t;
    for (let f = 1; f <= 7; f++) {
      for (let a = 1; a <= 4; a++) {
        altosIdx++;
        if (altosIdx > 312) break;

        const num = f + '0' + a;
        const name = 'Apto ' + num;
        const path = towerName + ' -> Piso ' + f + ' -> ' + name;
        const status: PropertyUnit['status'] = altosIdx % 14 === 0 ? 'VACANT' : 'OCCUPIED';

        result.push({
          id: 'prop-alt-' + t + '-' + f + '-' + a,
          tenantId: 'tenant-altos-rio',
          name,
          path,
          type: 'Apartamento',
          status,
          structureName: towerName,
          structureType: 'Torre',
          level: f,
          number: num,
          area: 88,
          bedrooms: 3,
          bathrooms: 2,
          residentName: status === 'OCCUPIED' ? mockResidentsPool[(altosIdx + 3) % mockResidentsPool.length] : undefined,
          vehiclesCount: 1,
          petsCount: 0
        });
      }
      if (altosIdx > 312) break;
    }
  }

  // 3. Torres del Valle (8 bloques)
  const bloques = ['Bloque A', 'Bloque B', 'Bloque C', 'Bloque D', 'Bloque E', 'Bloque F', 'Bloque G', 'Bloque H'];
  bloques.forEach((bName, bIdx) => {
    for (let f = 1; f <= 5; f++) {
      for (let a = 1; a <= 4; a++) {
        const num = f + '0' + a;
        const name = 'Apto ' + num;
        const path = bName + ' -> Piso ' + f + ' -> ' + name;
        const isVacant = (bIdx + f + a) % 9 === 0;

        result.push({
          id: 'prop-tdv-' + bIdx + '-' + f + '-' + a,
          tenantId: 'tenant-torres-valle',
          name,
          path,
          type: 'Apartamento',
          status: isVacant ? 'VACANT' : 'OCCUPIED',
          structureName: bName,
          structureType: 'Bloque',
          level: f,
          number: num,
          area: 65,
          bedrooms: 2,
          bathrooms: 1,
          residentName: !isVacant ? mockResidentsPool[(bIdx * 3 + a) % mockResidentsPool.length] : undefined,
          vehiclesCount: 1,
          petsCount: 0
        });
      }
    }
  });

  // 4. Reserva Campestre del Sur (5 Manzanas)
  const manzanas = ['Manzana A', 'Manzana B', 'Manzana C', 'Manzana D', 'Manzana E'];
  manzanas.forEach((mName, mIdx) => {
    for (let c = 1; c <= 12; c++) {
      const name = 'Casa ' + c;
      const path = mName + ' -> ' + name;
      const isMaint = (mIdx + c) === 7;
      const isVacant = (mIdx + c) % 8 === 0;
      const status: PropertyUnit['status'] = isMaint ? 'MAINTENANCE' : isVacant ? 'VACANT' : 'OCCUPIED';

      result.push({
        id: 'prop-rds-' + mIdx + '-' + c,
        tenantId: 'tenant-reserva-sur',
        name,
        path,
        type: 'Casa',
        status,
        structureName: mName,
        structureType: 'Manzana',
        level: 1,
        number: String(c),
        area: 195,
        bedrooms: 4,
        bathrooms: 4,
        residentName: status === 'OCCUPIED' ? mockResidentsPool[(mIdx * 4 + c) % mockResidentsPool.length] : undefined,
        vehiclesCount: 2,
        petsCount: 1
      });
    }
  });

  // 5. La Arboleda (3 Etapas)
  ['Etapa 1', 'Etapa 2', 'Etapa 3'].forEach((eName, eIdx) => {
    for (let c = 1; c <= 20; c++) {
      const name = 'Casa ' + c;
      const path = eName + ' -> ' + name;
      const isVacant = c % 7 === 0;

      result.push({
        id: 'prop-arb-' + eIdx + '-' + c,
        tenantId: 'tenant-arboleda',
        name,
        path,
        type: 'Casa',
        status: isVacant ? 'VACANT' : 'OCCUPIED',
        structureName: eName,
        structureType: 'Etapa',
        level: 1,
        number: String(c),
        area: 120,
        bedrooms: 3,
        bathrooms: 3,
        residentName: !isVacant ? mockResidentsPool[(eIdx * 5 + c) % mockResidentsPool.length] : undefined,
        vehiclesCount: 1,
        petsCount: 0
      });
    }
  });

  return result;
};

export const properties: PropertyUnit[] = generateMockProperties();
