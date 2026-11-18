const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Comunidad con la que DataContext carga los datos y abre la conexión en tiempo real (SSE).
 *
 * Antes solo se usaba la comunidad resuelta por el host (`currentTenant`). Sin subdominio ni `?tenant=`, como en la
 * PWA instalada (que arranca en /app con almacenamiento propio) o al entrar por el dominio raíz, quedaba vacía. Con la
 * sesión iniciada, la app no abría el SSE: las visitas no pasaban solas a «En curso» o «Finalizadas» y la citofonía no
 * recibía eventos. Ahora se usa la comunidad de la sesión (`user.tenantId`), la misma que `apiClient` ya envía en
 * `X-Tenant-ID`. El backend sigue validando la comunidad en cada petición y en el ticket del SSE.
 */
export function resolveDataTenantId(
  currentTenantId: string | null | undefined,
  user: { tenantId?: string | null } | null | undefined,
): string {
  if (currentTenantId) return currentTenantId;
  const fromSession = user?.tenantId ? String(user.tenantId) : '';
  return UUID_RE.test(fromSession) ? fromSession : '';
}
