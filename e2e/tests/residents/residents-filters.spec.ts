import { test, expect, asRole, requireWrites } from '../../fixtures/test';
import { seedResidents } from '../../helpers/seed';
import { ResidentsDirectoryPage } from '../../pages/ResidentsDirectoryPage';

/** "Todos los tipos / Propietarios / Arrendatarios" filter on the directory. */
test.describe('Directorio de residentes · filtro por tipo', () => {
  asRole('admin');

  test('ofrece las opciones Todos, Propietarios y Arrendatarios', async ({ page }) => {
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await expect(directory.typeFilter()).toHaveValue('Todos');
    await expect(directory.typeFilter().locator('option')).toHaveText([
      'Todos los tipos',
      'Propietarios',
      'Arrendatarios',
      'Residentes', // TASK-008: el dominio también tiene el tipo «Residente» (familiares registrados por la unidad)
    ]);
  });

  test('filtrar por Arrendatarios oculta a los propietarios', async ({ page, adminApi, cleanup }) => {
    requireWrites();
    const { tag, residents } = await seedResidents(adminApi, cleanup, 'FLT', ['Propietario', 'Arrendatario']);
    const [owner, tenant] = residents;
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await directory.searchFor(tag);
    await expect(directory.dataRows()).toHaveCount(2);

    await directory.typeFilter().selectOption('Arrendatario');
    await expect(directory.row(tenant.name)).toBeVisible();
    await expect(directory.row(owner.name)).toHaveCount(0);
  });

  test('filtrar por Propietarios oculta a los arrendatarios', async ({ page, adminApi, cleanup }) => {
    requireWrites();
    const { tag, residents } = await seedResidents(adminApi, cleanup, 'FLO', ['Propietario', 'Arrendatario']);
    const [owner, tenant] = residents;
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await directory.searchFor(tag);

    await directory.typeFilter().selectOption('Propietario');
    await expect(directory.row(owner.name)).toBeVisible();
    await expect(directory.row(tenant.name)).toHaveCount(0);

    await directory.typeFilter().selectOption('Todos');
    await expect(directory.dataRows()).toHaveCount(2);
  });
});
