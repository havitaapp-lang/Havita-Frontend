import { createContext, useContext, useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { User, Role } from '../types';
import { setSSOCookie, getSSOCookie, removeSSOCookie } from '../utils/cookieUtils';
import { apiClient } from '../api/apiClient';
import { pushNotificationService } from '../services/pushNotificationService';
import {
  activeUnitStore,
  dedupeUnits,
  resolveSelection,
  UNIT_SELECTION_REQUIRED_EVENT,
  UNIT_UNAVAILABLE_EVENT,
} from '../features/resident/unit/activeUnitStore';
import type { ResidentUnit, UnitStatus } from '../features/resident/unit/activeUnitStore';

/** Unidad autorizada del residente (contrato de GET /resident/me/properties, Fase 2 / E1). */
export type ResidentProperty = ResidentUnit;

export const UNIT_UNAVAILABLE_MESSAGE =
  'La unidad que tenías seleccionada ya no está disponible para tu cuenta. Elige otra de tus unidades para continuar.';

interface AuthContextProps {
  /** Unidades autorizadas (una entrada por unidad, en el orden del backend). */
  userProperties: ResidentProperty[];
  /** Unidad activa de ESTA pestaña (Fase 2 / E2): usar `useActiveUnit()` en los componentes. */
  activePropertyId: string | null;
  switchProperty: (propertyId: string) => void;
  isSwitchingProperty: boolean;
  refreshProperties: () => void;
  unitStatus: UnitStatus;
  unitNotice: string | null;
  dismissUnitNotice: () => void;
  user: User | null;
  login: (email: string, password: string, tenantId?: string) => Promise<User>;
  loginAs: (role: Role, tenantId: string, tenantSubdomain?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  completeOnboarding: () => void;
  updateUser: (fields: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userProperties, setUserProperties] = useState<ResidentProperty[]>([]);
  const [unitStatus, setUnitStatus] = useState<UnitStatus>('idle');
  const [unitNotice, setUnitNotice] = useState<string | null>(null);
  const [isSwitchingProperty, setIsSwitchingProperty] = useState(false);
  // Fase 2 / E2: la unidad activa vive en activeUnitStore (una por pestaña, por usuario y comunidad).
  const activePropertyId = useSyncExternalStore(activeUnitStore.subscribe, activeUnitStore.getActiveUnitId, () => null);
  const unitsRef = useRef<ResidentProperty[]>([]);
  const loadSeq = useRef(0);

  const [user, setUser] = useState<User | null>(() => {
    const savedCookie = getSSOCookie('havita_user');
    if (savedCookie) {
      try {
        const u = JSON.parse(decodeURIComponent(savedCookie));
        if (u?.avatar && u.avatar.includes('pravatar')) delete u.avatar;
        return u;
      } catch {
        return null;
      }
    }
    const saved = localStorage.getItem('havita_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u?.avatar && u.avatar.includes('pravatar')) delete u.avatar;
        return u;
      } catch {
        return null;
      }
    }
    return null;
  });

  const userRef = useRef<User | null>(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  /**
   * Fase 2 / E2 (D1): carga las unidades AUTORIZADAS y decide la unidad activa de esta pestaña:
   * la selección de la pestaña si sigue siendo válida; si hay una sola unidad, esa; si no, la preferencia guardada para
   * esta cuenta y comunidad si sigue siendo válida; si no, ninguna (se pide elegir). Nunca la primera de la lista.
   * Un error al cargar NO cierra la sesión (eso solo lo deciden ACCESS_REVOKED / 401 en apiClient).
   */
  const loadUnits = useCallback(async (forUser: User | null) => {
    if (!forUser || forUser.role !== 'RESIDENT') {
      unitsRef.current = [];
      setUserProperties([]);
      setUnitStatus('idle');
      return;
    }
    activeUnitStore.setScope({ userId: String(forUser.id), tenantId: String(forUser.tenantId || 'sin-comunidad') });
    const seq = ++loadSeq.current;
    if (unitsRef.current.length === 0) setUnitStatus('loading');
    try {
      const data = await apiClient.get<ResidentProperty[]>('/resident/me/properties');
      if (seq !== loadSeq.current) return; // respuesta tardía de una carga anterior
      const units = Array.isArray(data) ? dedupeUnits(data) : [];
      unitsRef.current = units;
      setUserProperties(units);
      const preferred = activeUnitStore.getPreferredUnitId();
      if (preferred && !units.some((u) => u.propertyId === preferred)) activeUnitStore.forgetPreference();
      // La unidad que esta pestaña tenía activa ya no está autorizada (revocada por la administración o el SSE): se
      // avisa, aunque no haya habido un 409, en vez de cambiar de unidad sin decir nada.
      const previous = activeUnitStore.getActiveUnitId();
      if (previous && !units.some((u) => u.propertyId === previous)) setUnitNotice(UNIT_UNAVAILABLE_MESSAGE);
      const { unitId, status } = resolveSelection(units, previous, preferred);
      activeUnitStore.setActiveUnitId(unitId);
      setUnitStatus(status);
    } catch (e) {
      if (seq !== loadSeq.current) return;
      console.warn('No se pudieron cargar las unidades del residente:', e);
      setUnitStatus('error');
    }
  }, []);

  // Carga (o limpia) las unidades al cambiar de usuario, rol o comunidad; nunca hereda la unidad de otra cuenta.
  // (logout ya vacía la lista; aquí solo se carga para un residente con sesión).
  const unitScopeKey = user ? `${user.id}|${user.role}|${user.tenantId ?? ''}` : '';
  useEffect(() => {
    const current = userRef.current ?? user;
    if (current && current.role === 'RESIDENT' && localStorage.getItem('havita_access_token')) {
      loadUnits(current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se recarga solo si cambian cuenta, rol o comunidad
  }, [unitScopeKey, loadUnits]);

  // P8-B: con sesión, configura el service worker y vuelve a registrar la suscripción push de ESTE dispositivo si ESTE
  // usuario la activó antes (nunca pide permiso por sí mismo). Reactiva el aviso tras cerrar y abrir sesión.
  const pushSyncKey = user ? `${user.id}|${user.tenantId ?? ''}` : '';
  useEffect(() => {
    if (!pushSyncKey || !localStorage.getItem('havita_access_token')) return;
    void pushNotificationService.syncSubscription(pushSyncKey.split('|')[0]);
  }, [pushSyncKey]);

  // 409 del resolvedor de unidades (apiClient): la sesión sigue siendo válida; se invalida la unidad y se refresca la
  // lista. No se reintenta ninguna operación con otra unidad.
  useEffect(() => {
    const onUnavailable = (e: Event) => {
      const unitId = (e as CustomEvent<{ unitId: string | null }>).detail?.unitId ?? null;
      const active = activeUnitStore.getActiveUnitId();
      if (unitId && unitId === active) {
        activeUnitStore.setActiveUnitId(null);
        if (activeUnitStore.getPreferredUnitId() === unitId) activeUnitStore.forgetPreference();
        setUnitNotice(UNIT_UNAVAILABLE_MESSAGE);
      }
      loadUnits(userRef.current);
    };
    const onSelectionRequired = () => {
      loadUnits(userRef.current);
    };
    window.addEventListener(UNIT_UNAVAILABLE_EVENT, onUnavailable);
    window.addEventListener(UNIT_SELECTION_REQUIRED_EVENT, onSelectionRequired);
    return () => {
      window.removeEventListener(UNIT_UNAVAILABLE_EVENT, onUnavailable);
      window.removeEventListener(UNIT_SELECTION_REQUIRED_EVENT, onSelectionRequired);
    };
  }, [loadUnits]);

  /** Selección explícita del usuario (solo entre las unidades autorizadas); se recuerda como preferencia. */
  const switchProperty = useCallback((propertyId: string) => {
    if (!unitsRef.current.some((u) => u.propertyId === propertyId)) return;
    if (propertyId !== activeUnitStore.getActiveUnitId()) {
      setIsSwitchingProperty(true);
      setTimeout(() => setIsSwitchingProperty(false), 500);
    }
    activeUnitStore.setActiveUnitId(propertyId, true);
    setUnitStatus('ready');
    setUnitNotice(null);
  }, []);

  const login = async (email: string, password: string, tenantId?: string): Promise<User> => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        password,
        tenantId: tenantId && tenantId.includes('-') && tenantId.length === 36 ? tenantId : undefined,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const message = errJson?.message || errJson?.detail || errJson?.data?.message || 'Credenciales inválidas o error de autenticación';
      throw new Error(message);
    }

    const json = await res.json();
    const data = json.data;
    const loggedUser: User = {
      id: data.user.id,
      tenantId: data.user.tenantId || tenantId || '',
      name: data.user.fullName,
      email: data.user.email,
      role: data.user.role as Role,
      propertyUnit: data.user.propertyUnit,
      avatar: data.user.avatar || undefined,
      residentPropertyId: data.user.residentPropertyId,
      hasCompletedOnboarding: data.user.hasCompletedOnboarding ?? false,
      memberships: data.user.memberships || [],
    };

    setSSOCookie('havita_access_token', data.accessToken);
    setSSOCookie('havita_refresh_token', data.refreshToken);
    setSSOCookie('havita_user', encodeURIComponent(JSON.stringify(loggedUser)));

    localStorage.setItem('havita_access_token', data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('havita_refresh_token', data.refreshToken);
    }
    localStorage.setItem('havita_user', JSON.stringify(loggedUser));
    // Fase 2 / E2: la nueva sesión no hereda la unidad de la anterior (ni la clave global antigua).
    activeUnitStore.clear();
    unitsRef.current = [];
    setUserProperties([]);
    setUnitNotice(null);
    setUser(loggedUser);

    if (loggedUser.role === 'RESIDENT') {
      await loadUnits(loggedUser);
    }

    return loggedUser;
  };

  const loginAs = async (role: Role, tenantId: string, tenantSubdomain?: string) => {
    const sub = tenantSubdomain || 'limonar';
    let demoEmail = `admin@${sub}.demo`;
    if (role === 'SECURITY') demoEmail = `porteria@${sub}.demo`;
    else if (role === 'RESIDENT') demoEmail = `residente@${sub}.demo`;
    else if (role === 'SUPER_ADMIN') demoEmail = 'superadmin@havita.com';

    await login(demoEmail, 'Password123!', tenantId);
  };

  /**
   * Fase 2 / E2: vuelve a pedir las unidades autorizadas. Perder UNA unidad no cierra la sesión: si quedan otras se
   * sigue con ellas (la activa se reemplaza solo si era la perdida). La revocación total la señalan el backend
   * (ACCESS_REVOKED / 401, que gestiona apiClient) o el SSE con el usuario en affectedUserIds.
   */
  const refreshProperties = () => {
    void loadUnits(userRef.current);
  };

  const logout = () => {
    // P8-B: este dispositivo deja de recibir avisos push de la cuenta. Las credenciales se capturan ANTES de borrarlas;
    // la revocación es asíncrona y nunca bloquea el cierre de sesión.
    void pushNotificationService.revokeCurrentDevice(pushNotificationService.captureAuth());
    setUser(null);
    unitsRef.current = [];
    setUserProperties([]);
    setUnitStatus('idle');
    setUnitNotice(null);
    activeUnitStore.clear();
    removeSSOCookie('havita_access_token');
    removeSSOCookie('havita_refresh_token');
    removeSSOCookie('havita_user');
    localStorage.removeItem('havita_access_token');
    localStorage.removeItem('havita_refresh_token');
    localStorage.removeItem('havita_user');
  };

  const completeOnboarding = () => {
    setUser((prev) => (prev ? { ...prev, hasCompletedOnboarding: true } : prev));
  };

  const updateUser = (fields: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...fields };
      setSSOCookie('havita_user', encodeURIComponent(JSON.stringify(updated)));
      localStorage.setItem('havita_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, userProperties, activePropertyId, switchProperty, isSwitchingProperty, login, loginAs, logout, isAuthenticated: !!user, completeOnboarding, updateUser, refreshProperties, unitStatus, unitNotice, dismissUnitNotice: () => setUnitNotice(null) }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within a AuthProvider');
  }
  return context;
};

