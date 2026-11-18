import { test, expect, requireWrites } from '../../fixtures/test';
import { ApiSession, tokenFromLink } from '../../helpers/api';
import { syntheticResident } from '../../helpers/data';
import { fixtureProperty, resetFixtureProperty } from '../../helpers/seed';
import { InvitationRegistrationPage } from '../../pages/InvitationRegistrationPage';
import { credentials, USER_CREATION_ALLOWED } from '../../support/env';

/**
 * Public self-registration through an admin-generated invitation link (/register/invite/:token).
 * Backend: PublicResidentInvitationController + ResidentInvitationService.
 */

test.describe('Registro por invitación · token inválido (público)', () => {
  test('un token inexistente muestra "Invitacion Invalida" y permite volver al login', async ({ page }) => {
    const reg = new InvitationRegistrationPage(page);
    await reg.goto('token-que-no-existe-e2e');
    await expect(reg.invalidHeading()).toBeVisible();
    await expect(page.getByText('Invitacion no valida.')).toBeVisible();
    await expect(reg.formHeading()).toHaveCount(0);

    await reg.backHome().click();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('Registro por invitación · token válido', () => {
  test.beforeEach(() => {
    test.skip(!credentials('admin'), 'BLOCKED: E2E_ADMIN_EMAIL/PASSWORD needed to generate an invitation');
    requireWrites();
  });

  /** Pool unit (see fixtureProperty) with a fresh PENDING invitation; the unit is reset again afterwards. */
  async function arrangeInvitation(adminApi: ApiSession, cleanup: (fn: () => Promise<unknown>) => void) {
    const property = await fixtureProperty(adminApi, 'INV');
    cleanup(() => resetFixtureProperty(adminApi, property.id));
    const invitation = await adminApi.generateInvitation(property.id);
    expect(invitation.link, 'backend must return the one-time link only at generation time').toBeTruthy();
    return { property, invitation, token: tokenFromLink(invitation.link!) };
  }

  test('muestra la comunidad y la vivienda de la invitación', async ({ page, adminApi, cleanup }) => {
    const { property, token } = await arrangeInvitation(adminApi, cleanup);
    const tenant = await ApiSession.tenantConfig();
    const reg = new InvitationRegistrationPage(page);

    await reg.goto(token);
    await expect(reg.formHeading()).toBeVisible();
    await expect(page.getByText(tenant.name, { exact: true })).toBeVisible();
    await expect(page.getByText(property.name, { exact: true })).toBeVisible();
    await expect(page.getByText('propietario', { exact: true })).toBeVisible();
  });

  test('enviar el formulario vacío muestra todos los errores obligatorios', async ({ page, adminApi, cleanup }) => {
    const { token } = await arrangeInvitation(adminApi, cleanup);
    const reg = new InvitationRegistrationPage(page);
    await reg.goto(token);

    let registerCalls = 0;
    page.on('request', (r) => r.url().includes('/register') && r.method() === 'POST' && registerCalls++);

    await reg.submit().click();
    await expect(reg.errorSummary()).toContainText('Hay 6 campos que debes revisar');
    for (const msg of [
      'El nombre completo es obligatorio.',
      'El número de documento es obligatorio.',
      'El correo electrónico es obligatorio.',
      'El número de celular es obligatorio.',
      'La contraseña debe tener al menos 6 caracteres.',
      'Debes aceptar los Términos y la Política de Privacidad.',
    ]) {
      await expect(reg.errorSummary().getByText(msg)).toBeVisible();
    }
    expect(registerCalls).toBe(0);
  });

  test('valida formato de correo, longitud de contraseña y aceptación de términos', async ({ page, adminApi, cleanup }) => {
    const { token } = await arrangeInvitation(adminApi, cleanup);
    const reg = new InvitationRegistrationPage(page);
    await reg.goto(token);

    await reg.name().fill('E2E Persona');
    await reg.documentId().fill('123456789');
    await reg.email().fill('correo-sin-dominio@');
    await reg.phone().fill('3001234567');
    await reg.password().fill('12345');
    await reg.acceptTerms().check({ force: true });
    await reg.submit().click();

    await expect(reg.errorSummary().getByText('El correo electrónico no es válido.')).toBeVisible();
    await expect(reg.errorSummary().getByText('La contraseña debe tener al menos 6 caracteres.')).toBeVisible();
    await expect(reg.errorSummary().getByText('Debes aceptar los Términos y la Política de Privacidad.')).toBeVisible();
    await expect(reg.errorSummary().getByText('El nombre completo es obligatorio.')).toHaveCount(0);
  });

  test('los campos respetan las longitudes máximas', async ({ page, adminApi, cleanup }) => {
    const { token } = await arrangeInvitation(adminApi, cleanup);
    const reg = new InvitationRegistrationPage(page);
    await reg.goto(token);

    await expect(reg.name()).toHaveAttribute('maxlength', '100');
    await expect(reg.documentId()).toHaveAttribute('maxlength', '20');
    await expect(reg.email()).toHaveAttribute('maxlength', '150');
    await expect(reg.phone()).toHaveAttribute('maxlength', '20');
    await reg.name().fill('A'.repeat(130));
    await expect(reg.name()).toHaveValue('A'.repeat(100));
  });

  test('el botón de ojo alterna la visibilidad de la contraseña', async ({ page, adminApi, cleanup }) => {
    const { token } = await arrangeInvitation(adminApi, cleanup);
    const reg = new InvitationRegistrationPage(page);
    await reg.goto(token);

    await expect(reg.password()).toHaveAttribute('type', 'password');
    await reg.togglePassword().click();
    await expect(reg.password()).toHaveAttribute('type', 'text');
    await reg.togglePassword().click();
    await expect(reg.password()).toHaveAttribute('type', 'password');
  });

  test('una invitación revocada ya no permite registrarse', async ({ page, adminApi, cleanup }) => {
    const { invitation, token } = await arrangeInvitation(adminApi, cleanup);
    await adminApi.revokeInvitation(invitation.id);

    const reg = new InvitationRegistrationPage(page);
    await reg.goto(token);
    await expect(reg.invalidHeading()).toBeVisible();
    await expect(page.getByText('Invitacion revocada.')).toBeVisible();
  });

  test('registro completo crea el residente en la vivienda y el token queda consumido', async ({
    page,
    adminApi,
    cleanup,
  }) => {
    test.skip(!USER_CREATION_ALLOWED, 'NOT RUN: creates a new user account (E2E_ALLOW_USER_CREATION != 1)');
    const { property, token } = await arrangeInvitation(adminApi, cleanup);
    const person = syntheticResident('REG');
    const password = `E2e-${Date.now()}!`;
    const reg = new InvitationRegistrationPage(page);
    await reg.goto(token);

    await reg.name().fill(person.name);
    await reg.documentId().fill(person.phone);
    await reg.email().fill(person.email);
    await reg.phone().fill(person.phone);
    await reg.password().fill(password);
    await reg.acceptTerms().check({ force: true });
    await reg.acceptPrivacy().check({ force: true });

    const registered = page.waitForResponse((r) => r.url().endsWith(`/register`) && r.request().method() === 'POST');
    await reg.submit().click();
    expect((await registered).status()).toBeLessThan(300);
    await expect(reg.successHeading()).toBeVisible();
    await expect(page.getByText(property.name, { exact: true })).toBeVisible();

    // Functional effect: the resident now exists on that property (cleaned up afterwards).
    const { content } = await adminApi.findResidents(person.email);
    const created = content.find((r) => r.email?.toLowerCase() === person.email);
    expect(created, 'registered resident appears in the census').toBeTruthy();
    cleanup(() => adminApi.deleteResident(created!.id));
    expect(created!.propertyId).toBe(property.id);
    expect(created!.type).toBe('Propietario');

    // The new account can authenticate.
    const login = await ApiSession.rawLogin(person.email, password);
    expect(login.ok()).toBe(true);

    // One-time token: reopening it must fail.
    await reg.goto(token);
    await expect(reg.invalidHeading()).toBeVisible();
  });
});
