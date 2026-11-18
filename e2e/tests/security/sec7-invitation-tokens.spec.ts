import { test, expect, asRole, requireWrites, requireSandbox } from '../../fixtures/test';
import { ApiSession, tokenFromLink } from '../../helpers/api';
import { confirmSwal } from '../../helpers/swal';
import { MyHomePage } from '../../pages/MyHomePage';

/**
 * SEC-7 contra el entorno local: los enlaces de invitacion solo se entregan al emitirlos. Mi Hogar no los lista y
 * quien emitio una invitacion de hogar genera uno nuevo, que invalida el anterior. Solo crea una invitacion sintetica
 * y la revoca al terminar.
 */
test.describe('SEC-7 · Mi Hogar · enlaces de invitación', () => {
  asRole('resident');
  test.beforeEach(() => requireWrites());

  test('el listado no expone enlaces y el emisor genera uno nuevo que invalida el anterior', async ({ page, cleanup }) => {
    requireSandbox();
    const api = await ApiSession.login('resident');
    const ids: string[] = [];
    cleanup(async () => {
      for (const id of ids) await api.delete(`/resident/me/invitations/${id}`);
      await api.dispose();
    });

    const info = (await (await api.get('/resident/me/property-info')).json()).data;
    const res = await api.post('/resident/me/invitations', { type: 'Residente', email: '', name: '', phone: '', propertyId: info.propertyId });
    expect(res.ok(), `crear invitación de hogar: HTTP ${res.status()}`).toBe(true);
    const created = (await res.json()).data;
    ids.push(created.id);
    const oldToken = tokenFromLink(created.link);

    const people = await (await api.get('/resident/me/people')).text();
    expect(people).not.toContain('inviteLink');
    expect(people).not.toContain(oldToken);

    const home = new MyHomePage(page);
    await home.goto();
    await expect(home.people().getByTitle('Copiar enlace')).toHaveCount(0);
    await expect(home.people().getByTitle('Ver Código QR')).toHaveCount(0);
    // La cuenta E2E no debe tener otras invitaciones propias pendientes: el boton corresponde a la recien creada.
    const regenerate = home.people().getByTitle('Generar nuevo enlace');
    await expect(regenerate).toHaveCount(1);

    await regenerate.click();
    const regenerated = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith('/regenerate'));
    await confirmSwal(page, '¿Generar un nuevo enlace?', 'Sí, generar');
    const response = await regenerated;
    expect(response.url()).toContain(`/resident/me/invitations/${created.id}/regenerate`);
    expect(response.ok()).toBe(true);
    const renewed = (await response.json()).data;
    ids.push(renewed.id);
    await expect(page.getByText('¡Enlace Generado!')).toBeVisible();

    const newToken = tokenFromLink(renewed.link);
    expect(newToken).not.toBe(oldToken);
    expect((await api.get(`/public/resident-invitations/${newToken}`)).status()).toBe(200);
    expect((await api.get(`/public/resident-invitations/${oldToken}`)).status()).toBe(409);
  });
});
