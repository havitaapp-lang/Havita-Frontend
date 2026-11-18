import { expect, test } from '@playwright/test';
import {
  P6Api, PDF, SUB_B, confirmDialog, liveAssembly, ownerRelation, requirePhase6, uiLogin, unitId, urlFor, SUB_A,
} from '../../helpers/phase6';

/**
 * Fase 2 / P7 — G3 (designacion administrativa con evidencia) y G4 (historial del limite), con frontend y backend
 * REALES en el sandbox aislado (bandera ON). Datos sinteticos del seed de P6.
 */
test.describe.configure({ mode: 'serial' });

let admin: P6Api;
let assemblyId: string;
let unit103: string;

test.beforeAll(async () => {
  requirePhase6();
  admin = await P6Api.login('admin');
  const live = await liveAssembly(admin, `Asamblea P7 ${Date.now()}`);
  assemblyId = live.assemblyId;
  unit103 = await unitId(admin, assemblyId, 'P6-103');
});

test.beforeEach(() => requirePhase6());

test('G3 · la administración registra en nombre del propietario con evidencia y declaración; queda en revisión y auditado', async ({ page }) => {
  const grantor = await ownerRelation(admin, unit103, process.env.P6_OWNER3_EMAIL!);
  await uiLogin(page, 'admin');
  await page.goto(`${urlFor(SUB_A())}/admin/assemblies/${assemblyId}`);
  await page.getByRole('button', { name: 'Poderes y voto asistido' }).click();
  await page.getByRole('button', { name: 'Registrar poder' }).click();
  const form = page.getByRole('form', { name: 'Solicitud de poder' });
  await form.getByLabel('Unidad', { exact: true }).selectOption({ label: 'P6-103' });
  await form.getByLabel('Propietario que otorga').selectOption(grantor);
  await form.getByLabel('Nombre completo del apoderado').fill('Designada P7');
  await form.getByLabel('Número de documento').fill('P7DES103');
  await form.getByLabel(/Documento del poder/).setInputFiles({ name: 'poder.pdf', mimeType: 'application/pdf', buffer: PDF });
  // Sin evidencia ni declaración: la interfaz no envía.
  await form.getByRole('button', { name: 'Registrar poder' }).click();
  await expect(form.getByText('Indica cómo se recibió el poder firmado por el otorgante.')).toBeVisible();
  await expect(form.getByText('Confirma que el documento adjunto es el poder firmado por el otorgante.')).toBeVisible();
  await form.getByLabel('¿Cómo se recibió el poder firmado?').selectOption('SIGNED_DOCUMENT_IN_PERSON');
  await form.getByLabel(/Declaro que el documento adjunto/).check();
  await form.getByRole('button', { name: 'Registrar poder' }).click();
  await confirmDialog(page, 'Sí, registrar');
  const row = page.getByTestId('admin-proxy-row').filter({ hasText: 'Designada P7' });
  await expect(row.getByTestId('proxy-status')).toHaveAttribute('data-status', 'PENDING_REVIEW');
  await row.getByRole('button', { name: 'Eventos' }).click();
  await expect(page.getByTestId('proxy-events')).toContainText('Evidencia: Poder firmado entregado en persona por el otorgante');
  await expect(page.getByTestId('proxy-events')).not.toContainText('P7DES103');

  // El otorgante lo ve como suyo; no se creó ninguna relación nueva.
  const owner3 = await P6Api.login('owner3');
  const mine = (await owner3.call('GET', `/assemblies/${assemblyId}/proxies/mine`)).data as Array<{ relation: string; proxy: { proxyFullName: string } }>;
  expect(mine.some((m) => m.relation === 'GRANTOR' && m.proxy.proxyFullName === 'Designada P7')).toBe(true);
});

test('G3 · por API: sin evidencia 400; residente 403; administración de otra comunidad 404', async () => {
  const grantor = await ownerRelation(admin, unit103, process.env.P6_OWNER3_EMAIL!);
  const body = { propertyId: unit103, grantorResidentId: grantor, proxyFullName: 'Sin Evidencia', proxyDocumentType: 'CC', proxyDocumentNumber: 'P7NOEV' };
  const noEvidence = await admin.multipart(`/assemblies/${assemblyId}/proxies/admin`, body);
  expect(noEvidence.status).toBe(400);
  expect(noEvidence.code).toBe('EVIDENCE_TYPE_REQUIRED');
  const owner1 = await P6Api.login('owner1');
  expect((await owner1.multipart(`/assemblies/${assemblyId}/proxies/admin`,
    { ...body, evidenceType: 'SIGNED_DOCUMENT_IN_PERSON', grantorConsentAttested: true })).status).toBe(403);
  const adminB = await P6Api.login('adminb', SUB_B());
  expect((await adminB.multipart(`/assemblies/${assemblyId}/proxies/admin`,
    { ...body, evidenceType: 'SIGNED_DOCUMENT_IN_PERSON', grantorConsentAttested: true })).status).toBe(404);
});

test('G4 · historial del límite en la interfaz (anterior, nuevo, administrador); aislado y solo para la administración', async ({ page }) => {
  expect((await admin.call('PUT', '/assemblies/proxy-settings', { maxUnitsPerProxy: 4 })).status).toBe(200);
  expect((await admin.call('PUT', '/assemblies/proxy-settings', { maxUnitsPerProxy: 6 })).status).toBe(200);
  const hist = (await admin.call('GET', '/assemblies/proxy-settings/history?page=0&size=5')).data;
  expect(hist.items[0]).toMatchObject({ previousMaxUnits: 4, newMaxUnits: 6, actorUserId: admin.userId });
  expect(hist.items[1]).toMatchObject({ newMaxUnits: 4 });

  await uiLogin(page, 'admin');
  await page.goto(`${urlFor(SUB_A())}/admin/assemblies/${assemblyId}`);
  await page.getByRole('button', { name: 'Poderes y voto asistido' }).click();
  const rows = page.getByTestId('proxy-limit-history-row');
  await expect(rows.first()).toBeVisible();
  const first = (await rows.first().innerText()).replace(/\s+/g, ' ');
  expect(first).toMatch(/\b4 6 /);
  expect(first).toContain(hist.items[0].actorName);

  // Otra comunidad: su historial no incluye estos cambios. Residente: 403.
  const adminB = await P6Api.login('adminb', SUB_B());
  const histB = (await adminB.call('GET', '/assemblies/proxy-settings/history')).data;
  const idsA = new Set((hist.items as Array<{ id: string }>).map((h) => h.id));
  expect((histB.items as Array<{ id: string }>).some((h) => idsA.has(h.id))).toBe(false);
  const owner1 = await P6Api.login('owner1');
  expect((await owner1.call('GET', '/assemblies/proxy-settings/history')).status).toBe(403);
  // Sesión de A enviada a la comunidad B: rechazada.
  const cross = await admin.asTenant(SUB_B(), process.env.P6_TENANT_B!);
  expect([401, 403]).toContain((await cross.get('/api/v1/assemblies/proxy-settings/history')).status());
  await cross.dispose();
  // Ejecución hermética: la comunidad vuelve a quedar sin límite.
  expect((await admin.call('PUT', '/assemblies/proxy-settings', { maxUnitsPerProxy: null })).status).toBe(200);
});
