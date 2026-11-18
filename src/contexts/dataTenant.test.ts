/**
 * Comunidad de DataContext (datos y SSE): sin subdominio ni `?tenant=` (PWA instalada) se usa la de la sesión, para que
 * la app reciba en tiempo real los cambios de visitas, paquetes y citofonía.
 */
import { describe, expect, it } from 'vitest';
import { resolveDataTenantId } from './dataTenant';

const A = '11111111-2222-4333-8444-555555555555';
const B = '66666666-7777-4888-8999-aaaaaaaaaaaa';

describe('resolveDataTenantId', () => {
  it('con comunidad resuelta por el host, se usa esa', () => {
    expect(resolveDataTenantId(A, { tenantId: B })).toBe(A);
  });

  it('sin comunidad del host (PWA instalada, dominio raíz), se usa la de la sesión', () => {
    expect(resolveDataTenantId(undefined, { tenantId: B })).toBe(B);
    expect(resolveDataTenantId('', { tenantId: B })).toBe(B);
  });

  it('sin sesión, o con un valor de sesión que no es un id válido, queda vacía (no se conecta)', () => {
    expect(resolveDataTenantId(undefined, null)).toBe('');
    expect(resolveDataTenantId(undefined, { tenantId: '' })).toBe('');
    expect(resolveDataTenantId(undefined, { tenantId: 'no-es-un-uuid' })).toBe('');
  });
});
