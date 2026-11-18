import { test, expect, asRole, requireWrites } from '../../fixtures/test';
import { ApiSession, tokenFromLink } from '../../helpers/api';
import { seedResidents } from '../../helpers/seed';
import type { Page } from '@playwright/test';

/**
 * SEC-8 contra el entorno local: transferir la titularidad y leer el historial de una unidad son operaciones de la
 * administracion. Solo usa unidades sinteticas del pool E2E con un propietario E2E- sembrado (nunca las unidades de
 * las cuentas reales), asi que ni una regresion tocaria datos preexistentes; la limpieza del pool revoca el enlace,
 * da de baja al propietario sintetico nuevo y deja la unidad libre.
 */

async function openPropertyDrawer(page: Page, propertyName: string): Promise<void> {
  await page.goto('/admin/properties');
  await page.getByPlaceholder('Buscar propiedad, torre o residente...').fill(propertyName);
  await page.getByRole('button', { name: new RegExp(`^${propertyName} \\(`) }).click();
  await expect(page.getByText('Residentes Registrados')).toBeVisible();
}

const syntheticEmail = (tag: string) => `${tag.toLowerCase().replace(/[^a-z0-9-]/g, '')}@example.test`;

test.describe('SEC-8 · Transferencia de propietario · roles no administrativos (API)', () => {
  test.beforeEach(() => requireWrites());

  test('residente y portería reciben 403 al transferir y al leer el historial; la titularidad no cambia', async ({ adminApi, cleanup }) => {
    const { tag, property, residents } = await seedResidents(adminApi, cleanup, 'TRF', ['Propietario']);
    for (const role of ['resident', 'security'] as const) {
      const api = await ApiSession.login(role);
      try {
        const res = await api.post(`/properties/${property.id}/transfer-owner`, {
          newOwnerName: `${tag} Bypass`,
          newOwnerEmail: syntheticEmail(`${tag}-bypass-${role}`),
          effectiveDate: new Date().toISOString(),
        });
        expect(res.status(), `${role}: transferir`).toBe(403);
        expect((await api.get(`/properties/${property.id}/history`)).status(), `${role}: historial`).toBe(403);
      } finally {
        await api.dispose();
      }
    }
    const owners = (await adminApi.residentsOfProperty(property.id)).filter((r) => r.status === 'ACTIVE' && r.type === 'Propietario');
    expect(owners.map((r) => r.id)).toEqual([residents[0].id]);
  });
});

test.describe('SEC-8 · Transferencia de propietario · administración (UI)', () => {
  asRole('admin');
  test.beforeEach(() => requireWrites());

  test('transfiere por correo desde el panel: el enlace queda ligado al destinatario y el historial lo refleja', async ({ page, adminApi, cleanup }) => {
    const { tag, property, residents } = await seedResidents(adminApi, cleanup, 'TRU', ['Propietario']);
    const previousOwner = residents[0];
    const recipient = syntheticEmail(`${tag}-nuevo`);

    await openPropertyDrawer(page, property.name);
    await page.getByRole('button', { name: 'Cambiar Propietario' }).click();
    await expect(page.getByRole('heading', { name: 'Transferir Propiedad' })).toBeVisible();
    await page.getByText('Nombre del nuevo Propietario *').locator('xpath=..').locator('input').fill(`${tag} Nuevo Propietario`);
    await expect(page.getByLabel('Email *')).toHaveAttribute('required', '');
    await page.getByLabel('Email *').fill(recipient);

    const transferred = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith(`/properties/${property.id}/transfer-owner`));
    await page.getByRole('button', { name: 'Confirmar Transferencia' }).click();
    const response = await transferred;
    expect(response.status()).toBe(200);
    await expect(page.getByRole('heading', { name: '¡Transferencia Exitosa!' })).toBeVisible();

    const link = (await response.json()).data.inviteLink as string;
    expect((await adminApi.get(`/public/resident-invitations/${tokenFromLink(link)}`)).status()).toBe(200);

    const after = await adminApi.residentsOfProperty(property.id);
    expect(after.find((r) => r.id === previousOwner.id)?.status).toBe('INACTIVE');
    const owners = after.filter((r) => r.status === 'ACTIVE' && r.type === 'Propietario');
    expect(owners).toHaveLength(1);
    expect(owners[0].email).toBe(recipient);

    // El historial (solo administración) muestra al propietario saliente.
    await openPropertyDrawer(page, property.name);
    await page.getByRole('button', { name: 'Historial', exact: true }).click();
    await expect(page.getByText(previousOwner.name).first()).toBeVisible();
  });
});
