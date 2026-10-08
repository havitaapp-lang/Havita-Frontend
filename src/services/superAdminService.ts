import { apiClient } from '../api/apiClient';
import type { PageResponse } from '../api/types';
import type {
  PlatformTenant,
  Organization,
  GlobalUser,
  InternalUser,
  BackofficeRole,
  SubscriptionStatus,
  ProductFeature,
  Plan,
  SaaSSubscription,
  SaaSInvoice,
  SupportTicket,
  PlatformHealthService,
  PlatformIncident,
  AuditEvent,
  PlatformIntegration,
  PlatformWebhook,
} from '../types/superAdmin';
import { planService } from './planService';

const DEFAULT_TENANT_FEATURES = [
  'visitors',
  'packages',
  'pqrs',
  'maintenance',
  'reservations',
  'staff',
  'documents',
  'pets',
  'vehicles',
  'surveys',
];

function isValidUuid(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
}

class SuperAdminService {
  private tenants: PlatformTenant[] = [];
  private organizations: Organization[] = [];
  private users: GlobalUser[] = [];
  private subscriptions: SaaSSubscription[] = [];
  private invoices: SaaSInvoice[] = [];
  private featureFlags: ProductFeature[] = [];
  private tickets: SupportTicket[] = [];
  private auditLog: AuditEvent[] = [];
  private integrations: PlatformIntegration[] = [];
  private webhooks: PlatformWebhook[] = [];
  private platformHealth: PlatformHealthService[] = [];
  private incidents: PlatformIncident[] = [];
  private plans: Plan[] = [];

  private mapBackendTenant(t: any): PlatformTenant {
    const activeFeatures = Array.isArray(t.activeFeatures)
      ? t.activeFeatures.map((f: string) => String(f).trim().toLowerCase()).filter(Boolean)
      : typeof t.activeFeatures === 'string' && t.activeFeatures.trim()
      ? t.activeFeatures.split(',').map((f: string) => f.trim().toLowerCase()).filter(Boolean)
      : [...DEFAULT_TENANT_FEATURES];

    const propertiesCount = Number(t.propertiesCount ?? 0);
    const usersCount = Number(t.usersCount ?? 0);
    const mrrCOP = Number(t.mrrCop ?? t.mrrCOP ?? 0);

    return {
      id: t.id,
      organizationId: t.organizationId || undefined,
      organizationName: t.organizationName || 'Sin organización',
      name: t.name || '',
      slug: t.slug || '',
      subdomain: t.subdomain || '',
      nit: t.nit || '',
      city: t.city || 'Cali',
      address: t.address || '',
      phone: t.phone || '',
      contactEmail: t.contactEmail || '',
      adminName: t.adminName || 'Administrador Designado',
      adminEmail: t.adminEmail || t.contactEmail || '',
      adminPhone: t.adminPhone || t.phone || '',
      status: t.status || 'ACTIVE',
      planId: t.planId ? String(t.planId) : 'starter',
      planName: t.planName || 'Esencial',
      propertiesCount,
      usersCount,
      staffCount: Number(t.staffCount ?? 0),
      mrrCOP,
      health: {
        score: 85,
        label: 'Bueno',
        color: 'blue',
        activeUsersRate: 80,
        configCompletion: 85,
        moduleAdoptionRate: Math.round((activeFeatures.length / 10) * 100),
        errorRate: 0.1,
        lastIncidentDaysAgo: 90,
      },
      activeFeatures,
      openTicketsCount: 0,
      lastActivityAt: t.updatedAt ? String(t.updatedAt).split('T')[0] : 'ACTIVE',
      createdAt: t.createdAt ? String(t.createdAt).split('T')[0] : new Date().toISOString().split('T')[0],
      trialEndsAt: t.trialEndsAt,
      suspendedReason: t.suspendedReason,
      storageUsedMB: Number(t.storageUsedMb ?? t.storageUsedMB ?? 0),
      storageLimitMB: Number(t.storageLimitMb ?? t.storageLimitMB ?? 5120),
      statsMonthly: {
        visitorsCount: 0,
        packagesCount: 0,
        pqrsCount: 0,
        reservationsCount: 0,
      },
    };
  }

  private mapBackendAuditEvent(e: any): AuditEvent {
    const rawResult = String(e.result || 'SUCCESS').toUpperCase();
    const result: 'Éxito' | 'Advertencia' | 'Error' =
      rawResult.includes('WARN') || rawResult.includes('ADVERT')
        ? 'Advertencia'
        : rawResult.includes('ERR') || rawResult.includes('FAIL')
        ? 'Error'
        : 'Éxito';

    let formattedTs = e.timestamp || e.createdAt || new Date().toISOString();
    try {
      const d = new Date(formattedTs);
      if (!isNaN(d.getTime())) {
        formattedTs = d.toLocaleString('es-CO', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch {
      // keep raw
    }

    return {
      id: e.id || `audit-${Date.now()}`,
      timestamp: formattedTs,
      actorName: e.actorName || 'Super Administrador Global',
      actorEmail: e.actorEmail || 'superadmin@havita.com',
      actorRole: (e.actorRole as BackofficeRole) || 'SUPER_ADMIN',
      action: e.action || 'EVENTO',
      resource: e.resource || 'Comunidades',
      entityId: e.tenantId ? String(e.tenantId) : undefined,
      tenantName: e.tenantName || undefined,
      result,
      details: e.details || '',
      ipAddress: e.ipAddress || '127.0.0.1',
    };
  }

  // ─── Overview & KPIs ──────────────────────────────────────
  async getOverview() {
    const [tenants, orgs] = await Promise.all([
      this.getTenants(),
      this.getOrganizations(),
    ]);

    const activeTenants = tenants.filter(t => t.status === 'ACTIVE').length;
    const suspendedTenants = tenants.filter(t => t.status === 'SUSPENDED').length;

    return {
      totalTenants: tenants.length,
      activeTenants,
      suspendedTenants,
      organizations: orgs.length,
      totalUsers: tenants.reduce((acc, t) => acc + (t.usersCount || 0), 0),
      totalProperties: tenants.reduce((acc, t) => acc + (t.propertiesCount || 0), 0),
      mrrCOP: tenants.reduce((sum, t) => sum + (t.mrrCOP || 0), 0),
      openTickets: this.tickets.filter(t => t.status === 'OPEN').length,
    };
  }

  // ─── Organizations ────────────────────────────────────────
  async getOrganizations(search?: string): Promise<Organization[]> {
    try {
      const params: Record<string, any> = { size: 100 };
      if (search) params.search = search;
      const res = await apiClient.get<PageResponse<any>>('/organizations', params);
      const rawList = res?.content || (Array.isArray(res) ? res : []);
      this.organizations = rawList.map((org: any) => ({
        id: org.id,
        name: org.name,
        nit: org.nit,
        email: org.email || '',
        phone: org.phone || '',
        city: org.city || 'Cali',
        address: org.address || '',
        communitiesCount: org.communitiesCount || 0,
        propertiesCount: org.propertiesCount || 0,
        adminsCount: org.adminsCount || 1,
        totalMrrCOP: org.totalMrrCOP || 0,
        createdAt: org.createdAt ? String(org.createdAt).split('T')[0] : new Date().toISOString().split('T')[0],
        status: org.status || 'ACTIVE',
      }));
      return [...this.organizations];
    } catch (err) {
      console.warn('Backend /organizations unreachable, fallback to memory:', err);
      return [...this.organizations];
    }
  }

  async createOrganization(data: Omit<Organization, 'id' | 'createdAt' | 'communitiesCount' | 'propertiesCount' | 'adminsCount' | 'totalMrrCOP' | 'status'>): Promise<Organization> {
    try {
      const created: any = await apiClient.post('/organizations', {
        name: data.name,
        nit: data.nit,
        email: data.email,
        phone: data.phone,
        city: data.city,
        address: data.address,
      });

      const newOrg: Organization = {
        ...data,
        id: created?.id || `org-${Date.now()}`,
        communitiesCount: 0,
        propertiesCount: 0,
        adminsCount: 1,
        totalMrrCOP: 0,
        createdAt: new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
      };
      this.organizations.unshift(newOrg);
      this.recordAudit('Creación de Organización', 'Organizaciones', `Se registró la organización ${newOrg.name}`, newOrg.id, undefined, 'Éxito');
      return newOrg;
    } catch (err) {
      console.error('Error al crear organización en backend:', err);
      throw err;
    }
  }

  // ─── Tenants ──────────────────────────────────────────────
  async getTenants(filters?: { search?: string; status?: string; plan?: string; orgId?: string }): Promise<PlatformTenant[]> {
    try {
      const params: Record<string, any> = { size: 100 };
      if (filters?.search) params.search = filters.search;
      if (filters?.status && filters.status !== 'ALL') params.status = filters.status;

      const res = await apiClient.get<PageResponse<any>>('/tenants', params);
      const rawList = res?.content || (Array.isArray(res) ? res : []);
      this.tenants = rawList.map((t: any) => this.mapBackendTenant(t));

      let result = [...this.tenants];
      if (filters?.plan && filters.plan !== 'ALL') {
        const planFilter = filters.plan;
        result = result.filter(t => t.planId === planFilter || t.planName.toLowerCase() === planFilter.toLowerCase());
      }
      if (filters?.orgId && filters.orgId !== 'ALL') {
        const orgFilter = filters.orgId;
        result = result.filter(t => t.organizationId === orgFilter);
      }
      return result;
    } catch (err) {
      console.warn('Backend /tenants unreachable, fallback to memory:', err);
      let result = [...this.tenants];
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(
          t => t.name.toLowerCase().includes(q) || t.nit.includes(q) || t.city.toLowerCase().includes(q) || t.subdomain.toLowerCase().includes(q)
        );
      }
      if (filters?.status && filters.status !== 'ALL') {
        result = result.filter(t => t.status === filters.status);
      }
      return result;
    }
  }

  async getTenantById(id: string): Promise<PlatformTenant | undefined> {
    try {
      const t: any = await apiClient.get(`/tenants/${id}`);
      if (t?.id) {
        const mapped = this.mapBackendTenant(t);
        const idx = this.tenants.findIndex(item => item.id === mapped.id);
        if (idx >= 0) {
          this.tenants[idx] = mapped;
        } else {
          this.tenants.push(mapped);
        }
        return mapped;
      }
    } catch (err) {
      console.warn('Error fetching tenant by id:', err);
    }
    return this.tenants.find(t => t.id === id);
  }

  async createTenant(data: Partial<PlatformTenant>): Promise<PlatformTenant> {
    try {
      const safeSlug = (data.name || 'comunidad').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');
      const safeSubdomain = (data.subdomain || safeSlug.replace(/-/g, '')).toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');

      const created: any = await apiClient.post('/tenants', {
        organizationId: data.organizationId || null,
        name: (data.name || '').trim(),
        slug: safeSlug,
        subdomain: safeSubdomain,
        nit: data.nit,
        city: data.city,
        address: data.address,
        phone: data.phone || data.adminPhone,
        contactEmail: data.contactEmail || data.adminEmail,
        storageLimitMb: data.storageLimitMB || 5120,
        adminName: data.adminName,
        adminEmail: data.adminEmail,
        adminPassword: (data as any).adminPassword,
        adminPhone: data.adminPhone,
        planId: data.planId,
        planName: data.planName,
        propertiesCount: data.propertiesCount,
      });

      const newTenant = this.mapBackendTenant({
        ...data,
        ...created,
      });

      this.tenants.unshift(newTenant);
      return newTenant;
    } catch (err: any) {
      console.error('Error al crear tenant en backend:', err, err.data?.errors || err.data);
      throw err;
    }
  }

  async suspendTenant(id: string, reason: string): Promise<boolean> {
    try {
      const updated: any = await apiClient.post(`/tenants/${id}/suspend?reason=${encodeURIComponent(reason)}`);
      if (updated?.id) {
        const mapped = this.mapBackendTenant(updated);
        const idx = this.tenants.findIndex(t => t.id === id);
        if (idx >= 0) this.tenants[idx] = mapped;
      }
      return true;
    } catch (err) {
      console.error('Error suspendiendo tenant en backend:', err);
      return false;
    }
  }

  async reactivateTenant(id: string): Promise<boolean> {
    try {
      const updated: any = await apiClient.post(`/tenants/${id}/activate`);
      if (updated?.id) {
        const mapped = this.mapBackendTenant(updated);
        const idx = this.tenants.findIndex(t => t.id === id);
        if (idx >= 0) this.tenants[idx] = mapped;
      }
      return true;
    } catch (err) {
      console.error('Error reactivando tenant en backend:', err);
      return false;
    }
  }

  async updateTenant(id: string, updates: Partial<PlatformTenant> & { adminPassword?: string }): Promise<PlatformTenant | null> {
    try {
      const updated: any = await apiClient.put(`/tenants/${id}`, {
        name: updates.name,
        nit: updates.nit,
        city: updates.city,
        address: updates.address,
        phone: updates.phone ?? updates.adminPhone,
        contactEmail: updates.contactEmail ?? updates.adminEmail,
        organizationId: updates.organizationId || null,
        storageLimitMb: updates.storageLimitMB,
        propertiesCount: updates.propertiesCount,
        adminName: updates.adminName,
        adminEmail: updates.adminEmail,
        adminPhone: updates.adminPhone,
        adminPassword: updates.adminPassword,
        activeFeatures: updates.activeFeatures,
      });

      const mapped = updated?.id ? this.mapBackendTenant(updated) : null;
      if (mapped) {
        const idx = this.tenants.findIndex(t => t.id === id);
        if (idx >= 0) this.tenants[idx] = mapped;
      }
      return mapped;
    } catch (err) {
      console.error('Error actualizando tenant en backend:', err);
      return null;
    }
  }

  async changeTenantPlan(id: string, newPlanId: string): Promise<boolean> {
    try {
      const updated: any = await apiClient.post(`/tenants/${id}/change-plan`, {
        planId: newPlanId,
      });
      if (updated?.id) {
        const mapped = this.mapBackendTenant(updated);
        const idx = this.tenants.findIndex(t => t.id === id);
        if (idx >= 0) this.tenants[idx] = mapped;
      }
      return true;
    } catch (err) {
      console.error('Error cambiando plan de tenant en backend:', err);
      return false;
    }
  }

  async toggleTenantFeature(tenantId: string, featureKey: string, enabled: boolean): Promise<boolean> {
    try {
      const updated: any = await apiClient.put(
        `/tenants/${tenantId}/features/${encodeURIComponent(featureKey)}?enabled=${enabled}`
      );
      if (updated?.id) {
        const mapped = this.mapBackendTenant(updated);
        const idx = this.tenants.findIndex(t => t.id === tenantId);
        if (idx >= 0) this.tenants[idx] = mapped;
      }
      return true;
    } catch (err) {
      console.error('Error actualizando feature de tenant en backend:', err);
      return false;
    }
  }

  // ─── Internal Users ───────────────────────────────────────
  async getInternalUsers(): Promise<InternalUser[]> {
    try {
      const usersRes = await apiClient.get<any[]>('/users/internal');
      this.users = usersRes.map((u: any) => {
        const globalMem = u.memberships?.find((m: any) => m.role === 'SUPER_ADMIN' || m.role === 'PLATFORM_ADMIN');
        return {
          id: u.id,
          name: u.name || '',
          email: u.email || '',
          phone: '',
          role: globalMem ? globalMem.role : 'READ_ONLY',
          status: u.status || 'ACTIVE',
          lastLoginAt: 'No disponible',
          createdAt: new Date().toISOString().split('T')[0],
        };
      });
      return this.users;
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async getGlobalUsers(): Promise<InternalUser[]> {
    return [...this.users];
  }

  async createInternalUser(data: { name: string; email: string; phone?: string; role: BackofficeRole | 'COMMUNITY_ADMIN'; password?: string }): Promise<any> {
    try {
      const res = await apiClient.post('/users', {
        fullName: data.name,
        email: data.email,
        password: data.password || 'Temporal123!',
        phone: data.phone,
        role: data.role,
      });
      return res;
    } catch (err) {
      console.error('Error creating user:', err);
      throw err;
    }
  }

  async updateInternalUserRole(id: string, role: BackofficeRole): Promise<boolean> {
    const u = this.users.find(usr => usr.id === id);
    if (!u) return false;
    u.role = role;
    this.recordAudit('Rol de Usuario Modificado', 'Usuarios Internos', `Nuevo rol: ${role} para ${u.name}`, u.id, undefined, 'Éxito');
    return true;
  }

  async updateInternalUserStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<boolean> {
    const u = this.users.find(usr => usr.id === id);
    if (!u) return false;
    u.status = status;
    this.recordAudit('Estado de Usuario Modificado', 'Usuarios Internos', `${u.name} ahora está ${status}`, u.id, undefined, 'Éxito');
    return true;
  }

  // ─── Plans & Subscriptions ────────────────────────────────
  async getPlans(): Promise<Plan[]> {
    try {
      const plans = await planService.getPlans();
      const mapped = plans.map(p => ({
        ...p,
        tagline: p.tagline || (p.maxProperties ? `Hasta ${p.maxProperties} propiedades residenciales` : 'Unidades y almacenamiento ilimitado'),
        basePriceCOP: 0,
        pricePerUnitCOP: Number(p.grossPricePerProperty ?? 3000),
        storageGB: p.maxStorageBytes ? Math.floor(p.maxStorageBytes / (1024 * 1024 * 1024)) : 512,
        maxAdmins: p.maxAdminUsers || 2,
        features: p.features ? String(p.features).split(',').map(f => f.trim()) : [],
      })) as unknown as Plan[];
      this.plans = mapped;
      return mapped;
    } catch (err) {
      console.error('Error fetching plans in superAdminService:', err);
      return this.plans;
    }
  }

  async updatePlan(id: string, updates: Partial<Plan>): Promise<boolean> {
    const p = this.plans.find(plan => plan.id === id);
    if (!p) return false;
    Object.assign(p, updates);
    this.recordAudit('Actualización de Plan', 'Planes', `Se actualizaron parámetros del plan ${p.name}`, p.id, undefined, 'Éxito');
    return true;
  }

  async getSubscriptions(): Promise<SaaSSubscription[]> {
    try {
      const res = await apiClient.get<PageResponse<any>>('/saas/subscriptions', { size: 100 });
      const raw = res?.content || (Array.isArray(res) ? res : []);
      this.subscriptions = raw.map((s: any) => ({
        id: s.id,
        tenantId: s.tenantId,
        tenantName: s.tenantName || 'N/A',
        planId: s.planId,
        planName: s.planName || s.tier,
        tier: s.tier,
        priceCOP: s.grossPricePerProperty || 0,
        billingCycle: s.billingCycle || 'MONTHLY',
        status: s.status || 'ACTIVE',
        startDate: s.startDate ? String(s.startDate).split('T')[0] : '',
        expiresAt: s.expiresAt ? String(s.expiresAt).split('T')[0] : '',
        paymentMethod: s.paymentMethod,
        autoRenew: s.autoRenew
      }));
      return [...this.subscriptions];
    } catch (err) {
      console.warn('Backend /saas/subscriptions failed, fallback to memory:', err);
      return [...this.subscriptions];
    }
  }

  async updateSubscriptionStatus(id: string, status: SubscriptionStatus): Promise<boolean> {
    try {
      await apiClient.post(`/saas/subscriptions/${id}/status?status=${status}`);
      const sub = this.subscriptions.find(s => s.id === id);
      if (sub) sub.status = status;
      this.recordAudit('Estado de Suscripción', 'Suscripciones', `${sub?.tenantName || id} pasó a estado ${status}`, id, sub?.tenantName, status === 'SUSPENDED' ? 'Advertencia' : 'Éxito');
      return true;
    } catch (err) {
      console.error('Error updateSubscriptionStatus:', err);
      return false;
    }
  }

  async changeSubscriptionPlan(id: string, newPlanId: string): Promise<boolean> {
    try {
      await apiClient.post(`/saas/subscriptions/${id}/change-plan?planId=${newPlanId}`);
      const sub = this.subscriptions.find(s => s.id === id);
      const plan = this.plans.find(p => p.id === newPlanId);
      if (sub && plan) {
        sub.planId = plan.id;
        sub.planName = plan.name;
        sub.tier = plan.tier;
        sub.priceCOP = plan.basePriceCOP;
      }
      this.recordAudit('Cambio de Plan en Suscripción', 'Suscripciones', `${sub?.tenantName || id} migró al plan ${plan?.name || newPlanId}`, id, sub?.tenantName, 'Éxito');
      return true;
    } catch (err) {
      console.error('Error changeSubscriptionPlan:', err);
      return false;
    }
  }

  async getInvoices(): Promise<SaaSInvoice[]> {
    return [...this.invoices];
  }

  // ─── Product Features ─────────────────────────────────────
  async getFeatureFlags(): Promise<ProductFeature[]> {
    try {
      const flags = await apiClient.get<any[]>('/feature-flags');
      if (Array.isArray(flags)) {
        this.featureFlags = flags.map((f: any) => ({
          id: f.id,
          key: f.key,
          name: f.name,
          description: f.description || '',
          category: f.category || 'Operación',
          enabledByPlan: f.enabledByPlan ? String(f.enabledByPlan).split(',').map((s: string) => s.trim()) : ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'],
          isEnabled: Boolean(f.isGlobalEnabled),
          isBeta: Boolean(f.isBeta),
          tenantsUsingCount: 0,
        }));
      }
      return [...this.featureFlags];
    } catch {
      return [...this.featureFlags];
    }
  }

  async getProductFeatures(): Promise<ProductFeature[]> {
    return this.getFeatureFlags();
  }

  async toggleGlobalFeatureFlag(id: string, enabled: boolean): Promise<boolean> {
    try {
      await apiClient.put(`/feature-flags/${id}/toggle?enabled=${enabled}`);
      const feat = this.featureFlags.find(f => f.id === id);
      if (feat) feat.isEnabled = enabled;
      return true;
    } catch {
      const feat = this.featureFlags.find(f => f.id === id);
      if (!feat) return false;
      feat.isEnabled = enabled;
      return true;
    }
  }

  // ─── Support Tickets & Health (kept for internal stability)
  async getSupportTickets(): Promise<SupportTicket[]> {
    return [...this.tickets];
  }

  async updateTicketStatus(id: string, status: SupportTicket['status']): Promise<boolean> {
    const t = this.tickets.find((item) => item.id === id);
    if (!t) return false;
    t.status = status;
    t.updatedAt = new Date().toISOString();
    return true;
  }

  async getPlatformHealth(): Promise<PlatformHealthService[]> {
    return [...this.platformHealth];
  }

  async getIncidents(): Promise<PlatformIncident[]> {
    return [...this.incidents];
  }

  async getIntegrations(): Promise<PlatformIntegration[]> {
    return [...this.integrations];
  }

  async getWebhooks(): Promise<PlatformWebhook[]> {
    return [...this.webhooks];
  }

  // ─── Audit Log ────────────────────────────────────────────
  async getAuditLog(search?: string): Promise<AuditEvent[]> {
    try {
      const params: Record<string, any> = { size: 100 };
      if (search) params.search = search;
      const res = await apiClient.get<PageResponse<any>>('/audit/logs', params);
      const raw = res?.content || (Array.isArray(res) ? res : []);
      if (raw.length > 0) {
        this.auditLog = raw.map((e: any) => this.mapBackendAuditEvent(e));
      }
      return [...this.auditLog];
    } catch {
      return [...this.auditLog];
    }
  }

  async getTenantAuditLog(tenantId: string): Promise<AuditEvent[]> {
    try {
      const res = await apiClient.get<PageResponse<any>>('/audit/logs', {
        tenantId,
        size: 30,
      });
      const raw = res?.content || (Array.isArray(res) ? res : []);
      return raw.map((e: any) => this.mapBackendAuditEvent(e));
    } catch {
      return this.auditLog.filter(e => e.entityId === tenantId);
    }
  }

  recordAudit(
    action: string,
    resource: string,
    details: string,
    entityId?: string,
    tenantName?: string,
    result: 'Éxito' | 'Advertencia' | 'Error' = 'Éxito'
  ) {
    const newEvent: AuditEvent = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toLocaleString('es-CO'),
      actorName: 'Super Administrador Global',
      actorEmail: 'xsebaspc5@gmail.com',
      actorRole: 'SUPER_ADMIN',
      action,
      resource,
      result,
      details,
      entityId,
      tenantName,
      ipAddress: '127.0.0.1',
    };
    this.auditLog.unshift(newEvent);

    const backendResult = result === 'Advertencia' ? 'WARNING' : result === 'Error' ? 'ERROR' : 'SUCCESS';
    apiClient
      .post('/audit/events', {
        actorName: newEvent.actorName,
        actorEmail: newEvent.actorEmail,
        actorRole: newEvent.actorRole,
        action,
        resource,
        tenantId: isValidUuid(entityId) ? entityId : null,
        tenantName: tenantName || null,
        result: backendResult,
        details,
        ipAddress: '127.0.0.1',
      })
      .catch(() => {
        // silent fallback if offline
      });
  }
}

export const superAdminService = new SuperAdminService();
