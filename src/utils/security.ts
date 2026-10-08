/**
 * Helpers de seguridad, control de acceso (RBAC), multi-tenancy y manejo defensivo de respuestas.
 */

import type { UserRole } from '../types';

/**
 * Matriz de permisos por rol.
 * NOTA: El backend debe obligatoriamente verificar la autorización en cada endpoint.
 */
export const PERMISSIONS = {
  MANAGE_RESIDENTS: ['COMMUNITY_ADMIN'],
  MANAGE_PROPERTIES: ['COMMUNITY_ADMIN'],
  MANAGE_COMMUNICATIONS: ['COMMUNITY_ADMIN'],
  MANAGE_SETTINGS: ['COMMUNITY_ADMIN'],
  RECEIVE_PACKAGES: ['COMMUNITY_ADMIN', 'SECURITY'],
  DELIVER_PACKAGES: ['COMMUNITY_ADMIN', 'SECURITY', 'RESIDENT'],
  MANAGE_VISITORS: ['COMMUNITY_ADMIN', 'SECURITY', 'RESIDENT'],
  RESOLVE_PQRS: ['COMMUNITY_ADMIN'],
  CREATE_PQRS: ['COMMUNITY_ADMIN', 'RESIDENT'],
  MANAGE_RESERVATIONS: ['COMMUNITY_ADMIN', 'RESIDENT'],
  DELETE_RECORDS: ['COMMUNITY_ADMIN'],
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export function hasRole(currentRole?: UserRole, allowedRoles: UserRole[] = []): boolean {
  if (!currentRole) return false;
  return allowedRoles.includes(currentRole);
}

export function hasPermission(currentRole?: UserRole, permission?: PermissionKey): boolean {
  if (!currentRole || !permission) return false;
  const allowed = PERMISSIONS[permission] as readonly UserRole[];
  return allowed ? allowed.includes(currentRole) : false;
}

export function canDelete(currentRole?: UserRole): boolean {
  return currentRole === 'COMMUNITY_ADMIN';
}

export function canEdit(currentRole?: UserRole): boolean {
  return currentRole === 'COMMUNITY_ADMIN' || currentRole === 'SECURITY';
}

/**
 * Valida si un tenantId está en la lista de tenants permitidos para el usuario.
 */
export function isAuthorizedTenant(tenantId: string, allowedTenantIds: string[]): boolean {
  if (!tenantId || !Array.isArray(allowedTenantIds)) return false;
  return allowedTenantIds.includes(tenantId);
}

/**
 * Mapeo de errores HTTP amigable para el usuario.
 * Previene mostrar stack traces o textos crudos al usuario final.
 */
export function mapApiError(status: number | string, fallbackMessage?: string): string {
  const statusCode = typeof status === 'string' ? parseInt(status, 10) : status;

  switch (statusCode) {
    case 400:
      return fallbackMessage || 'Revisa la información ingresada. Algunos datos no son válidos.';
    case 401:
      return 'Tu sesión ha expirado o no es válida. Por favor, inicia sesión nuevamente.';
    case 403:
      return 'No tienes permisos suficientes para realizar esta acción.';
    case 404:
      return 'No encontramos el recurso solicitado.';
    case 409:
      return fallbackMessage || 'Este registro ya existe o entra en conflicto con otro existente.';
    case 422:
      return fallbackMessage || 'Algunos datos ingresados no cumplen con las reglas requeridas.';
    case 429:
      return 'Has realizado demasiadas solicitudes en poco tiempo. Por favor espera unos momentos antes de reintentar.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Ocurrió un error inesperado en el servidor. Intenta nuevamente en unos minutos.';
    default:
      if (status === 'OFFLINE' || status === 'NETWORK_ERROR') {
        return 'Sin conexión a internet. Revisa tu red e intenta nuevamente.';
      }
      if (status === 'TIMEOUT') {
        return 'La solicitud tardó demasiado tiempo en responder. Intenta nuevamente.';
      }
      return fallbackMessage || 'Ocurrió un error al procesar tu solicitud.';
  }
}

/**
 * Defensive parser: Asegura que la data recibida sea un array válido.
 * Si la API devuelve null, undefined u otro tipo, retorna el fallback sin romper la UI.
 */
export function safeApiArray<T>(data: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }
  return fallback;
}

/**
 * Defensive parser: Asegura que la data sea un objeto no nulo.
 */
export function safeApiObject<T extends object>(data: unknown, fallback: T): T {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as T;
  }
  return fallback;
}
