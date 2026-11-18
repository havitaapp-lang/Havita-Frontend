/**
 * Teléfono de contacto (Marketplace y demás formularios): filtro al escribir y validación con la misma regla que el
 * backend (7–20 caracteres: dígitos, espacios, guiones y + inicial).
 */
import { describe, expect, it } from 'vitest';
import { isValidPhone, sanitizePhoneInput } from './sanitizers';

describe('sanitizePhoneInput', () => {
  it('descarta letras y símbolos; conserva dígitos, espacios y guiones', () => {
    expect(sanitizePhoneInput('300abc4567')).toBe('3004567');
    expect(sanitizePhoneInput('llámame al 300 123-4567')).toBe('300 123-4567');
    expect(sanitizePhoneInput('300   123')).toBe('300 123'); // espacios repetidos: uno
    expect(sanitizePhoneInput('<script>300</script>')).toBe('300');
  });

  it('admite + solo al principio', () => {
    expect(sanitizePhoneInput('+57 300')).toBe('+57 300');
    expect(sanitizePhoneInput('57+300')).toBe('57300');
  });

  it('máximo 20 caracteres', () => {
    expect(sanitizePhoneInput('1'.repeat(30))).toHaveLength(20);
  });
});

describe('isValidPhone', () => {
  it.each(['3001234567', '+57 300 123 4567', '300-123-4567', '  3001234567  '])('válido: %s', (v) => {
    expect(isValidPhone(v)).toBe(true);
  });
  it.each(['', '123', '300abc4567', '+57 300 123 4567 ext 9', '1'.repeat(21), '57+3001234567'])('inválido: %s', (v) => {
    expect(isValidPhone(v)).toBe(false);
  });
});
