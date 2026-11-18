import { test, expect } from '@playwright/test';
import { credentials } from '../../support/env';
import { confirmSwal, toast } from '../../helpers/swal';
import { Api, chooseUnit, liveAssembly, phase2Account, requirePhase2, scheduledAssembly, uiLogin, uniqueTag, type Unit } from '../../helpers/phase2';

/**
 * Fase 2 / E3-E5 — asambleas con un propietario sintético de dos unidades (sandbox, SANDBOX_PHASE2=1):
 * asistencia por cada unidad sin cambiar la unidad activa, voto por dos unidades con el estado leído del backend (no de
 * localStorage), delegación bloqueada por asistencia administrativa previa (D10) y revocación bloqueada por asistencia
 * del delegado (D9). Cada prueba crea su propia asamblea y la finaliza; la delegación de prueba se revoca al terminar.
 */
test.describe('Fase 2 · asambleas, asistencia y delegación', () => {
  test.describe.configure({ mode: 'serial' });
  requirePhase2();

  let owner: Api;
  let lessee: Api;
  let admin: Api;
  let units: Unit[] = [];
  let withLessee: Unit; // E2E-SBX-103: tiene arrendatario sintético
  let other: Unit; // E2E-SBX-102
  const tag = uniqueTag('F2');
  const question = `¿Aprueba el presupuesto ${tag}?`;
  let attendanceAssembly: { id: string; poll: { id: string; options: { id: string }[] } | null };

  test.beforeAll(async () => {
    owner = await Api.login(phase2Account('owner')!);
    lessee = await Api.login(phase2Account('lessee')!);
    admin = await Api.login(credentials('admin')!);
    units = await owner.ok('GET', '/resident/me/properties');
    expect(units.map((u) => u.number).sort()).toEqual(['E2E-SBX-102', 'E2E-SBX-103']);
    withLessee = units.find((u) => u.number === 'E2E-SBX-103')!;
    other = units.find((u) => u.number === 'E2E-SBX-102')!;
    await owner.ok('PATCH', '/resident/me/onboarding', {});
    await lessee.call('PATCH', '/resident/me/onboarding', {});
  });

  test.afterAll(async () => {
    if (attendanceAssembly) await admin.call('POST', `/assemblies/${attendanceAssembly.id}/finish`, {});
    await owner?.dispose();
    await lessee?.dispose();
    await admin?.dispose();
  });

  const attendanceOf = async (assemblyId: string) =>
    Object.fromEntries(((await owner.ok<{ propertyId: string; status: string }[]>('GET', `/assemblies/${assemblyId}/my-attendance-units`)))
      .map((u) => [u.propertyId, u.status]));

  test('asistencia de varias unidades: cada una se registra por separado y la unidad activa no cambia', async ({ page }) => {
    attendanceAssembly = await liveAssembly(admin, `Asamblea ${tag}`);
    await uiLogin(page, phase2Account('owner')!);
    await chooseUnit(page, other.label);
    await page.goto('/resident/community');
    await page.getByRole('button', { name: /Asambleas & Votos/ }).click();

    const rows = page.getByTestId('attendance-unit');
    await expect(rows).toHaveCount(2);
    const rowOf = (u: Unit) => rows.filter({ hasText: u.label });
    await expect(rowOf(other)).toHaveAttribute('data-status', 'PENDING');
    await expect(rowOf(withLessee)).toHaveAttribute('data-status', 'PENDING');

    // Registra la unidad que NO es la activa.
    await rowOf(withLessee).getByTestId('attendance-register').click();
    await expect(rowOf(withLessee)).toHaveAttribute('data-status', 'REGISTERED');
    await expect(rowOf(other)).toHaveAttribute('data-status', 'PENDING');
    await expect(page.getByTestId('unit-selector')).toContainText(other.label);
    expect(await attendanceOf(attendanceAssembly.id)).toEqual({ [withLessee.propertyId]: 'REGISTERED', [other.propertyId]: 'PENDING' });

    await rowOf(other).getByTestId('attendance-register').click();
    await expect(page.getByTestId('attendance-done')).toBeVisible();
    expect(await attendanceOf(attendanceAssembly.id)).toEqual({ [withLessee.propertyId]: 'REGISTERED', [other.propertyId]: 'REGISTERED' });

    // Reintento directo de una unidad ya registrada: rechazado, sin duplicar el quórum.
    const again = await owner.call('POST', `/assemblies/${attendanceAssembly.id}/attendees/self-register`, { propertyId: other.propertyId });
    expect(again.status).toBe(409);
    expect(again.code).toBe('ALREADY_REGISTERED');
    const asm = await admin.ok('GET', `/assemblies/${attendanceAssembly.id}`);
    expect(asm.registeredAttendees).toBe(2);
  });

  test('voto por dos unidades: la insignia sale del backend y distingue «1 de 2» de «todas»', async ({ page, browser }) => {
    const poll = await admin.ok('POST', '/assemblies/polls', {
      assemblyId: attendanceAssembly.id, question, type: 'SINGLE_CHOICE', showResultsToResidents: true, options: ['Sí', 'No'],
    });
    await admin.ok('POST', `/assemblies/polls/${poll.id}/open`, {});
    attendanceAssembly.poll = poll;

    await uiLogin(page, phase2Account('owner')!);
    await chooseUnit(page, other.label);
    await page.goto('/resident/community');
    await page.getByRole('button', { name: /Asambleas & Votos/ }).click();
    const status = page.getByTestId('poll-vote-status');
    await expect(status.filter({ hasText: '2 unidades pendientes de votar' }).first()).toBeVisible();

    await page.locator('h4', { hasText: question }).click();
    const voteUnits = page.getByTestId('vote-unit');
    await expect(voteUnits).toHaveCount(2);
    await voteUnits.filter({ hasText: withLessee.label }).click();
    await page.locator('label:has(input[name="pollOption"])').nth(0).click();
    await page.getByText('Emitir Mi Voto').click();
    await expect(voteUnits.filter({ hasText: withLessee.label })).toContainText('Ya votó');
    await page.getByRole('button', { name: 'Cancelar' }).click();

    // El listado no dice «ya votó» en general: queda una unidad pendiente.
    await expect(status.filter({ hasText: 'Votaste por 1 de 2 unidades · 1 pendiente' }).first()).toBeVisible();
    await expect(status.filter({ hasText: /^Ya emitiste tu voto$/ })).toHaveCount(0);

    await page.locator('h4', { hasText: question }).click();
    await voteUnits.filter({ hasText: other.label }).click();
    await page.locator('label:has(input[name="pollOption"])').nth(1).click();
    await page.getByText('Emitir Mi Voto').click();
    await expect(page.getByText('¡Tus votos están registrados!')).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(status.filter({ hasText: 'Votaste por 2 unidades' }).first()).toBeVisible();
    await expect(page.getByTestId('unit-selector')).toContainText(other.label);

    // Ninguna marca de voto en localStorage: el estado es el de PostgreSQL.
    const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('havita_voted_')));
    expect(keys).toEqual([]);
    const mine = await owner.ok<{ status: string }[]>('GET', `/assemblies/polls/${poll.id}/my-voting-units`);
    expect(mine.map((u) => u.status)).toEqual(['VOTED', 'VOTED']);
    const retry = await owner.call('POST', `/assemblies/polls/${poll.id}/vote`, { propertyId: other.propertyId, optionIds: [poll.options[0].id] });
    expect(retry.status).toBe(409);
    expect(retry.code).toBe('PROPERTY_ALREADY_VOTED');

    // Otro dispositivo (contexto nuevo, sin almacenamiento local): el mismo estado, leído del backend.
    const ctx = await browser.newContext();
    const device = await ctx.newPage();
    await uiLogin(device, phase2Account('owner')!);
    await chooseUnit(device, withLessee.label);
    await device.goto('/resident/community');
    await device.getByRole('button', { name: /Asambleas & Votos/ }).click();
    await expect(device.getByTestId('poll-vote-status').filter({ hasText: 'Votaste por 2 unidades' }).first()).toBeVisible();
    await ctx.close();

    await admin.ok('POST', `/assemblies/${attendanceAssembly.id}/finish`, {});
    attendanceAssembly = undefined as never;
  });

  test('D10 · asistencia administrativa previa (asamblea programada): la delegación se rechaza con un mensaje claro', async ({ page }) => {
    const asm = await scheduledAssembly(admin, `Asamblea programada ${tag}`);
    try {
      // Cierre E5 / D14: el pre-registro administrativo identifica al representante (el propietario de la Fase 2).
      const people = await admin.ok<{ id: string; email?: string }[]>('GET', `/residents/by-property/${withLessee.propertyId}`);
      const ownerRel = people.find((p) => (p.email || '').toLowerCase() === phase2Account('owner')!.email.toLowerCase())!;
      await admin.ok('POST', `/assemblies/${asm.id}/attendees`, { propertyId: withLessee.propertyId, residentId: ownerRel.id, isPowerOfAttorney: false });
      await uiLogin(page, phase2Account('owner')!);
      await chooseUnit(page, withLessee.label);
      await page.getByRole('link', { name: 'Hogar' }).first().click();
      await page.getByText('Delegar voto al arrendatario').click();
      await confirmSwal(page, '¿Delegar derecho de voto?', 'Delegar voto');
      await expect(toast(page, 'No puedes delegar el voto de esta unidad porque ya tiene asistencia registrada en una asamblea programada o en curso.')).toBeVisible();
      await expect(page.getByText('Delegar voto al arrendatario')).toBeVisible(); // sin delegación en pantalla
      const del = await owner.call('GET', `/properties/${withLessee.propertyId}/voting-delegation`);
      expect(del.data ?? null).toBeNull();
    } finally {
      await admin.call('POST', `/assemblies/${asm.id}/finish`, {});
    }
  });

  test('D9 · el delegado ya registró asistencia en una asamblea en curso: la revocación se rechaza y la delegación sigue', async ({ page }) => {
    expect((await owner.call('POST', `/properties/${withLessee.propertyId}/voting-delegation`)).status).toBe(200);
    const asm = await liveAssembly(admin, `Asamblea delegada ${tag}`);
    try {
      const reg = await lessee.call('POST', `/assemblies/${asm.id}/attendees/self-register`, { propertyId: withLessee.propertyId });
      expect(reg.status, reg.code).toBe(201);
      await uiLogin(page, phase2Account('owner')!);
      await chooseUnit(page, withLessee.label);
      await page.getByRole('link', { name: 'Hogar' }).first().click();
      await page.getByRole('button', { name: 'Revocar delegación' }).click();
      await confirmSwal(page, '¿Revocar derecho de voto?', 'Revocar delegación');
      await expect(toast(page, 'No puedes revocar esta delegación porque el delegado ya tiene asistencia registrada en una asamblea programada o en curso.')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Revocar delegación' })).toBeVisible(); // sigue delegada en pantalla
      const del = await owner.ok('GET', `/properties/${withLessee.propertyId}/voting-delegation`);
      expect(del.status).toBe('ACTIVE');
      // El propietario tampoco puede registrar asistencia por esa unidad (el derecho sigue en el delegado).
      const ownerReg = await owner.call('POST', `/assemblies/${asm.id}/attendees/self-register`, { propertyId: withLessee.propertyId });
      expect(ownerReg.status).toBe(409);
    } finally {
      await admin.call('POST', `/assemblies/${asm.id}/finish`, {});
      // Con la asamblea finalizada la revocación vuelve a estar permitida: se deja la unidad sin delegación.
      expect((await owner.call('DELETE', `/properties/${withLessee.propertyId}/voting-delegation`)).status).toBe(200);
    }
  });
});
