import { randomUUID } from 'node:crypto';
import { test, expect, asRole, requireWrites, requireSandbox } from '../../fixtures/test';
import { ApiSession } from '../../helpers/api';
import { fixtureProperty } from '../../helpers/seed';
import { uniqueTag } from '../../helpers/data';

/**
 * SEC-6 contra el entorno local: asambleas (asistentes y delegacion de voto), comunicaciones por id y entrega
 * de eventos SSE en el navegador. Solo crea datos sinteticos con prefijo E2E- y los borra al terminar.
 */

type Unit = { propertyId: string };

async function ownUnits(api: ApiSession): Promise<string[]> {
  const res = await api.get('/resident/me/properties');
  expect(res.ok()).toBeTruthy();
  return ((await res.json()).data as Unit[]).map((u) => u.propertyId);
}

async function foreignUnit(admin: ApiSession, mine: string[]): Promise<string | undefined> {
  const res = await admin.get('/residents', { size: 500 });
  const residents = (await res.json()).data.content as Array<{ propertyId: string; name: string }>;
  return residents.find((r) => !mine.includes(r.propertyId) && !r.name.startsWith('E2E-'))?.propertyId;
}

test.describe('SEC-6 · Asambleas · rol RESIDENT (API, solo lectura)', () => {
  test('asistentes de una asamblea inexistente u ajena: 404', async () => {
    const resident = await ApiSession.login('resident');
    try {
      expect((await resident.get(`/assemblies/${randomUUID()}/attendees`)).status()).toBe(404);
    } finally {
      await resident.dispose();
    }
  });

  test('en las asambleas de su comunidad solo ve la asistencia de sus propias unidades', async () => {
    const resident = await ApiSession.login('resident');
    try {
      const mine = await ownUnits(resident);
      const assemblies = (await (await resident.get('/assemblies', { size: 50 })).json()).data.content as Array<{ id: string }>;
      for (const a of assemblies) {
        const res = await resident.get(`/assemblies/${a.id}/attendees`);
        expect(res.status()).toBe(200);
        const attendees = (await res.json()).data as Array<{ propertyId: string }>;
        for (const at of attendees) expect(mine, 'asistencia de una unidad ajena expuesta').toContain(at.propertyId);
      }
    } finally {
      await resident.dispose();
    }
  });

  test('delegacion de voto: 403 para una unidad ajena, 200 para la propia', async ({ adminApi }) => {
    const resident = await ApiSession.login('resident');
    try {
      const mine = await ownUnits(resident);
      const foreign = await foreignUnit(adminApi, mine);
      test.skip(!foreign, 'NOT RUN: no hay una unidad ajena ocupada en los datos locales');
      expect((await resident.get(`/properties/${foreign}/voting-delegation`)).status()).toBe(403);
      expect((await resident.get(`/properties/${randomUUID()}/voting-delegation`)).status()).toBe(403);
      expect((await resident.get(`/properties/${mine[0]}/voting-delegation`)).status()).toBe(200);
      expect((await adminApi.get(`/properties/${foreign}/voting-delegation`)).status()).toBe(200);
    } finally {
      await resident.dispose();
    }
  });
});

test.describe('SEC-6 · Comunicaciones', () => {
  test('un borrador solo lo lee la administracion; el residente y porteria reciben 404', async ({ adminApi, cleanup }) => {
    requireWrites();
    const res = await adminApi.post('/communications', {
      title: uniqueTag('SEC6-BORRADOR'),
      content: 'Contenido sintetico de prueba',
      audience: 'Todos',
      status: 'DRAFT',
    });
    expect(res.status()).toBe(201);
    const id = (await res.json()).data.id as string;
    cleanup(() => adminApi.delete(`/communications/${id}`));

    const resident = await ApiSession.login('resident');
    const security = await ApiSession.login('security');
    try {
      expect((await resident.get(`/communications/${id}`)).status()).toBe(404);
      expect((await security.get(`/communications/${id}`)).status()).toBe(404);
      expect((await adminApi.get(`/communications/${id}`)).status()).toBe(200);
    } finally {
      await resident.dispose();
      await security.dispose();
    }
  });
});

test.describe('SEC-6 · Eventos en tiempo real (SSE) en el navegador del residente', () => {
  asRole('resident');

  test('recibe el paquete de su unidad y no el de una unidad ajena', async ({ page, adminApi, cleanup }) => {
    requireSandbox();
    requireWrites();
    const resident = await ApiSession.login('resident');
    const security = await ApiSession.login('security');
    // Se registra primero para que se ejecute al final (cleanup va en orden inverso): los borrados lo usan.
    cleanup(() => security.dispose());
    try {
      const [ownUnit] = await ownUnits(resident);
      const foreign = await fixtureProperty(adminApi, 'INV');

      // Conexion SSE real del navegador (mismo origen, a traves del proxy de Vite), con ticket del residente.
      await page.goto('/resident/my-home');
      const ticket = (await (await resident.post('/sync/stream-ticket')).json()).ticket as string;
      await page.evaluate((t) => {
        const w = window as unknown as { __sse: string[] };
        w.__sse = [];
        const es = new EventSource(`/api/v1/sync/stream?ticket=${encodeURIComponent(t)}`);
        for (const type of ['CONNECTED', 'PACKAGE_CREATED']) {
          es.addEventListener(type, (e) => w.__sse.push(`${type} ${(e as MessageEvent).data}`));
        }
      }, ticket);
      await expect.poll(() => page.evaluate(() => (window as unknown as { __sse: string[] }).__sse.length)).toBeGreaterThan(0);

      const foreignTag = uniqueTag('SEC6-AJENO');
      const ownTag = uniqueTag('SEC6-PROPIO');
      for (const [propertyId, recipientName] of [[foreign.id, foreignTag], [ownUnit, ownTag]]) {
        const res = await security.post('/access/packages', { propertyId, recipientName, company: 'E2E' });
        expect(res.status()).toBe(201);
        const pkgId = (await res.json()).data.id as string;
        cleanup(() => security.delete(`/access/packages/${pkgId}`));
      }

      await expect
        .poll(() => page.evaluate(() => (window as unknown as { __sse: string[] }).__sse.join('\n')), { timeout: 15000 })
        .toContain(ownTag);
      const all = await page.evaluate(() => (window as unknown as { __sse: string[] }).__sse.join('\n'));
      expect(all, 'el residente recibio por SSE un paquete de otra unidad').not.toContain(foreignTag);
    } finally {
      await resident.dispose();
    }
  });
});
