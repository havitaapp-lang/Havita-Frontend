import { expect, test } from '@playwright/test';
import {
  P6Api, PDF, SUB_B, confirmDialog, liveAssembly, openPoll, ownerRelation, promptDialog, requirePhase6, sandboxSql, uiLogin, unitId,
  urlFor, SUB_A,
} from '../../helpers/phase6';

/**
 * Fase 2 / P6 — flujos de extremo a extremo de poderes, asistencia por poder, voto mediante poder, voto asistido,
 * anulación, nueva emisión, documentos y límites, con frontend y backend REALES en el sandbox aislado de P6.
 * Serial: los pasos comparten una asamblea (como en una asamblea real).
 */
test.describe.configure({ mode: 'serial' });

let admin: P6Api;
let assemblyId: string;
let poll: { id: string; yes: string; no: string };
const ids: Record<string, string> = {};
// P7 (G3): el registro por la administracion exige la evidencia del poder firmado y la declaracion.
const ADMIN_EVIDENCE = { evidenceType: 'SIGNED_DOCUMENT_IN_PERSON', grantorConsentAttested: true };

test.beforeAll(async () => {
  requirePhase6();
  admin = await P6Api.login('admin');
  // Ejecucion hermetica: la comunidad empieza SIN limite (la prueba 21 lo fija en 2).
  expect((await admin.call('PUT', '/assemblies/proxy-settings', { maxUnitsPerProxy: null })).status).toBe(200);
  const live = await liveAssembly(admin, `Asamblea P6 ${Date.now()}`);
  assemblyId = live.assemblyId;
  poll = live.poll;
  for (const n of ['101', '102', '103', '104', '105', '106', '107']) ids[n] = await unitId(admin, assemblyId, `P6-${n}`);
});

test.beforeEach(() => requirePhase6());

test('1-2 · el propietario solicita un poder con documento desde «Poderes»', async ({ page }) => {
  await uiLogin(page, 'owner1');
  await page.goto(`${urlFor(SUB_A())}/resident/proxies`);
  await page.getByLabel('Asamblea').selectOption(assemblyId);
  await expect(page.getByTestId('resident-proxies')).toBeVisible();
  await page.getByRole('button', { name: 'Solicitar poder' }).click();
  await page.getByLabel('Nombre completo del apoderado').fill('Laura Externa');
  await page.getByLabel('Número de documento').fill('P6EXT101');
  await page.getByLabel(/Documento del poder/).setInputFiles({ name: 'poder.pdf', mimeType: 'application/pdf', buffer: PDF });
  await page.getByRole('button', { name: 'Enviar solicitud' }).click();
  const row = page.getByTestId('granted-proxy').filter({ hasText: 'Laura Externa' });
  await expect(row).toBeVisible();
  await expect(row.getByTestId('proxy-status')).toHaveAttribute('data-status', 'PENDING_REVIEW');
  ids.proxy101 = (await row.getAttribute('data-proxy-id'))!;
});

test('3-4 · la administración revisa el documento, ve los eventos y aprueba', async ({ page }) => {
  await uiLogin(page, 'admin');
  await page.goto(`${urlFor(SUB_A())}/admin/assemblies/${assemblyId}`);
  await page.getByRole('button', { name: 'Poderes y voto asistido' }).click();
  const row = page.locator(`[data-testid="admin-proxy-row"][data-proxy-id="${ids.proxy101}"]`);
  await expect(row.getByTestId('proxy-status')).toHaveAttribute('data-status', 'PENDING_REVIEW');
  const [download] = await Promise.all([page.waitForEvent('download'), row.getByRole('button', { name: 'Documento' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^poder-.*\.pdf$/);
  await row.getByRole('button', { name: 'Aprobar' }).click();
  await confirmDialog(page, 'Sí, aprobar');
  await expect(row.getByTestId('proxy-status')).toHaveAttribute('data-status', 'APPROVED');
  await row.getByRole('button', { name: 'Eventos' }).click();
  await expect(page.getByTestId('proxy-events')).toContainText('PROXY_APPROVED');
  await expect(page.getByTestId('proxy-events')).toContainText('PROXY_REQUESTED');
});

test('5 · rechazar con motivo; el propietario ve el motivo y no puede revocar un rechazado', async ({ page, browser }) => {
  const owner2 = await P6Api.login('owner2');
  const r = await owner2.multipart(`/assemblies/${assemblyId}/proxies`, { propertyId: ids['102'], proxyFullName: 'Rechazable',
    proxyDocumentType: 'CC', proxyDocumentNumber: 'P6REJ102' });
  expect(r.status).toBe(201);
  await uiLogin(page, 'admin');
  await page.goto(`${urlFor(SUB_A())}/admin/assemblies/${assemblyId}`);
  await page.getByRole('button', { name: 'Poderes y voto asistido' }).click();
  const row = page.locator(`[data-testid="admin-proxy-row"][data-proxy-id="${r.data.id}"]`);
  await row.getByRole('button', { name: 'Rechazar' }).click();
  await promptDialog(page, 'Documento ilegible', 'Rechazar');
  await expect(row.getByTestId('proxy-status')).toHaveAttribute('data-status', 'REJECTED');
  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  await uiLogin(p2, 'owner2');
  await p2.goto(`${urlFor(SUB_A())}/resident/proxies`);
  await p2.getByLabel('Asamblea').selectOption(assemblyId);
  const mine = p2.locator(`[data-testid="granted-proxy"][data-proxy-id="${r.data.id}"]`);
  await expect(mine).toContainText('Motivo del rechazo: Documento ilegible');
  await expect(mine.getByRole('button', { name: /Revocar/ })).toHaveCount(0);
  await ctx.close();
});

test('6 · el otorgante revoca su poder antes de usarse', async ({ page }) => {
  const owner7 = await P6Api.login('owner7');
  const r = await owner7.multipart(`/assemblies/${assemblyId}/proxies`, { propertyId: ids['107'], proxyFullName: 'Revocable',
    proxyDocumentType: 'CC', proxyDocumentNumber: 'P6REV107' });
  expect(r.status).toBe(201);
  await uiLogin(page, 'owner7');
  await page.goto(`${urlFor(SUB_A())}/resident/proxies`);
  await page.getByLabel('Asamblea').selectOption(assemblyId);
  const row = page.locator(`[data-testid="granted-proxy"][data-proxy-id="${r.data.id}"]`);
  await row.getByRole('button', { name: /Revocar/ }).click();
  await confirmDialog(page, 'Sí, revocar');
  await expect(row.getByTestId('proxy-status')).toHaveAttribute('data-status', 'REVOKED');
  ids.revoked = r.data.id;
});

test('8, 11 · asistencia presencial del apoderado externo y voto asistido con verificación y comprobante', async ({ page }) => {
  await uiLogin(page, 'admin');
  await page.goto(`${urlFor(SUB_A())}/admin/assemblies/${assemblyId}`);
  await page.getByRole('button', { name: 'Poderes y voto asistido' }).click();
  const row = page.locator(`[data-testid="admin-proxy-row"][data-proxy-id="${ids.proxy101}"]`);
  await row.getByRole('button', { name: 'Registrar asistencia' }).click();
  await row.getByLabel('Número del documento presentado').fill('P6EXT101');
  await row.getByRole('button', { name: 'Confirmar asistencia' }).click();
  await expect(row.getByTestId('proxy-status')).toHaveAttribute('data-status', 'USED');

  await page.getByLabel('Poder utilizado (apoderado externo)').selectOption(ids.proxy101);
  await page.getByRole('region', { name: 'Voto asistido' }).getByLabel('Número del documento presentado').fill('P6EXT101');
  await page.getByLabel(/Verifiqué en persona/).check();
  await page.getByLabel(/expresó personalmente/).check();
  await page.getByRole('region', { name: 'Voto asistido' }).getByLabel('Sí', { exact: true }).check();
  await page.getByRole('button', { name: 'Registrar voto asistido' }).click();
  await confirmDialog(page, 'Sí, registrar voto');
  await expect(page.getByTestId('assisted-receipt')).toContainText('Voto asistido registrado');
  await expect(page.getByTestId('history-entry')).toHaveCount(1);
});

test('12-14, 22 · anular el voto asistido (motivo), nueva emisión y resultados sin el anulado; historial completo', async ({ page }) => {
  await uiLogin(page, 'admin');
  await page.goto(`${urlFor(SUB_A())}/admin/assemblies/${assemblyId}`);
  await page.getByRole('button', { name: 'Poderes y voto asistido' }).click();
  await page.getByRole('button', { name: 'Anular voto asistido' }).click();
  await promptDialog(page, 'Error de digitación', 'Anular voto');
  await expect(page.getByTestId('history-entry').first()).toHaveAttribute('data-status', 'VOIDED');
  let res = await admin.call('GET', `/assemblies/polls/${poll.id}`);
  expect(res.data.totalVotes).toBe(0);

  await page.getByLabel('Poder utilizado (apoderado externo)').selectOption(ids.proxy101);
  await page.getByRole('region', { name: 'Voto asistido' }).getByLabel('Número del documento presentado').fill('P6EXT101');
  await page.getByLabel(/Verifiqué en persona/).check();
  await page.getByLabel(/expresó personalmente/).check();
  await page.getByRole('region', { name: 'Voto asistido' }).getByLabel('No', { exact: true }).check();
  await page.getByRole('button', { name: 'Registrar voto asistido' }).click();
  await confirmDialog(page, 'Sí, registrar voto');
  await expect(page.getByTestId('assisted-receipt')).toContainText('Nueva emisión registrada');
  const entries = page.getByTestId('history-entry');
  await expect(entries).toHaveCount(2);
  await expect(entries.nth(0)).toHaveAttribute('data-status', 'VOIDED');
  await expect(entries.nth(0)).toContainText('Motivo: Error de digitación');
  await expect(entries.nth(1)).toHaveAttribute('data-status', 'VALID');
  await expect(entries.nth(1)).toContainText('Nueva emisión');
  res = await admin.call('GET', `/assemblies/polls/${poll.id}`);
  expect(res.data.totalVotes).toBe(1);
  expect(res.data.options.find((o: { id: string }) => o.id === poll.no).votesCount).toBe(1);
  expect(res.data.options.find((o: { id: string }) => o.id === poll.yes).votesCount).toBe(0);
});

test('7, 9-10 · apoderado con cuenta: asistencia propia y voto por dos unidades representadas', async ({ page }) => {
  const proxyacc = await P6Api.login('proxyacc');
  for (const [unit, grantor] of [['102', 'owner2'], ['103', 'owner3']] as const) {
    const rel = await ownerRelation(admin, ids[unit], process.env[`P6_${grantor.toUpperCase()}_EMAIL`]!);
    const r = await admin.multipart(`/assemblies/${assemblyId}/proxies/admin`, { propertyId: ids[unit], grantorResidentId: rel,
      proxyUserId: proxyacc.userId, proxyFullName: 'Apoderado Con Cuenta', proxyDocumentType: 'CC', proxyDocumentNumber: 'P6ACC', ...ADMIN_EVIDENCE });
    expect(r.status, JSON.stringify(r)).toBe(201);
    expect((await admin.call('POST', `/assemblies/${assemblyId}/proxies/${r.data.id}/approve`)).status).toBe(200);
    ids[`acc${unit}`] = r.data.id;
  }
  await uiLogin(page, 'proxyacc');
  await page.goto(`${urlFor(SUB_A())}/resident/proxies`);
  await page.getByLabel('Asamblea').selectOption(assemblyId);
  for (const unit of ['102', '103']) {
    const row = page.locator(`[data-testid="represented-proxy"][data-proxy-id="${ids[`acc${unit}`]}"]`);
    await expect(row).toContainText(`Unidad P6-${unit}`);
    await row.getByRole('button', { name: 'Registrar mi asistencia' }).click();
    await confirmDialog(page, 'Sí, registrar');
    await expect(row.getByTestId('proxy-status')).toHaveAttribute('data-status', 'USED');
    await row.getByLabel('Sí', { exact: true }).check();
    await row.getByRole('button', { name: `Votar por la unidad P6-${unit}` }).click();
    await confirmDialog(page, 'Sí, votar');
    await expect(row.getByTestId('proxy-vote-done')).toContainText(`P6-${unit}`);
  }
  // 15 · voto duplicado por la misma unidad: el backend lo rechaza.
  const dup = await proxyacc.call('POST', `/assemblies/polls/${poll.id}/proxy-vote`, { proxyId: ids.acc102, optionIds: [poll.no] });
  expect(dup.status).toBe(409);
  expect(dup.code).toBe('PROPERTY_ALREADY_VOTED');
});

test('16-17 · poder inválido (aprobado sin asistencia, revocado o ajeno) y pregunta cerrada: rechazados', async () => {
  const proxyacc = await P6Api.login('proxyacc');
  const rel = await ownerRelation(admin, ids['104'], process.env.P6_COOWNER1_EMAIL!);
  const r = await admin.multipart(`/assemblies/${assemblyId}/proxies/admin`, { propertyId: ids['104'], grantorResidentId: rel,
    proxyUserId: proxyacc.userId, proxyFullName: 'Sin Asistencia', proxyDocumentType: 'CC', proxyDocumentNumber: 'P6ACC', ...ADMIN_EVIDENCE });
  expect(r.status).toBe(201);
  expect((await admin.call('POST', `/assemblies/${assemblyId}/proxies/${r.data.id}/approve`)).status).toBe(200);
  const noAttendance = await proxyacc.call('POST', `/assemblies/polls/${poll.id}/proxy-vote`, { proxyId: r.data.id, optionIds: [poll.yes] });
  expect(noAttendance.status).toBe(409);
  expect(noAttendance.code).toBe('PROPERTY_NOT_REGISTERED_IN_ASSEMBLY');
  const revoked = await proxyacc.call('POST', `/assemblies/polls/${poll.id}/proxy-vote`, { proxyId: ids.revoked, optionIds: [poll.yes] });
  expect(revoked.status).toBe(404); // no es su poder: «no existe» para él
  const closed = await openPoll(admin, assemblyId, '¿Pregunta cerrada?');
  expect((await admin.call('POST', `/assemblies/polls/${closed.id}/close`)).status).toBe(200);
  const late = await proxyacc.call('POST', `/assemblies/polls/${closed.id}/proxy-vote`, { proxyId: ids.acc102, optionIds: [closed.yes] });
  expect(late.status).toBe(409);
  expect(late.code).toBe('POLL_NOT_LIVE');
});

test('18, 20 · otra comunidad y documento ajeno: sin acceso ni datos', async ({ page }) => {
  const adminB = await P6Api.login('adminb', SUB_B());
  // Listado de poderes de una asamblea ajena: 200 y VACÍO (contrato de P1: no revela ni datos ni si la asamblea existe).
  const foreignList = await adminB.call('GET', `/assemblies/${assemblyId}/proxies`);
  expect(foreignList.status).toBe(200);
  expect(foreignList.data).toEqual([]);
  expect((await adminB.call('GET', `/assemblies/${assemblyId}/proxies/${ids.proxy101}/events`)).status).toBe(404);
  expect((await adminB.call('GET', `/assemblies/polls/${poll.id}/participations`)).status).toBe(404);
  const cross = await adminB.asTenant(SUB_A(), admin.tenantId);
  expect([401, 403]).toContain((await cross.get(`/api/v1/assemblies/${assemblyId}/proxies`)).status());
  await cross.dispose();
  const owner2 = await P6Api.login('owner2');
  expect((await owner2.call('GET', `/assemblies/${assemblyId}/proxies/${ids.proxy101}/document`)).status).toBe(404);
  const household = await P6Api.login('household');
  expect((await household.call('GET', `/assemblies/${assemblyId}/proxies/mine`)).data).toEqual([]);
  // La UI del residente sin representación no ofrece solicitar poderes.
  await uiLogin(page, 'household');
  await page.goto(`${urlFor(SUB_A())}/resident/proxies`);
  await page.getByLabel('Asamblea').selectOption(assemblyId);
  await expect(page.getByText('Solo un propietario activo de la unidad puede otorgar un poder.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Solicitar poder' })).toHaveCount(0);
});

test('19 · administrador desactivado: su sesión deja de servir', async ({ page }) => {
  const admin2 = await P6Api.login('admin2');
  expect((await admin2.call('GET', `/assemblies/${assemblyId}/proxies`)).status).toBe(200);
  sandboxSql(`update memberships set status = 'INACTIVE' where user_id = '${admin2.userId}'`);
  try {
    expect([401, 403]).toContain((await admin2.call('GET', `/assemblies/${assemblyId}/proxies`)).status);
    expect([401, 403]).toContain((await admin2.call('POST', `/assemblies/polls/${poll.id}/assisted-vote`, {
      proxyId: ids.proxy101, documentType: 'CC', documentNumber: 'P6EXT101', expressedByProxyConfirmed: true, optionIds: [poll.yes],
    })).status);
    await page.goto(`${urlFor(SUB_A())}/login`);
    await page.getByPlaceholder('ejemplo@micopropiedad.com').fill(process.env.P6_ADMIN2_EMAIL!);
    await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(process.env.P6_PASSWORD!);
    await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
    await expect(page).not.toHaveURL(/\/admin/, { timeout: 8_000 });
  } finally {
    sandboxSql(`update memberships set status = 'ACTIVE' where user_id = '${admin2.userId}'`);
  }
});

test('21 · límite por comunidad desde la interfaz, sin afectar a la otra comunidad', async ({ page }) => {
  await uiLogin(page, 'admin');
  await page.goto(`${urlFor(SUB_A())}/admin/assemblies/${assemblyId}`);
  await page.getByRole('button', { name: 'Poderes y voto asistido' }).click();
  await expect(page.getByTestId('proxy-limit-current')).toContainText('Sin límite · Configurado para esta comunidad');
  await page.getByLabel(/Unidades por apoderado/).fill('2');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await confirmDialog(page, 'Sí, cambiar');
  await expect(page.getByTestId('proxy-limit-current')).toContainText('2 unidad(es) por apoderado · Configurado para esta comunidad');
  const adminB = await P6Api.login('adminb', SUB_B());
  expect((await adminB.call('GET', '/assemblies/proxy-settings')).data.configured).toBe(false);
  // Con límite 2, el apoderado con cuenta (ya con 3 poderes aprobados o utilizados, que NO se tocan) no recibe otro.
  const proxyacc = await P6Api.login('proxyacc');
  const rel = await ownerRelation(admin, ids['107'], process.env.P6_OWNER7_EMAIL!);
  const extra = await admin.multipart(`/assemblies/${assemblyId}/proxies/admin`, { propertyId: ids['107'], grantorResidentId: rel,
    proxyUserId: proxyacc.userId, proxyFullName: 'Apoderado Con Cuenta', proxyDocumentType: 'CC', proxyDocumentNumber: 'P6ACC', ...ADMIN_EVIDENCE });
  expect(extra.status).toBe(201);
  const over = await admin.call('POST', `/assemblies/${assemblyId}/proxies/${extra.data.id}/approve`);
  expect(over.status).toBe(409);
  expect(over.code).toBe('PROXY_REPRESENTATION_LIMIT_REACHED');
  const list = (await admin.call('GET', `/assemblies/${assemblyId}/proxies`)).data as Array<{ id: string; status: string }>;
  expect(list.find((p) => p.id === ids.acc102)!.status).toBe('USED');
});

test('roles · copropietario y arrendatario delegado votan por la vía directa (participación con su título)', async () => {
  for (const [k, unit] of [['coowner2', '104'], ['lessee', '106']] as const) {
    const api = await P6Api.login(k);
    if (k === 'coowner2') {
      // La unidad 104 tiene un poder aprobado (prueba 16): se revoca para que represente el copropietario.
      expect((await admin.call('POST', `/assemblies/${assemblyId}/proxies/${(await admin.call('GET', `/assemblies/${assemblyId}/proxies`))
        .data.find((p: { propertyId: string; status: string }) => p.propertyId === ids['104'] && p.status === 'APPROVED').id}/revoke`, {})).status).toBe(200);
    }
    expect((await api.call('POST', `/assemblies/${assemblyId}/attendees/self-register`, { propertyId: ids[unit] })).status).toBe(201);
    expect((await api.call('POST', `/assemblies/polls/${poll.id}/vote`, { propertyId: ids[unit], optionIds: [poll.yes] })).status).toBe(200);
  }
  const history = await admin.call('GET', `/assemblies/polls/${poll.id}/participations`);
  const types = (history.data as Array<{ propertyId: string; representationType: string; status: string }>)
    .filter((p) => p.status === 'VALID').map((p) => `${p.propertyId === ids['104'] ? '104' : p.propertyId === ids['106'] ? '106' : 'x'}:${p.representationType}`);
  expect(types).toEqual(expect.arrayContaining(['104:CO_OWNER', '106:TENANT_DELEGATE']));
});

test('23 · asamblea finalizada: sin botón de reabrir, sin acciones sobre poderes y sin votos', async ({ page }) => {
  await uiLogin(page, 'admin');
  await page.goto(`${urlFor(SUB_A())}/admin/assemblies/${assemblyId}`);
  await page.getByRole('button', { name: 'Finalizar Sesión' }).click();
  await expect(page.getByText('SESIÓN FINALIZADA')).toBeVisible();
  await expect(page.getByRole('button', { name: /Iniciar Sesión|Reabrir Sesión/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Poderes y voto asistido' }).click();
  await expect(page.getByRole('button', { name: /^Aprobar$|^Revocar$|Registrar asistencia/ })).toHaveCount(0);
  const late = await admin.call('POST', `/assemblies/polls/${poll.id}/assisted-vote`, {
    proxyId: ids.proxy101, documentType: 'CC', documentNumber: 'P6EXT101', expressedByProxyConfirmed: true, optionIds: [poll.yes] });
  expect(late.status).toBe(409);
  expect((await admin.call('POST', `/assemblies/${assemblyId}/start`)).code).toBe('ASSEMBLY_ALREADY_ENDED');
});
