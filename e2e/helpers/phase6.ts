import { execFileSync } from 'node:child_process';
import { expect, request, test, type APIRequestContext, type Page } from '@playwright/test';
import { assertLocalTarget, BASE_URL } from '../support/env';

/**
 * Fase 2 / P6 — utilidades de tests/phase6 (poderes, voto mediante poder, voto asistido, anulación, límites). SOLO en
 * el sandbox aislado de P6: PostgreSQL y emulador S3 en contenedores Docker propios, backend aislado con
 * havita.assembly-proxies.enabled=true y Vite con VITE_FEATURE_ASSEMBLY_PROXIES=true. Credenciales sintéticas por
 * entorno (nunca se imprimen). Las llamadas a la API pasan por el proxy de Vite, con la comunidad resuelta por el Host.
 */
export type P6Account = 'admin' | 'admin2' | 'owner1' | 'owner2' | 'owner3' | 'coowner1' | 'coowner2' | 'proxyacc' | 'owner6'
  | 'lessee' | 'household' | 'owner7' | 'adminb' | 'ownerb' | 'guard';

export function requirePhase6(): void {
  test.skip(process.env.E2E_SANDBOX !== '1' || process.env.E2E_PHASE6 !== '1',
    'BLOCKED fuera del sandbox de P6 (contenedores propios, backend aislado con la bandera de poderes)');
  test.skip(!process.env.P6_PASSWORD || !process.env.P6_SUB_A || !process.env.P6_SUB_B, 'BLOCKED: faltan las variables del sandbox P6');
}

export const SUB_A = () => process.env.P6_SUB_A!;
export const SUB_B = () => process.env.P6_SUB_B!;
const port = () => new URL(BASE_URL).port;
export const urlFor = (sub: string) => `http://${sub}.localhost:${port()}`;

export function account(k: P6Account) {
  const email = process.env[`P6_${k.toUpperCase()}_EMAIL`];
  if (!email) throw new Error(`falta la cuenta ${k}`);
  return { email, password: process.env.P6_PASSWORD! };
}

/** Sesión de API de una cuenta sintética en una comunidad (Host del subdominio, como el navegador). */
export class P6Api {
  private constructor(readonly ctx: APIRequestContext, readonly tenantId: string, readonly userId: string, readonly token: string) {}

  static async login(k: P6Account, sub = SUB_A()): Promise<P6Api> {
    assertLocalTarget(urlFor(sub));
    const host = { Host: `${sub}.localhost:${port()}` };
    const anon = await request.newContext({ baseURL: `http://127.0.0.1:${port()}`, extraHTTPHeaders: host });
    const tenant = (await (await anon.get('/api/v1/public/tenant-config')).json()).data;
    const res = await anon.post('/api/v1/auth/login', { data: { ...account(k), tenantId: tenant.id } });
    expect(res.ok(), `login ${k} HTTP ${res.status()}`).toBeTruthy();
    const { data } = await res.json();
    await anon.dispose();
    const ctx = await request.newContext({
      baseURL: `http://127.0.0.1:${port()}`,
      extraHTTPHeaders: { ...host, Authorization: `Bearer ${data.accessToken}`, 'X-Tenant-ID': tenant.id },
    });
    return new P6Api(ctx, tenant.id, data.user.id, data.accessToken);
  }

  /** Misma sesión enviada a otra comunidad (cabecera ajena): para probar el aislamiento. */
  async asTenant(sub: string, tenantId: string): Promise<APIRequestContext> {
    return request.newContext({
      baseURL: `http://127.0.0.1:${port()}`,
      extraHTTPHeaders: { Host: `${sub}.localhost:${port()}`, Authorization: `Bearer ${this.token}`, 'X-Tenant-ID': tenantId },
    });
  }

  async call(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown) {
    const res = await this.ctx.fetch(`/api/v1${path}`, { method, data: body });
    let json: any = null;
    try { json = await res.json(); } catch { /* sin cuerpo */ }
    return { status: res.status(), data: json?.data ?? json, code: json?.code as string | undefined };
  }

  async multipart(path: string, data: unknown, pdf = PDF) {
    const res = await this.ctx.fetch(`/api/v1${path}`, {
      method: 'POST',
      multipart: {
        data: { name: 'data.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) },
        document: { name: 'poder.pdf', mimeType: 'application/pdf', buffer: pdf },
      },
    });
    const json = await res.json().catch(() => null);
    return { status: res.status(), data: json?.data ?? json, code: json?.code as string | undefined };
  }
}

export const PDF = Buffer.from('%PDF-1.7\n% poder sintetico E2E P6\n%%EOF\n');

/** Asamblea EN CURSO con una pregunta SINGLE_CHOICE abierta. */
export async function liveAssembly(admin: P6Api, title: string) {
  const asm = await admin.call('POST', '/assemblies', { title, assemblyDate: new Date().toISOString().slice(0, 10), startTime: '18:00' });
  expect(asm.status, JSON.stringify(asm)).toBe(201);
  expect((await admin.call('POST', `/assemblies/${asm.data.id}/start`)).status).toBe(200);
  const poll = await openPoll(admin, asm.data.id, `¿Aprueba ${title}?`);
  return { assemblyId: asm.data.id as string, poll };
}

export async function openPoll(admin: P6Api, assemblyId: string, question: string) {
  const poll = await admin.call('POST', '/assemblies/polls', { assemblyId, question, type: 'SINGLE_CHOICE', options: ['Sí', 'No'] });
  expect([200, 201]).toContain(poll.status);
  expect((await admin.call('POST', `/assemblies/polls/${poll.data.id}/open`)).status).toBe(200);
  return { id: poll.data.id as string, yes: poll.data.options[0].id as string, no: poll.data.options[1].id as string };
}

export async function unitId(admin: P6Api, assemblyId: string, number: string): Promise<string> {
  const rights = await admin.call('GET', `/assemblies/${assemblyId}/voting-rights`);
  const u = (rights.data as Array<{ propertyId: string; propertyNumber: string }>).find((r) => r.propertyNumber === number);
  if (!u) throw new Error(`unidad ${number} no encontrada`);
  return u.propertyId;
}

/** Relación de propietario (id de residente) de una unidad, para registrar un poder en nombre del propietario. */
export async function ownerRelation(admin: P6Api, propertyId: string, email: string): Promise<string> {
  const r = await admin.call('GET', `/residents/by-property/${propertyId}`);
  const list = (Array.isArray(r.data) ? r.data : r.data?.content ?? []) as Array<{ id: string; email: string; type: string }>;
  const rel = list.find((x) => x.email === email && x.type === 'Propietario');
  if (!rel) throw new Error('relación de propietario no encontrada');
  return rel.id;
}

/**
 * Cambio de estado de una cuenta SOLO en el contenedor del sandbox (havita-p6-pg), para simular una baja
 * administrativa; nunca en otra base.
 */
export function sandboxSql(sql: string): string {
  // Contenedor, usuario y base sobreescribibles SOLO para el ensayo de activación (otro contenedor del sandbox).
  const c = process.env.P6_PG_CONTAINER ?? 'havita-p6-pg';
  const u = process.env.P6_PG_USER ?? 'havita_p6';
  const db = process.env.P6_PG_DB ?? 'havita_p6';
  if (!c.startsWith('havita-p6-')) throw new Error('sandboxSql solo opera sobre contenedores del sandbox P6');
  return execFileSync('docker', ['exec', '-i', c, 'psql', '-U', u, '-d', db, '-X', '-At', '-v',
    'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf-8' }).trim();
}

export async function uiLogin(page: Page, k: P6Account, sub = SUB_A(), landing: RegExp = /\/(resident|admin)/) {
  await page.goto(`${urlFor(sub)}/login`);
  await page.getByPlaceholder('ejemplo@micopropiedad.com').fill(account(k).email);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account(k).password);
  await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
  await expect(page).toHaveURL(landing, { timeout: 25_000 });
}

export async function confirmDialog(page: Page, confirm: string) {
  const dialog = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: confirm, exact: true }) });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: confirm, exact: true }).click();
  await expect(dialog).toBeHidden();
}

export async function promptDialog(page: Page, text: string, confirm: string) {
  const dialog = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: confirm, exact: true }) });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox').fill(text);
  await dialog.getByRole('button', { name: confirm, exact: true }).click();
  await expect(dialog).toBeHidden();
}
