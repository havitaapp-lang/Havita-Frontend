import { apiClient } from '../api/apiClient';
import type { Resident } from '../types';
import type { PageResponse, QueryParams } from '../api/types';

export const residentService = {
  async getAll(_tenantId?: string, params?: QueryParams): Promise<PageResponse<Resident>> {
    return apiClient.get<PageResponse<Resident>>('/residents', params);
  },

  async getById(_tenantId: string, residentId: string): Promise<Resident> {
    return apiClient.get<Resident>('/residents/' + residentId);
  },

  async create(_tenantId: string, data: Omit<Resident, 'id' | 'tenantId'>): Promise<Resident> {
    return apiClient.post<Resident>('/residents', data);
  },

  async update(_tenantId: string, residentId: string, data: Partial<Resident>): Promise<Resident> {
    return apiClient.put<Resident>('/residents/' + residentId, data);
  },

  async delete(_tenantId: string, residentId: string): Promise<void> {
    return apiClient.delete<void>('/residents/' + residentId);
  }
};
