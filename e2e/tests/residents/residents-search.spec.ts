import { test, expect, asRole, requireWrites } from '../../fixtures/test';
import { seedResidents } from '../../helpers/seed';
import { ResidentsDirectoryPage } from '../../pages/ResidentsDirectoryPage';

/** Server-side search (ResidentRepository.searchResidents: name, email, phone, documentId; case-insensitive). */
test.describe('Directorio de residentes · búsqueda', () => {
  asRole('admin');
  test.beforeEach(() => requireWrites());

  test('busca por nombre sin distinguir mayúsculas', async ({ page, adminApi, cleanup }) => {
    const { tag, residents } = await seedResidents(adminApi, cleanup, 'SRCH', ['Propietario', 'Arrendatario']);
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();

    await directory.searchFor(tag.toLowerCase());
    await expect(directory.dataRows()).toHaveCount(2);
    for (const r of residents) await expect(directory.row(r.name)).toBeVisible();
  });

  test('busca por correo electrónico', async ({ page, adminApi, cleanup }) => {
    const { residents } = await seedResidents(adminApi, cleanup, 'MAIL', ['Propietario', 'Propietario']);
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();

    await directory.searchFor(residents[1].email);
    await expect(directory.dataRows()).toHaveCount(1);
    await expect(directory.row(residents[1].name)).toBeVisible();
  });

  test('busca por teléfono', async ({ page, adminApi, cleanup }) => {
    const { residents } = await seedResidents(adminApi, cleanup, 'TEL', ['Propietario']);
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();

    await directory.searchFor(residents[0].phone);
    await expect(directory.row(residents[0].name)).toBeVisible();
  });

  test('busca por número de apartamento, como anuncia el placeholder', async ({ page, adminApi, cleanup }) => {
    const { property, residents } = await seedResidents(adminApi, cleanup, 'APTO', ['Propietario']);
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();

    await directory.searchFor(property.number);
    await expect(directory.row(residents[0].name)).toBeVisible();
  });

  test('limpiar la búsqueda vuelve al listado completo y a la página 1', async ({ page, adminApi, cleanup }) => {
    const { tag } = await seedResidents(adminApi, cleanup, 'CLR', ['Propietario']);
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();

    await directory.searchFor(tag);
    await expect(directory.dataRows()).toHaveCount(1);
    // The unfiltered page is served from the react-query cache, so no new request is guaranteed.
    await directory.search().fill('');
    await expect(directory.search()).toHaveValue('');
    await expect.poll(() => directory.dataRows().count()).toBeGreaterThan(1);
    await expect(directory.pageIndicator()).toHaveText(/^1 \/ \d+$/);
  });
});

test.describe('Directorio de residentes · búsqueda (límites)', () => {
  asRole('admin');

  test('el campo de búsqueda limita la entrada a 100 caracteres', async ({ page }) => {
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    await expect(directory.search()).toHaveAttribute('maxlength', '100');
    await directory.search().fill('x'.repeat(150));
    await expect(directory.search()).toHaveValue('x'.repeat(100));
  });

  test('caracteres especiales en la búsqueda no rompen la consulta', async ({ page }) => {
    const directory = new ResidentsDirectoryPage(page);
    await directory.goto();
    const res = page.waitForResponse((r) => r.url().includes('/api/v1/residents?') && r.url().includes('search='));
    await directory.search().fill(`%_'"<script>`);
    expect((await res).status()).toBe(200);
    await expect(directory.heading()).toBeVisible();
  });
});
