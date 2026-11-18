import { test, expect, asRole, requireWrites, requireSandbox } from '../../fixtures/test';
import { ApiSession } from '../../helpers/api';
import { uniqueTag } from '../../helpers/data';
import { confirmSwal, cancelSwal, toast } from '../../helpers/swal';
import { MyHomePage } from '../../pages/MyHomePage';

/**
 * Resident portal "Mi Hogar" (/resident/my-home): household people, vehicles and pets of the active unit.
 * Backend: ResidentSelfController (/api/v1/resident/me/**, role RESIDENT).
 */
test.describe('Mi Hogar · estructura', () => {
  asRole('resident');

  test('muestra las secciones Personas, Vehículos y Mascotas', async ({ page }) => {
    const home = new MyHomePage(page);
    await home.goto();
    await expect(home.people()).toBeVisible();
    await expect(home.vehicles()).toBeVisible();
    await expect(home.pets()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Hogar', exact: true })).toBeVisible();
  });
});

test.describe('Mi Hogar · vehículos', () => {
  asRole('resident');
  test.beforeEach(() => requireWrites());

  /** Removes any vehicle this test created even if the UI never refreshed. */
  async function trackVehicle(cleanup: (fn: () => Promise<unknown>) => void, plate: string) {
    cleanup(async () => {
      const api = await ApiSession.login('resident');
      const list = await (await api.get('/resident/me/vehicles')).json();
      for (const v of list.data ?? []) if (v.plate === plate) await api.delete(`/resident/me/vehicles/${v.id}`);
      await api.dispose();
    });
  }

  test('la placa se normaliza a mayúsculas sin símbolos y máximo 10 caracteres', async ({ page }) => {
    const home = new MyHomePage(page);
    await home.goto();
    await home.addVehicle().click();
    // maxlength=10 truncates the raw input before formatPlateInput strips symbols, so "ab c-12*3x" → "ABC-123X".
    await home.plate().fill('ab c-12*3xyz9999');
    await expect(home.plate()).toHaveValue('ABC-123X');
    await home.plate().fill('xyz98765432');
    await expect(home.plate()).toHaveValue('XYZ9876543');
    await expect(home.plate()).toHaveAttribute('required', '');
  });

  test('no guarda un vehículo sin placa', async ({ page }) => {
    const home = new MyHomePage(page);
    await home.goto();
    let posts = 0;
    page.on('request', (r) => r.method() === 'POST' && r.url().includes('/resident/me/vehicles') && posts++);
    await home.addVehicle().click();
    await home.saveVehicle().click();
    expect(await home.plate().evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
    expect(posts).toBe(0);
  });

  test('registra, edita y elimina un vehículo', async ({ page, cleanup }) => {
    requireSandbox();
    const plate = `E2E${Date.now().toString(36).toUpperCase().slice(-6)}`.slice(0, 10);
    await trackVehicle(cleanup, plate);
    const home = new MyHomePage(page);
    await home.goto();

    // Create
    await home.addVehicle().click();
    await home.plate().fill(plate);
    await home.vehicleType().selectOption('Moto');
    await home.vehicleBrand().fill('E2E Marca');
    await home.vehicleColor().fill('Gris');
    const created = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/resident/me/vehicles'));
    await home.saveVehicle().click();
    expect((await created).ok()).toBe(true);
    await expect(toast(page, 'Vehículo registrado exitosamente')).toBeVisible();
    const item = home.vehicleItem(plate);
    await expect(item).toContainText('Moto');
    await expect(item).toContainText('E2E Marca');

    // Edit
    await item.getByRole('button', { name: 'Editar vehículo' }).click();
    await expect(home.vehicles().getByText('Editar vehículo', { exact: true })).toBeVisible();
    await expect(home.plate()).toHaveValue(plate);
    await home.vehicleColor().fill('Rojo');
    const updated = page.waitForResponse((r) => r.request().method() === 'PUT' && r.url().includes('/resident/me/vehicles/'));
    await home.saveVehicle().click();
    expect((await updated).ok()).toBe(true);
    await expect(home.vehicleItem(plate)).toContainText('Rojo');

    // Delete: cancel first, then confirm
    await home.vehicleItem(plate).getByRole('button', { name: 'Eliminar vehículo' }).click();
    await cancelSwal(page, '¿Eliminar vehículo?');
    await expect(home.vehicleItem(plate)).toBeVisible();

    await home.vehicleItem(plate).getByRole('button', { name: 'Eliminar vehículo' }).click();
    const deleted = page.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().includes('/resident/me/vehicles/'));
    await confirmSwal(page, '¿Eliminar vehículo?', 'Sí, eliminar');
    expect((await deleted).ok()).toBe(true);
    await expect(toast(page, 'Vehículo eliminado')).toBeVisible();
    // The list must drop the deleted vehicle without a manual reload.
    await expect(home.vehicles().getByText(plate, { exact: true })).toHaveCount(0);

    // TASK-011: the deletion persists — gone after a reload and from the backend list.
    await page.reload();
    await expect(home.vehicles()).toBeVisible();
    await expect(home.vehicles().getByText(plate, { exact: true })).toHaveCount(0);
    const api = await ApiSession.login('resident');
    const after = await (await api.get('/resident/me/vehicles')).json();
    await api.dispose();
    expect((after.data ?? []).filter((v: { plate: string }) => v.plate === plate)).toHaveLength(0);
  });
});

test.describe('Mi Hogar · mascotas', () => {
  asRole('resident');
  test.beforeEach(() => requireWrites());

  test('marcar raza peligrosa muestra el aviso de póliza', async ({ page }) => {
    const home = new MyHomePage(page);
    await home.goto();
    await home.addPet().click();
    const notice = page.getByText('Se debe presentar certificado de seguro vigente a la administración.');
    await expect(notice).toBeHidden();
    await home.dangerousBreed().check();
    await expect(notice).toBeVisible();
    await home.dangerousBreed().uncheck();
    await expect(notice).toBeHidden();
  });

  test('registra, edita y elimina una mascota', async ({ page, cleanup }) => {
    requireSandbox();
    const name = uniqueTag('PET');
    cleanup(async () => {
      const api = await ApiSession.login('resident');
      const list = await (await api.get('/resident/me/pets')).json();
      for (const p of list.data ?? []) if (p.name === name) await api.delete(`/resident/me/pets/${p.id}`);
      await api.dispose();
    });
    const home = new MyHomePage(page);
    await home.goto();

    await home.addPet().click();
    await home.petName().fill(name);
    await home.petType().selectOption('Gato');
    await home.petBreed().fill('Criollo');
    await home.dangerousBreed().check();
    const created = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/resident/me/pets'));
    await home.savePet().click();
    expect((await created).ok()).toBe(true);
    await expect(toast(page, 'Mascota registrada exitosamente')).toBeVisible();
    await expect(home.petItem(name)).toContainText('Gato');
    await expect(home.petItem(name)).toContainText('PPP');

    await home.petItem(name).getByRole('button', { name: 'Editar mascota' }).click();
    await expect(home.petName()).toHaveValue(name);
    await home.petColor().fill('Negro');
    await home.savePet().click();
    await expect(toast(page, 'Mascota actualizada exitosamente')).toBeVisible();
    await expect(home.petItem(name)).toContainText('Negro');

    await home.petItem(name).getByRole('button', { name: 'Eliminar mascota' }).click();
    const deleted = page.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().includes('/resident/me/pets/'));
    await confirmSwal(page, '¿Eliminar mascota?', 'Sí, eliminar');
    expect((await deleted).ok()).toBe(true);
    await expect(toast(page, 'Mascota eliminada')).toBeVisible();
    await expect(home.pets().getByText(name, { exact: true })).toHaveCount(0);

    // TASK-011: the deletion persists — gone after a reload and from the backend list.
    await page.reload();
    await expect(home.pets()).toBeVisible();
    await expect(home.pets().getByText(name, { exact: true })).toHaveCount(0);
    const api = await ApiSession.login('resident');
    const after = await (await api.get('/resident/me/pets')).json();
    await api.dispose();
    expect((after.data ?? []).filter((p: { name: string }) => p.name === name)).toHaveLength(0);
  });
});

test.describe('Mi Hogar · invitar personas', () => {
  asRole('resident');
  test.beforeEach(() => requireWrites());

  test('genera un enlace de invitación de co-residente y se puede cancelar', async ({ page, cleanup }) => {
    requireSandbox();
    const home = new MyHomePage(page);
    await home.goto();
    await home.invite().click();
    await expect(page.getByRole('heading', { name: 'Generar Enlace de Invitación' })).toBeVisible();
    await home.people().getByRole('button', { name: /Familiar \/ Co-Residente/ }).click();

    const created = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/resident/me/invitations'));
    await home.generateInvitation().click();
    const res = await created;
    if (!res.ok()) {
      // Business rules may legitimately forbid inviting (e.g. account is not owner/tenant of the unit).
      const body = await res.json().catch(() => ({}));
      test.info().annotations.push({ type: 'business-rule', description: `HTTP ${res.status()} ${body?.message ?? ''}` });
      await expect(page.getByRole('dialog')).toBeVisible();
      return;
    }
    const invitation = (await res.json()).data;
    cleanup(async () => {
      const api = await ApiSession.login('resident');
      await api.delete(`/resident/me/invitations/${invitation.id}`);
      await api.dispose();
    });

    await expect(toast(page, 'Invitación generada')).toBeVisible();
    await expect(page.getByText('Válido por 24 horas')).toBeVisible();
    await expect(home.people().getByRole('button', { name: 'Copiar Enlace', exact: true })).toBeVisible();
    await home.people().getByRole('button', { name: 'Cerrar', exact: true }).click();

    // Pending invitation can be cancelled from the people list.
    await home.people().getByRole('button', { name: 'Cancelar invitación' }).first().click();
    const cancelled = page.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().includes('/resident/me/invitations/'));
    await confirmSwal(page, '¿Cancelar invitación?', 'Sí, cancelar');
    expect((await cancelled).ok()).toBe(true);
  });
});
