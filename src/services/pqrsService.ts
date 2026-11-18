import { apiClient } from '../api/apiClient';

export interface CreatePqrsDto {
  propertyId: string;
  residentId?: string;
  category: string;
  title: string;
  description: string;
  priority: string;
}

export interface AddPqrsCommentDto {
  comment: string;
}

export const pqrsService = {
  findAll: (page: number = 0, size: number = 20, status?: string, query?: string) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('size', size.toString());
    if (status) params.append('status', status);
    if (query) params.append('query', query);
    return apiClient.get<any>(`/pqrs?${params.toString()}`);
  },

  findById: (id: string) => 
    apiClient.get<any>(`/pqrs/${id}`),

  findByProperty: (propertyId: string) => 
    apiClient.get<any[]>(`/pqrs/by-property/${propertyId}`),

  create: (data: CreatePqrsDto) => 
    apiClient.post<any>('/pqrs', data),

  update: (id: string, data: any) => 
    apiClient.put<any>(`/pqrs/${id}`, data),
    
  delete: (id: string) => 
    apiClient.delete<void>(`/pqrs/${id}`),
    
  assignTechnician: (id: string, technicianUserId: string) => 
    apiClient.post<any>(`/pqrs/${id}/assign/${technicianUserId}`, {}),

  resolve: (id: string, responseNotes: string) => 
    apiClient.post<any>(`/pqrs/${id}/resolve`, { responseNotes }),

  addComment: (id: string, data: AddPqrsCommentDto) => 
    apiClient.post<any>(`/pqrs/${id}/comments`, data),
};
