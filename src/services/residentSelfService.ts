/**
 * Servicio HTTP para el portal self-service del residente autenticado.
 * Todos los endpoints validan IDOR en el backend (propertyId viene del JWT).
 */
import { apiClient } from "../api/apiClient";
import type { Vehicle, Pet } from "../types";

export interface ResidentCreateVehicleDto {
  plate: string;
  type?: string;
  brand?: string;
  model?: string;
  color?: string;
  parkingSpot?: string;
}

export interface ResidentCreatePetDto {
  name: string;
  type?: string;
  breed?: string;
  color?: string;
  isDangerousBreed?: boolean;
}

const BASE = "/resident/me";

export const residentSelfService = {

  getMyPeople: (): Promise<any[]> => apiClient.get<any[]>('/resident/me/people').then((r) => r ?? []),

  inviteResident: (data: any): Promise<any> => apiClient.post<any>('/resident/me/invitations', data),

  cancelInvitation: (invitationId: string): Promise<void> => apiClient.delete<void>(`/resident/me/invitations/${invitationId}`),

  terminatePerson: (personId: string): Promise<void> => apiClient.delete<void>(`/resident/me/people/${personId}`),

  reactivatePerson: (personId: string): Promise<void> => apiClient.patch<void>(`/resident/me/people/${personId}/reactivate`, {}),


  // ─── Info y Estado ───────────────────────────────────────────────────────────

  getMyPropertyInfo: (): Promise<{
    propertyId: string;
    number: string;
    name: string;
    status: string;
    hasCompletedOnboarding: boolean;
  }> => apiClient.get<any>(`${BASE}/property-info`),

  // ─── Vehículos ───────────────────────────────────────────────────────────────

  getMyVehicles: (): Promise<Vehicle[]> =>
    apiClient.get<any>(`${BASE}/vehicles`).then((r) => r ?? []),

  addMyVehicle: (data: ResidentCreateVehicleDto): Promise<Vehicle> =>
    apiClient.post<any>(`${BASE}/vehicles`, data),

  deleteMyVehicle: (vehicleId: string): Promise<void> =>
    apiClient.delete<void>(`${BASE}/vehicles/${vehicleId}`),

  // ─── Mascotas ────────────────────────────────────────────────────────────────

  getMyPets: (): Promise<Pet[]> =>
    apiClient.get<any>(`${BASE}/pets`).then((r) => r ?? []),

  addMyPet: (data: ResidentCreatePetDto): Promise<Pet> =>
    apiClient.post<any>(`${BASE}/pets`, data),

  deleteMyPet: (petId: string): Promise<void> =>
    apiClient.delete<void>(`${BASE}/pets/${petId}`),

  // ─── Onboarding ──────────────────────────────────────────────────────────────

  completeOnboarding: (): Promise<void> =>
    apiClient.patch<void>(`${BASE}/onboarding`, {}),
};
