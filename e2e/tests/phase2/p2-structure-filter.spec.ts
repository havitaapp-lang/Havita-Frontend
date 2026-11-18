import { test, expect, type Page } from '@playwright/test';
import { credentials } from '../../support/env';
import { requirePhase2, uiLogin } from '../../helpers/phase2';

/**
 * Fase 2 / E4 — filtro administrativo por estructura (structureId) en el Directorio y en Unidades, escritorio y móvil
 * (sandbox, SANDBOX_PHASE2=1: estructuras sintéticas «Torre 1» y «Torre 10» y unidades E2E-SBX-* sin estructura).
 * «Torre 1» no incluye «Torre 10»; las unidades sin estructura siguen accesibles. Migrado del scratchpad de E4.
 */
test.describe('Fase 2 · filtro por estructura', () => {
  requirePhase2();

  /** Elemento visible con ese texto exacto (la tabla tiene una variante oculta según el tamaño de pantalla). */
  const visibleText = (page: Page, text: string) => page.getByText(text, { exact: true }).locator('visible=true');
  /** Elemento visible que contiene el texto (la ruta de la unidad se pinta como «Torre 10 / E2E-Torre10-101»). */
  const visibleSub = (page: Page, text: string) => page.getByText(text).locator('visible=true');

  for (const viewport of [{ width: 1366, height: 860, name: 'escritorio' }, { width: 390, height: 844, name: 'móvil' }]) {
    test(`directorio (${viewport.name}): Torre 1, Torre 10, sin estructura y todas`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await uiLogin(page, credentials('admin')!, /\/admin\/?$/);
      await page.goto('/admin/residents');
      const filter = page.getByTestId('structure-filter');
      await expect(filter).toBeVisible();

      const wait = () => page.waitForResponse((r) => r.url().includes('/api/v1/residents') && r.request().method() === 'GET');
      let resp = wait();
      await filter.selectOption({ label: 'Torre 1' });
      expect((await resp).url()).toContain('structureId=');
      await expect(visibleText(page, 'Residente Torre 1').first()).toBeVisible();
      await expect(visibleText(page, 'Residente Torre 10')).toHaveCount(0);

      resp = wait();
      await filter.selectOption({ label: 'Torre 10' });
      await resp;
      await expect(visibleText(page, 'Residente Torre 10').first()).toBeVisible();
      await expect(visibleText(page, 'Residente Torre 1')).toHaveCount(0);

      resp = wait();
      await filter.selectOption({ label: 'Sin estructura' });
      expect((await resp).url()).toContain('structureId=none');
      await expect(visibleText(page, 'Residente Torre 1')).toHaveCount(0);
      await expect(visibleText(page, 'Residente Torre 10')).toHaveCount(0);

      // «Todas» combinada con la búsqueda (el directorio pagina: se acota para ver ambas torres en la primera página).
      // React Query puede servirla desde caché; basta con que vuelvan a verse las dos torres.
      await page.getByLabel('Buscar residentes').fill('Residente Torre');
      await filter.selectOption({ label: 'Todas las estructuras' });
      await expect(visibleText(page, 'Residente Torre 1').first()).toBeVisible();
      await expect(visibleText(page, 'Residente Torre 10').first()).toBeVisible();
    });
  }

  test('unidades (lista): Torre 10 muestra solo su unidad; sin estructura y todas siguen accesibles', async ({ page }) => {
    await uiLogin(page, credentials('admin')!, /\/admin\/?$/);
    await page.goto('/admin/properties');
    // Dos estructuras reales (Torre 1 y Torre 10); las unidades sin estructura no cuentan como torres.
    await expect(page.getByText('Torres', { exact: true }).locator('xpath=preceding-sibling::*[1]')).toHaveText('2');
    await page.getByRole('button', { name: /Lista/ }).first().click();
    const filter = page.getByTestId('structure-filter');
    await filter.selectOption({ label: 'Torre 10' });
    await expect(visibleSub(page, 'E2E-Torre10-101').first()).toBeVisible();
    await expect(visibleSub(page, 'E2E-Torre1-101')).toHaveCount(0);
    await expect(visibleSub(page, 'E2E-SBX-101')).toHaveCount(0);
    await filter.selectOption({ label: 'Sin estructura' });
    await page.getByPlaceholder(/Buscar propiedad/).fill('E2E-SBX-101');
    await expect(visibleSub(page, 'E2E-SBX-101').first()).toBeVisible();
    await expect(visibleSub(page, 'E2E-Torre10-101')).toHaveCount(0);
    // «Todas» (la lista pagina de 10 en 10: se acota con la búsqueda para ver ambas torres en la primera página).
    await page.getByPlaceholder(/Buscar propiedad/).fill('E2E-Torre');
    await filter.selectOption({ label: 'Todas las estructuras' });
    await expect(visibleSub(page, 'E2E-Torre1-101').first()).toBeVisible();
    await expect(visibleSub(page, 'E2E-Torre10-101').first()).toBeVisible();
  });
});
