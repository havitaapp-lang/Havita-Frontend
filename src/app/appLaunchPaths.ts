import type { Role } from '../types';

/** P8-B — ruta de arranque de la PWA instalada (`start_url` del manifiesto). Ver AppLaunch. */
export const APP_LAUNCH_PATH = '/app';

/** Portal de cada rol; mismo reparto que tras iniciar sesión (LoginPage). */
export function portalForRole(role: Role | string | undefined | null): string {
  if (role === 'SUPER_ADMIN') return '/super-admin';
  if (role === 'SECURITY') return '/security';
  if (role === 'RESIDENT') return '/resident';
  return '/admin';
}
