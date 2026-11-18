import { apiClient } from "../api/apiClient";

export interface ResidentInvitationResponse {
  id: string;
  propertyId: string;
  propertyName: string;
  status: string;
  invitationType: string;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  createdAt: string;
  usedAt?: string;
  link?: string;
}

export interface PublicInvitationResponse {
  tenantName: string;
  propertyName: string;
  structureName: string;
  invitationType: string;
}

export const residentInvitationService = {
  generateInvitation: async (propertyId: string, additionalPropertyIds?: string[]): Promise<ResidentInvitationResponse> => {
    const response = await apiClient.post<any>(`/properties/${propertyId}/resident-invitations`, { additionalPropertyIds });
    return response;
  },

  listInvitations: async (propertyId: string): Promise<ResidentInvitationResponse[]> => {
    const response = await apiClient.get<any>(`/properties/${propertyId}/resident-invitations`);
    return response;
  },

  revokeInvitation: async (id: string): Promise<void> => {
    await apiClient.post<any>(`/resident-invitations/${id}/revoke`);
  },

  /** Revoca la invitacion pendiente y emite una nueva para la misma unidad; solo la respuesta trae el enlace. */
  regenerateInvitation: async (id: string): Promise<ResidentInvitationResponse> => {
    const response = await apiClient.post<any>(`/resident-invitations/${id}/regenerate`);
    return response;
  },

  validatePublicToken: async (token: string): Promise<PublicInvitationResponse> => {
    const response = await apiClient.get<any>(`/public/resident-invitations/${token}`);
    return response;
  },

  registerResident: async (token: string, data: any): Promise<void> => {
    await apiClient.post<any>(`/public/resident-invitations/${token}/register`, data);
  }
};

