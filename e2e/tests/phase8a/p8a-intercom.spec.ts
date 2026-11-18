import { readFileSync } from 'node:fs';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { requirePhase6, sandboxSql, SUB_A, uiLogin, urlFor } from '../../helpers/phase6';

/**
 * P8-A — citofonía de extremo a extremo en el SANDBOX aislado: backend contra PostgreSQL en contenedor y un SIMULADOR
 * local de la API REST de RealtimeKit (P8A_RTK_LOG). En los navegadores, toda petición a un host externo se BLOQUEA y se
 * registra, así que el SDK no puede alcanzar Cloudflare: estas pruebas validan el flujo de interfaz, los estados, el
 * backend y CUÁNDO intenta conectarse el SDK. NO establecen medios WebRTC ni miden latencia de audio real.
 */
// Límite de cada PRUEBA (no de la aplicación): cada una inicia sesión por interfaz en dos contextos (portería y
// residente) y en WebKit eso supera los 45 s generales. Las esperas de la aplicación conservan sus propios plazos.
test.describe.configure({ mode: 'serial', timeout: 90_000 });

interface External { host: string; at: number }

const isLocal = (url: URL) => url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname.endsWith('.localhost');

/**
 * Solo se interceptan los hosts EXTERNOS (se bloquean y se registran). Las peticiones locales no pasan por la
 * interceptación: interceptar también el stream SSE local retenía sus eventos en WebKit (artefacto de la prueba).
 */
async function isolate(context: BrowserContext, sink: External[]) {
  await context.route((url) => !isLocal(url), (route) => {
    sink.push({ host: new URL(route.request().url()).hostname, at: Date.now() });
    return route.abort();
  });
}

/**
 * P8-A3: con E2E_EARLY_PREPARE=1 (frontend VITE_INTERCOM_EARLY_PREPARE y backend early-token), el SDK SÍ se inicializa
 * mientras timbra. La garantía deja de ser «0 contactos con RealtimeKit» y pasa a ser la barrera del backend: la reunión
 * queda INACTIVE antes de emitir tokens y solo pasa a ACTIVE tras «Contestar».
 */
const EARLY = process.env.E2E_EARLY_PREPARE === '1';
const activations = (lines: string[]) => lines.filter((l) => / PATCH .*"status":\s*"ACTIVE"/.test(l));
const deactivations = (lines: string[]) => lines.filter((l) => / PATCH .*"status":\s*"INACTIVE"/.test(l));
const rtkLike = (sink: External[]) => sink.filter((e) => /cloudflare|realtime|dyte/i.test(e.host));
const stubLog = () => readFileSync(process.env.P8A_RTK_LOG!, 'utf-8').split(/\r?\n/).filter(Boolean);

async function startCall(guard: Page) {
  await guard.goto(`${urlFor(SUB_A())}/security/intercom`);
  await guard.getByPlaceholder(/Buscar por unidad/).fill('101');
  await guard.getByRole('button', { name: /101/ }).first().click();
  const row = guard.locator('div').filter({ has: guard.getByRole('heading', { name: 'P6 Owner1' }) })
    .filter({ has: guard.getByRole('button', { name: 'Llamar' }) }).last();
  await row.getByRole('button', { name: 'Llamar' }).click();
  await expect(guard.getByTestId('intercom-status')).toContainText('Timbrando en la vivienda', { timeout: 15_000 });
}

const lastCall = () => sandboxSql(
  "select status || '|' || coalesce(end_reason,'') || '|' || coalesce(duration_seconds::text,'') || '|' || " +
  "(connected_at is not null)::text from intercom_calls order by created_at desc limit 1");

test.describe('P8-A citofonía (sandbox, RealtimeKit simulado)', () => {
  test.beforeEach(() => {
    requirePhase6();
    test.skip(!process.env.P8A_RTK_LOG || !process.env.P6_GUARD_EMAIL, 'BLOCKED: falta el sandbox de P8-A');
  });

  test('aceptar y colgar: el SDK solo se activa tras la aceptación y la interfaz nunca finge «Conectado» sin audio', async ({ browser }) => {
    const guardExt: External[] = [];
    const residentExt: External[] = [];
    const guardCtx = await browser.newContext();
    const residentCtx = await browser.newContext();
    await isolate(guardCtx, guardExt);
    await isolate(residentCtx, residentExt);
    const guard = await guardCtx.newPage();
    const resident = await residentCtx.newPage();
    await uiLogin(resident, 'owner1');
    await uiLogin(guard, 'guard', SUB_A(), /\/security/);

    const logBefore = stubLog().length;
    await startCall(guard);
    await expect(resident.getByText('Llamada de Citofonía')).toBeVisible({ timeout: 15_000 });

    // Antes de aceptar: reunión y dos participantes creados en el backend, y NINGÚN cliente intenta conectarse.
    const created = stubLog().slice(logBefore);
    expect(created.filter((l) => / POST .*\/meetings$/.test(l))).toHaveLength(1);
    expect(created.filter((l) => / POST .*\/participants$/.test(l))).toHaveLength(2);
    await guard.waitForTimeout(1500);
    if (EARLY) {
      // Barrera: INACTIVE antes del primer participante; ninguna activación mientras timbra.
      const lines = stubLog().slice(logBefore);
      const firstParticipant = lines.findIndex((l) => / POST .*\/participants$/.test(l));
      const gate = lines.findIndex((l) => / PATCH .*"status":\s*"INACTIVE"/.test(l));
      expect(gate, 'reunión INACTIVE antes de emitir tokens').toBeGreaterThanOrEqual(0);
      expect(gate).toBeLessThan(firstParticipant);
      expect(activations(lines), 'ninguna activación mientras timbra').toHaveLength(0);
      expect(created.filter((l) => /kick-all/.test(l))).toHaveLength(0);
    } else {
      expect(created.filter((l) => /kick-all| PATCH /.test(l))).toHaveLength(0);
      expect(rtkLike(guardExt), 'la portería no debe contactar RealtimeKit mientras timbra').toHaveLength(0);
      expect(rtkLike(residentExt), 'el residente no debe contactar RealtimeKit antes de aceptar').toHaveLength(0);
    }

    const acceptedAt = Date.now();
    await resident.getByRole('button', { name: 'Contestar' }).click();
    await expect(guard.getByTestId('intercom-status')).not.toContainText('Timbrando', { timeout: 15_000 });

    // Con Cloudflare bloqueado no hay audio: la interfaz no debe mostrar «Conectado en tiempo real».
    for (let i = 0; i < 6; i++) {
      await expect(guard.getByTestId('intercom-status')).not.toContainText('Conectado en tiempo real');
      await expect(resident.getByTestId('intercom-status')).not.toContainText('Conectado en tiempo real');
      await guard.waitForTimeout(500);
    }
    const rtkAfter = [...rtkLike(guardExt), ...rtkLike(residentExt)];
    if (EARLY) {
      expect(activations(stubLog().slice(logBefore)), 'la reunión se activa al aceptar').toHaveLength(1);
    } else {
      expect(rtkAfter.every((e) => e.at >= acceptedAt), 'cualquier intento del SDK ocurre después de aceptar').toBeTruthy();
    }

    await guard.getByTitle('Colgar llamada').click();
    await expect(guard.getByTestId('intercom-status')).toContainText('Llamada finalizada', { timeout: 15_000 });
    await expect(resident.getByTestId('intercom-status')).toContainText('Llamada finalizada', { timeout: 15_000 });

    const [status, reason, duration, connected] = lastCall().split('|');
    expect(status).toBe('ENDED');
    expect(reason).toBe('ACCEPTED_NEVER_CONNECTED');
    expect(duration).toBe('0');
    expect(connected).toBe('false');
    await expect.poll(() => stubLog().slice(logBefore).filter((l) => /kick-all| PATCH /.test(l)).length, { timeout: 10_000 })
      .toBeGreaterThanOrEqual(2);

    // Métricas del residente: eventos en orden y sin el token del participante.
    const traces = await resident.evaluate(() => (window as any).__havitaIntercomMetrics?.list() ?? []);
    const recipient = traces.find((t: any) => t.role === 'RECIPIENT');
    expect(recipient).toBeTruthy();
    const events = recipient.marks.map((m: any) => m.event);
    expect(events.indexOf('RESIDENT_NOTIFIED')).toBeLessThan(events.indexOf('RESIDENT_ACCEPTED'));
    // El primer paso tras aceptar es pedir el micrófono. En navegadores sin dispositivo o con el diálogo de permiso sin
    // responder (Firefox headless) el SDK puede no llegar a inicializarse: si lo hace, siempre es después de aceptar.
    // Consentimiento: el micrófono NUNCA se pide antes de pulsar «Contestar» (ACCEPT_REQUESTED). Con
    // VITE_INTERCOM_FAST_CONNECT se pide justo al pulsar, en paralelo con POST /accept; sin la bandera, después de la
    // respuesta. Mientras timbra no hay petición de micrófono.
    expect(events.indexOf('MICROPHONE_REQUEST_STARTED')).toBeGreaterThan(-1);
    expect(events.indexOf('ACCEPT_REQUESTED')).toBeLessThan(events.indexOf('MICROPHONE_REQUEST_STARTED'));
    expect(events.indexOf('RINGING')).toBeLessThan(events.indexOf('ACCEPT_REQUESTED'));
    if (EARLY) {
      // P8-A3: el init (sin micrófono) ocurre MIENTRAS TIMBRA; el micrófono, solo tras «Contestar» (comprobado arriba).
      if (events.includes('SDK_INITIALIZATION_STARTED')) {
        expect(events.indexOf('RESIDENT_NOTIFIED')).toBeLessThan(events.indexOf('SDK_INITIALIZATION_STARTED'));
        expect(events.indexOf('SDK_INITIALIZATION_STARTED')).toBeLessThan(events.indexOf('ACCEPT_REQUESTED'));
      }
    } else if (events.includes('SDK_INITIALIZATION_STARTED')) {
      expect(events.indexOf('RESIDENT_ACCEPTED')).toBeLessThan(events.indexOf('SDK_INITIALIZATION_STARTED'));
    }
    expect(events).not.toContain('AUDIO_READY');
    expect(JSON.stringify(traces)).not.toMatch(/stub-token-/);
    const hostsAfter = [...new Set(rtkAfter.map((e) => e.host))].join(', ') || 'ninguno';
    test.info().annotations.push({ type: 'external-hosts-after-accept', description: hostsAfter });
    console.log(`P8A-EVIDENCE hosts RealtimeKit bloqueados tras aceptar: ${hostsAfter}; ` +
      `estado residente: ${await resident.getByTestId('intercom-status').textContent().catch(() => 'cerrado')}; ` +
      `eventos residente: ${events.join('>')}`);

    await guardCtx.close();
    await residentCtx.close();
  });

  test('rechazo: la portería ve el rechazo; nadie contacta RealtimeKit', async ({ browser }) => {
    const ext: External[] = [];
    const guardCtx = await browser.newContext();
    const residentCtx = await browser.newContext();
    await isolate(guardCtx, ext);
    await isolate(residentCtx, ext);
    const guard = await guardCtx.newPage();
    const resident = await residentCtx.newPage();
    await uiLogin(resident, 'owner1');
    await uiLogin(guard, 'guard', SUB_A(), /\/security/);

    const logBefore = stubLog().length;
    await startCall(guard);
    await expect(resident.getByText('Llamada de Citofonía')).toBeVisible({ timeout: 15_000 });
    await resident.getByRole('button', { name: 'Rechazar' }).click();
    await expect(guard.getByTestId('intercom-status')).toContainText('La llamada fue rechazada', { timeout: 15_000 });
    expect(lastCall().split('|').slice(0, 3)).toEqual(['REJECTED', 'REJECTED_BY_RESIDENT', '0']);
    if (EARLY) {
      expect(activations(stubLog().slice(logBefore)), 'sin aceptar, la reunión nunca se activa').toHaveLength(0);
      expect(deactivations(stubLog().slice(logBefore)).length).toBeGreaterThanOrEqual(1);
    } else {
      expect(rtkLike(ext)).toHaveLength(0);
    }
    await guardCtx.close();
    await residentCtx.close();
  });

  test('cancelación mientras timbra: el aviso desaparece del residente; nadie contacta RealtimeKit', async ({ browser }) => {
    const ext: External[] = [];
    const guardCtx = await browser.newContext();
    const residentCtx = await browser.newContext();
    await isolate(guardCtx, ext);
    await isolate(residentCtx, ext);
    const guard = await guardCtx.newPage();
    const resident = await residentCtx.newPage();
    await uiLogin(resident, 'owner1');
    await uiLogin(guard, 'guard', SUB_A(), /\/security/);

    const logBefore = stubLog().length;
    await startCall(guard);
    await expect(resident.getByText('Llamada de Citofonía')).toBeVisible({ timeout: 15_000 });
    await guard.getByTitle('Cancelar').click();
    await expect(guard.getByTestId('intercom-status')).toContainText('Llamada cancelada', { timeout: 15_000 });
    await expect(resident.getByText('Llamada de Citofonía')).toBeHidden({ timeout: 15_000 });
    expect(lastCall().split('|').slice(0, 3)).toEqual(['CANCELLED', 'CANCELLED_BY_CALLER', '0']);
    if (EARLY) {
      expect(activations(stubLog().slice(logBefore)), 'sin aceptar, la reunión nunca se activa').toHaveLength(0);
      expect(deactivations(stubLog().slice(logBefore)).length).toBeGreaterThanOrEqual(1);
    } else {
      expect(rtkLike(ext)).toHaveLength(0);
    }
    await guardCtx.close();
    await residentCtx.close();
  });
});
