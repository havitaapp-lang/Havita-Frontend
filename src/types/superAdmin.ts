// Types for Havita Super Admin / Global SaaS Backoffice

export type BackofficeRole = 
  | 'SUPER_ADMIN' 
  | 'PLATFORM_ADMIN' 
  | 'READ_ONLY';

export type TenantStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED';

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';

export type PlanTier = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  included: boolean;
  limit?: string | number;
}

export interface Plan {
  id: string;
  tier: PlanTier;
  name: string;
  tagline: string;
  basePriceCOP: number;
  pricePerUnitCOP: number;
  periodicity: 'Mensual' | 'Anual';
  maxProperties: number;
  maxAdmins: number;
  storageGB: number;
  popular?: boolean;
  features: string[];
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Organization {
  id: string;
  name: string;
  nit: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  communitiesCount: number;
  propertiesCount: number;
  adminsCount: number;
  totalMrrCOP: number;
  createdAt: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface TenantHealthBreakdown {
  score: number; // 0 - 100
  label: 'Excelente' | 'Bueno' | 'En Riesgo' | 'Crítico';
  color: 'emerald' | 'blue' | 'amber' | 'rose';
  activeUsersRate: number; // percentage
  configCompletion: number; // percentage
  moduleAdoptionRate: number; // percentage
  errorRate: number; // percentage
  lastIncidentDaysAgo: number;
}

export interface PlatformTenant {
  id: string;
  organizationId?: string;
  organizationName?: string;
  name: string;
  slug: string;
  subdomain: string;
  nit: string;
  city: string;
  address: string;
  phone: string;
  contactEmail: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  adminPassword?: string;
  status: TenantStatus;
  planId: string;
  planName: string;
  propertiesCount: number;
  usersCount: number;
  staffCount: number;
  mrrCOP: number;
  health: TenantHealthBreakdown;
  activeFeatures: string[];
  openTicketsCount: number;
  lastActivityAt: string;
  createdAt: string;
  trialEndsAt?: string;
  suspendedReason?: string;
  storageUsedMB: number;
  storageLimitMB: number;
  statsMonthly: {
    visitorsCount: number;
    packagesCount: number;
    pqrsCount: number;
    reservationsCount: number;
  };
}

export interface InternalUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: BackofficeRole;
  status: 'ACTIVE' | 'INACTIVE' | 'INVITED';
  lastLoginAt: string;
  createdAt: string;
}

// GlobalUser kept for compatibility if referenced
export type GlobalUser = InternalUser;

export interface SaaSSubscription {
  id: string;
  tenantId: string;
  tenantName: string;
  planId: string;
  planName: string;
  tier: PlanTier;
  priceCOP: number;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  status: SubscriptionStatus;
  startDate: string;
  expiresAt: string;
  paymentMethod?: 'PSE' | 'CARD' | 'BANK_TRANSFER';
  autoRenew?: boolean;
}

export interface ProductFeature {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
}


export interface SaaSInvoice {
  id: string;
  invoiceNumber: string; // e.g. "INV-2026-089"
  tenantId: string;
  tenantName: string;
  planName: string;
  period: string; // e.g. "Septiembre 2026"
  amountCOP: number;
  taxCOP: number;
  totalCOP: number;
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'VOIDED';
}

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  category: 'Seguridad' | 'Operación' | 'Finanzas' | 'Comunidad' | 'Avanzado';
  enabledByPlan: PlanTier[];
  isGlobalEnabled: boolean;
  isBeta?: boolean;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string; // e.g. "TICK-492"
  tenantId: string;
  tenantName: string;
  requesterName: string;
  requesterEmail: string;
  title: string;
  description: string;
  category: 'Acceso / Portería' | 'Facturación' | 'Integración' | 'Error del Sistema' | 'Configuración';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
}

export interface PlatformHealthService {
  name: string;
  category: 'Core' | 'Data' | 'External';
  status: 'OPERATIONAL' | 'DEGRADED' | 'OUTAGE';
  latencyMs: number;
  uptime90d: number;
  lastIncident?: string;
}

export interface PlatformIncident {
  id: string;
  title: string;
  affectedServices: string[];
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
  status: 'INVESTIGATING' | 'IDENTIFIED' | 'MONITORING' | 'RESOLVED';
  startedAt: string;
  resolvedAt?: string;
  description: string;
  updates: Array<{ timestamp: string; message: string }>;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorName: string;
  actorEmail?: string;
  actorRole: BackofficeRole | string;
  action: string;
  resource: string;
  tenantId?: string;
  tenantName?: string;
  result: 'Éxito' | 'Advertencia' | 'Error';
  details: string;
  ipAddress: string;
  entityType?: 'TENANT' | 'ORGANIZATION' | 'SUBSCRIPTION' | 'PLAN' | 'USER' | 'FEATURE_FLAG' | 'SETTINGS';
  entityId?: string;
}

export interface PlatformIntegration {
  id: string;
  name: string;
  provider: string;
  category: 'Pagos' | 'Comunicación' | 'Acceso / IoT' | 'Contabilidad';
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  description: string;
  lastSyncAt: string;
  tenantsConnectedCount: number;
}

export interface PlatformWebhook {
  id: string;
  name: string;
  url: string;
  tenantId?: string;
  tenantName?: string;
  events: string[];
  status: 'ACTIVE' | 'FAILING' | 'DISABLED';
  lastDeliveryStatus: 'SUCCESS' | 'FAILED';
  lastDeliveryAt: string;
  deliveriesCount: number;
}
