import { test, expect, asRole, requireWrites } from '../../fixtures/test';
import { seedResidents } from '../../helpers/seed';
import { ResidentsDirectoryPage } from '../../pages/ResidentsDirectoryPage';

/**
 * TASK-008 · D-5: el Directorio muestra por defecto solo residentes activos. Inactivos y «Todos los estados»
 * permiten consultar el historial. Los filtros se combinan con la búsqueda y el tipo, y el total sigue a los filtros.
 */
test.describe('Directorio de residentes · filtro por estado (D-5)', () => {
  asRole('admin');

  test('ofrece Activos (por defecto), Inactivos y Todos los estados', async ({ page }) => {
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await expect(directory.statusFilter()).toHaveValue('ACTIVE');
    await expect(directory.statusFilter().locator('option')).toHaveText(['Activos', 'Inactivos', 'Todos los estados']);
  });

  test('por defecto oculta a los dados de baja; Inactivos y Todos los muestran, con el total de cada filtro', async ({ page, adminApi, cleanup }) => {
    requireWrites();
    const { tag, residents } = await seedResidents(adminApi, cleanup, 'STF', ['Propietario', 'Propietario', 'Arrendatario']);
    const [active, removed, tenant] = residents;
    expect((await adminApi.delete(`/residents/${removed.id}`)).status()).toBe(200);

    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await directory.searchFor(tag);
    await expect(directory.dataRows()).toHaveCount(2);
    await expect(directory.row(active.name)).toBeVisible();
    await expect(directory.row(removed.name)).toHaveCount(0);
    await expect(directory.paginationSummary()).toHaveText('Mostrando 1 a 2 de 2 residentes');

    await directory.statusFilter().selectOption('INACTIVE');
    await expect(directory.row(removed.name)).toContainText('Inactivo');
    await expect(directory.dataRows()).toHaveCount(1);
    await expect(directory.paginationSummary()).toHaveText('Mostrando 1 a 1 de 1 residentes');

    await directory.statusFilter().selectOption('ALL');
    await expect(directory.dataRows()).toHaveCount(3);
    await expect(directory.paginationSummary()).toHaveText('Mostrando 1 a 3 de 3 residentes');

    // Combinado con el tipo: todos los estados, solo arrendatarios.
    await directory.typeFilter().selectOption('Arrendatario');
    await expect(directory.dataRows()).toHaveCount(1);
    await expect(directory.row(tenant.name)).toBeVisible();
  });

  test('cambiar un filtro vuelve a la primera página y el total cambia con él', async ({ page, adminApi, cleanup }) => {
    requireWrites();
    const { tag, residents } = await seedResidents(adminApi, cleanup, 'STP', Array(10).fill('Propietario'));
    for (const r of residents.slice(0, 2)) expect((await adminApi.delete(`/residents/${r.id}`)).status()).toBe(200);

    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await directory.searchFor(tag);
    await expect(directory.paginationSummary()).toHaveText('Mostrando 1 a 8 de 8 residentes');
    await expect(directory.pageIndicator()).toHaveText('1 / 1');

    await directory.statusFilter().selectOption('ALL');
    await expect(directory.paginationSummary()).toHaveText('Mostrando 1 a 8 de 10 residentes');
    await directory.pagerButtons().next.click();
    await expect(directory.pageIndicator()).toHaveText('2 / 2');
    await expect(directory.dataRows()).toHaveCount(2);

    await directory.statusFilter().selectOption('INACTIVE');
    await expect(directory.pageIndicator()).toHaveText('1 / 1');
    await expect(directory.paginationSummary()).toHaveText('Mostrando 1 a 2 de 2 residentes');
  });
});
