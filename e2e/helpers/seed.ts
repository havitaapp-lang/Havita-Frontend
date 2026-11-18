import type { ApiSession, ResidentDto } from './api';
import { syntheticResident, uniqueTag } from './data';

type Cleanup = (fn: () => Promise<unknown>) => void;

/**
 * Isolated synthetic property so tests never change the status/occupancy of existing units.
 *
 * A-8: dar de baja a un residente ya no lo borra (queda INACTIVE con su historial), y una propiedad con residentes,
 * aunque esten inactivos, no se puede borrar (FK). Por eso las propiedades sinteticas con residentes salen de un
 * pool reutilizable (E2E-FIX-RES-NN) que se reinicia al terminar, en lugar de crearse y borrarse en cada prueba.
 * `_label` se mantiene por compatibilidad con los llamadores.
 */
export async function seedProperty(api: ApiSession, cleanup: Cleanup, _label = 'PROP') {
  const property = await fixtureProperty(api, 'RES');
  cleanup(() => resetFixtureProperty(api, property.id));
  return property;
}

/**
 * Reusable VACANT unit for invitation scenarios.
 *
 * The backend cannot delete a property that has ever had an invitation (FK from resident_invitations, HTTP 500)
 * and exposes no endpoint to delete invitations, so invitation tests use a fixed pool of synthetic units
 * (E2E-FIX-INV-01.., E2E-FIX-BLK-01..) that are reset before each use instead of being created and deleted.
 * Reset only touches E2E data: pending invitations are revoked, active E2E- residents are given the INACTIVE status
 * (logical removal, A-8), and the unit is set back to VACANT.
 */
const poolCursor: Record<string, number> = {};

export async function fixtureProperty(api: ApiSession, pool: 'INV' | 'BLK' | 'RES' = 'INV') {
  poolCursor[pool] = (poolCursor[pool] ?? 0) + 1;
  const name = `E2E-FIX-${pool}-${String(poolCursor[pool]).padStart(2, '0')}`;
  const property = (await api.findPropertyByName(name)) ?? (await api.createProperty(name));
  await resetFixtureProperty(api, property.id);
  return { ...property, name };
}

export async function resetFixtureProperty(api: ApiSession, propertyId: string): Promise<void> {
  for (const inv of await api.listInvitations(propertyId)) {
    if (inv.status === 'PENDING') await api.revokeInvitation(inv.id);
  }
  for (const r of await api.residentsOfProperty(propertyId)) {
    // Baja logica (A-8): los ya INACTIVE se quedan como historial sintetico.
    if (r.name.startsWith('E2E-') && r.status === 'ACTIVE') await api.deleteResident(r.id);
  }
  await api.updateProperty(propertyId, { status: 'VACANT' });
}

/**
 * Creates `count` residents that share one search tag (in name and email) on a synthetic property.
 * Returns the tag so a search narrows the directory to exactly these rows.
 */
export async function seedResidents(
  api: ApiSession,
  cleanup: Cleanup,
  label: string,
  types: Array<'Propietario' | 'Arrendatario'>,
): Promise<{ tag: string; property: { id: string; number: string; name: string }; residents: ResidentDto[] }> {
  const property = await seedProperty(api, cleanup, `${label}P`);
  const tag = uniqueTag(label);
  const residents: ResidentDto[] = [];
  // Sin borrado físico (A-8), las filas E2E- dadas de baja de una unidad del pool se reutilizan: se renombran y se
  // reactivan (misma fila), y solo se crea una fila nueva si no queda ninguna libre. Así el número de residentes
  // sintéticos por unidad queda acotado al máximo que pide una prueba, en lugar de crecer en cada ejecución.
  const reusable = (await api.residentsOfProperty(property.id)).filter(
    (x) => x.name.startsWith('E2E-') && x.status === 'INACTIVE',
  );
  for (const [i, type] of types.entries()) {
    const r = syntheticResident(`${label}${i}`);
    const data = {
      name: `${tag} ${type} ${String(i + 1).padStart(2, '0')}`,
      email: `${tag.toLowerCase()}-${i}@example.test`,
      phone: r.phone,
      type,
    };
    const free = reusable.shift();
    const created = free
      ? await api.updateResident(free.id, { ...data, status: 'ACTIVE' })
      : await api.createResident({ propertyId: property.id, ...data });
    cleanup(() => api.deleteResident(created.id));
    residents.push(created);
  }
  return { tag, property, residents };
}
