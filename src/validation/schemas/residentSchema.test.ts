import { describe, expect, it } from 'vitest';
import { residentSchema } from './residentSchema';
import { validateForm } from '../validators/formValidator';

const valid = {
  name: 'Ana Gómez',
  email: 'ana@example.test',
  phone: '3001234567',
  propertyId: 'b1d6f1d2-0000-4000-8000-000000000001',
  type: 'Propietario',
};

describe('residentSchema (TASK-007 #1)', () => {
  it('acepta un residente con una sola unidad', () => {
    expect(validateForm(residentSchema, valid).success).toBe(true);
  });

  it('sin unidad devuelve el error en español sobre el campo propertyId (antes: mensaje de Zod en inglés)', () => {
    const missing = validateForm(residentSchema, { ...valid, propertyId: undefined });
    expect(missing.success).toBe(false);
    expect(missing.errors.propertyId).toMatch(/propiedad o unidad/i);
    expect(missing.errors.propertyId).not.toMatch(/expected|invalid input/i);

    const empty = validateForm(residentSchema, { ...valid, propertyId: '' });
    expect(empty.errors.propertyId).toMatch(/propiedad o unidad/i);
  });

  it('el formulario antiguo (propertyIds) ya no valida', () => {
    const { propertyId: _ignored, ...rest } = valid;
    const legacy = validateForm(residentSchema, { ...rest, propertyIds: [valid.propertyId] });
    expect(legacy.success).toBe(false);
    expect(Object.keys(legacy.errors)).toContain('propertyId');
  });
});
