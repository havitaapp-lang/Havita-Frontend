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

export const residentApi = {
  findAll: async (page = 0, size = 10, search?: string) => {
    const response = await apiClient.get<PageResponse<ResidentResponse>>('/residents', { page, size, search });
    return response;
  },
  create: async (data: any) => {
    const response = await apiClient.post<ResidentResponse>('/residents', data);
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
