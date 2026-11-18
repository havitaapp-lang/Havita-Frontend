import { test as base, expect } from '@playwright/test';
import { ApiSession } from '../helpers/api';
import { credentials, storageStateFor, WRITES_ALLOWED, type Role } from '../support/env';

type WorkerFixtures = {
  /** API session of the COMMUNITY_ADMIN test user, used only to arrange and clean synthetic data. */
  adminApi: ApiSession;
};

type TestFixtures = {
  /** Registers cleanup callbacks that run after the test even when it fails. */
  cleanup: (fn: () => Promise<unknown>) => void;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  adminApi: [
    async ({}, use) => {
      const session = await ApiSession.login('admin');
      await use(session);
      await session.dispose();
    },
    { scope: 'worker' },
  ],

  cleanup: async ({}, use) => {
    const tasks: Array<() => Promise<unknown>> = [];
    await use((fn) => tasks.push(fn));
    // Reverse order: dependants (residents, invitations) before the property that owns them.
    for (const task of tasks.reverse()) {
      try {
        await task();
      } catch (err) {
        console.warn(`[cleanup] ${(err as Error).message}`);
      }
    }
  },
});

/**
 * Runs the describe block as a logged-in role. If the setup project could not log that role in
 * (credentials missing or rejected), every test is skipped with a BLOCKED reason instead of failing.
 */
export function asRole(role: Role): void {
  const state = storageStateFor(role);
  test.use({ storageState: state ?? { cookies: [], origins: [] } });
  test.beforeEach(() => {
    test.skip(!credentials(role), `BLOCKED: E2E_${role.toUpperCase()}_EMAIL/PASSWORD not set in e2e/.env.e2e`);
    test.skip(!state, `BLOCKED: auth setup for role "${role}" did not produce a session (login failed)`);
  });
}

export function requireWrites(): void {
  test.skip(!WRITES_ALLOWED, 'NOT RUN: E2E_ALLOW_WRITES != 1 (test creates/deletes synthetic data)');
}

/**
 * Pruebas que escriben con la cuenta del residente sobre SU unidad (vehiculos, mascotas, invitaciones, paquetes): solo
 * se ejecutan en el sandbox aislado (e2e/sandbox, base havita_e2e_sandbox). Contra la base local principal se omiten
 * para no modificar una unidad real.
 */
export function requireSandbox(): void {
  test.skip(process.env.E2E_SANDBOX !== '1',
    'BLOCKED fuera del sandbox: escribe sobre la unidad real del residente (ver e2e/sandbox/README.md)');
}

export { expect };
