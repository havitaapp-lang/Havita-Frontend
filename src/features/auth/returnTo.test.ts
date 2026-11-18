/** P8-B — destino de la llamada a través del inicio de sesión (sin redirección abierta). */
import { beforeEach, describe, expect, it } from 'vitest';
import { consumeReturnTo, isSafeReturnPath, rememberReturnTo } from './returnTo';

const CALL_PATH = '/resident?intercomCall=3f2a1c9e-1111-4222-8333-444455556666';

describe('returnTo', () => {
  beforeEach(() => sessionStorage.clear());

  it('recuerda un enlace de llamada y lo devuelve una sola vez al residente', () => {
    expect(rememberReturnTo(CALL_PATH, 1000)).toBe(true);
    expect(consumeReturnTo('RESIDENT', 2000)).toBe(CALL_PATH);
    expect(consumeReturnTo('RESIDENT', 2000)).toBeNull();
  });

  it('solo enlaces de llamada: otras rutas no se recuerdan', () => {
    expect(rememberReturnTo('/resident/packages')).toBe(false);
    expect(consumeReturnTo('RESIDENT')).toBeNull();
  });

  it('sin redirección abierta: rutas externas, protocolo relativo, barras invertidas y control rechazados', () => {
    for (const bad of ['https://evil.example/?intercomCall=x', '//evil.example/?intercomCall=x', '/\\evil.example?intercomCall=x',
      'javascript:alert(1)?intercomCall=x', '/resident?intercomCall=x\u0000', '']) {
      expect(isSafeReturnPath(bad) && rememberReturnTo(bad)).toBe(false);
    }
  });

  it('caduca a los 10 minutos y no sirve a otro rol', () => {
    rememberReturnTo(CALL_PATH, 0);
    expect(consumeReturnTo('RESIDENT', 10 * 60 * 1000 + 1)).toBeNull();
    rememberReturnTo(CALL_PATH, 0);
    expect(consumeReturnTo('SECURITY', 1)).toBeNull();
    // Un valor manipulado en sessionStorage que no empieza por el portal del rol se descarta.
    sessionStorage.setItem('havita:returnTo', JSON.stringify({ path: '/admin?intercomCall=x', at: 0 }));
    expect(consumeReturnTo('RESIDENT', 1)).toBeNull();
    sessionStorage.setItem('havita:returnTo', 'no-json');
    expect(consumeReturnTo('RESIDENT', 1)).toBeNull();
  });
});
