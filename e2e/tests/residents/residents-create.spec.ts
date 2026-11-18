import { test, expect, asRole, requireWrites } from '../../fixtures/test';
import { syntheticResident } from '../../helpers/data';
import { seedProperty, seedResidents } from '../../helpers/seed';
import { toast } from '../../helpers/swal';
import { ResidentsDirectoryPage } from '../../pages/ResidentsDirectoryPage';

/** "Nuevo Residente" modal (residentSchema + POST /api/v1/residents). */
test.describe('Directorio de residentes · crear · usabilidad', () => {
  asRole('admin');

  test('el formulario cabe en una pantalla estándar (1366x860) y sus botones son alcanzables', async ({ page }) => {
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await directory.newButton().click();
    const form = directory.form();
    await expect(form.title('create')).toBeInViewport();
    await expect(form.submitCreate()).toBeInViewport();
    await expect(form.cancel()).toBeInViewport();
  });
});

test.describe('Directorio de residentes · crear', () => {
  asRole('admin');
  // TASK-007 (#8): el modal ya cabe en 1366x860 (selector de una unidad, alto máximo con scroll); se retira el
  // viewport alto que servía de contorno temporal.

  test('abre el modal con valores por defecto y se cierra con X y con Cancelar', async ({ page }) => {
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    const form = directory.form();

    await directory.newButton().click();
    await expect(form.title('create')).toBeVisible();
    await expect(form.name()).toHaveValue('');
    await expect(form.email()).toHaveValue('');
    await expect(form.phone()).toHaveValue('');
    await expect(form.type()).toHaveValue('Propietario');
    await expect(form.type().locator('option')).toHaveText(['Propietario', 'Arrendatario']);
    await expect(form.unit()).toHaveValue('');
    await expect(page.getByRole('checkbox')).toHaveCount(0);
    await expect(form.status()).toHaveCount(0); // el alta no admite estado: el backend crea ACTIVE

    await form.close().click();
    await expect(form.title('create')).toBeHidden();

    await directory.newButton().click();
    await form.cancel().click();
    await expect(form.title('create')).toBeHidden();
  });

  test('enviar vacío muestra errores por campo y no llama al backend', async ({ page }) => {
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    let posts = 0;
    page.on('request', (r) => r.method() === 'POST' && r.url().includes('/api/v1/residents') && posts++);

    await directory.newButton().click();
    const form = directory.form();
    await form.submitCreate().click();

    await expect(form.errorSummary()).toBeVisible();
    await expect(form.name()).toHaveAttribute('aria-invalid', 'true');
    await expect(form.email()).toHaveAttribute('aria-invalid', 'true');
    await expect(form.phone()).toHaveAttribute('aria-invalid', 'true');
    await expect(form.title('create')).toBeVisible();
    expect(posts).toBe(0);
  });

  test('rechaza correo con formato inválido y teléfono demasiado corto', async ({ page }) => {
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await directory.newButton().click();
    const form = directory.form();

    await form.fill({ name: 'E2E Nombre Valido', email: 'no-es-un-correo', phone: '123' });
    await form.submitCreate().click();

    await expect(form.email()).toHaveAttribute('aria-invalid', 'true');
    await expect(form.phone()).toHaveAttribute('aria-invalid', 'true');
    await expect(form.name()).toHaveAttribute('aria-invalid', 'false');
  });

  test('rechaza un nombre de un solo carácter (mínimo 2)', async ({ page }) => {
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await directory.newButton().click();
    const form = directory.form();

    await form.fill({ name: 'A', email: 'e2e-min@example.test', phone: '3001234567' });
    await form.submitCreate().click();
    await expect(form.name()).toHaveAttribute('aria-invalid', 'true');
  });

  test('aplica longitudes máximas y normaliza la entrada', async ({ page }) => {
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await directory.newButton().click();
    const form = directory.form();

    await expect(form.name()).toHaveAttribute('maxlength', '100');
    await expect(form.email()).toHaveAttribute('maxlength', '150');
    await expect(form.phone()).toHaveAttribute('maxlength', '20');
    await form.name().fill('N'.repeat(120));
    await expect(form.name()).toHaveValue('N'.repeat(100));
    // Spaces typed in the e-mail field are stripped while typing.
    await form.email().fill('e2e test@example.test');
    await expect(form.email()).toHaveValue('e2etest@example.test');
    // Letters are removed from the phone field.
    await form.phone().fill('30a0b1234567');
    await expect(form.phone()).not.toHaveValue(/[a-z]/);
  });

  test('elige una sola unidad en un selector con búsqueda', async ({ page, adminApi, cleanup }) => {
    requireWrites();
    const property = await seedProperty(adminApi, cleanup, 'CHK');
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await directory.newButton().click();

    const form = directory.form();
    await form.unitSearch().fill(property.name);
    await expect(form.unit().locator('option', { hasText: property.name })).toHaveCount(1);
    await form.unit().selectOption({ label: property.name });
    await expect(form.unit()).toHaveValue(property.id);
  });

  test('registra un residente válido y aparece en el directorio', async ({ page, adminApi, cleanup }) => {
    requireWrites();
    const property = await seedProperty(adminApi, cleanup, 'NEW');
    const person = syntheticResident('NEW');
    cleanup(async () => {
      const { content } = await adminApi.findResidents(person.email);
      for (const r of content) await adminApi.deleteResident(r.id);
    });

    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await directory.newButton().click();
    const form = directory.form();
    await form.fill({ ...person, type: 'Arrendatario', property: property.name });

    const created = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith('/api/v1/residents'));
    await form.submitCreate().click();
    expect((await created).status()).toBe(201);
    await expect(toast(page, 'Residente registrado exitosamente')).toBeVisible();
    await expect(form.title('create')).toBeHidden();

    const { content } = await adminApi.findResidents(person.email);
    expect(content).toHaveLength(1);
    expect(content[0]).toMatchObject({ name: person.name, type: 'Arrendatario', propertyId: property.id, status: 'ACTIVE' });

    await directory.searchFor(person.tag);
    await expect(directory.row(person.name)).toBeVisible();
  });

  test('no permite registrar un correo ya existente y muestra el error del backend', async ({ page, adminApi, cleanup }) => {
    requireWrites();
    const { property, residents } = await seedResidents(adminApi, cleanup, 'DUP', ['Propietario']);
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await directory.newButton().click();
    const form = directory.form();
    await form.fill({ name: 'E2E Duplicado', email: residents[0].email, phone: '3007654321', property: property.name });

    const attempt = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith('/api/v1/residents'));
    await form.submitCreate().click();
    expect((await attempt).status()).toBeGreaterThanOrEqual(400);
    // The user must be told it failed; a success toast here would be a false positive.
    await expect(toast(page, 'Residente registrado exitosamente')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toBeVisible();

    const { content } = await adminApi.findResidents(residents[0].email);
    expect(content).toHaveLength(1);
  });
});
