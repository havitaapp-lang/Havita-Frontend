import { request, type APIRequestContext, type APIResponse } from '@playwright/test';
import { API_BASE_URL, API_HOST_HEADER, credentials, type Role } from '../support/env';

/**
 * Thin API client for arranging and cleaning synthetic test data.
 * Goes through the Vite proxy (same origin as the UI) so the backend resolves the tenant from the Host header.
 * Tokens live only in memory and are never printed.
 */
export class ApiSession {
  private constructor(
    readonly ctx: APIRequestContext,
    readonly tenantId: string,
    readonly userId: string,
  ) {}

  static async tenantConfig(): Promise<{ id: string; name: string }> {
    const ctx = await request.newContext({ baseURL: API_BASE_URL, extraHTTPHeaders: API_HOST_HEADER });
    try {
      const res = await ctx.get('/api/v1/public/tenant-config');
      if (!res.ok()) throw new Error(`tenant-config HTTP ${res.status()}`);
      return (await res.json()).data;
    } finally {
      await ctx.dispose();
    }
  }

  /** Raw login; returns the HTTP response without throwing so negative cases can assert on it. */
  static async rawLogin(email: string, password: string): Promise<APIResponse> {
    const ctx = await request.newContext({ baseURL: API_BASE_URL, extraHTTPHeaders: API_HOST_HEADER });
    const res = await ctx.post('/api/v1/auth/login', { data: { email, password } });
    // Body is consumed by callers before dispose is irrelevant: APIResponse buffers it.
    await res.body();
    await ctx.dispose();
    return res;
  }

  static async login(role: Role): Promise<ApiSession> {
    const creds = credentials(role);
    if (!creds) throw new Error(`Missing credentials for role "${role}" in e2e/.env.e2e`);
    const anon = await request.newContext({ baseURL: API_BASE_URL, extraHTTPHeaders: API_HOST_HEADER });
    const res = await anon.post('/api/v1/auth/login', { data: creds });
    if (!res.ok()) {
      await anon.dispose();
      throw new Error(`API login for role "${role}" failed with HTTP ${res.status()}`);
    }
    const { data } = await res.json();
    await anon.dispose();
    const tenant = await ApiSession.tenantConfig();
    const ctx = await request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: {
        ...API_HOST_HEADER,
        Authorization: `Bearer ${data.accessToken}`,
        'X-Tenant-ID': tenant.id,
        Accept: 'application/json',
      },
    });
    return new ApiSession(ctx, tenant.id, data.user.id);
  }

  async dispose(): Promise<void> {
    await this.ctx.dispose();
  }

  private static async unwrap<T>(res: APIResponse, what: string): Promise<T> {
    if (!res.ok()) {
      let detail = '';
      try {
        detail = (await res.json())?.message ?? '';
      } catch {
        /* non-JSON body */
      }
      throw new Error(`${what} failed: HTTP ${res.status()} ${detail}`);
    }
    if (res.status() === 204) return undefined as T;
    const json = await res.json();
    return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
  }

  get(path: string, params?: Record<string, string | number>) {
    return this.ctx.get(`/api/v1${path}`, { params });
  }
  post(path: string, data?: unknown) {
    return this.ctx.post(`/api/v1${path}`, { data });
  }
  delete(path: string) {
    return this.ctx.delete(`/api/v1${path}`);
  }

  // ── Domain helpers ────────────────────────────────────────────────────────

  async createProperty(tag: string): Promise<PropertyDto> {
    return ApiSession.unwrap(
      await this.post('/properties', { number: tag, name: tag, type: 'Apartamento' }),
      'create property',
    );
  }

  async findPropertyByName(name: string): Promise<PropertyDto | undefined> {
    const page = await ApiSession.unwrap<{ content?: PropertyDto[] } | PropertyDto[]>(
      await this.get('/properties', { search: name, size: 50 }),
      'search properties',
    );
    const list = Array.isArray(page) ? page : (page.content ?? []);
    return list.find((p) => p.name === name);
  }

  async updateProperty(id: string, data: { name?: string; status?: 'VACANT' | 'OCCUPIED' }): Promise<PropertyDto> {
    return ApiSession.unwrap(await this.ctx.put(`/api/v1/properties/${id}`, { data }), 'update property');
  }

  /** PUT /residents/{id}: con status ACTIVE sobre una fila INACTIVE es la reactivación administrativa (misma fila). */
  async updateResident(
    id: string,
    data: { name?: string; email?: string; phone?: string; type?: string; status?: 'ACTIVE' | 'INACTIVE' },
  ): Promise<ResidentDto> {
    return ApiSession.unwrap(await this.ctx.put(`/api/v1/residents/${id}`, { data }), 'update resident');
  }

  async residentsOfProperty(propertyId: string): Promise<ResidentDto[]> {
    return ApiSession.unwrap(await this.get(`/residents/by-property/${propertyId}`), 'residents by property');
  }

  async deleteProperty(id: string): Promise<void> {
    const res = await this.delete(`/properties/${id}`);
    if (!res.ok() && res.status() !== 404) {
      throw new Error(`delete property ${id} failed: HTTP ${res.status()}`);
    }
  }

  async createResident(input: {
    propertyId: string;
    name: string;
    email: string;
    phone: string;
    type?: 'Propietario' | 'Arrendatario';
  }): Promise<ResidentDto> {
    return ApiSession.unwrap(await this.post('/residents', { type: 'Propietario', ...input }), 'create resident');
  }

  async findResidents(search: string, size = 50): Promise<{ content: ResidentDto[]; totalElements: number }> {
    return ApiSession.unwrap(await this.get('/residents', { search, size, page: 0 }), 'list residents');
  }

  async getResident(id: string): Promise<APIResponse> {
    return this.get(`/residents/${id}`);
  }

  async deleteResident(id: string): Promise<void> {
    const res = await this.delete(`/residents/${id}`);
    if (!res.ok() && res.status() !== 404) {
      throw new Error(`delete resident ${id} failed: HTTP ${res.status()}`);
    }
  }

  async generateInvitation(propertyId: string): Promise<InvitationDto> {
    return ApiSession.unwrap(
      await this.post(`/properties/${propertyId}/resident-invitations`, { additionalPropertyIds: [] }),
      'generate invitation',
    );
  }

  async listInvitations(propertyId: string): Promise<InvitationDto[]> {
    return ApiSession.unwrap(await this.get(`/properties/${propertyId}/resident-invitations`), 'list invitations');
  }

  async revokeInvitation(id: string): Promise<void> {
    const res = await this.post(`/resident-invitations/${id}/revoke`);
    if (!res.ok() && res.status() !== 404) throw new Error(`revoke invitation failed: HTTP ${res.status()}`);
  }
}

export interface ResidentDto {
  id: string;
  tenantId: string;
  propertyId: string;
  propertyNumber: string;
  propertyName: string;
  userId?: string | null;
  name: string;
  type: string;
  phone: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface PropertyDto {
  id: string;
  number: string;
  name: string;
  status: string;
}

export interface InvitationDto {
  id: string;
  propertyId: string;
  status: string;
  link?: string;
  expiresAt: string;
}

/** Extracts the raw token from an invitation link such as http://host/register/invite/<token>. */
export function tokenFromLink(link: string): string {
  const match = link.match(/\/register\/invite\/([^/?#]+)/);
  if (!match) throw new Error('Invitation link does not contain /register/invite/<token>');
  return match[1];
}
