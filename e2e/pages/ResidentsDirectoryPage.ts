import { expect, type Locator, type Page } from '@playwright/test';

/** /admin/residents — "Directorio de Residentes" (src/features/admin/ResidentsPage.tsx). */
export class ResidentsDirectoryPage {
  constructor(readonly page: Page) {}

  readonly heading = () => this.page.getByRole('heading', { name: 'Directorio de Residentes' });
  readonly newButton = () => this.page.getByRole('button', { name: 'Nuevo Residente' });
  readonly search = () => this.page.getByRole('searchbox');
  // The type filter <select> has no label; it is identified by its own option set.
  readonly typeFilter = () => this.page.locator('select').filter({ hasText: 'Todos los tipos' });
  /** D-5 (TASK-008): Activos por defecto; Inactivos o Todos los estados para el historial. */
  readonly statusFilter = () => this.page.getByRole('combobox', { name: 'Filtrar por estado' });
  readonly table = () => this.page.getByRole('table');
  readonly emptyState = () => this.table().getByText('No se encontraron residentes con los filtros aplicados.');
  readonly paginationSummary = () => this.page.getByText(/^Mostrando \d+ a \d+ de \d+ residentes$/);
  readonly pageIndicator = () => this.page.getByText(/^\d+ \/ \d+$/);
  readonly form = () => new ResidentFormModal(this.page);

  async goto(): Promise<void> {
    await this.page.goto('/admin/residents');
    await expect(this.heading()).toBeVisible();
  }

  /** Data rows of the desktop table (excludes the header row). */
  dataRows(): Locator {
    return this.table().locator('tbody').getByRole('row');
  }

  row(text: string): Locator {
    return this.dataRows().filter({ hasText: text });
  }

  async searchFor(term: string): Promise<void> {
    const response = this.page.waitForResponse(
      (r) => r.url().includes('/api/v1/residents') && r.request().method() === 'GET' && r.url().includes(`search=`),
    );
    await this.search().fill(term);
    await response;
  }

  async openEdit(name: string): Promise<ResidentFormModal> {
    await this.row(name).getByRole('button', { name: 'Editar residente' }).click();
    const form = this.form();
    await expect(form.title('edit')).toBeVisible();
    return form;
  }

  async clickDelete(name: string): Promise<void> {
    await this.row(name).getByRole('button', { name: 'Eliminar residente' }).click();
  }

  pagerButtons(): { prev: Locator; next: Locator } {
    const bar = this.page.getByText(/^Mostrando /).locator('..');
    const buttons = bar.getByRole('button');
    return { prev: buttons.first(), next: buttons.last() };
  }
}

/** Create/Edit modal rendered inside ResidentsPage (role="dialog" con aria-modal desde TASK-007; located by its title). */
export class ResidentFormModal {
  constructor(readonly page: Page) {}

  title(mode: 'create' | 'edit'): Locator {
    return this.page.getByRole('heading', {
      name: mode === 'create' ? 'Registrar Nuevo Residente' : 'Editar Residente',
    });
  }

  readonly name = () => this.page.getByLabel('Nombre completo');
  readonly email = () => this.page.getByRole('textbox', { name: 'Correo electrónico' });
  readonly phone = () => this.page.getByRole('textbox', { name: 'Teléfono' });
  readonly type = () => this.page.getByLabel('Tipo de residente');
  readonly status = () => this.page.getByLabel('Estado de cuenta');
  /** TASK-007 (#1): una sola unidad por registro, con un filtro de búsqueda. */
  readonly unit = () => this.page.getByLabel(/^Unidad/);
  readonly unitSearch = () => this.page.getByRole('searchbox', { name: 'Buscar unidad' });
  readonly submitCreate = () => this.page.getByRole('button', { name: 'Registrar Residente' });
  readonly submitEdit = () => this.page.getByRole('button', { name: 'Guardar Cambios' });
  readonly cancel = () => this.page.getByRole('button', { name: 'Cancelar', exact: true });
  readonly close = () => this.page.getByRole('button', { name: 'Cerrar modal' });
  readonly errorSummary = () => this.page.getByRole('alert').filter({ hasText: /campos? que debes revisar/ });
  fieldError = (message: string | RegExp) => this.page.getByRole('alert').filter({ hasText: message });

  async fill(data: { name?: string; email?: string; phone?: string; type?: string; property?: string }) {
    if (data.name !== undefined) await this.name().fill(data.name);
    if (data.email !== undefined) await this.email().fill(data.email);
    if (data.phone !== undefined) await this.phone().fill(data.phone);
    if (data.type) await this.type().selectOption(data.type);
    if (data.property) await this.unit().selectOption({ label: data.property });
  }
}
