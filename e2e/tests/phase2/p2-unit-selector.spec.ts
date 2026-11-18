import { test, expect, request } from '@playwright/test';
import { credentials, API_BASE_URL, API_HOST_HEADER } from '../../support/env';
import { Api, chooseUnit, phase2Account, requirePhase2, switchUnit, uiLogin, uniqueTag, type Unit } from '../../helpers/phase2';

/**
 * Fase 2 / E1-E2 — selector de unidades con un propietario sintético de dos unidades (sandbox, SANDBOX_PHASE2=1):
 * elección obligatoria, SOS sin unidad, dos pestañas independientes y revocación parcial de una unidad.
 * Migrado del scratchpad de E2 (multi-unit.spec.ts).
 */
test.describe('Fase 2 · selector de unidades', () => {
  test.describe.configure({ mode: 'serial' });
  requirePhase2();

  let owner: Api;
  let admin: Api;
  let units: Unit[] = [];

  test.beforeAll(async () => {
    owner = await Api.login(phase2Account('owner')!);
    admin = await Api.login(credentials('admin')!);
    units = await owner.ok('GET', '/resident/me/properties');
    expect(units.length, 'el propietario sintético de la Fase 2 debe tener 2 unidades').toBe(2);
    await owner.ok('PATCH', '/resident/me/onboarding', {}); // cuenta sintética: sin asistente de bienvenida
  });

  test.afterAll(async () => {
    await owner?.dispose();
    await admin?.dispose();
  });

  const plates = async (unit: string): Promise<string[]> =>
    ((await owner.call('GET', '/resident/me/vehicles', undefined, { 'X-Property-Id': unit })).data as { plate: string }[]).map((v) => v.plate);

  async function addVehicle(page: import('@playwright/test').Page, plate: string) {
    // Navegación interna (sin recargar), para mantener la unidad activa de la pestaña.
    await page.getByRole('link', { name: 'Hogar' }).first().click();
    const vehicles = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Vehículos', exact: true }) });
    await vehicles.getByRole('button', { name: 'Añadir' }).click();
    await vehicles.getByPlaceholder('Placa (ej. ABC123) *').fill(plate);
    const created = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/resident/me/vehicles'));
    await vehicles.getByRole('button', { name: 'Guardar' }).click();
    expect((await created).ok()).toBe(true);
  }

  test('varias unidades sin selección (móvil): se pide elegir y el SOS no permite enviar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // en móvil el SOS está en la cabecera
    await uiLogin(page, phase2Account('owner')!);
    await expect(page.getByTestId('unit-chooser')).toBeVisible();
    await expect(page.getByText('Selecciona tu unidad').first()).toBeVisible();
    await page.getByRole('button', { name: /Botón de emergencia SOS/i }).first().click();
    await expect(page.getByTestId('sos-no-unit')).toBeVisible();
    await page.getByText('Emergencia médica').click();
    await expect(page.getByRole('button', { name: 'Enviar alerta' })).toBeDisabled();
  });

  test('dos pestañas: cada una opera sobre su unidad; el pánico sale de la unidad de esa pestaña', async ({ browser }) => {
    const [u1, u2] = units;
    const ctx = await browser.newContext();
    const tab1 = await ctx.newPage();
    await uiLogin(tab1, phase2Account('owner')!);
    await chooseUnit(tab1, u1.label);

    const tab2 = await ctx.newPage();
    await tab2.goto('/resident');
    await switchUnit(tab2, u2.label);

    const p1 = 'P2A' + Date.now().toString().slice(-4);
    await addVehicle(tab1, p1);
    const p2 = 'P2B' + Date.now().toString().slice(-4);
    await addVehicle(tab2, p2);
    expect(await plates(u1.propertyId)).toContain(p1);
    expect(await plates(u1.propertyId)).not.toContain(p2);
    expect(await plates(u2.propertyId)).toContain(p2);
    expect(await plates(u2.propertyId)).not.toContain(p1);

    await tab1.reload(); // la pestaña conserva su unidad (sessionStorage)
    await expect(tab1.getByTestId('unit-selector')).toContainText(u1.label);

    await tab2.getByRole('link', { name: 'Inicio' }).first().click();
    await tab2.getByRole('button', { name: /Botón de emergencia SOS/i }).last().click();
    await tab2.getByText('Emergencia médica').click();
    await expect(tab2.getByTestId('sos-unit')).toContainText(u2.label);
    await tab2.getByRole('button', { name: 'Enviar alerta' }).click();
    await expect(tab2.getByText('Alerta enviada con éxito')).toBeVisible();
    const alerts = (await owner.call('GET', '/realtime/panic/my')).data as { propertyId: string }[];
    expect(alerts[0].propertyId).toBe(u2.propertyId);

    for (const [plate, unit] of [[p1, u1.propertyId], [p2, u2.propertyId]] as const) {
      const list = (await owner.call('GET', '/resident/me/vehicles', undefined, { 'X-Property-Id': unit })).data as { id: string; plate: string }[];
      const v = list.find((x) => x.plate === plate);
      if (v) await owner.call('DELETE', `/resident/me/vehicles/${v.id}`, undefined, { 'X-Property-Id': unit });
    }
    await ctx.close();
  });

  test('revocación parcial: la pestaña de la unidad revocada avisa y sigue con otra, sin cerrar sesión', async ({ page }) => {
    // Unidad sintética temporal: se vincula al propietario y después se le revoca (las otras dos no se tocan).
    const number = uniqueTag('E2E-P2-REV');
    const unit = await admin.ok('POST', '/properties', { number, name: 'Apto ' + number, type: 'Apartamento' });
    const inv = await admin.ok('POST', `/properties/${unit.id}/resident-invitations`, { additionalPropertyIds: [] });
    const raw = /\/register\/invite\/([^/?#]+)/.exec(inv.link ?? JSON.stringify(inv))![1];
    const acct = phase2Account('owner')!;
    const anon = await request.newContext({ baseURL: API_BASE_URL, extraHTTPHeaders: API_HOST_HEADER });
    const reg = await anon.post(`/api/v1/public/resident-invitations/${raw}/register`, {
      data: { name: 'E2E Propietario F2', email: acct.email, documentType: 'CC', documentId: 'E2EP-REV', phone: '3000000002',
        password: acct.password, acceptTerms: true, acceptPrivacy: true },
    });
    expect(reg.ok(), `registro en la unidad temporal: HTTP ${reg.status()}`).toBeTruthy();
    await anon.dispose();
    const mine = (await owner.ok<Unit[]>('GET', '/resident/me/properties')).find((u) => u.propertyId === unit.id)!;

    await uiLogin(page, acct);
    await chooseUnit(page, mine.label);

    const people = await admin.ok<{ id: string; email?: string }[]>('GET', `/residents/by-property/${unit.id}`);
    const rel = people.find((p) => (p.email || '').toLowerCase() === acct.email.toLowerCase())!;
    await admin.ok('DELETE', `/residents/${rel.id}`);

    await page.goto('/resident/my-home');
    await expect(page.getByText(/ya no está disponible/)).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/resident/); // sigue dentro, sin volver al login
    await expect(page.getByTestId('unit-chooser').or(page.getByTestId('unit-selector')).first()).toBeVisible();
    expect((await owner.ok<Unit[]>('GET', '/resident/me/properties')).map((u) => u.propertyId).sort())
      .toEqual(units.map((u) => u.propertyId).sort());
  });
});
