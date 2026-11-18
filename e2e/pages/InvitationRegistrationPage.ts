import type { Page } from '@playwright/test';

/** /register/invite/:token — public resident self-registration (src/features/auth/ResidentRegistrationPage.tsx). */
export class InvitationRegistrationPage {
  constructor(readonly page: Page) {}

  goto(token: string) {
    return this.page.goto(`/register/invite/${token}`);
  }

  readonly invalidHeading = () => this.page.getByRole('heading', { name: 'Invitacion Invalida' });
  readonly formHeading = () => this.page.getByRole('heading', { name: 'Crear tu cuenta' });
  readonly successHeading = () => this.page.getByRole('heading', { name: 'Registro completado' });
  readonly backHome = () => this.page.getByRole('button', { name: 'Volver al Inicio' });

  readonly name = () => this.page.getByLabel('Nombre Completo');
  readonly documentType = () => this.page.getByLabel('Tipo');
  readonly documentId = () => this.page.getByLabel('Nº Documento');
  readonly email = () => this.page.getByLabel('Correo Electrónico');
  readonly phone = () => this.page.getByLabel('Celular');
  // Label text is "Contraseña *"; anchored regex avoids also matching the "Ver contraseña" toggle.
  readonly password = () => this.page.getByLabel(/^Contraseña/);
  readonly togglePassword = () => this.page.getByRole('button', { name: /Ver contraseña|Ocultar contraseña/ });
  readonly acceptTerms = () => this.page.getByRole('checkbox', { name: /Términos de Servicio/ });
  readonly acceptPrivacy = () => this.page.getByRole('checkbox', { name: /Política de Privacidad/ });
  readonly submit = () => this.page.getByRole('button', { name: 'Completar Registro' });
  readonly errorSummary = () => this.page.getByRole('alert').filter({ hasText: /campos? que debes revisar/ });
}
