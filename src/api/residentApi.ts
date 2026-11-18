import { apiClient } from './apiClient';
import type { PageResponse, ApiResponse } from './types';

export interface ResidentResponse {
  id: string;
  tenantId: string;
  propertyId: string;
  propertyNumber: string;
  propertyName: string;
  userId?: string;
  name: string;
  documentType: string;
  documentId: string;
  type: string;
  phone: string;
  email: string;
  isMainContact: boolean;
  status: string;
  createdAt: string;
}

export interface CreateResidentRequest {
  propertyId: string;
  userId?: string;
  name: string;
  type: string;
  phone: string;
  email: string;
}

export interface UpdateResidentRequest {
  propertyId?: string;
  name?: string;
  type?: string;
  phone?: string;
  email?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export const residentApi = {
  /**
   * Directorio paginado en el backend. `status` ausente = todos los estados; `type` ausente = todos los tipos.
   * La búsqueda cubre nombre, documento, correo, teléfono y unidad (número, nombre y torre).
   */
  findAll: async (
    page = 0,
    size = 10,
    search?: string,
    filters: { status?: 'ACTIVE' | 'INACTIVE'; type?: string; structureId?: string } = {},
  ) => {
    const response = await apiClient.get<PageResponse<ResidentResponse>>('/residents', {
      page,
      size,
      search: search?.trim() || undefined,
      status: filters.status,
      type: filters.type,
      // Fase 2 / E4: UUID de una estructura de la comunidad o "none" (unidades sin estructura); ausente = todas.
      structureId: filters.structureId,
    });
    return response;
  },
  create: async (data: CreateResidentRequest) => {
    const response = await apiClient.post<ResidentResponse>('/residents', data);
    return response;
  },
  /** PUT /residents/{id} (UpdateResidentRequest). Con status INACTIVE es una baja lógica y con ACTIVE, una reactivación. */
  update: async (id: string, data: UpdateResidentRequest) => {
    const response = await apiClient.put<ResidentResponse>(`/residents/${id}`, data);
    return response;
  },
  assignProperties: async (userId: string, propertyIds: string[], type: string, isMainContact: boolean) => {
    const response = await apiClient.post<ApiResponse<ResidentResponse[]>>(`/residents/users/${userId}/properties`, { propertyIds, type, isMainContact });
    return response;
  },
  generateInvitation: async (propertyId: string, additionalPropertyIds?: string[]) => {
    const response = await apiClient.post<ApiResponse<any>>(`/properties/${propertyId}/resident-invitations`, { additionalPropertyIds });
    return response.data;
  },
  delete: async (id: string) => {
    await apiClient.delete(`/residents/${id}`);
  }
};
