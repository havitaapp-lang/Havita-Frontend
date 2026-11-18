import { expect, test } from '@playwright/test';
import { P6Api, liveAssembly, requirePhase6, uiLogin, unitId, urlFor, SUB_A } from '../../helpers/phase6';

/**
 * Fase 2 / P6 · escenario 24 — backend del sandbox arrancado con havita.assembly-proxies.enabled=FALSE (y el mismo
 * esquema V100–V106). Se ejecuta aparte (E2E_P6_FLAG_OFF=1) tras reiniciar el backend con la bandera apagada.
 */
test.beforeEach(() => {
  requirePhase6();
  test.skip(process.env.E2E_P6_FLAG_OFF !== '1', 'solo con el backend del sandbox arrancado con la bandera apagada');
});

test('24 · bandera apagada: rutas de poderes inexistentes, la interfaz lo indica y el voto tradicional funciona', async ({ page }) => {
  const admin = await P6Api.login('admin');
  const { assemblyId, poll } = await liveAssembly(admin, `Asamblea P6 sin poderes ${Date.now()}`);
  for (const path of [`/assemblies/${assemblyId}/proxies`, `/assemblies/${assemblyId}/proxies/mine`,
    `/assemblies/polls/${poll.id}/participations`]) {
    expect((await admin.call('GET', path)).status, path).toBe(404);
  }
  // Sin la bandera, /assemblies/proxy-settings no existe y cae en GET /assemblies/{id} con un id que no es UUID: 400.
  const settings = await admin.call('GET', '/assemblies/proxy-settings');
  expect([400, 404]).toContain(settings.status);
  expect(JSON.stringify(settings.data ?? {})).not.toMatch(/maxUnitsPerProxy|effectiveLimit/);
  // P7 (G4): el historial del limite tampoco existe sin la bandera.
  const history = await admin.call('GET', '/assemblies/proxy-settings/history');
  expect([400, 404]).toContain(history.status);
  expect(JSON.stringify(history.data ?? {})).not.toMatch(/newMaxUnits|previousMaxUnits/);
  expect((await admin.call('POST', `/assemblies/polls/${poll.id}/assisted-vote`, {})).status).toBe(404);
  // Voto tradicional (propietario) sin cambios.
  const owner = await P6Api.login('owner1');
  const unit = await unitId(admin, assemblyId, 'P6-101');
  expect((await owner.call('POST', `/assemblies/${assemblyId}/attendees/self-register`, { propertyId: unit })).status).toBe(201);
  expect((await owner.call('POST', `/assemblies/polls/${poll.id}/vote`, { propertyId: unit, optionIds: [poll.yes] })).status).toBe(200);
  // La interfaz (compilada con la bandera) muestra «no disponible» en vez de fallar.
  await uiLogin(page, 'admin');
  await page.goto(`${urlFor(SUB_A())}/admin/assemblies/${assemblyId}`);
  await page.getByRole('button', { name: 'Poderes y voto asistido' }).click();
  await expect(page.getByTestId('proxies-unavailable')).toContainText('no está disponible');
});
