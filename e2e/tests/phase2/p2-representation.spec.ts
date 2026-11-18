import { test, expect } from '@playwright/test';
import { credentials } from '../../support/env';
import { confirmSwal, toast } from '../../helpers/swal';
import { Api, liveAssembly, phase2Account, requirePhase2, scheduledAssembly, uiLogin, uniqueTag, type Unit } from '../../helpers/phase2';

/**
 * Fase 2 / cierre de E5 — representación de la unidad E2E-SBX-104 (dos copropietarios y un arrendatario sintéticos,
 * sandbox con SANDBOX_PHASE2=1):
 * D11 representación única y delegación entre copropietarios, D12 revocación bloqueada desde el pre-registro y en curso,
 * D13 registro administrativo (válido, persona no autorizada, asamblea finalizada) y quórum. Cada prueba crea su asamblea
 * y la finaliza; las delegaciones de prueba se revocan al terminar.
 */
test.describe('Fase 2 · representación de la unidad (copropietarios, delegación, registro administrativo)', () => {
  test.describe.configure({ mode: 'serial' });
  requirePhase2();

  let co1: Api;
  let co2: Api;
  let lessee2: Api;
  let admin: Api;
  let unit: Unit;
  const tag = uniqueTag('F2R');
  const opened: string[] = [];

  const relationIdOf = async (email: string) => {
    const people = await admin.ok<{ id: string; email?: string; status?: string }[]>('GET', `/residents/by-property/${unit.propertyId}`);
    return people.find((p) => (p.email || '').toLowerCase() === email.toLowerCase() && (p.status ?? 'ACTIVE') === 'ACTIVE')!.id;
  };

  test.beforeAll(async () => {
    test.skip(!phase2Account('coOwner1') || !phase2Account('coOwner2') || !phase2Account('lessee2'),
      'BLOCKED: faltan E2E_COOWNER1_* / E2E_COOWNER2_* / E2E_LESSEE2_* (siembra de la Fase 2)');
    co1 = await Api.login(phase2Account('coOwner1')!);
    co2 = await Api.login(phase2Account('coOwner2')!);
    lessee2 = await Api.login(phase2Account('lessee2')!);
    admin = await Api.login(credentials('admin')!);
    const units = await co1.ok<Unit[]>('GET', '/resident/me/properties');
    unit = units.find((u) => u.number === 'E2E-SBX-104')!;
    expect(unit, 'el copropietario 1 debe tener E2E-SBX-104').toBeTruthy();
    for (const s of [co1, co2, lessee2]) await s.call('PATCH', '/resident/me/onboarding', {});
  });

  test.afterAll(async () => {
    for (const id of opened) await admin?.call('POST', `/assemblies/${id}/finish`, {});
    await co1?.call('DELETE', `/properties/${unit?.propertyId}/voting-delegation`);
    for (const s of [co1, co2, lessee2, admin]) await s?.dispose();
  });

  test('D11 · dos copropietarios se registran a la vez: una sola representación, quórum 1 y solo vota el representante', async ({ page }) => {
    const asm = await liveAssembly(admin, `Asamblea copropietarios ${tag}`, `¿Aprueba la obra ${tag}?`);
    opened.push(asm.id);
    const [r1, r2] = await Promise.all([
      co1.call('POST', `/assemblies/${asm.id}/attendees/self-register`, { propertyId: unit.propertyId }),
      co2.call('POST', `/assemblies/${asm.id}/attendees/self-register`, { propertyId: unit.propertyId }),
    ]);
    expect([r1.status, r2.status].sort()).toEqual([201, 409]);
    expect([r1.code, r2.code]).toContain('ALREADY_REGISTERED');
    const [winner, loser, loserAccount] = r1.status === 201 ? [co1, co2, phase2Account('coOwner2')!] : [co2, co1, phase2Account('coOwner1')!];
    expect((await admin.ok('GET', `/assemblies/${asm.id}`)).registeredAttendees).toBe(1);

    // El otro copropietario ve la unidad ya representada y no puede sustituir al representante.
    await uiLogin(page, loserAccount);
    await page.goto('/resident/community');
    await page.getByRole('button', { name: /Asambleas & Votos/ }).click();
    await expect(page.getByTestId('attendance-done')).toBeVisible();
    await expect(page.getByTestId('attendance-register')).toHaveCount(0);

    // Votación después de registrar asistencia: vota el representante; el otro copropietario no.
    const optionId = asm.poll!.options[0].id;
    expect((await loser.call('POST', `/assemblies/polls/${asm.poll!.id}/vote`, { propertyId: unit.propertyId, optionIds: [optionId] })).code)
      .toBe('UNAUTHORIZED_VOTE');
    expect((await winner.call('POST', `/assemblies/polls/${asm.poll!.id}/vote`, { propertyId: unit.propertyId, optionIds: [optionId] })).status)
      .toBe(200);
    const poll = await admin.ok('GET', `/assemblies/polls/${asm.poll!.id}`);
    expect(poll.totalVotes).toBe(1);
    await admin.ok('POST', `/assemblies/${asm.id}/finish`, {});
  });

  test('D11 · delegación entre copropietarios: el otro copropietario no la revoca; mensaje real del backend', async ({ page }) => {
    expect((await co1.call('POST', `/properties/${unit.propertyId}/voting-delegation`)).status).toBe(200);
    expect((await co2.call('POST', `/properties/${unit.propertyId}/voting-delegation`)).code).toBe('DELEGATION_ALREADY_EXISTS');

    await uiLogin(page, phase2Account('coOwner2')!);
    await page.getByRole('link', { name: 'Hogar' }).first().click();
    await page.getByRole('button', { name: 'Revocar delegación' }).click();
    await confirmSwal(page, '¿Revocar derecho de voto?', 'Revocar delegación');
    await expect(toast(page, 'Solo el copropietario que otorgó esta delegación puede revocarla.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Revocar delegación' })).toBeVisible();
    expect((await co1.ok('GET', `/properties/${unit.propertyId}/voting-delegation`)).status).toBe('ACTIVE');
  });

  test('D12 · pre-registro del delegado en asamblea programada: revocar se bloquea (UI) y sigue bloqueado al iniciar', async ({ page }) => {
    const asm = await scheduledAssembly(admin, `Asamblea programada ${tag}`);
    opened.push(asm.id);
    const lesseeRel = await relationIdOf(phase2Account('lessee2')!.email);
    const reg = await admin.call('POST', `/assemblies/${asm.id}/attendees`, { propertyId: unit.propertyId, residentId: lesseeRel, isPowerOfAttorney: false });
    expect(reg.status, reg.code).toBe(201);

    await uiLogin(page, phase2Account('coOwner1')!);
    await page.getByRole('link', { name: 'Hogar' }).first().click();
    await page.getByRole('button', { name: 'Revocar delegación' }).click();
    await confirmSwal(page, '¿Revocar derecho de voto?', 'Revocar delegación');
    await expect(toast(page, 'No puedes revocar esta delegación porque el delegado ya tiene asistencia registrada en una asamblea programada o en curso.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Revocar delegación' })).toBeVisible();

    await admin.ok('POST', `/assemblies/${asm.id}/start`, {});
    const live = await co1.call('DELETE', `/properties/${unit.propertyId}/voting-delegation`);
    expect(live.status).toBe(409);
    expect(live.code).toBe('DELEGATION_REVOCATION_BLOCKED_BY_ATTENDANCE');
    // El delegado sigue representando a la unidad y vota.
    const poll = await admin.ok('POST', '/assemblies/polls', { assemblyId: asm.id, question: `¿Pregunta ${tag}?`, type: 'SINGLE_CHOICE', showResultsToResidents: true, options: ['Sí', 'No'] });
    await admin.ok('POST', `/assemblies/polls/${poll.id}/open`, {});
    expect((await lessee2.call('POST', `/assemblies/polls/${poll.id}/vote`, { propertyId: unit.propertyId, optionIds: [poll.options[1].id] })).status).toBe(200);

    await admin.ok('POST', `/assemblies/${asm.id}/finish`, {});
    expect((await co1.call('DELETE', `/properties/${unit.propertyId}/voting-delegation`)).status).toBe(200); // libre al finalizar
  });

  test('D13/D14 · registro administrativo: representante obligatorio y elegido en la interfaz, apoderado no disponible, sin sustitución', async ({ page }) => {
    const asm = await scheduledAssembly(admin, `Asamblea administrativa ${tag}`);
    opened.push(asm.id);
    // Persona no autorizada: el arrendatario sin delegación vigente a su favor; y un residente de otra unidad.
    const lesseeRel = await relationIdOf(phase2Account('lessee2')!.email);
    const notDelegated = await admin.call('POST', `/assemblies/${asm.id}/attendees`, { propertyId: unit.propertyId, residentId: lesseeRel });
    expect(notDelegated.status).toBe(409);
    expect(notDelegated.code).toBe('VOTING_RIGHT_NOT_DELEGATED');
    const otherUnitPeople = await admin.ok<{ id: string; propertyId?: string }[]>('GET', '/residents?size=50');
    const foreign = ((otherUnitPeople as any).content ?? otherUnitPeople).find((p: any) => p.propertyId && p.propertyId !== unit.propertyId);
    const wrongUnit = await admin.call('POST', `/assemblies/${asm.id}/attendees`, { propertyId: unit.propertyId, residentId: foreign.id });
    expect(wrongUnit.code).toBe('INVALID_UNIT_REPRESENTATION');
    // Sin representante y por apoderado: rechazados por el backend (D14).
    expect((await admin.call('POST', `/assemblies/${asm.id}/attendees`, { propertyId: unit.propertyId })).code).toBe('REPRESENTATIVE_REQUIRED');
    expect((await admin.call('POST', `/assemblies/${asm.id}/attendees`, { propertyId: unit.propertyId, isPowerOfAttorney: true, representativeName: 'Apoderado E2E' })).code)
      .toBe('POWER_OF_ATTORNEY_NOT_SUPPORTED');
    expect((await admin.ok('GET', `/assemblies/${asm.id}`)).registeredAttendees).toBe(0);

    // Interfaz: sin elegir no se guarda; el apoderado no está disponible; se elige explícitamente al copropietario 2.
    await uiLogin(page, credentials('admin')!, /\/admin\/?$/);
    await page.goto(`/admin/assemblies/${asm.id}`);
    await page.getByRole('button', { name: 'Quórum y Asistencia' }).click();
    const row = page.locator('tr', { hasText: 'E2E-SBX-104' });
    await row.getByRole('button', { name: 'Registrar' }).click();
    const submit = page.getByRole('button', { name: /Registrar Asistencia/ });
    await expect(page.getByTestId('representative-option').first()).toBeVisible();
    await expect(submit).toBeDisabled();
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0); // nadie preseleccionado
    await expect(page.getByTestId('representative-option').filter({ hasText: 'Arrendatario' }).getByRole('radio')).toBeDisabled();
    await page.getByRole('button', { name: /Tiene Apoderado/ }).click();
    await expect(page.getByTestId('power-of-attorney-unavailable')).toBeVisible();
    await expect(submit).toBeDisabled();
    await page.getByRole('button', { name: /Titular Presente/ }).click();
    await page.getByTestId('representative-option').filter({ hasText: 'E2E Copropietario 2' }).getByRole('radio').check();
    await submit.click();
    await expect(toast(page, 'Asistencia registrada correctamente')).toBeVisible();
    await expect(row).toContainText('Presente');
    await expect(row).toContainText('Representante: E2E Copropietario 2');
    expect((await admin.ok('GET', `/assemblies/${asm.id}`)).registeredAttendees).toBe(1);

    // Nadie sustituye al representante: ni el otro copropietario (auto-registro) ni otro registro administrativo.
    await admin.ok('POST', `/assemblies/${asm.id}/start`, {});
    expect((await co1.call('POST', `/assemblies/${asm.id}/attendees/self-register`, { propertyId: unit.propertyId })).code).toBe('ALREADY_REGISTERED');
    const co1Rel = await relationIdOf(phase2Account('coOwner1')!.email);
    expect((await admin.call('POST', `/assemblies/${asm.id}/attendees`, { propertyId: unit.propertyId, residentId: co1Rel })).code)
      .toBe('PROPERTY_ALREADY_REGISTERED');
    // Votación: solo el representante, en todas las preguntas; la administración no vota.
    for (const q of [1, 2]) {
      const poll = await admin.ok('POST', '/assemblies/polls', { assemblyId: asm.id, question: `¿Pregunta ${q} ${tag}?`, type: 'SINGLE_CHOICE', showResultsToResidents: true, options: ['Sí', 'No'] });
      await admin.ok('POST', `/assemblies/polls/${poll.id}/open`, {});
      const body = { propertyId: unit.propertyId, optionIds: [poll.options[0].id] };
      expect((await co1.call('POST', `/assemblies/polls/${poll.id}/vote`, body)).code).toBe('UNAUTHORIZED_VOTE');
      expect((await admin.call('POST', `/assemblies/polls/${poll.id}/vote`, body)).code).toBe('ADMIN_VOTE_NOT_SUPPORTED');
      expect((await co2.call('POST', `/assemblies/polls/${poll.id}/vote`, body)).status).toBe(200);
      expect((await admin.ok('GET', `/assemblies/polls/${poll.id}`)).totalVotes).toBe(1);
    }
    expect((await admin.ok('GET', `/assemblies/${asm.id}`)).registeredAttendees).toBe(1);

    // Asamblea finalizada: la interfaz muestra el rechazo real y no marca la unidad como presente.
    await admin.ok('POST', `/assemblies/${asm.id}/finish`, {});
    const ended = await scheduledAssembly(admin, `Asamblea finalizada ${tag}`);
    await admin.ok('POST', `/assemblies/${ended.id}/finish`, {});
    await page.goto(`/admin/assemblies/${ended.id}`);
    await page.getByRole('button', { name: 'Quórum y Asistencia' }).click();
    const endedRow = page.locator('tr', { hasText: 'E2E-SBX-104' });
    await endedRow.getByRole('button', { name: 'Registrar' }).click();
    await page.getByTestId('representative-option').filter({ hasText: 'E2E Copropietario 1' }).getByRole('radio').check();
    await page.getByRole('button', { name: /Registrar Asistencia/ }).click();
    await expect(toast(page, 'La asamblea ya finalizó; no se registran más asistencias.')).toBeVisible();
    await expect(endedRow).toContainText('Ausente');
    expect((await admin.ok('GET', `/assemblies/${ended.id}`)).registeredAttendees).toBe(0);
  });

  test('autor dado de baja · la delegación se invalida automáticamente y el otro copropietario recupera el derecho de voto en su portal', async ({ page }) => {
    // El otro copropietario no revoca una delegación cuyo autor sigue activo.
    expect((await co1.call('POST', `/properties/${unit.propertyId}/voting-delegation`)).status).toBe(200);
    expect((await co2.call('DELETE', `/properties/${unit.propertyId}/voting-delegation`)).code).toBe('DELEGATION_GRANTED_BY_OTHER_OWNER');
    const co1Rel = await relationIdOf(phase2Account('coOwner1')!.email);
    const lesseeRel = await relationIdOf(phase2Account('lessee2')!.email);
    // Baja administrativa del autor: el sistema invalida su delegación (ResidentService.endRelation). La revocación
    // excepcional por otro copropietario cubre el caso en que la delegación sigue vigente (p. ej. tras una transferencia
    // de propiedad); se prueba en el backend (AssemblyRepresentationIT).
    expect((await admin.call('DELETE', `/residents/${co1Rel}`)).status).toBeLessThan(300);
    try {
      expect((await co2.call('GET', `/properties/${unit.propertyId}/voting-delegation`)).data ?? null).toBeNull();
      await uiLogin(page, phase2Account('coOwner2')!);
      await page.getByRole('link', { name: 'Hogar' }).first().click();
      await expect(page.getByText('Tú tienes el derecho de voto de esta unidad.').first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Revocar delegación' })).toHaveCount(0);
    } finally {
      // Se restablecen las relaciones (reactivación administrativa) para que la spec sea repetible: dar de baja al
      // copropietario 1 puede dar de baja, en cascada, al arrendatario que él invitó.
      await admin.call('PUT', `/residents/${co1Rel}`, { status: 'ACTIVE' });
      await admin.call('PUT', `/residents/${lesseeRel}`, { status: 'ACTIVE' });
    }
  });
});
