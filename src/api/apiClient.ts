/**
 * Generic API Client abstraction prepared for Java 21 + Spring Boot + PostgreSQL backend.
 * Handles tenant header injection, auth bearer token, automatic token refresh, unified error interception, and timeout.
 */
import { removeSSOCookie, getSSOCookie, setSSOCookie } from '../utils/cookieUtils';

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
  _retried?: boolean;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

class ApiClient {
  private refreshPromise: Promise<string | null> | null = null;

  private getAccessToken(): string | null {
    try {
      const cookieToken = getSSOCookie('havita_access_token');
      if (cookieToken) return cookieToken;
      return localStorage.getItem('havita_access_token');
    } catch {
      return null;
    }
  }

  private getRefreshToken(): string | null {
    try {
      const cookieRefresh = getSSOCookie('havita_refresh_token');
      if (cookieRefresh) return cookieRefresh;
      return localStorage.getItem('havita_refresh_token');
    } catch {
      return null;
    }
  }

  private async tryRefreshToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    this.refreshPromise = (async () => {
      try {
        const res = await fetch(`${window.location.origin}${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) {
          return null;
        }

        const json = await res.json();
        const data = json?.data || json;
        if (data?.accessToken) {
          setSSOCookie('havita_access_token', data.accessToken);
          localStorage.setItem('havita_access_token', data.accessToken);
          if (data.refreshToken) {
            setSSOCookie('havita_refresh_token', data.refreshToken);
            localStorage.setItem('havita_refresh_token', data.refreshToken);
          }
          return data.accessToken as string;
        }
        return null;
      } catch {
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Multi-tenant header (only send if valid UUID and not on global admin host)
    try {
      const host = window.location.hostname.toLowerCase();
      const isGlobalAdminHost = host.startsWith('admin.') || host.startsWith('super.');
      if (!isGlobalAdminHost) {
        const savedTenant = localStorage.getItem('havita_tenant');
        if (savedTenant) {
          const tenant = JSON.parse(savedTenant);
          if (tenant?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenant.id)) {
            headers['X-Tenant-ID'] = tenant.id;
          }
        }
      }
    } catch {
      // ignore
    }

    // Auth Bearer token
    const accessToken = this.getAccessToken();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const propertyId = localStorage.getItem('havita_active_property');
    if (propertyId) {
      headers['X-Property-Id'] = propertyId;
    }

    return headers;
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined | null>): string {
    const base = endpoint.startsWith('http') ? endpoint : window.location.origin + API_BASE_URL + (endpoint.startsWith('/') ? '' : '/') + endpoint;
    const url = new URL(base);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, _retried, ...customConfig } = options;
    const url = this.buildUrl(endpoint, params);

    const config: RequestInit = {
      ...customConfig,
      headers: {
        ...this.getHeaders(),
        ...customConfig.headers,
      },
    };

    // If body is FormData, we must let the browser set the Content-Type header with the boundary
    if (config.body instanceof FormData) {
      if (config.headers) {
        delete (config.headers as Record<string, string>)['Content-Type'];
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    config.signal = controller.signal;

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }

        const errorCode = errorData?.code;
        const errorMsg = String(errorData?.message || errorData?.detail || '').toLowerCase();

        // Si el backend rechaza por acceso revocado o sin vivienda asignada
        const isAccessRevoked =
          errorCode === 'ACCESS_REVOKED' ||
          errorCode === 'NO_PROPERTY_ASSIGNED' ||
          (response.status === 403 && errorMsg.includes('revocado')) ||
          (response.status === 403 && errorMsg.includes('no tiene ninguna vivienda asignada'));

        if (isAccessRevoked && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
          console.warn('[ApiClient] Acceso revocado o sin vivienda asignada. Despachando evento de revocación...');
          removeSSOCookie('havita_access_token');
          removeSSOCookie('havita_refresh_token');
          removeSSOCookie('havita_user');

          localStorage.removeItem('havita_access_token');
          localStorage.removeItem('havita_refresh_token');
          localStorage.removeItem('havita_tenant');
          localStorage.removeItem('havita_user');
          localStorage.removeItem('havita_active_property');

          window.dispatchEvent(new CustomEvent('auth:access_revoked'));
          return {} as T;
        }

        // Attempt token refresh on 401 or 403 (when token expired before backend 401 entryPoint update)
        if ((response.status === 401 || response.status === 403) && !_retried && !endpoint.includes('/auth/')) {
          const refreshedToken = await this.tryRefreshToken();
          if (refreshedToken) {
            return this.request<T>(endpoint, { ...options, _retried: true });
          }
        }

        if (response.status === 401) {
          removeSSOCookie('havita_access_token');
          removeSSOCookie('havita_refresh_token');
          removeSSOCookie('havita_user');

          localStorage.removeItem('havita_access_token');
          localStorage.removeItem('havita_refresh_token');
          localStorage.removeItem('havita_tenant');
          localStorage.removeItem('havita_user');
          localStorage.removeItem('havita_active_property');

          window.dispatchEvent(new CustomEvent('auth:session_expired'));
          return {} as T;
        }

        throw new ApiError(
          (errorData as { message?: string })?.message || 'Error de servidor HTTP ' + response.status,
          response.status,
          errorData
        );
      }

      if (response.status === 204) {
        return {} as T;
      }

      const json = await response.json();
      if (json && typeof json === 'object' && 'data' in json && 'success' in json) {
        return json.data as T;
      }
      return json as T;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if ((err as Error).name === 'AbortError') {
        throw new ApiError('Tiempo de espera agotado al conectar con el servidor', 408);
      }
      if (err instanceof ApiError) {
        throw err;
      }
      throw new ApiError(
        (err as Error).message || 'No se pudo establecer conexión con el servidor',
        0
      );
    }
  }

  get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined | null>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  }

  put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  }

  patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async downloadFile(endpoint: string, filename: string): Promise<void> {
    const url = this.buildUrl(endpoint);
    const config: RequestInit = {
      method: 'GET',
      headers: this.getHeaders(),
    };
    
    // Remove default application/json accepts
    if (config.headers) {
      delete (config.headers as Record<string, string>)['Accept'];
      delete (config.headers as Record<string, string>)['Content-Type'];
    }

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error('Error al descargar el archivo');
      }
      
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(objectUrl);
    } catch (e) {
      console.error('Download failed:', e);
      throw e;
    }
  }
  async getPreviewUrl(endpoint: string): Promise<string> {
    const url = this.buildUrl(endpoint);
    const config: RequestInit = {
      method: 'GET',
      headers: this.getHeaders(),
    };
    
    if (config.headers) {
      delete (config.headers as Record<string, string>)['Accept'];
      delete (config.headers as Record<string, string>)['Content-Type'];
    }

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error('Error al visualizar el archivo');
      }
      
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      return objectUrl;
    } catch (e) {
      console.error('Preview failed:', e);
      throw e;
    }
  }
}

export const apiClient = new ApiClient();
