import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { account, requirePhase6, SUB_A, uiLogin, urlFor } from '../../helpers/phase6';

/**
 * P8-B — citofonía: recuperación de la llamada sin SSE y apertura desde el enlace del aviso push, en el SANDBOX aislado
 * (backend local contra PostgreSQL en contenedor y RealtimeKit SIMULADO). Toda petición a un host externo se bloquea.
 *
 * NO se envía ni recibe ningún Web Push real (sin claves VAPID): estas pruebas cubren lo que ocurre cuando el residente
 * abre la app tarde o pulsa el aviso (`/resident?intercomCall=<id>`), incluido el inicio de sesión, una llamada ya
 * terminada y el acceso de otro residente. La entrega del aviso con el móvil bloqueado solo se valida en dispositivos.
 */
// Límite de cada PRUEBA (no de la aplicación): la tercera inicia sesión por interfaz tres veces y en WebKit eso supera
// los 90 s. Las esperas de la aplicación conservan sus propios plazos.
test.describe.configure({ mode: 'serial', timeout: 180_000 });

const isLocal = (url: URL) => url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname.endsWith('.localhost');

const opened: BrowserContext[] = [];

async function isolated(browser: import('@playwright/test').Browser): Promise<BrowserContext> {
  const ctx = await browser.newContext();
  opened.push(ctx);
  await ctx.route((url) => !isLocal(url), (route) => route.abort());
  return ctx;
}

/** La portería llama a la unidad 101 (P6 Owner1) y devuelve el id de la llamada. */
async function startCall(guard: Page): Promise<string> {
  await guard.goto(`${urlFor(SUB_A())}/security/intercom`);
  await guard.getByPlaceholder(/Buscar por unidad/).fill('101');
  await guard.getByRole('button', { name: /101/ }).first().click();
  const row = guard.locator('div').filter({ has: guard.getByRole('heading', { name: 'P6 Owner1' }) })
    .filter({ has: guard.getByRole('button', { name: 'Llamar' }) }).last();
  const created = guard.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/v1\/intercom\/calls$/.test(new URL(r.url()).pathname));
  await row.getByRole('button', { name: 'Llamar' }).click();
  const body = await (await created).json();
  await expect(guard.getByTestId('intercom-status')).toContainText('Timbrando en la vivienda', { timeout: 15_000 });
  const id = body?.data?.callId ?? body?.data?.id;
  expect(id).toMatch(/^[0-9a-f-]{36}$/);
  return id;
}

async function cancelFromGuard(guard: Page) {
  await guard.getByTitle('Cancelar').click();
  await expect(guard.getByTestId('intercom-status')).toContainText(/cancelada/i, { timeout: 15_000 });
}

async function loginForm(page: Page) {
  await page.getByPlaceholder('ejemplo@micopropiedad.com').fill(account('owner1').email);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(account('owner1').password);
  await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
}

test.describe('P8-B citofonía: recuperación y enlace del aviso (sandbox)', () => {
  test.beforeEach(() => {
    requirePhase6();
    test.skip(!process.env.P6_GUARD_EMAIL, 'BLOCKED: falta la cuenta de portería del sandbox');
  });

  // Cada prueba abre varios contextos (portería y residentes) con SSE abierto: se cierran al terminar para no
  // acumular conexiones entre pruebas (WebKit se ralentiza con muchas páginas vivas).
  test.afterEach(async () => {
    await Promise.all(opened.splice(0).map((c) => c.close().catch(() => {})));
  });

  test('app abierta DESPUÉS de que empiece a timbrar (evento SSE perdido): la llamada se recupera y se puede rechazar', async ({ browser }) => {
    const guard = await (await isolated(browser)).newPage();
    await uiLogin(guard, 'guard', SUB_A(), /\/security/);
    await startCall(guard);

    const resident = await (await isolated(browser)).newPage();
    await uiLogin(resident, 'owner1');
    await expect(resident.getByRole('button', { name: 'Contestar' })).toBeVisible({ timeout: 15_000 });
    await resident.getByRole('button', { name: 'Rechazar' }).click();
    await expect(guard.getByTestId('intercom-status')).toContainText(/rechazada/i, { timeout: 15_000 });
  });

  test('aviso pulsado con la sesión cerrada: inicio de sesión y VUELTA a la llamada; al cancelar, se cierra', async ({ browser }) => {
    const guard = await (await isolated(browser)).newPage();
    await uiLogin(guard, 'guard', SUB_A(), /\/security/);
    const callId = await startCall(guard);

    const resident = await (await isolated(browser)).newPage();
    await resident.goto(`${urlFor(SUB_A())}/resident?intercomCall=${callId}`);
    await expect(resident).toHaveURL(/\/login/, { timeout: 15_000 });
    await loginForm(resident);
    await expect(resident.getByRole('button', { name: 'Contestar' })).toBeVisible({ timeout: 20_000 });
    // El enlace no queda en la URL (ni en el historial).
    await expect(resident).toHaveURL(/\/resident$/);

    await cancelFromGuard(guard);
    await expect(resident.getByRole('button', { name: 'Contestar' })).toHaveCount(0, { timeout: 15_000 });
  });

  test('aviso de una llamada YA terminada: «ya terminó», nunca se ofrece contestar; otro residente tampoco puede', async ({ browser }) => {
    const guard = await (await isolated(browser)).newPage();
    await uiLogin(guard, 'guard', SUB_A(), /\/security/);
    const callId = await startCall(guard);

    // Otro residente de la misma comunidad abre el enlace mientras timbra: sin acceso (403) → aviso genérico.
    const other = await (await isolated(browser)).newPage();
    await uiLogin(other, 'owner2');
    await other.goto(`${urlFor(SUB_A())}/resident?intercomCall=${callId}`);
    await expect(other.getByTestId('intercom-call-ended-notice')).toBeVisible({ timeout: 15_000 });
    await expect(other.getByRole('button', { name: 'Contestar' })).toHaveCount(0);

    await cancelFromGuard(guard);

    const resident = await (await isolated(browser)).newPage();
    await uiLogin(resident, 'owner1');
    await resident.goto(`${urlFor(SUB_A())}/resident?intercomCall=${callId}`);
    await expect(resident.getByTestId('intercom-call-ended-notice')).toBeVisible({ timeout: 15_000 });
    await expect(resident.getByText('La llamada de portería ya terminó.')).toBeVisible();
    await expect(resident.getByRole('button', { name: 'Contestar' })).toHaveCount(0);
  });
});
