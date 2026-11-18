import { apiClient } from './apiClient';
import type { PageResponse, ApiResponse } from './types';

export interface PropertyResponse {
  id: string;
  name: string;
  number: string;
  status: string;
  /** Fase 2 / E4: estructura de la unidad (null si no tiene: casas). Ya venían en la respuesta. */
  structureId?: string | null;
  structureName?: string | null;
  structureType?: string | null;
}

export const propertyApi = {
  findAll: async () => {
    const response = await apiClient.get<PageResponse<PropertyResponse>>('/properties', { size: 1000 });
    return response.content || [];
  }
};
