import { expect, type Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  // The "Correo electrónico" label is not associated with the input (FormField puts the id on the wrapper div),
  // so there is no accessible name to target; the placeholder is the most stable alternative.
  readonly email = () => this.page.getByPlaceholder('ejemplo@micopropiedad.com');
  readonly password = () => this.page.getByRole('textbox', { name: 'Contraseña', exact: true });
  readonly submit = () => this.page.getByRole('button', { name: 'Ingresar al Sistema' });

  async goto(): Promise<void> {
    await this.page.goto('/login');
    await expect(this.email()).toBeVisible();
  }

  async login(email: string, password: string): Promise<void> {
    await this.email().fill(email);
    await this.password().fill(password);
    await this.submit().click();
  }
}
