import { randomUUID } from 'node:crypto';
import { request } from '@playwright/test';
import { test, expect, asRole, requireWrites } from '../../fixtures/test';
import { seedResidents } from '../../helpers/seed';
import { ApiSession } from '../../helpers/api';
import { ResidentsDirectoryPage } from '../../pages/ResidentsDirectoryPage';
import { API_BASE_URL, API_HOST_HEADER } from '../../support/env';

/**
 * Route protection (AdminLayout / ResidentLayout guards) and backend authorization
 * for the residents endpoints (@PreAuthorize on ResidentController / ResidentSelfController).
 */

test.describe('Residentes · permisos · usuario anónimo', () => {
  test('/admin/residents redirige a /login sin sesión', async ({ page }) => {
    await page.goto('/admin/residents');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Directorio de Residentes' })).toHaveCount(0);
  });

  test('/resident/my-home redirige a /login sin sesión', async ({ page }) => {
    await page.goto('/resident/my-home');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('API GET /residents rechaza peticiones sin token', async () => {
    const ctx = await request.newContext({ baseURL: API_BASE_URL, extraHTTPHeaders: API_HOST_HEADER });
    const res = await ctx.get('/api/v1/residents');
    expect([401, 403]).toContain(res.status());
    await ctx.dispose();
  });

  test('API /resident/me/people rechaza peticiones sin token', async () => {
    const ctx = await request.newContext({ baseURL: API_BASE_URL, extraHTTPHeaders: API_HOST_HEADER });
    const res = await ctx.get('/api/v1/resident/me/people');
    expect([401, 403]).toContain(res.status());
    await ctx.dispose();
  });
});

test.describe('Residentes · permisos · rol RESIDENT', () => {
  asRole('resident');

  test('no puede abrir el directorio de administración', async ({ page }) => {
    await page.goto('/admin/residents');
    await expect(page).not.toHaveURL(/\/admin\/residents/);
    await expect(page.getByRole('heading', { name: 'Directorio de Residentes' })).toHaveCount(0);
  });

  test('API: no puede listar, crear ni eliminar residentes del censo', async () => {
    const api = await ApiSession.login('resident');
    try {
      expect((await api.get('/residents')).status()).toBe(403);
      const create = await api.post('/residents', {
        propertyId: randomUUID(),
        name: 'E2E-FORBIDDEN',
        email: 'e2e-forbidden@example.test',
      });
      expect(create.status()).toBe(403);
      expect((await api.delete(`/residents/${randomUUID()}`)).status()).toBe(403);
      // Body must be valid: bean validation (400) runs before @PreAuthorize.
      const assign = await api.post(`/residents/users/${randomUUID()}/properties`, { propertyIds: [randomUUID()] });
      expect(assign.status()).toBe(403);
    } finally {
      await api.dispose();
    }
  });

  test('API: no puede leer residentes, vehículos ni ficha de una unidad ajena por su UUID', async ({ adminApi, cleanup }) => {
    requireWrites();
    const { property, residents } = await seedResidents(adminApi, cleanup, 'PRIV', ['Propietario']);
    const api = await ApiSession.login('resident');
    try {
      for (const path of [
        `/residents/${residents[0].id}`,
        `/residents/by-property/${property.id}`,
        `/residents/vehicles/by-property/${property.id}`,
        `/residents/pets/by-property/${property.id}`,
        `/properties/${property.id}`,
      ]) {
        expect((await api.get(path)).status(), path.replace(/[0-9a-f-]{36}/g, '<id>')).toBe(403);
      }
      // Its own unit stays readable.
      const own = await (await api.get('/resident/me/properties')).json();
      expect((await api.get(`/residents/by-property/${own.data[0].propertyId}`)).status()).toBe(200);
    } finally {
      await api.dispose();
    }
  });

  test('API: no puede generar invitaciones de administrador', async () => {
    const api = await ApiSession.login('resident');
    try {
      const res = await api.post(`/properties/${randomUUID()}/resident-invitations`, { additionalPropertyIds: [] });
      expect(res.status()).toBe(403);
    } finally {
      await api.dispose();
    }
  });
});

test.describe('Residentes · permisos · rol SECURITY', () => {
  asRole('security');

  test('no puede abrir el directorio de administración', async ({ page }) => {
    await page.goto('/admin/residents');
    await expect(page).not.toHaveURL(/\/admin\/residents/);
    await expect(page.getByRole('heading', { name: 'Directorio de Residentes' })).toHaveCount(0);
  });

  test('API: puede consultar el censo pero no modificarlo', async () => {
    const api = await ApiSession.login('security');
    try {
      expect((await api.get('/residents')).status()).toBe(200);
      expect((await api.delete(`/residents/${randomUUID()}`)).status()).toBe(403);
    } finally {
      await api.dispose();
    }
  });
});

test.describe('Residentes · permisos · rol COMMUNITY_ADMIN', () => {
  asRole('admin');

  test('accede al directorio desde el menú lateral', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('link', { name: 'Residentes' }).first().click();
    await expect(page).toHaveURL(/\/admin\/residents$/);
    await expect(new ResidentsDirectoryPage(page).heading()).toBeVisible();
  });

  test('acceso directo por URL a /admin/residents', async ({ page }) => {
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await expect(directory.newButton()).toBeVisible();
  });

  test('no puede abrir el portal del residente', async ({ page }) => {
    await page.goto('/resident/my-home');
    await expect(page).not.toHaveURL(/\/resident\/my-home/);
  });

  test('API: un residente inexistente responde 404', async ({ adminApi }) => {
    const res = await adminApi.getResident(randomUUID());
    expect(res.status()).toBe(404);
  });

  test('API: no se pueden leer residentes de otro tenant enviando un X-Tenant-ID ajeno', async ({ adminApi }) => {
    // The admin token belongs to the configured tenant; a forged tenant header must not grant access to another tenant.
    const res = await adminApi.ctx.get('/api/v1/residents', { headers: { 'X-Tenant-ID': randomUUID() } });
    if (res.ok()) {
      const body = await res.json();
      const foreign = (body.data?.content ?? []).filter((r: { tenantId: string }) => r.tenantId !== adminApi.tenantId);
      expect(foreign, 'residents of a tenant other than the token tenant were returned').toHaveLength(0);
    } else {
      expect([400, 401, 403, 404]).toContain(res.status());
    }
  });

  test('API: assignProperties no acepta un userId inexistente', async ({ adminApi }) => {
    const res = await adminApi.post(`/residents/users/${randomUUID()}/properties`, {
      propertyIds: [randomUUID()],
      type: 'Propietario',
      isMainContact: false,
    });
    expect(res.status()).toBe(404);
  });
});
