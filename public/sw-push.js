// Havita — manejadores de Web Push del service worker.
// P8-B: este archivo ya NO se registra como service worker propio. Lo importa el service worker de la PWA (Workbox,
// vite.config.ts → workbox.importScripts), de modo que hay UN solo SW en el ámbito «/» con caché, actualizaciones y push.
// ECMAScript plano: se ejecuta directamente en el ámbito del service worker.

var HAVITA_CONFIG_CACHE = 'havita-sw-config';
var HAVITA_CONFIG_KEY = '/__havita_sw_config__';
var HAVITA_ICON = '/pwa-192x192.png';
var HAVITA_BADGE = '/notification-badge-96x96.png';
// Margen ante relojes desajustados: un aviso de timbre que llega más tarde no ofrece contestar.
var HAVITA_EXPIRY_SKEW_MS = 15000;

// ── Configuración (base de la API) ─────────────────────────────────────────────────────────────────────────────────
// La app envía {type:'HAVITA_SW_CONFIG', apiBase} al cargar; se guarda en Cache Storage porque el SW no conserva memoria.

function havitaDefaultApiBase() {
  return self.location.origin + '/api/v1';
}

function havitaValidApiBase(value) {
  try {
    var u = new URL(value);
    return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href.replace(/\/+$/, '') : null;
  } catch {
    return null;
  }
}

function havitaGetApiBase() {
  if (typeof caches === 'undefined') return Promise.resolve(havitaDefaultApiBase());
  return caches.open(HAVITA_CONFIG_CACHE)
    .then(function (cache) { return cache.match(HAVITA_CONFIG_KEY); })
    .then(function (res) { return res ? res.json() : null; })
    .then(function (cfg) { return (cfg && havitaValidApiBase(cfg.apiBase)) || havitaDefaultApiBase(); })
    .catch(function () { return havitaDefaultApiBase(); });
}

self.addEventListener('message', function (event) {
  var data = event.data || {};
  if (data.type !== 'HAVITA_SW_CONFIG') return;
  var apiBase = havitaValidApiBase(data.apiBase);
  if (!apiBase || typeof caches === 'undefined') return;
  var body = JSON.stringify({ apiBase: apiBase });
  var saving = caches.open(HAVITA_CONFIG_CACHE).then(function (cache) {
    return cache.put(HAVITA_CONFIG_KEY, new Response(body, { headers: { 'Content-Type': 'application/json' } }));
  }).catch(function () { /* sin configuración: se usa la base por defecto */ });
  if (event.waitUntil) event.waitUntil(saving);
});

// ── Recibos de diagnóstico (sin sesión: solo un nonce de un solo uso; nunca datos personales) ───────────────────────

function havitaReceipt(nonce, stage) {
  if (!nonce || typeof fetch === 'undefined') return Promise.resolve();
  return havitaGetApiBase().then(function (apiBase) {
    return fetch(apiBase + '/intercom/push-receipts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ r: nonce, s: stage }),
      credentials: 'omit',
      keepalive: true,
    });
  }).catch(function () { /* el diagnóstico nunca afecta al aviso */ });
}

// ── Avisos ────────────────────────────────────────────────────────────────────────────────────────────────────────

function havitaIntercomNotification(payload) {
  var kind = payload.kind || 'RINGING';
  var expired = kind === 'RINGING' && typeof payload.expiresAt === 'number'
    && Date.now() > payload.expiresAt + HAVITA_EXPIRY_SKEW_MS;
  var ringing = kind === 'RINGING' && !expired;
  var body = expired ? 'Llamada de portería perdida' : (payload.body || 'Llamada de portería');
  if (ringing && payload.detail) body = body + '\n' + payload.detail;
  var options = {
    body: body,
    icon: HAVITA_ICON,
    badge: HAVITA_BADGE,
    // El mismo tag sustituye el aviso de timbre por el de fin (cancelada, perdida…); además se cierra el anterior (F2).
    tag: payload.tag || ('intercom-' + payload.callId),
    renotify: ringing,
    requireInteraction: ringing,
    silent: !ringing,
    timestamp: Date.now(),
    data: {
      type: 'INTERCOM_CALL',
      kind: expired ? 'MISSED' : kind,
      callId: payload.callId,
      url: ringing ? (payload.url || '/resident') : '/resident',
      receipt: payload.receipt || null,
    },
  };
  if (ringing) options.vibrate = [400, 200, 400, 200, 400];
  return { title: payload.title || 'Havita', options: options };
}

/**
 * P8-B (F2, iPhone): iOS no sustituyó el aviso de timbre por el de fin aunque compartían `tag`, y se vieron los dos.
 * Antes de mostrar un aviso de llamada se cierran explícitamente los que ya hay con ese tag.
 */
function havitaCloseTag(tag) {
  try {
    if (!tag || typeof self.registration.getNotifications !== 'function') return Promise.resolve();
    return self.registration.getNotifications({ tag: tag }).then(function (list) {
      (list || []).forEach(function (n) { try { n.close(); } catch { /* ya cerrado */ } });
    }).catch(function () {});
  } catch {
    return Promise.resolve();
  }
}

function havitaGeneralNotification(payload) {
  return {
    title: payload.title || 'Havita',
    options: {
      body: payload.body || '',
      icon: HAVITA_ICON,
      badge: HAVITA_BADGE,
      tag: payload.type || 'havita-notification',
      renotify: true,
      data: {
        url: payload.url || '/',
        type: payload.type || 'GENERAL',
      },
      actions: [
        { action: 'open', title: 'Ver' },
        { action: 'dismiss', title: 'Cerrar' },
      ],
    },
  };
}

self.addEventListener('push', function (event) {
  if (!event.data) {
    console.warn('[SW] Push recibido sin contenido');
    return;
  }

  var payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Havita', body: event.data.text() };
  }

  if (payload && payload.type === 'INTERCOM_CALL') {
    var n = havitaIntercomNotification(payload);
    event.waitUntil(Promise.all([
      havitaReceipt(payload.receipt, 'RECEIVED'),
      havitaCloseTag(n.options.tag).then(function () {
        return self.registration.showNotification(n.title, n.options);
      }).then(function () {
        return havitaReceipt(payload.receipt, 'DISPLAYED');
      }),
      // Con la app abierta, se le avisa para que sincronice (la app deduplica por callId).
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
        list.forEach(function (c) {
          c.postMessage({ type: 'INTERCOM_PUSH', kind: n.options.data.kind, callId: payload.callId });
        });
      }).catch(function () {}),
    ]));
    return;
  }

  var g = havitaGeneralNotification(payload || {});
  event.waitUntil(self.registration.showNotification(g.title, g.options));
});

function havitaSameOriginPath(url) {
  try {
    var u = new URL(url, self.location.origin);
    return u.origin === self.location.origin ? u.pathname + u.search : '/';
  } catch {
    return '/';
  }
}

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  var data = event.notification.data || {};
  var isIntercom = data.type === 'INTERCOM_CALL';
  // Solo rutas del propio origen (nunca una URL externa).
  var targetPath = havitaSameOriginPath(data.url || '/');
  var targetUrl = self.location.origin + targetPath;

  var clicked = isIntercom && data.kind === 'RINGING' ? havitaReceipt(data.receipt, 'CLICKED') : Promise.resolve();

  event.waitUntil(Promise.all([
    clicked,
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.indexOf(self.location.origin) !== 0 || !('focus' in client)) continue;
        var clientPath = havitaSameOriginPath(client.url);
        if (isIntercom && clientPath.indexOf('/resident') === 0) {
          // La app ya está en el portal del residente: abre la llamada sin recargar (conserva la sesión y el SSE).
          client.postMessage({ type: 'INTERCOM_OPEN_CALL', callId: data.kind === 'RINGING' ? data.callId : null });
          return client.focus();
        }
        if ('navigate' in client) {
          return Promise.resolve(client.focus()).then(function (c) { return (c || client).navigate(targetUrl); });
        }
        return client.focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  ]));
});

self.addEventListener('pushsubscriptionchange', function (event) {
  // El navegador renovó la suscripción. Se vuelve a suscribir con la misma clave pública y se avisa a las ventanas
  // abiertas; si no hay ninguna, la app la vuelve a registrar al abrirse (sincronización al iniciar).
  var oldKey = event.oldSubscription && event.oldSubscription.options
    ? event.oldSubscription.options.applicationServerKey : null;
  var renewed = event.newSubscription ? Promise.resolve(event.newSubscription)
    : (oldKey ? self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: oldKey })
      : Promise.resolve(null));
  event.waitUntil(
    renewed.then(function (newSubscription) {
      if (!newSubscription) return;
      return self.clients.matchAll().then(function (clients) {
        clients.forEach(function (client) {
          client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED', subscription: newSubscription.toJSON() });
        });
      });
    }).catch(function () { /* se resuelve al abrir la app */ })
  );
});
