import { test, expect, asRole, requireWrites } from '../../fixtures/test';
import { seedResidents } from '../../helpers/seed';
import { toast } from '../../helpers/swal';
import { ResidentsDirectoryPage } from '../../pages/ResidentsDirectoryPage';

/** "Editar residente" (pencil icon) → same modal in edit mode; expected to persist via PUT /api/v1/residents/{id}. */
test.describe('Directorio de residentes · editar', () => {
  asRole('admin');
  test.beforeEach(() => requireWrites());
  // TASK-007 (#8): el modal ya cabe en 1366x860 (selector de una unidad, alto máximo con scroll); se retira el
  // viewport alto que servía de contorno temporal.

  test('el modal se abre precargado con los datos del residente', async ({ page, adminApi, cleanup }) => {
    const { tag, property, residents } = await seedResidents(adminApi, cleanup, 'EDP', ['Arrendatario']);
    const r = residents[0];
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await directory.searchFor(tag);

    const form = await directory.openEdit(r.name);
    await expect(form.name()).toHaveValue(r.name);
    await expect(form.email()).toHaveValue(r.email);
    await expect(form.phone()).toHaveValue(/\d/);
    await expect(form.type()).toHaveValue('Arrendatario');
    await expect(form.unit()).toHaveValue(property.id);
    await expect(form.status()).toHaveValue('ACTIVE');
    await expect(form.status().locator('option')).toHaveText(['Activo', 'Inactivo']);
    await expect(form.submitEdit()).toBeVisible();
  });

  test('guardar cambios de nombre y teléfono actualiza el residente existente', async ({ page, adminApi, cleanup }) => {
    const { tag, residents } = await seedResidents(adminApi, cleanup, 'EDS', ['Propietario']);
    const r = residents[0];
    const newName = `${tag} Editado`;
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await directory.searchFor(tag);

    const form = await directory.openEdit(r.name);
    await form.name().fill(newName);
    await form.phone().fill('3109998877');

    const write = page.waitForResponse(
      (r) => ['PUT', 'POST', 'PATCH'].includes(r.request().method()) && r.url().includes('/api/v1/residents'),
    );
    await form.submitEdit().click();
    const res = await write;
    expect(res.request().method(), 'edit should update (PUT) instead of creating a new resident').toBe('PUT');
    expect(res.ok()).toBe(true);
    await expect(toast(page, 'Residente actualizado correctamente')).toBeVisible();

    const updated = await (await adminApi.getResident(r.id)).json();
    expect(updated.data).toMatchObject({ name: newName, phone: '3109998877' });
    const { content } = await adminApi.findResidents(tag);
    expect(content, 'no duplicate resident was created').toHaveLength(1);
  });

  test('cambiar el estado a Inactivo se refleja en el listado', async ({ page, adminApi, cleanup }) => {
    const { tag, residents } = await seedResidents(adminApi, cleanup, 'EDI', ['Propietario']);
    const r = residents[0];
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await directory.searchFor(tag);

    const form = await directory.openEdit(r.name);
    await form.status().selectOption({ label: 'Inactivo' });
    await form.submitEdit().click();

    await expect.poll(async () => (await (await adminApi.getResident(r.id)).json()).data.status).toBe('INACTIVE');
    // D-5: sale de la vista de activos y aparece en «Inactivos».
    await expect(directory.row(r.name)).toHaveCount(0);
    await directory.statusFilter().selectOption('INACTIVE');
    await expect(directory.row(r.name)).toContainText('Inactivo');
  });

  test('cancelar la edición no modifica el residente', async ({ page, adminApi, cleanup }) => {
    const { tag, residents } = await seedResidents(adminApi, cleanup, 'EDC', ['Propietario']);
    const r = residents[0];
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await directory.searchFor(tag);

    const form = await directory.openEdit(r.name);
    await form.name().fill(`${tag} No Guardar`);
    await form.cancel().click();
    await expect(form.title('edit')).toBeHidden();

    await expect(directory.row(r.name)).toBeVisible();
    const current = await (await adminApi.getResident(r.id)).json();
    expect(current.data.name).toBe(r.name);
  });

  test('la edición valida los campos igual que la creación', async ({ page, adminApi, cleanup }) => {
    const { tag, residents } = await seedResidents(adminApi, cleanup, 'EDV', ['Propietario']);
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await directory.searchFor(tag);

    const form = await directory.openEdit(residents[0].name);
    await form.email().fill('correo-invalido');
    await form.submitEdit().click();
    await expect(form.email()).toHaveAttribute('aria-invalid', 'true');
    await expect(form.title('edit')).toBeVisible();
  });
});
