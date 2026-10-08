
export interface UserMembership {
  tenantId: string;
  role: Role;
  tenantName: string;
  tenantSubdomain: string;
}
export type Role = 'SUPER_ADMIN' | 'PLATFORM_ADMIN' | 'READ_ONLY' | 'COMMUNITY_ADMIN' | 'SECURITY' | 'STAFF' | 'RESIDENT' | 'ACCOUNTANT';
export type UserRole = Role;

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  unitsCount?: number;
  structureType?: string;
  stratum?: number;
  status?: string;
  suspendedReason?: string;
  activeFeatures?: string[];
}

export interface User {
  hasCompletedOnboarding?: boolean;
  memberships?: UserMembership[];
  residentPropertyId?: string;
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  propertyUnit?: string;
  phone?: string;
  status?: string;
  createdAt?: string;
}

export interface PropertyUnit {
  id: string;
  tenantId: string;
  name: string; // e.g., '101', 'Apto 2003'
  path: string; // e.g., 'Torre 7 -> Piso 20 -> Apto 2003'
  type: 'Apartamento' | 'Casa' | 'Local' | 'Parqueadero' | 'Depósito';
  area?: number;
  status: 'OCCUPIED' | 'VACANT' | 'MAINTENANCE' | 'INACTIVE';
  residentName?: string;
  residentPhone?: string;
  residentEmail?: string;
  structureName?: string;
  structureType?: 'Torre' | 'Bloque' | 'Manzana' | 'Sector' | 'Etapa';
  level?: string | number;
  number?: string;
  bedrooms?: number;
  bathrooms?: number;
  vehiclesCount?: number;
  petsCount?: number;
}

export interface Resident {
  id: string;
  userId?: string;
  tenantId: string;
  propertyId: string; // e.g. 'Torre 1 - 101'
  name: string;
  type: 'Propietario' | 'Arrendatario' | string;
  phone: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE' | string;
  registeredAt?: string;
}

export interface Package {
  id: string;
  tenantId: string;
  propertyId: string; // e.g. 'Torre 2 - 504'
  recipientName: string;
  trackingNumber?: string;
  company: string; // 'Mercado Libre' | 'Amazon' | 'Servientrega' | 'Coordinadora' | 'DHL' | 'Otro'
  status: 'RECEIVED' | 'NOTIFIED' | 'DELIVERED';
  receivedAt: string;
  deliveredAt?: string;
  observations?: string;
}

export interface Visitor {
  id: string;
  tenantId: string;
  propertyId: string; // UUID
  propertyNumber?: string;
  propertyName?: string;
  residentName?: string;
  createdByUserId?: string;
  name: string;
  documentId: string;
  status: 'APPROVED' | 'PENDING' | 'ENTERED' | 'EXITED' | 'EXPIRED' | 'CANCELLED';
  expectedAt?: string;
  enteredAt?: string;
  exitedAt?: string;
  createdAt?: string;
  vehiclePlate?: string;
  observations?: string;
  qrCode?: string;
  groupId?: string; // Links multiple visitors under one visit pass
  groupName?: string; // Optional group title, e.g. 'Visita Familiar'
  visitPurpose?: string; // e.g. 'Almuerzo familiar', 'Reunión de trabajo'
}

export interface RequestPQRS {
  id: string;
  tenantId: string;
  propertyId: string; // e.g. 'Torre 2 - 504'
  residentName: string;
  category: 'Plomería' | 'Electricidad' | 'Ascensor' | 'Seguridad' | 'Limpieza' | 'Zonas comunes' | 'Otro';
  title: string;
  description: string;
  status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  createdAt: string;
  updatedAt: string;
  responseNotes?: string;
}

export interface CommonZone {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  capacity: number;
  reservationRequired: boolean;
  costPerHour?: number;
  rules?: string;
  status: string; // "ACTIVE" or "INACTIVE"
  disabledMessage?: string;
  disabledDays?: string; // Comma separated days e.g. "MONDAY,TUESDAY"
  openTime?: string;
  closeTime?: string;
}

export interface Reservation {
  id: string;
  tenantId: string;
  propertyId: string;
  commonZoneId?: string;
  residentName: string;
  zone: 'Salón Social' | 'Zona BBQ' | 'Piscina' | 'Cancha Múltiple' | 'Gimnasio' | string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  guestsCount?: number;
  attendeesCount?: number;
  totalCost?: number;
  status: 'Confirmada' | 'PENDING' | 'Cancelada' | 'Rechazada' | string;
  observations?: string;
  notes?: string;
  adminNotes?: string;
}

  export interface Communication {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  authorId?: string;
  authorName: string;
  audience: string;
  createdAt: string;
  status: 'PUBLISHED' | 'DRAFT';
  category?: string;
}

export interface CommunityDocument {
  id: string;
  tenantId: string;
  title: string;
  category: 'Reglamento' | 'Acta' | 'Estados Financieros' | 'Manual' | 'Circular' | string;
  fileSize: string;
  uploadedAt: string;
  fileType: 'PDF' | 'DOCX' | 'XLSX' | string;
  description?: string;
  downloadsCount: number;
  fileUrl?: string;
  storageKey?: string;
}


// ─── Vehículos y Mascotas ─────────────────────────────────────────────────────

export interface Vehicle {
  id: string;
  tenantId: string;
  propertyId: string;
  propertyNumber: string;
  residentId?: string;
  residentName?: string;
  plate: string;
  type: string; // 'Automóvil' | 'Moto' | 'Camioneta' | 'Bicicleta' | 'Otro'
  brand?: string;
  model?: string;
  color?: string;
  parkingSpot?: string;
}

export interface Pet {
  id: string;
  tenantId: string;
  propertyId: string;
  propertyNumber: string;
  residentId?: string;
  residentName?: string;
  name: string;
  type: string; // 'Perro' | 'Gato' | 'Ave' | 'Reptil' | 'Otro'
  breed?: string;
  color?: string;
  isDangerousBreed?: boolean;
  vaccinationCardUrl?: string;
  photoUrl?: string;
}


export * from './visitorSettings';


// ─── Marketplace ─────────────────────────────────────────────────────────────

export type ListingType = 'PRODUCT' | 'SERVICE';
export type ListingStatus = 'PENDING_APPROVAL' | 'PUBLISHED' | 'REJECTED' | 'HIDDEN' | 'EXPIRED';
export type PriceType = 'FIXED' | 'NEGOTIABLE' | 'CONTACT';
export type MarketplaceMode = 'AUTO_APPROVE' | 'REQUIRE_APPROVAL';
export type ReportReason = 'INAPPROPRIATE' | 'NOT_ALLOWED' | 'MISLEADING' | 'SPAM' | 'OTHER';
export type ReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';

export interface MarketplaceListingAuthor {
  userId: string;
  fullName: string;
  propertyUnit: string | null;
}

export interface MarketplaceListing {
  id: string;
  type: ListingType;
  category: string;
  title: string;
  description: string;
  price: number | null;
  priceType: PriceType;
  status: ListingStatus;
  imageUrls: string[];
  contactPhone: string | null;
  rejectionReason: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: MarketplaceListingAuthor;
}

export interface MarketplaceConfig {
  mode: MarketplaceMode;
  listingDurationDays: number;
  marketplaceEnabled: boolean;
}

export interface MarketplaceReport {
  id: string;
  listing: MarketplaceListing;
  reportedByUserId: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
}

export interface MarketplacePageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
}


export type AlertType = 'MEDICAL' | 'SECURITY' | 'FIRE' | 'OTHER';
export type PanicAlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_ALARM';

export interface PanicAlert {
  id: string;
  alertType: AlertType;
  alertTypeLabel: string;
  notes: string | null;
  status: PanicAlertStatus;
  residentId: string | null;
  residentName: string | null;
  propertyId: string | null;
  propertyPath: string | null;
  propertyNumber: string | null;
  acknowledgedById: string | null;
  acknowledgedByName: string | null;
  acknowledgedAt: string | null;
  resolvedById: string | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}
