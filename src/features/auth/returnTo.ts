/**
 * P8-B — Conserva el destino de una llamada de citofonía a través del inicio de sesión.
 *
 * Al pulsar el aviso push se abre `/resident?intercomCall=<id>`. Si la sesión venció, el portal redirige a /login y,
 * tras iniciar sesión, se vuelve a ese enlace (la app comprueba en el servidor si la llamada sigue timbrando).
 *
 * Reglas de seguridad:
 * - Solo rutas RELATIVAS del mismo origen («/…», nunca «//…», esquemas ni barras invertidas): sin redirección abierta.
 * - Solo enlaces de llamada (`intercomCall`) y solo hacia el portal del rol que inicia sesión.
 * - Caduca a los 10 minutos y se consume una sola vez (sessionStorage: no sale de la pestaña).
 */

const KEY = 'havita:returnTo';
const MAX_AGE_MS = 10 * 60 * 1000;
const MAX_LENGTH = 512;

const ROLE_PREFIX: Record<string, string> = {
  RESIDENT: '/resident',
};

export function isSafeReturnPath(path: unknown): path is string {
  if (typeof path !== 'string' || path.length === 0 || path.length > MAX_LENGTH) return false;
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return false;
  for (let i = 0; i < path.length; i++) if (path.charCodeAt(i) < 0x20) return false; // caracteres de control
  try {
    const u = new URL(path, 'https://havita.invalid');
    return u.origin === 'https://havita.invalid';
  } catch {
    return false;
  }
}

/** Recuerda el destino si es un enlace de llamada válido. Devuelve si lo guardó. */
export function rememberReturnTo(path: string, now: number = Date.now()): boolean {
  if (!isSafeReturnPath(path) || !/[?&]intercomCall=/.test(path)) return false;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ path, at: now }));
    return true;
  } catch {
    return false;
  }
}

/** Devuelve (y borra) el destino guardado si sigue vigente y corresponde al portal del rol; si no, null. */
export function consumeReturnTo(role: string | null | undefined, now: number = Date.now()): string | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const { path, at } = JSON.parse(raw) as { path?: unknown; at?: unknown };
    const prefix = role ? ROLE_PREFIX[role] : undefined;
    if (!prefix || !isSafeReturnPath(path) || typeof at !== 'number' || now - at > MAX_AGE_MS || now < at) return null;
    if (path !== prefix && !path.startsWith(`${prefix}/`) && !path.startsWith(`${prefix}?`)) return null;
    return path;
  } catch {
    return null;
  }
}
