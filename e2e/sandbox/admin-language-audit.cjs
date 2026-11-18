// Auditoria visual de idioma del panel de administracion (Playwright).
//
// Uso (sandbox local; las cuentas y la contrasena se leen de los archivos del sandbox, fuera de Git):
//   node e2e/sandbox/admin-language-audit.cjs <ruta Havita-Frontend> <ruta Havita-Local/p8b-device> <salida.json> [desktop|mobile]
//
// Recorre todas las secciones de /admin y las fichas de detalle, abre pestanas, filtros y modales de APERTURA (nunca
// pulsa guardar, eliminar, aprobar ni ninguna accion) y registra los textos visibles con estados tecnicos (PENDING,
// IN_PROGRESS...) o palabras en ingles. Ver e2e/ADMIN_UNITS_VISUAL_LANGUAGE_AUDIT.md.
const fs = require('fs');
const path = require('path');
const [, , fe, L, outFile, mode] = process.argv;
const { chromium } = require(`${fe}/e2e/node_modules/playwright`);
const ORIGIN = 'https://192.168.0.5:5443';
const env = (f) => Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const acc = env(path.join(L, 'sbx', 'p6', 'sbx', 'accounts.env'));
const PASS = env(path.join(L, 'sbx', 'p6', 'sbx', 'secret.env')).SBX_PASSWORD;

const ROUTES = ['/admin', '/admin/residents', '/admin/properties', '/admin/staff', '/admin/shifts', '/admin/attendance',
  '/admin/assemblies', '/admin/marketplace', '/admin/marketplace/settings', '/admin/communications', '/admin/intercom',
  '/admin/chat', '/admin/packages', '/admin/visitors', '/admin/requests', '/admin/reservations', '/admin/documents',
  '/admin/settings', '/admin/profile'];

// Botones que solo ABREN algo (modal, pestana, filtro, detalle). Todo lo demas se ignora.
const OPENER = /^(nuev[oa]|crear|agregar|añadir|editar|ver\b|ver |detalle|historial|todos|todas|pendientes|activ[oa]s|inactiv[oa]s|aprobad[oa]s|rechazad[oa]s|publicad[oa]s|borradores|archivad[oa]s|programad[oa]s|en curso|en vivo|finalizad[oa]s|entregad[oa]s|por (reclamar|entregar)|hoy|próxim|pasad|calendario|lista|configuraci|general|categor|reglas|turnos|asistencia|personal|directorio|bandeja|en revisión|reportad|ocultad|resuelt|cerrad|abiert|pre-?autorizad|ingresad|salid|vencid|expirad|ingresos|salidas|propietarios|arrendatarios|residentes|unidades|torres|zonas|reservas|documentos|filtro|filtrar|más filtros)/i;
const NEVER = /(eliminar|borrar|aprobar|rechazar|publicar|archivar|iniciar|finalizar|cerrar asamblea|desactivar|activar |guardar|enviar|confirmar|resolver|entregar|notificar|registrar (entrada|salida|ingreso)|marcar|asignar|liberar|transferir|cancelar|anular|revocar|suspender|llamar|cerrar sesión|salir|exportar|descargar|importar|subir|bloquear|ocultar|restaurar|invitar|reenviar)/i;

// Estados internos tipicos y palabras inglesas que no deberian verse en la interfaz.
const ENUM = /\b(?:[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+|PENDING|APPROVED|REJECTED|ACTIVE|INACTIVE|COMPLETED|CANCELL?ED|EXPIRED|CONFIRMED|OPEN|CLOSED|DRAFT|PUBLISHED|RESOLVED|SUSPENDED|SCHEDULED|ENDED|LIVE|ARCHIVED|DELIVERED|RECEIVED|NOTIFIED|AUTHORIZED|ENTERED|EXITED|OCCUPIED|VACANT|MAINTENANCE|PRESENT|LATE|ABSENT|INCOMPLETE|NEW|HIDDEN|REPORTED|WAITLIST(?:ED)?|PAID|OVERDUE|VOIDED|USED|REVOKED|ACKNOWLEDGED|ASSIGNED|RESIDENT|SECURITY|STAFF|ADMIN|OWNER|TENANT|LOW|MEDIUM|HIGH|URGENT|MORNING|AFTERNOON|NIGHT|VIRTUAL|HYBRID|IN_PERSON|ORDINARY|EXTRAORDINARY|YES|NO|ABSTAIN|SINGLE_CHOICE|MULTIPLE_CHOICE)\b/g;
const ENGLISH = /\b(Dashboard|Status|Pending|Active|Inactive|Approved|Rejected|Cancel(?:l)?ed|Completed|Draft|Published|Resolved|Closed|Open|Loading|Search|Save|Cancel|Delete|Edit|Submit|Close|Confirm|Error|Success|Unknown|None|Settings|Profile|Logout|Back|Next|Previous|Page|Show|Hide|Filter|Filters|All|Date|Time|Name|Phone|Unit|Units|Property|Properties|Residents?|Owners?|Tenants?|Staff|Shifts?|Attendance|Packages?|Visitors?|Requests?|Reservations?|Documents?|Assembly|Assemblies|Polls?|Votes?|Proxy|Upload|Download|Export|Created|Updated|Description|Title|Category|Priority|Low|Medium|High|Urgent|Notes|Details|View|New|Add|Remove|Select|Required|Optional|Invalid|Failed|Scheduled|Live|Ended|Expired|Occupied|Vacant|Present|Late|Absent|Morning|Afternoon|Night|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|June|July|August|September|October|November|December|Yes|Submitted|Waitlist(?:ed)?|Hidden|Reported|Paid|Overdue|Owner|Guard|Security|Today|Yesterday|Tomorrow|ago|undefined|null|NaN|Invalid Date|true|false)\b/g;

async function collect(page) {
  return page.evaluate(() => {
    const out = new Set();
    const visible = (el) => !!el && (el.checkVisibility ? el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) : true);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.data.replace(/\s+/g, ' ').trim();
      if (!t || !visible(n.parentElement)) continue;
      if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(n.parentElement.tagName)) continue;
      out.add('txt|' + t);
    }
    document.querySelectorAll('select').forEach((s) => { if (visible(s)) [...s.options].forEach((o) => out.add('opt|' + o.text.trim())); });
    document.querySelectorAll('[placeholder],[title],[aria-label]').forEach((el) => {
      if (!visible(el)) return;
      ['placeholder', 'title', 'aria-label'].forEach((a) => { const v = el.getAttribute(a); if (v) out.add(a + '|' + v.trim()); });
    });
    out.add('doctitle|' + document.title);
    return [...out];
  });
}

function findings(items) {
  const res = [];
  for (const it of items) {
    const [kind, ...rest] = it.split('|');
    const text = rest.join('|');
    if (!text || text.length > 400) continue;
    const enums = [...new Set(text.match(ENUM) || [])].filter((w) => !['PQRS', 'SOS', 'PDF', 'QR', 'NIT', 'CC', 'URL', 'ID', 'IVA', 'PIN', 'API', 'SSE', 'PWA', 'OK', 'AM', 'PM', 'COP', 'UTC', 'GMT', 'HAVITA'].includes(w));
    const eng = [...new Set(text.match(ENGLISH) || [])];
    if (enums.length || eng.length) res.push({ kind, text, enums, eng });
  }
  return res;
}

(async () => {
  const mobile = mode === 'mobile';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, serviceWorkers: 'block',
    viewport: mobile ? { width: 390, height: 844 } : { width: 1366, height: 900 }, locale: 'es-CO' });
  const page = await ctx.newPage();
  const jsErrors = [];
  page.on('pageerror', (e) => jsErrors.push(e.message.split('\n')[0]));
  await page.goto(`${ORIGIN}/login?tenant=${acc.P6_SUB_A}`);
  await page.getByPlaceholder('ejemplo@micopropiedad.com').fill(acc.P6_ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(PASS);
  await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
  await page.waitForURL(/\/admin/);

  // Fichas de detalle: ids reales del sandbox (todas las asambleas y el primer miembro del personal).
  const detailRoutes = await page.evaluate(async () => {
    const t = localStorage.getItem('havita_access_token'); const u = JSON.parse(localStorage.getItem('havita_user'));
    const ten = JSON.parse(localStorage.getItem('havita_tenant') || 'null');
    const h = { Authorization: `Bearer ${t}`, 'X-Tenant-ID': (ten && ten.id) || u.tenantId };
    const get = async (url) => { try { const j = await (await fetch(url, { headers: h })).json(); const d = j.data; return d?.content || d || []; } catch { return []; } };
    const assemblies = await get('/api/v1/assemblies?size=20');
    const staff = await get('/api/v1/staff?size=5');
    return [...assemblies.map((a) => `/admin/assemblies/${a.id}`), ...staff.slice(0, 1).map((s) => `/admin/staff/${s.id}`)];
  });
  ROUTES.push(...detailRoutes);

  const report = { mode: mobile ? 'mobile' : 'desktop', routes: [], jsErrors };
  for (const route of ROUTES) {
    const entry = { route, finalUrl: '', screens: 0, openers: [], findings: [] };
    const settle = async () => { await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(600); };
    await page.goto(ORIGIN + route); await settle();
    entry.finalUrl = page.url().replace(ORIGIN, '');
    const seen = new Map();
    const add = (where, items) => { for (const f of findings(items)) { const k = f.kind + '|' + f.text; if (!seen.has(k)) seen.set(k, { ...f, where }); } };
    add('página', await collect(page)); entry.screens++;

    // Candidatos "de apertura" en la pagina base.
    const labels = await page.evaluate(() => [...document.querySelectorAll('button,[role=tab],a[role=button]')]
      .filter((b) => b.checkVisibility && b.checkVisibility() && !b.disabled && !b.closest('aside,nav'))
      .map((b) => (b.innerText || b.getAttribute('title') || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean));
    const uniq = [...new Set(labels)].filter((t) => t.length <= 40 && OPENER.test(t) && !NEVER.test(t)).slice(0, 12);
    for (const label of uniq) {
      try {
        await page.goto(ORIGIN + route); await settle();
        const btn = page.locator('button,[role=tab],a[role=button]').filter({ hasText: label }).first();
        if (!(await btn.count())) continue;
        await btn.click({ timeout: 3000 }); await settle();
        add(`tras pulsar «${label}»`, await collect(page)); entry.screens++;
        entry.openers.push(label);
      } catch { /* boton no clicable: se ignora */ }
    }
    // Fichas de detalle enlazadas desde la pagina (asamblea, personal): se visita la primera.
    await page.goto(ORIGIN + route); await settle();
    const details = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href]')]
      .map((a) => a.getAttribute('href')).filter((h) => /^\/admin\/(assemblies|staff)\/[^/]+$/.test(h)))]);
    for (const d of details.slice(0, 1)) {
      await page.goto(ORIGIN + d); await settle();
      add(`detalle ${d.replace(/[0-9a-f-]{36}/, ':id')}`, await collect(page)); entry.screens++;
      entry.openers.push('detalle ' + d);
    }
    entry.findings = [...seen.values()];
    report.routes.push(entry);
    process.stdout.write(`${route}: ${entry.screens} pantallas, ${entry.findings.length} hallazgos\n`);
  }
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  await browser.close();
})().catch((e) => { console.error('FALLO:', e.message.split('\n')[0]); process.exit(1); });
