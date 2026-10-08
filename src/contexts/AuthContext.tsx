import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, Role } from '../types';
import { setSSOCookie, getSSOCookie, removeSSOCookie } from '../utils/cookieUtils';
import { apiClient } from '../api/apiClient';

export interface ResidentProperty {
  propertyId: string;
  number: string;
  name: string;
  type: string;
  status: string;
}

interface AuthContextProps {
  userProperties: ResidentProperty[];
  activePropertyId: string | null;
  switchProperty: (propertyId: string) => void;
  isSwitchingProperty: boolean;
  refreshProperties: () => void;
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
  const [activePropertyId, _setActivePropertyId] = useState<string | null>(() => localStorage.getItem('havita_active_property'));
  const [isSwitchingProperty, setIsSwitchingProperty] = useState(false);
  const setActivePropertyId = (id: string | null) => {
    setIsSwitchingProperty(true);
    setTimeout(() => setIsSwitchingProperty(false), 500);
    _setActivePropertyId(id);
    if (id) localStorage.setItem('havita_active_property', id);
    else localStorage.removeItem('havita_active_property');
  };

  const [user, setUser] = useState<User | null>(() => {
    const savedCookie = getSSOCookie('havita_user');
    if (savedCookie) {
      try {
        return JSON.parse(decodeURIComponent(savedCookie));
      } catch {
        return null;
      }
    }
    const saved = localStorage.getItem('havita_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (user && user.role === 'RESIDENT' && userProperties.length === 0) {
      const token = localStorage.getItem('havita_access_token');
      if (token) {
        apiClient.get('/resident/me/properties').then((data: any) => {
          if (data && Array.isArray(data)) {
            setUserProperties(data);
            
            const savedActiveProperty = localStorage.getItem('havita_active_property');
            const propertyExists = data.some(p => p.propertyId === savedActiveProperty);
            
            if (data.length > 0 && (!savedActiveProperty || !propertyExists)) {
              setActivePropertyId(data[0].propertyId);
            }
          }
        }).catch(console.error);
      }
    }
  }, [user]);

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
      avatar: 'https://i.pravatar.cc/150?u=' + data.user.role,
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
    setUser(loggedUser);

    if (loggedUser.role === 'RESIDENT') {
      try {
        const propsData: any = await apiClient.get('/resident/me/properties');
        if (propsData && Array.isArray(propsData)) {
          setUserProperties(propsData);
          if (propsData.length > 0) {
            const propId = loggedUser.residentPropertyId || propsData[0].propertyId;
            setActivePropertyId(propId);
          }
        }
      } catch (e) {
        console.error('Failed to load resident properties', e);
      }
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

  const refreshProperties = async () => {
    try {
      const data = await apiClient.get('/resident/me/properties');
      if (data && Array.isArray(data)) {
        setUserProperties(data);
        const currentActive = localStorage.getItem('havita_active_property');
        if (data.length === 0) {
          setActivePropertyId(null);
          logout();
          window.dispatchEvent(new CustomEvent('auth:access_revoked'));
          return;
        } else if (!data.find(p => p.propertyId === currentActive)) {
          setActivePropertyId(data[0].propertyId);
        }
      }
    } catch (e) {
      console.warn('Error refreshing properties, evicting session:', e);
      logout();
      window.dispatchEvent(new CustomEvent('auth:access_revoked'));
    }
  };

  const logout = () => {
    setUser(null);
    setUserProperties([]);
    setActivePropertyId(null);
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
    <AuthContext.Provider value={{ user, userProperties, activePropertyId, switchProperty: setActivePropertyId, isSwitchingProperty, login, loginAs, logout, isAuthenticated: !!user, completeOnboarding, updateUser, refreshProperties }}>
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

