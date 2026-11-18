import { test, expect, asRole, requireWrites } from '../../fixtures/test';
import { seedResidents } from '../../helpers/seed';
import { cancelSwal, confirmSwal, swalDialog, toast } from '../../helpers/swal';
import { ResidentsDirectoryPage } from '../../pages/ResidentsDirectoryPage';

/**
 * Trash icon → SweetAlert confirmation → DELETE /api/v1/residents/{id}.
 *
 * A-8: Eliminar es una baja lógica de la relación del residente con la unidad. El registro queda INACTIVE con su
 * historial y sale del acceso de la comunidad; no desaparece de la base de datos. Que la fila desaparezca no basta
 * como evidencia: se comprueba el estado en el backend, el historial y el mensaje que recibe el administrador.
 */
const CONFIRM_TITLE = '¿Dar de baja al residente?';
const CONFIRM_BUTTON = 'Sí, dar de baja';

test.describe('Directorio de residentes · dar de baja', () => {
  asRole('admin');
  test.beforeEach(() => requireWrites());

  test('pide confirmación nombrando al residente y explica que el historial se conserva; cancelar no da de baja', async ({ page, adminApi, cleanup }) => {
    const { tag, residents } = await seedResidents(adminApi, cleanup, 'DLC', ['Propietario']);
    const r = residents[0];
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await directory.searchFor(tag);

    let deletes = 0;
    page.on('request', (req) => req.method() === 'DELETE' && req.url().includes('/api/v1/residents/') && deletes++);
    await directory.clickDelete(r.name);
    const dialog = swalDialog(page, CONFIRM_TITLE);
    await expect(dialog).toContainText(`"${r.name}"`);
    await expect(dialog).toContainText('historial');
    await cancelSwal(page, CONFIRM_TITLE);

    expect(deletes).toBe(0);
    await expect(directory.row(r.name)).toBeVisible();
    const res = await adminApi.getResident(r.id);
    expect(res.status()).toBe(200);
    expect((await res.json()).data.status).toBe('ACTIVE');
  });

  test('confirmar da de baja al residente: INACTIVE en el backend, historial intacto, mensaje correcto y sin HTTP 500', async ({ page, adminApi, cleanup }) => {
    const { tag, property, residents } = await seedResidents(adminApi, cleanup, 'DLO', ['Propietario', 'Propietario']);
    const [target, other] = residents;

    // Historial sintético del residente: una PQRS a su nombre (la administración la borra al terminar).
    const pqrsRes = await adminApi.post('/pqrs', {
      propertyId: property.id,
      residentId: target.id,
      category: 'Mantenimiento',
      title: `${tag} historial`,
      description: 'Historial sintético para comprobar que la baja lo conserva',
    });
    expect(pqrsRes.status()).toBe(201);
    const pqrsId = (await pqrsRes.json()).data.id as string;
    cleanup(() => adminApi.delete(`/pqrs/${pqrsId}`));

    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await directory.searchFor(tag);

    const statuses: number[] = [];
    page.on('response', (r) => r.url().includes('/api/v1/') && statuses.push(r.status()));
    await directory.clickDelete(target.name);
    const del = page.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().endsWith(`/residents/${target.id}`));
    await confirmSwal(page, CONFIRM_TITLE, CONFIRM_BUTTON);
    expect((await del).status()).toBe(200);

    await expect(toast(page, 'Residente dado de baja')).toBeVisible();

    // Backend: el registro sigue existiendo, ahora INACTIVE; el otro residente de la unidad no cambia.
    const after = await adminApi.getResident(target.id);
    expect(after.status()).toBe(200);
    expect((await after.json()).data.status).toBe('INACTIVE');
    expect((await (await adminApi.getResident(other.id)).json()).data.status).toBe('ACTIVE');

    // Historial: la PQRS sigue asociada al residente dado de baja.
    const pqrs = await adminApi.get(`/pqrs/${pqrsId}`);
    expect(pqrs.status()).toBe(200);
    expect((await pqrs.json()).data.residentId).toBe(target.id);

    // D-5: la vista por defecto solo muestra activos, así que el dado de baja sale de ella...
    await expect(directory.row(target.name)).toHaveCount(0);
    await expect(directory.row(other.name)).toContainText('Activo');
    // ...pero la fila no se borra: con «Todos los estados» aparece como Inactivo. Ninguna llamada respondió 500.
    await directory.statusFilter().selectOption('ALL');
    await expect(directory.row(target.name)).toContainText('Inactivo');
    await expect(directory.row(other.name)).toContainText('Activo');
    expect(statuses.filter((s) => s >= 500), 'alguna petición respondió 5xx').toEqual([]);
  });

  test('dar de baja dos veces no falla ni cambia la baja original', async ({ adminApi, cleanup }) => {
    const { residents } = await seedResidents(adminApi, cleanup, 'DL2', ['Propietario']);
    const r = residents[0];
    expect((await adminApi.delete(`/residents/${r.id}`)).status()).toBe(200);
    expect((await adminApi.delete(`/residents/${r.id}`)).status()).toBe(200);
    expect((await (await adminApi.getResident(r.id)).json()).data.status).toBe('INACTIVE');
  });

  test('si el backend rechaza la baja no se muestra un mensaje de éxito y sí un error', async ({ page, adminApi, cleanup }) => {
    const { tag, residents } = await seedResidents(adminApi, cleanup, 'DLE', ['Propietario']);
    const r = residents[0];
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await directory.searchFor(tag);

    // Simulated server failure for this single request only (no data is touched).
    await page.route(`**/api/v1/residents/${r.id}`, (route) =>
      route.request().method() === 'DELETE'
        ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"success":false,"message":"E2E simulated failure"}' })
        : route.continue(),
    );
    // Record every success toast so a toast that renders and disappears is still caught.
    await page.evaluate(() => {
      (window as unknown as { __toasts: string[] }).__toasts = [];
      new MutationObserver(() => {
        if (document.body.innerText.includes('Residente dado de baja')) {
          (window as unknown as { __toasts: string[] }).__toasts.push('Residente dado de baja');
        }
      }).observe(document.body, { childList: true, subtree: true, characterData: true });
    });
    await directory.clickDelete(r.name);
    const failed = page.waitForResponse((res) => res.request().method() === 'DELETE' && res.url().includes(`/residents/${r.id}`));
    await confirmSwal(page, CONFIRM_TITLE, CONFIRM_BUTTON);
    expect((await failed).status()).toBe(500);

    const errorDialog = swalDialog(page, 'No se pudo dar de baja');
    await expect(errorDialog).toBeVisible();
    // El modal de SweetAlert oculta el resto de la página a la accesibilidad (aria-hidden): se cierra antes de mirar la tabla.
    await page.keyboard.press('Escape');
    await expect(errorDialog).toBeHidden();
    await expect(directory.row(r.name)).toBeVisible();
    // Negative assertion needs a bounded observation window: success toasts render within ~300 ms of the call.
    await page.waitForTimeout(1500);
    const seen = await page.evaluate(() => (window as unknown as { __toasts: string[] }).__toasts.length);
    expect(seen, 'a success toast was shown although the DELETE failed').toBe(0);
    expect((await (await adminApi.getResident(r.id)).json()).data.status).toBe('ACTIVE');
  });
});
