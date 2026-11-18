import fs from 'node:fs';
import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { AUTH_DIR, authFile, credentials, type Role } from '../support/env';

/**
 * Logs each configured role in through the real login UI once and stores the session
 * (SSO cookies + localStorage tokens) for reuse via storageState.
 */
const LANDING: Record<Role, RegExp> = {
  admin: /\/admin\/?$/,
  resident: /\/resident\/?$/,
  security: /\/security\/?$/,
};

fs.mkdirSync(AUTH_DIR, { recursive: true });

for (const role of Object.keys(LANDING) as Role[]) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    const file = authFile(role);
    fs.rmSync(file, { force: true });
    const creds = credentials(role);
    setup.skip(!creds, `BLOCKED: credentials for ${role} not configured`);

    const login = new LoginPage(page);
    await login.goto();
    await login.login(creds!.email, creds!.password);
    await expect(page).toHaveURL(LANDING[role], { timeout: 20_000 });

    await page.context().storageState({ path: file });
  });
}
