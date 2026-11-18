import { expect, type Locator, type Page } from '@playwright/test';

/** /resident/my-home — "Mi Hogar" (src/features/resident/ResidentMyHome.tsx). */
export class MyHomePage {
  constructor(readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/resident/my-home');
    await expect(this.section('Vehículos')).toBeVisible();
  }

  /** Each block is a <section> titled by an h3; sections are scoped by that heading. */
  section(title: 'Personas' | 'Vehículos' | 'Mascotas'): Locator {
    return this.page.locator('section').filter({ has: this.page.getByRole('heading', { name: title, exact: true }) });
  }

  // Vehicles
  readonly vehicles = () => this.section('Vehículos');
  readonly addVehicle = () => this.vehicles().getByRole('button', { name: 'Añadir' });
  readonly plate = () => this.vehicles().getByPlaceholder('Placa (ej. ABC123) *');
  readonly vehicleType = () => this.vehicles().getByRole('combobox');
  readonly vehicleColor = () => this.vehicles().getByPlaceholder('Color');
  readonly vehicleBrand = () => this.vehicles().getByPlaceholder('Marca (ej. Toyota)');
  readonly vehicleModel = () => this.vehicles().getByPlaceholder('Modelo');
  readonly saveVehicle = () => this.vehicles().getByRole('button', { name: 'Guardar' });
  readonly vehicleCount = () => this.vehicles().getByText(/^\d+ registrado\(s\)$/);
  vehicleItem(plate: string): Locator {
    return this.vehicles().getByText(plate, { exact: true }).locator('xpath=ancestor::div[2]');
  }

  // Pets
  readonly pets = () => this.section('Mascotas');
  readonly addPet = () => this.pets().getByRole('button', { name: 'Añadir' });
  readonly petName = () => this.pets().getByPlaceholder('Nombre de la mascota *');
  readonly petType = () => this.pets().getByRole('combobox');
  readonly petBreed = () => this.pets().getByPlaceholder('Raza');
  readonly petColor = () => this.pets().getByPlaceholder('Color');
  readonly dangerousBreed = () => this.pets().getByRole('checkbox', { name: 'Raza potencialmente peligrosa' });
  readonly savePet = () => this.pets().getByRole('button', { name: 'Guardar' });
  petItem(name: string): Locator {
    return this.pets().getByText(name, { exact: true }).locator('xpath=ancestor::div[3]');
  }

  // People
  readonly people = () => this.section('Personas');
  readonly invite = () => this.people().getByRole('button', { name: 'Invitar' });
  readonly generateInvitation = () => this.people().getByRole('button', { name: 'Generar Invitación' });
}
