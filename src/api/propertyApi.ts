import { apiClient } from './apiClient';
import type { PageResponse, ApiResponse } from './types';

export interface PropertyResponse {
  id: string;
  name: string;
  number: string;
  status: string;
}

export const propertyApi = {
  findAll: async () => {
    const response = await apiClient.get<PageResponse<PropertyResponse>>('/properties', { size: 1000 });
    return response.content || [];
  }
};
