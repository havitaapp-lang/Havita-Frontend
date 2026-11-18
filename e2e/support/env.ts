import fs from 'node:fs';
import path from 'node:path';

/**
 * Loads e2e/.env.e2e (gitignored) once and exposes typed, non-secret-leaking accessors.
 * Credentials are never logged; only their presence is reported.
 */
const envFile = path.resolve(import.meta.dirname, '..', '.env.e2e');
if (fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

export type Role = 'admin' | 'resident' | 'security';

export const BASE_URL = process.env.E2E_BASE_URL || 'http://limonar.localhost:5173';

/**
 * Node (unlike Chromium) does not resolve *.localhost on Windows, so API calls connect to the loopback
 * address and pass the tenant host explicitly; Vite's proxy forwards it (changeOrigin: false) and the
 * backend resolves the tenant from it, exactly as for browser requests.
 */
export const API_BASE_URL = (() => {
  const url = new URL(BASE_URL);
  if (url.hostname.endsWith('.localhost')) url.hostname = '127.0.0.1';
  return url.origin;
})();
export const API_HOST_HEADER = { Host: new URL(BASE_URL).host };

const LOCAL_HOST =/^(localhost|127\.0\.0\.1|\[::1\]|[a-z0-9-]+\.localhost)$/i;

/** Hard stop: this suite writes synthetic data and must never run against a non-local environment. */
export function assertLocalTarget(url: string = BASE_URL): void {
  const { hostname } = new URL(url);
  if (!LOCAL_HOST.test(hostname)) {
    throw new Error(
      `E2E safety guard: refusing to run against "${hostname}". Only localhost / *.localhost targets are allowed.`,
    );
  }
}

const ROLE_VARS: Record<Role, { email: string; password: string }> = {
  admin: { email: 'E2E_ADMIN_EMAIL', password: 'E2E_ADMIN_PASSWORD' },
  resident: { email: 'E2E_RESIDENT_EMAIL', password: 'E2E_RESIDENT_PASSWORD' },
  security: { email: 'E2E_SECURITY_EMAIL', password: 'E2E_SECURITY_PASSWORD' },
};

export function credentials(role: Role): { email: string; password: string } | null {
  const vars = ROLE_VARS[role];
  const email = process.env[vars.email];
  const password = process.env[vars.password];
  return email && password ? { email, password } : null;
}

export const WRITES_ALLOWED = process.env.E2E_ALLOW_WRITES === '1';

/** Completing an invitation registration creates a user account that no API can delete; off unless explicitly enabled. */
export const USER_CREATION_ALLOWED = process.env.E2E_ALLOW_USER_CREATION === '1';

export const AUTH_DIR = path.resolve(import.meta.dirname, '..', '.auth');

export function authFile(role: Role): string {
  return path.join(AUTH_DIR, `${role}.json`);
}

/** Storage state path when the setup project produced one, otherwise undefined (fresh context). */
export function storageStateFor(role: Role): string | undefined {
  const file = authFile(role);
  return fs.existsSync(file) ? file : undefined;
}
