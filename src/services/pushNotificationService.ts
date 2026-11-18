/**
 * Push Notification Service for Havita
 * Handles browser push subscription, VAPID key retrieval, and backend registration.
 *
 * P8-B:
 * - Ya no registra un service worker propio (`/sw-push.js`). Usa el ÚNICO service worker de la PWA (Workbox), que
 *   importa los manejadores de push (`vite.config.ts → workbox.importScripts`). Antes los dos se sustituían entre sí en
 *   el ámbito «/» y el activo no tenía manejador `push`.
 * - Sincroniza la suscripción al iniciar sesión, solo si ESE usuario la activó antes en este dispositivo.
 * - Revoca la suscripción de ESTE dispositivo al cerrar sesión (backend y navegador).
 */

import { apiClient } from '../api/apiClient';
import { getSSOCookie } from '../utils/cookieUtils';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PushSubscriptionStatus {
  pushConfigured: boolean;
  subscribed: boolean;
  deviceCount: number;
}

export interface PushSubscriptionInfo {
  id: string;
  deviceName: string | null;
  active: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

/** Credenciales capturadas ANTES de borrar la sesión (el cierre de sesión es síncrono). */
export interface CapturedAuth {
  accessToken: string | null;
  tenantId: string | null;
}

// ── Capability checks ──────────────────────────────────────────────────────

function isPushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function getPermissionState(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.permission;
}

// ── VAPID key conversion helper ────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ── Service Worker (el de la PWA) ─────────────────────────────────────────

const API_BASE_PATH = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const optInKey = (userId: string) => `havita:push-optin:${userId}`;
/**
 * P8-B (revisión de seguridad): usuario al que pertenece la suscripción push de ESTE navegador. Si en el mismo dispositivo
 * inicia sesión otra persona (p. ej. tras caducar la sesión, sin «Cerrar sesión»), la suscripción anterior se da de baja
 * para que el dispositivo no siga recibiendo avisos del usuario anterior.
 */
const OWNER_KEY = 'havita:push-owner';

function getOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

function setOwner(userId: string | null): void {
  try {
    if (userId) localStorage.setItem(OWNER_KEY, userId);
    else localStorage.removeItem(OWNER_KEY);
  } catch {
    /* sin almacenamiento */
  }
}

/** Cierra TODOS los avisos mostrados por la app en este dispositivo (cambio de usuario o cierre de sesión). */
async function closeAllNotifications(registration: ServiceWorkerRegistration | null): Promise<void> {
  try {
    const list = registration && typeof registration.getNotifications === 'function' ? await registration.getNotifications() : [];
    list.forEach((n) => n.close());
  } catch {
    /* sin avisos */
  }
}

/**
 * Da de baja en el navegador la suscripción de OTRO usuario (o de dueño desconocido). El endpoint deja de existir en el
 * servicio de push: el siguiente envío del backend recibe 404/410 y desactiva la fila. Devuelve true si la retiró.
 */
async function dropForeignSubscription(
  registration: ServiceWorkerRegistration,
  subscription: PushSubscription | null,
  userId: string,
): Promise<boolean> {
  if (!subscription || getOwner() === userId) return false;
  await closeAllNotifications(registration);
  try {
    await subscription.unsubscribe();
  } catch {
    /* ya dada de baja */
  }
  setOwner(null);
  return true;
}

/** Registro del service worker de la PWA, o null si no hay (p. ej. en desarrollo sin SW) en el plazo. */
async function getRegistration(timeoutMs = 10000): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
    return await Promise.race([navigator.serviceWorker.ready, timeout]);
  } catch {
    return null;
  }
}

/** Indica al service worker la base de la API para los recibos de diagnóstico. */
async function configureServiceWorker(): Promise<void> {
  const registration = await getRegistration(5000);
  const target = registration?.active ?? null;
  if (!target) return;
  try {
    target.postMessage({ type: 'HAVITA_SW_CONFIG', apiBase: `${window.location.origin}${API_BASE_PATH}` });
  } catch {
    /* sin configuración: el SW usa la base por defecto */
  }
}

// ── API calls ──────────────────────────────────────────────────────────────

async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const response = await apiClient.get<{ publicKey: string; configured: string }>(
      '/push-subscriptions/public-key'
    );
    if (response.configured === 'true' && response.publicKey) {
      return response.publicKey;
    }
    return null;
  } catch {
    console.warn('[PushService] Failed to fetch VAPID public key');
    return null;
  }
}

async function registerSubscriptionOnBackend(
  subscription: PushSubscription,
  deviceName?: string
): Promise<void> {
  const subJson = subscription.toJSON();
  await apiClient.post('/push-subscriptions', {
    endpoint: subJson.endpoint,
    keys: {
      p256dh: subJson.keys?.p256dh || '',
      auth: subJson.keys?.auth || '',
    },
    deviceName: deviceName || getDeviceName(),
  });
}

async function unregisterSubscriptionOnBackend(): Promise<void> {
  await apiClient.delete('/push-subscriptions');
}

async function fetchPushStatus(): Promise<PushSubscriptionStatus> {
  return apiClient.get<PushSubscriptionStatus>('/push-subscriptions/status');
}

async function fetchSubscriptions(): Promise<PushSubscriptionInfo[]> {
  return apiClient.get<PushSubscriptionInfo[]>('/push-subscriptions');
}

async function sendTestNotification(): Promise<{ sent: number }> {
  return apiClient.post<{ sent: number }>('/push-subscriptions/test');
}

// ── Device name helper ─────────────────────────────────────────────────────

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Navegador';
}

function currentUserId(): string | null {
  try {
    const saved = localStorage.getItem('havita_user');
    const id = saved ? JSON.parse(saved)?.id : null;
    return id ? String(id) : null;
  } catch {
    return null;
  }
}

/** Misma regla que apiClient para la cabecera de comunidad y el token, leída de forma síncrona. */
function captureAuth(): CapturedAuth {
  let tenantId: string | null = null;
  let accessToken: string | null = null;
  try {
    const savedTenant = localStorage.getItem('havita_tenant');
    const fromTenant = savedTenant ? JSON.parse(savedTenant)?.id : null;
    const savedUser = localStorage.getItem('havita_user');
    const fromUser = savedUser ? JSON.parse(savedUser)?.tenantId : null;
    const candidate = fromTenant || fromUser;
    tenantId = candidate && UUID_RE.test(String(candidate)) ? String(candidate) : null;
  } catch {
    tenantId = null;
  }
  try {
    accessToken = getSSOCookie('havita_access_token') || localStorage.getItem('havita_access_token');
  } catch {
    accessToken = null;
  }
  return { accessToken, tenantId };
}

// ── Main push notification service ─────────────────────────────────────────

export const pushNotificationService = {
  /**
   * Check if push notifications are supported in this browser.
   */
  isSupported: isPushSupported,

  /**
   * Get current notification permission state.
   */
  getPermission: getPermissionState,

  configureServiceWorker,

  captureAuth,

  /**
   * Subscribe to push notifications.
   * 1. Request notification permission (must be called from a user gesture)
   * 2. Use the PWA service worker
   * 3. Create push subscription with VAPID key
   * 4. Register on backend
   */
  async subscribe(): Promise<{ success: boolean; error?: string }> {
    if (!isPushSupported()) {
      return { success: false, error: 'Tu navegador no soporta notificaciones push.' };
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error: permission === 'denied'
          ? 'Las notificaciones fueron bloqueadas. Actívalas desde la configuración de tu navegador.'
          : 'No se concedió permiso para las notificaciones.',
      };
    }

    // Get VAPID public key
    const vapidKey = await fetchVapidPublicKey();
    if (!vapidKey) {
      return { success: false, error: 'Las notificaciones push no están configuradas en el servidor.' };
    }

    const registration = await getRegistration();
    if (!registration) {
      return {
        success: false,
        error: 'El servicio de notificaciones no está disponible en esta versión de la app. Abre la app instalada o la versión publicada.',
      };
    }

    try {
      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();
      const userId = currentUserId();
      // P8-B: una suscripción que dejó otro usuario en este navegador no se reutiliza: se retira y se crea una nueva.
      if (userId && (await dropForeignSubscription(registration, subscription, userId))) subscription = null;

      if (!subscription) {
        // Create new subscription
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
        });
      }

      // Register on backend
      await registerSubscriptionOnBackend(subscription);
      if (userId) {
        try { localStorage.setItem(optInKey(userId), '1'); } catch { /* sin almacenamiento */ }
        setOwner(userId);
      }
      void configureServiceWorker();

      return { success: true };
    } catch (err: any) {
      console.error('[PushService] Subscription error:', err?.name ?? err);
      return {
        success: false,
        error: err?.message || 'Error al suscribir las notificaciones push.',
      };
    }
  },

  /**
   * Unsubscribe from push notifications (explicit opt-out from the profile).
   */
  async unsubscribe(): Promise<{ success: boolean; error?: string }> {
    try {
      // Unsubscribe from browser
      const registration = await getRegistration(3000);
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      // Unsubscribe from backend
      await unregisterSubscriptionOnBackend();
      const userId = currentUserId();
      if (userId) {
        try { localStorage.removeItem(optInKey(userId)); } catch { /* sin almacenamiento */ }
      }
      setOwner(null);

      return { success: true };
    } catch (err: any) {
      console.error('[PushService] Unsubscribe error:', err?.name ?? err);
      return {
        success: false,
        error: err?.message || 'Error al desuscribir las notificaciones push.',
      };
    }
  },

  /**
   * P8-B: al iniciar la app con sesión. Configura el SW y, si ESTE usuario activó las notificaciones en este
   * dispositivo y el permiso sigue concedido, vuelve a registrar la suscripción (idempotente). Cubre la renovación de la
   * suscripción por el navegador y el reingreso tras cerrar sesión. Nunca pide permiso por sí misma.
   * Si la suscripción de este navegador pertenece a OTRO usuario (cambio de usuario sin cerrar sesión), la retira primero.
   */
  async syncSubscription(userId: string | null | undefined): Promise<'synced' | 'skipped'> {
    try {
      void configureServiceWorker();
      if (!userId || !isPushSupported()) return 'skipped';
      const uid = String(userId);
      const registration = await getRegistration(5000);
      if (!registration) return 'skipped';
      let subscription = await registration.pushManager.getSubscription();
      if (await dropForeignSubscription(registration, subscription, uid)) subscription = null;
      if (getPermissionState() !== 'granted') return 'skipped';
      if (localStorage.getItem(optInKey(uid)) !== '1') return 'skipped';
      if (!subscription) {
        const vapidKey = await fetchVapidPublicKey();
        if (!vapidKey) return 'skipped';
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
        });
      }
      await registerSubscriptionOnBackend(subscription);
      setOwner(uid);
      return 'synced';
    } catch {
      return 'skipped';
    }
  },

  /**
   * P8-B: al cerrar sesión. Revoca la suscripción de ESTE dispositivo en el backend (con las credenciales capturadas
   * antes de borrar la sesión) y en el navegador. Aunque falle la red, darse de baja en el navegador basta: el servicio
   * de push responde 410 en el siguiente envío y el backend la desactiva. Nunca lanza.
   */
  async revokeCurrentDevice(captured: CapturedAuth = captureAuth()): Promise<void> {
    try {
      const registration = await getRegistration(2000);
      // Los avisos ya mostrados (también los generales, que pueden ser privados) no quedan a la vista del siguiente usuario.
      await closeAllNotifications(registration);
      setOwner(null);
      const subscription = registration ? await registration.pushManager.getSubscription() : null;
      if (!subscription) return;
      if (captured.accessToken) {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${captured.accessToken}`,
        };
        if (captured.tenantId) headers['X-Tenant-ID'] = captured.tenantId;
        try {
          await fetch(`${window.location.origin}${API_BASE_PATH}/push-subscriptions/unsubscribe`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ endpoint: subscription.endpoint }),
            keepalive: true,
          });
        } catch {
          /* sin red: basta la baja en el navegador */
        }
      }
      try {
        await subscription.unsubscribe();
      } catch {
        /* ya dada de baja */
      }
    } catch {
      /* nunca interrumpe el cierre de sesión */
    }
  },

  /** P8-B: endpoint de push de ESTE dispositivo (para no avisarle de su propia acción al contestar o rechazar). */
  async getCurrentEndpoint(): Promise<string | null> {
    try {
      if (!isPushSupported()) return null;
      const registration = await getRegistration(1000);
      const subscription = registration ? await registration.pushManager.getSubscription() : null;
      return subscription?.endpoint ?? null;
    } catch {
      return null;
    }
  },

  /** P8-B: cierra los avisos de una llamada que ya se muestra en la app (evita duplicar el aviso y el modal). */
  async closeCallNotifications(callId: string): Promise<void> {
    try {
      const registration = await getRegistration(1000);
      const list = registration ? await registration.getNotifications({ tag: `intercom-${callId}` }) : [];
      list.forEach((n) => n.close());
    } catch {
      /* sin avisos */
    }
  },

  /**
   * Get the push status from the backend.
   */
  getStatus: fetchPushStatus,

  /**
   * List active subscriptions.
   */
  getSubscriptions: fetchSubscriptions,

  /**
   * Send a test notification.
   */
  sendTest: sendTestNotification,

  /**
   * Check if currently subscribed in the browser.
   */
  async isBrowserSubscribed(): Promise<boolean> {
    try {
      const registration = await getRegistration(3000);
      if (!registration) return false;
      const subscription = await registration.pushManager.getSubscription();
      return subscription !== null;
    } catch {
      return false;
    }
  },
};

// Auto-sync regenerated subscriptions from service worker
if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', async (event) => {
    if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED' && event.data.subscription) {
      // P8-B: solo se re-registra a nombre del usuario dueño de la suscripción y con su sesión abierta.
      const owner = getOwner();
      if (!owner || owner !== currentUserId()) return;
      try {
        const sub = event.data.subscription;
        await apiClient.post('/push-subscriptions', {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys?.p256dh || '',
            auth: sub.keys?.auth || '',
          },
          deviceName: getDeviceName(),
        });
        console.log('[PushService] Resuscripción automática completada en backend');
      } catch (err: any) {
        console.error('[PushService] Error actualizando suscripción regenerada:', err?.name ?? err);
      }
    }
  });
}
