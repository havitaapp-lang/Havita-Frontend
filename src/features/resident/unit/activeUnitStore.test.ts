import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResidentUnit } from './activeUnitStore';

const unit = (id: string, extra: Partial<ResidentUnit> = {}): ResidentUnit => ({
  propertyId: id, number: id, name: `Apto ${id}`, type: 'Propietario', status: 'OCCUPIED', ...extra,
});

/** Storage en memoria: permite simular la sessionStorage propia de otra pestaña. */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    key: (i: number) => Array.from(data.keys())[i] ?? null,
    removeItem: (k: string) => { data.delete(k); },
    setItem: (k: string, v: string) => { data.set(k, String(v)); },
  } as Storage;
}

async function freshStore() {
  vi.resetModules();
  return import('./activeUnitStore');
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolveSelection (D1)', () => {
  it('1 · una sola unidad: se selecciona automáticamente', async () => {
    const { resolveSelection } = await freshStore();
    expect(resolveSelection([unit('A')], null, null)).toEqual({ unitId: 'A', status: 'ready' });
  });

  it('2-3 · varias unidades sin selección: se exige elegir, nunca la primera', async () => {
    const { resolveSelection } = await freshStore();
    expect(resolveSelection([unit('A'), unit('B')], null, null)).toEqual({ unitId: null, status: 'selection-required' });
  });

  it('4 · restaura una selección válida (de la pestaña o la preferencia guardada)', async () => {
    const { resolveSelection } = await freshStore();
    expect(resolveSelection([unit('A'), unit('B')], 'B', null)).toEqual({ unitId: 'B', status: 'ready' });
    expect(resolveSelection([unit('A'), unit('B')], null, 'B')).toEqual({ unitId: 'B', status: 'ready' });
  });

  it('5 · selección guardada revocada: no se restaura y no se cae a otra unidad', async () => {
    const { resolveSelection } = await freshStore();
    // C ya no está en la lista autorizada (revocada): con varias unidades, hay que elegir.
    expect(resolveSelection([unit('A'), unit('B')], 'C', 'C')).toEqual({ unitId: null, status: 'selection-required' });
    // Si solo queda una, esa (no hay ambigüedad).
    expect(resolveSelection([unit('A')], 'C', 'C')).toEqual({ unitId: 'A', status: 'ready' });
  });

  it('sin unidades: estado "none"', async () => {
    const { resolveSelection } = await freshStore();
    expect(resolveSelection([], 'A', 'A')).toEqual({ unitId: null, status: 'none' });
  });
});

describe('etiquetas y duplicados', () => {
  it('10 · una unidad con varias relaciones aparece una vez, con sus relaciones', async () => {
    const { dedupeUnits, unitRelations } = await freshStore();
    const merged = dedupeUnits([unit('A', { type: 'Propietario' }), unit('A', { type: 'Residente' }), unit('B')]);
    expect(merged).toHaveLength(2);
    expect(unitRelations(merged[0])).toBe('Propietario · Residente');
    expect(unitRelations(unit('X', { relations: ['Propietario', 'Residente', 'Propietario'] }))).toBe('Propietario · Residente');
  });

  it('11 · comunidad sin torres: la etiqueta es la unidad, sin torre inventada', async () => {
    const { unitLabel } = await freshStore();
    expect(unitLabel(unit('C15', { name: 'Casa 15', structureName: null }))).toBe('Casa 15');
    expect(unitLabel(unit('T2', { name: 'Apto 402', structureName: 'Torre 2' }))).toBe('Torre 2 · Apto 402');
    expect(unitLabel(unit('T3', { label: 'Torre 3 · Apto 201' }))).toBe('Torre 3 · Apto 201');
  });
});

describe('activeUnitStore: ámbito y pestañas', () => {
  it('6 · cambio de unidad: notifica y guarda por usuario y comunidad', async () => {
    const { activeUnitStore } = await freshStore();
    const listener = vi.fn();
    activeUnitStore.subscribe(listener);
    activeUnitStore.setScope({ userId: 'u1', tenantId: 't1' });
    activeUnitStore.setActiveUnitId('A', true);
    activeUnitStore.setActiveUnitId('B', true);
    expect(activeUnitStore.getActiveUnitId()).toBe('B');
    expect(listener).toHaveBeenCalled();
    expect(sessionStorage.getItem('havita_active_unit:u1:t1')).toBe('B');
    expect(localStorage.getItem('havita_unit_pref:u1:t1')).toBe('B');
    expect(localStorage.getItem('havita_active_property')).toBeNull();
  });

  it('7 · cambio de comunidad: no arrastra la unidad de la comunidad anterior', async () => {
    const { activeUnitStore } = await freshStore();
    activeUnitStore.setScope({ userId: 'u1', tenantId: 't1' });
    activeUnitStore.setActiveUnitId('A', true);
    activeUnitStore.setScope({ userId: 'u1', tenantId: 't2' });
    expect(activeUnitStore.getActiveUnitId()).toBeNull();
    expect(activeUnitStore.getPreferredUnitId()).toBeNull();
  });

  it('8 · cambio de usuario y cierre de sesión: la siguiente cuenta no hereda la selección', async () => {
    const { activeUnitStore } = await freshStore();
    localStorage.setItem('havita_active_property', 'LEGADO'); // clave global antigua
    activeUnitStore.setScope({ userId: 'u1', tenantId: 't1' });
    activeUnitStore.setActiveUnitId('A', true);
    activeUnitStore.clear();
    expect(activeUnitStore.getActiveUnitId()).toBeNull();
    expect(sessionStorage.getItem('havita_active_unit:u1:t1')).toBeNull();
    expect(localStorage.getItem('havita_active_property')).toBeNull();
    activeUnitStore.setScope({ userId: 'u2', tenantId: 't1' });
    expect(activeUnitStore.getActiveUnitId()).toBeNull();
    expect(activeUnitStore.getPreferredUnitId()).toBeNull();
  });

  it('9 · dos pestañas: cada una conserva su unidad aunque la otra cambie la suya', async () => {
    // Pestaña 1
    const tab1 = await freshStore();
    tab1.activeUnitStore.setScope({ userId: 'u1', tenantId: 't1' });
    tab1.activeUnitStore.setActiveUnitId('A', true);

    // Pestaña 2: misma localStorage (mismo origen), sessionStorage propia.
    const tab1Session = window.sessionStorage;
    vi.stubGlobal('sessionStorage', memoryStorage());
    Object.defineProperty(window, 'sessionStorage', { value: globalThis.sessionStorage, configurable: true });
    const tab2 = await freshStore();
    tab2.activeUnitStore.setScope({ userId: 'u1', tenantId: 't1' });
    expect(tab2.activeUnitStore.getActiveUnitId()).toBeNull(); // no hereda la selección activa de la pestaña 1
    // La pestaña 2 elige B explícitamente.
    tab2.activeUnitStore.setActiveUnitId('B', true);

    // La pestaña 1 sigue operando sobre A (en memoria y en su propia sessionStorage).
    expect(tab1.activeUnitStore.getActiveUnitId()).toBe('A');
    expect(tab1Session.getItem('havita_active_unit:u1:t1')).toBe('A');
    expect(tab2.activeUnitStore.getActiveUnitId()).toBe('B');

    // Recargar la pestaña 2 restaura B (su sessionStorage), no la A de la otra pestaña.
    const tab2Reloaded = await freshStore();
    tab2Reloaded.activeUnitStore.setScope({ userId: 'u1', tenantId: 't1' });
    expect(tab2Reloaded.activeUnitStore.getStoredSessionUnitId()).toBe('B');

    Object.defineProperty(window, 'sessionStorage', { value: tab1Session, configurable: true });
  });
});
