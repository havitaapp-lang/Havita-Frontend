import { test, expect, asRole, requireWrites } from '../../fixtures/test';
import { fixtureProperty, resetFixtureProperty, seedProperty, seedResidents } from '../../helpers/seed';
import { confirmSwal, cancelSwal, toast } from '../../helpers/swal';
import { tokenFromLink } from '../../helpers/api';
import type { Page } from '@playwright/test';

/**
 * Resident actions launched from the Properties module (/admin/properties):
 * PropertyDrawer → "Invitar Residente" (ResidentInvitationModal) and "Asignar Existente" (ResidentAssignModal),
 * plus the "Generar Enlace Multiple" bulk invitation (BulkInvitationModal).
 */

async function openPropertyDrawer(page: Page, propertyName: string): Promise<void> {
  await page.goto('/admin/properties');
  await page.getByPlaceholder('Buscar propiedad, torre o residente...').fill(propertyName);
  await page.getByRole('button', { name: new RegExp(`^${propertyName} \\(`) }).click();
  await expect(page.getByText('Residentes Registrados')).toBeVisible();
}

test.describe('Propiedades · invitación individual de residente', () => {
  asRole('admin');
  test.beforeEach(() => requireWrites());

  test('genera una invitación pendiente con QR y enlace, y la revoca', async ({ page, adminApi, cleanup }) => {
    const property = await fixtureProperty(adminApi, 'INV');
    cleanup(() => resetFixtureProperty(adminApi, property.id));
    await openPropertyDrawer(page, property.name);

    await page.getByRole('button', { name: 'Invitar Residente' }).first().click();
    await expect(page.getByRole('heading', { name: 'Invitar Residente' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Generar Enlace Seguro' })).toBeVisible();

    const generated = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().endsWith(`/properties/${property.id}/resident-invitations`),
    );
    await page.getByRole('button', { name: 'Generar Invitacion' }).click();
    expect((await generated).status()).toBeLessThan(300);
    await expect(toast(page, 'Invitacion generada con exito')).toBeVisible();
    await expect(page.getByText('Invitacion Pendiente')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copiar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'WhatsApp' })).toBeVisible();

    const pending = (await adminApi.listInvitations(property.id)).filter((i) => i.status === 'PENDING');
    expect(pending).toHaveLength(1);

    const revoked = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith('/revoke'));
    await page.getByRole('button', { name: 'Revocar esta invitacion' }).click();
    expect((await revoked).ok()).toBe(true);
    await expect(toast(page, 'Invitacion revocada')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generar Invitacion' })).toBeVisible();
    expect((await adminApi.listInvitations(property.id)).filter((i) => i.status === 'PENDING')).toHaveLength(0);
  });

  test('reabrir el modal muestra la invitación pendiente existente', async ({ page, adminApi, cleanup }) => {
    const property = await fixtureProperty(adminApi, 'INV');
    cleanup(() => resetFixtureProperty(adminApi, property.id));
    const original = await adminApi.generateInvitation(property.id);
    const originalToken = tokenFromLink(original.link!);
    await openPropertyDrawer(page, property.name);

    await page.getByRole('button', { name: 'Invitar Residente' }).first().click();
    await expect(page.getByText('Invitacion Pendiente')).toBeVisible();
    // The list endpoint does not return the one-time link (TASK-011): no empty QR, no copy of an empty link,
    // and opening the modal must not silently rotate a link the admin may already have shared.
    await expect(page.getByTestId('invitation-qr')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Copiar' })).toHaveCount(0);
    await expect(page.getByText(/el enlace solo se muestra al generarlo/)).toBeVisible();
    expect((await adminApi.get(`/public/resident-invitations/${originalToken}`)).status()).toBe(200);

    // Cancelling keeps the shared link valid.
    await page.getByRole('button', { name: 'Generar nuevo enlace' }).click();
    await cancelSwal(page, '¿Generar un nuevo enlace?');
    expect((await adminApi.get(`/public/resident-invitations/${originalToken}`)).status()).toBe(200);

    // Regenerating issues a new link for the same unit and invalidates the old one.
    await page.getByRole('button', { name: 'Generar nuevo enlace' }).click();
    const regenerated = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith(`/resident-invitations/${original.id}/regenerate`));
    await confirmSwal(page, '¿Generar un nuevo enlace?', 'Si, generar');
    expect((await regenerated).ok()).toBe(true);
    await expect(page.getByTestId('invitation-qr')).toBeVisible();

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: 'Copiar' }).click();
    await expect(toast(page, 'Enlace copiado')).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    const newToken = tokenFromLink(copied);
    expect(newToken).not.toBe(originalToken);

    expect((await adminApi.get(`/public/resident-invitations/${newToken}`)).status()).toBe(200);
    expect((await adminApi.get(`/public/resident-invitations/${originalToken}`)).status()).toBe(409);
    const invitations = await adminApi.listInvitations(property.id);
    expect(invitations.find((i) => i.id === original.id)?.status).toBe('REVOKED');
    const pending = invitations.filter((i) => i.status === 'PENDING');
    expect(pending).toHaveLength(1);
    expect(pending[0].propertyId).toBe(property.id);
  });

  test('una propiedad ocupada no permite generar invitación y se informa el motivo', async ({ page, adminApi, cleanup }) => {
    const { property } = await seedResidents(adminApi, cleanup, 'OCC', ['Propietario']);
    await openPropertyDrawer(page, property.name);

    await page.getByRole('button', { name: 'Invitar Residente' }).first().click();
    const attempt = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/resident-invitations'));
    await page.getByRole('button', { name: 'Generar Invitacion' }).click();
    expect((await attempt).status()).toBe(409);
    await expect(page.getByRole('dialog')).toContainText('El inmueble ya se encuentra ocupado');
  });
});

test.describe('Propiedades · asignar residente existente', () => {
  asRole('admin');
  test.beforeEach(() => requireWrites());

  test('busca un residente y lo vincula a la propiedad', async ({ page, adminApi, cleanup }) => {
    const { tag, residents } = await seedResidents(adminApi, cleanup, 'ASG', ['Propietario']);
    const target = await seedProperty(adminApi, cleanup, 'ASGT');
    cleanup(async () => {
      const { content } = await adminApi.findResidents(tag);
      for (const r of content) await adminApi.deleteResident(r.id);
    });
    await openPropertyDrawer(page, target.name);

    await page.getByRole('button', { name: 'Asignar Existente' }).first().click();
    await expect(page.getByRole('heading', { name: 'Asignar Residente Existente' })).toBeVisible();
    await page.getByPlaceholder(/Buscar residente por nombre/).fill(tag);
    const candidate = page.getByText(residents[0].name, { exact: true }).locator('xpath=ancestor::div[2]');
    await expect(candidate).toBeVisible();

    const assigned = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/properties') && r.url().includes('/residents/users/'));
    await candidate.getByRole('button', { name: 'Asignar' }).click();
    expect((await assigned).ok()).toBe(true);
    await expect(toast(page, 'Residente asignado a la propiedad')).toBeVisible();

    await expect
      .poll(async () => (await adminApi.findResidents(tag)).content.some((r) => r.propertyId === target.id))
      .toBe(true);
  });
});

test.describe('Propiedades · invitación múltiple', () => {
  asRole('admin');
  test.beforeEach(() => requireWrites());

  test('selecciona propiedades vacantes y genera un único enlace', async ({ page, adminApi, cleanup }) => {
    const a = await fixtureProperty(adminApi, 'BLK');
    const b = await fixtureProperty(adminApi, 'BLK');
    cleanup(() => resetFixtureProperty(adminApi, a.id));
    cleanup(() => resetFixtureProperty(adminApi, b.id));
    await page.goto('/admin/properties');
    await page.getByRole('button', { name: 'Generar Enlace Multiple' }).click();
    await expect(page.getByRole('heading', { name: 'Generar Invitación Múltiple' })).toBeVisible();

    const generate = page.getByRole('button', { name: /^Generar Invitación \(\d+\)$/ });
    await expect(generate).toBeDisabled();

    // Both pool units share the E2E-FIX-BLK prefix; narrow the vacant list to them and select the group.
    await page.getByPlaceholder('Buscar por torre o apartamento...').fill('E2E-FIX-BLK');
    await page.getByRole('button', { name: /Seleccionar todos/ }).first().click();
    await expect(generate).toHaveText(/Generar Invitación \(2\)/);

    const req = page.waitForRequest((r) => r.method() === 'POST' && r.url().includes('/resident-invitations'));
    await generate.click();
    const body = (await req).postDataJSON();
    expect(body.additionalPropertyIds).toHaveLength(1);
    await expect(page.getByRole('heading', { name: '¡Enlace Generado Exitosamente!' })).toBeVisible();
    await expect(page.getByText('2 propiedades')).toBeVisible();
  });
});
