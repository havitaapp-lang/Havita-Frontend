import { expect, request, test, type APIRequestContext, type Page } from '@playwright/test';
import { API_BASE_URL, API_HOST_HEADER, BASE_URL, credentials } from '../support/env';

/**
 * Fase 2 — utilidades de las pruebas de tests/phase2 (selector de unidades, asambleas, delegación, filtro por
 * estructura). Solo en el sandbox aislado (e2e/sandbox, base havita_e2e_sandbox) sembrado con SANDBOX_PHASE2=1: crean
 * asambleas, asistencias, votos y delegaciones con cuentas sintéticas. Las llamadas a la API pasan por el proxy de Vite
 * (mismo origen que la UI), así que no dependen de puertos fijos del backend. Los tokens viven solo en memoria.
 */

export interface Account {
  email: string;
  password: string;
}

const ACCOUNT_PREFIX = {
  owner: 'E2E_P2_OWNER', // propietario de E2E-SBX-102 y E2E-SBX-103
  lessee: 'E2E_LESSEE', // arrendatario de E2E-SBX-103
  coOwner1: 'E2E_COOWNER1', // copropietarios de E2E-SBX-104 (cierre E5 / D11)
  coOwner2: 'E2E_COOWNER2',
  lessee2: 'E2E_LESSEE2', // arrendatario de E2E-SBX-104
} as const;

export function phase2Account(kind: keyof typeof ACCOUNT_PREFIX): Account | null {
  const prefix = ACCOUNT_PREFIX[kind];
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  return email && password ? { email, password } : null;
}

/** Omite el bloque fuera del sandbox de la Fase 2 (nunca escribe contra la base local principal). */
export function requirePhase2(): void {
  test.skip(process.env.E2E_SANDBOX !== '1' || process.env.E2E_PHASE2 !== '1',
    'BLOCKED fuera del sandbox de la Fase 2: crea asambleas, votos y delegaciones (ver e2e/sandbox/README.md)');
  test.skip(!phase2Account('owner') || !phase2Account('lessee') || !credentials('admin'),
    'BLOCKED: faltan E2E_P2_OWNER_* / E2E_LESSEE_* / E2E_ADMIN_* (credenciales sintéticas del sandbox)');
}

/** Sesión de API de una cuenta sintética, con la comunidad resuelta por el Host (como el navegador). */
export class Api {
  private constructor(readonly ctx: APIRequestContext, readonly tenantId: string, readonly userId: string) {}

  static async login(account: Account): Promise<Api> {
    const anon = await request.newContext({ baseURL: API_BASE_URL, extraHTTPHeaders: API_HOST_HEADER });
    const tenant = (await (await anon.get('/api/v1/public/tenant-config')).json()).data;
    const res = await anon.post('/api/v1/auth/login', { data: { ...account, tenantId: tenant.id } });
    expect(res.ok(), `login HTTP ${res.status()}`).toBeTruthy();
    const { data } = await res.json();
    await anon.dispose();
    const ctx = await request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: { ...API_HOST_HEADER, Authorization: `Bearer ${data.accessToken}`, 'X-Tenant-ID': tenant.id },
    });
    return new Api(ctx, tenant.id, data.user.id);
  }

  async call(method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', path: string, body?: unknown, headers?: Record<string, string>) {
    const res = await this.ctx.fetch(`/api/v1${path}`, { method, data: body, headers });
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      /* sin cuerpo */
    }
    return { status: res.status(), code: json?.code as string | undefined, data: json?.data };
  }

  async ok<T = any>(method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', path: string, body?: unknown): Promise<T> {
    const r = await this.call(method, path, body);
    expect(r.status, `${method} ${path} → ${r.status} ${r.code ?? ''}`).toBeLessThan(300);
    return r.data as T;
  }

  dispose() {
    return this.ctx.dispose();
  }
}

export interface Unit {
  propertyId: string;
  number: string;
  label: string;
}

/** Asamblea sintética iniciada (en curso), con una pregunta abierta opcional. */
export async function liveAssembly(admin: Api, title: string, question?: string) {
  const asm = await admin.ok('POST', '/assemblies', {
    title, type: 'ORDINARIA', modality: 'VIRTUAL', assemblyDate: new Date().toISOString().slice(0, 10), startTime: '19:00:00',
  });
  await admin.ok('POST', `/assemblies/${asm.id}/start`, {});
  let poll: { id: string; options: { id: string }[] } | null = null;
  if (question) {
    poll = await admin.ok('POST', '/assemblies/polls', {
      assemblyId: asm.id, question, type: 'SINGLE_CHOICE', showResultsToResidents: true, options: ['Sí', 'No'],
    });
    await admin.ok('POST', `/assemblies/polls/${poll!.id}/open`, {});
  }
  return { id: asm.id as string, poll };
}

export async function scheduledAssembly(admin: Api, title: string) {
  const asm = await admin.ok('POST', '/assemblies', {
    title, type: 'ORDINARIA', modality: 'VIRTUAL', assemblyDate: new Date().toISOString().slice(0, 10), startTime: '19:00:00',
  });
  return { id: asm.id as string };
}

export async function uiLogin(page: Page, account: Account, landing: RegExp = /\/resident/) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByPlaceholder('ejemplo@micopropiedad.com').fill(account.email);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
  await expect(page).toHaveURL(landing, { timeout: 20_000 });
}

/** Elige la unidad en el selector inicial (varias unidades sin elección previa en esta pestaña). */
export async function chooseUnit(page: Page, label: string) {
  await expect(page.getByTestId('unit-chooser')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('unit-chooser-option').filter({ hasText: label }).click();
  await expect(page.getByTestId('unit-selector')).toContainText(label);
}

/** Cambia la unidad activa desde el selector de la cabecera. */
export async function switchUnit(page: Page, label: string) {
  await page.getByTestId('unit-selector').click();
  await page.getByTestId('unit-option').filter({ hasText: label }).click();
  await expect(page.getByTestId('unit-selector')).toContainText(label);
}

export function uniqueTag(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}
