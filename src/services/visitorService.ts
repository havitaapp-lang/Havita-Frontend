import { apiClient } from "../api/apiClient";
import type { Visitor } from "../types";

export interface CreateVisitorDto {
  name: string;
  documentId: string;
  expectedAt?: string;
  vehiclePlate?: string;
  observations?: string;
  groupId?: string;
  groupName?: string;
  visitPurpose?: string;
}

export const visitorService = {
  // Endpoints del residente (autenticado, IDOR seguro)
  getMyVisitors: async (): Promise<Visitor[]> => {
    const res = await apiClient.get<any>("/resident/me/visitors");
    if (!Array.isArray(res)) return [];
    return res.map(mapBackendVisitor);
  },

  createMyVisitor: async (data: CreateVisitorDto): Promise<Visitor> => {
    const res = await apiClient.post<any>("/resident/me/visitors", data);
    return mapBackendVisitor(res);
  },

  deleteMyVisitor: async (visitorId: string): Promise<void> => {
    await apiClient.delete<void>(`/resident/me/visitors/${visitorId}`);
  },

  updateMyVisitor: async (visitorId: string, data: Partial<CreateVisitorDto>): Promise<Visitor> => {
    const res = await apiClient.put<any>(`/resident/me/visitors/${visitorId}`, data);
    return mapBackendVisitor(res);
  },

  // Endpoint público para el visor del pase QR /pass/:token
  getPublicPass: async (token: string): Promise<Visitor[]> => {
    const res = await apiClient.get<any>(`/public/visitor-passes/${token}`);
    if (!Array.isArray(res)) return [];
    return res.map(mapBackendVisitor);
  },
};

function formatFriendlyDateTime(dtStr?: string): string | undefined {
  if (!dtStr) return undefined;
  // If it's already a friendly string (e.g. "Hoy, 6:00 AM" or "Mañana..."), return as is
  if (dtStr.startsWith("Hoy") || dtStr.startsWith("Mañana") || dtStr.includes(" AM") || dtStr.includes(" PM")) {
    return dtStr;
  }
  try {
    const d = new Date(dtStr);
    if (isNaN(d.getTime())) return dtStr;

    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = d.toDateString() === tomorrow.toDateString();

    const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    if (isToday) return `Hoy, ${timeStr}`;
    if (isTomorrow) return `Mañana, ${timeStr}`;

    return `${d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}, ${timeStr}`;
  } catch {
    return dtStr;
  }
}

function mapBackendVisitor(v: any): Visitor {
  let status = v.status;
  if (status === 'AUTHORIZED' || status === 'AUTORIZADO') status = 'APPROVED';
  else if (status === 'PENDIENTE') status = 'PENDING';
  else if (status === 'INGRESO') status = 'ENTERED';
  else if (status === 'SALIO') status = 'EXITED';
  else if (status === 'EXPIRADO') status = 'EXPIRED';
  else if (status === 'CANCELADO' || status === 'CANCELADA') status = 'CANCELLED';
  // CANCELLED, PENDING, ENTERED, EXITED, EXPIRED, APPROVED pasan como están

  return {
    id: v.id,
    tenantId: v.tenantId,
    propertyId: v.propertyId || v.propertyNumber || v.propertyName,
    name: v.name,
    documentId: v.documentId,
    status: (status as Visitor['status']) || 'PENDING',
    expectedAt: formatFriendlyDateTime(v.expectedAt),
    enteredAt: formatFriendlyDateTime(v.enteredAt),
    exitedAt: formatFriendlyDateTime(v.exitedAt),
      createdAt: v.createdAt,
    vehiclePlate: v.vehiclePlate,
    observations: v.observations,
    visitPurpose: v.visitPurpose,
    groupId: v.groupId,
    groupName: v.groupName,
    qrCode: v.qrCode,
    propertyNumber: v.propertyNumber,
      createdByUserId: v.createdByUserId,
    propertyName: v.propertyName,
    residentName: v.residentName,
  } as any;
}

