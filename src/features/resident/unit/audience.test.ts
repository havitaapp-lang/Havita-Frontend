import { describe, expect, it } from 'vitest';
import { audienceMatchesUnit } from './audience';

const t10 = { propertyId: 'P', number: 'Torre 10-Piso 1-Apto 101', name: 'Apto 101', type: 'Propietario', status: 'OCCUPIED', structureName: 'Torre 10' };
const casa = { propertyId: 'C', number: 'C15', name: 'Casa 15', type: 'Propietario', status: 'OCCUPIED', structureName: null };

describe('audiencia por torre (Fase 2 / E3)', () => {
  it('"Torre 1" no alcanza a "Torre 10"; "Torre 10" sí, sin distinguir mayúsculas ni espacios', () => {
    expect(audienceMatchesUnit('Torre 1', t10)).toBe(false);
    expect(audienceMatchesUnit('  torre   10 ', t10)).toBe(true);
    expect(audienceMatchesUnit('Torre 2, Torre 10', t10)).toBe(true);
  });

  it('ruta exacta de una unidad: su unidad sí, la vecina con prefijo común no', () => {
    expect(audienceMatchesUnit('Torre 10 -> Piso 1 -> Apto 101', t10)).toBe(true);
    expect(audienceMatchesUnit('Torre 10 -> Piso 1 -> Apto 1010', t10)).toBe(false);
    expect(audienceMatchesUnit('Torre 1 -> Piso 1 -> Apto 101', t10)).toBe(false);
  });

  it('unidades sin torre: "Sin Torre" o su nombre exacto', () => {
    expect(audienceMatchesUnit('Sin Torre', casa)).toBe(true);
    expect(audienceMatchesUnit('Casa 15', casa)).toBe(true);
    expect(audienceMatchesUnit('Casa 1', casa)).toBe(false);
    expect(audienceMatchesUnit('Torre 1', null)).toBe(false);
  });
});
