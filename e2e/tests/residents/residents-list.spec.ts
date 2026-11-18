import { test, expect, asRole, requireWrites } from '../../fixtures/test';
import { seedResidents } from '../../helpers/seed';
import { ResidentsDirectoryPage } from '../../pages/ResidentsDirectoryPage';

/** /admin/residents — table rendering, pagination and empty state. Page size is 8 (ITEMS_PER_PAGE). */
test.describe('Directorio de residentes · listado', () => {
  asRole('admin');

  test('muestra encabezado, columnas y controles', async ({ page }) => {
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();

    for (const col of ['Residente', 'Propiedad', 'Tipo', 'Contacto', 'Estado', 'Acciones']) {
      await expect(directory.table().getByRole('columnheader', { name: col })).toBeVisible();
    }
    await expect(directory.newButton()).toBeVisible();
    await expect(directory.search()).toHaveAttribute('placeholder', 'Buscar por nombre, apartamento o correo...');
    await expect(directory.typeFilter()).toBeVisible();
  });

  test('la lista se carga desde GET /api/v1/residents paginado de 8 en 8', async ({ page }) => {
    const directory = new ResidentsDirectoryPage(page);
    const list = page.waitForResponse((r) => r.url().includes('/api/v1/residents?') && r.request().method() === 'GET');
    await page.goto('/admin/residents');
    const res = await list;
    expect(res.status()).toBe(200);
    const url = new URL(res.url());
    expect(url.searchParams.get('page')).toBe('0');
    expect(url.searchParams.get('size')).toBe('8');

    const body = await res.json();
    const expectedRows = Math.min(8, body.data.content.length);
    await expect(directory.dataRows()).toHaveCount(expectedRows || 1); // 1 = empty-state row
  });

  test('una fila muestra nombre, propiedad, tipo, contacto y estado del residente', async ({ page, adminApi, cleanup }) => {
    requireWrites();
    const { tag, property, residents } = await seedResidents(adminApi, cleanup, 'ROW', ['Propietario']);
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await directory.searchFor(tag);

    const row = directory.row(residents[0].name);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(residents[0].email);
    await expect(row).toContainText(residents[0].phone);
    await expect(row).toContainText('Propietario');
    // TASK-007 (#3): el estado se muestra en español.
    await expect(row).toContainText('Activo');
    // The "Propiedad" column should identify the unit, not expose its internal UUID.
    await expect(row.getByRole('cell').nth(1)).toHaveText(property.number);
  });

  test('pagina los resultados y el resumen refleja el total real', async ({ page, adminApi, cleanup }) => {
    requireWrites();
    const { tag } = await seedResidents(adminApi, cleanup, 'PAG', Array(9).fill('Propietario'));
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await directory.searchFor(tag);

    await expect(directory.dataRows()).toHaveCount(8);
    await expect(directory.pageIndicator()).toHaveText('1 / 2');
    const { prev, next } = directory.pagerButtons();
    await expect(prev).toBeDisabled();
    await expect(next).toBeEnabled();
    await expect(directory.paginationSummary()).toHaveText('Mostrando 1 a 8 de 9 residentes');

    const page2 = page.waitForResponse((r) => r.url().includes('/api/v1/residents?') && r.url().includes('page=1'));
    await next.click();
    await page2;
    await expect(directory.dataRows()).toHaveCount(1);
    await expect(directory.pageIndicator()).toHaveText('2 / 2');
    await expect(next).toBeDisabled();
    await expect(directory.paginationSummary()).toHaveText('Mostrando 9 a 9 de 9 residentes');

    await prev.click();
    await expect(directory.pageIndicator()).toHaveText('1 / 2');
  });

  test('estado vacío cuando ningún residente coincide', async ({ page }) => {
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await directory.searchFor('E2E-NO-EXISTE-ZZZ-000');

    await expect(directory.emptyState()).toBeVisible();
    await expect(directory.paginationSummary()).toHaveCount(0);
  });
});
