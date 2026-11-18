/**
 * Servicio HTTP para el portal self-service del residente autenticado.
 * Todos los endpoints validan IDOR en el backend (propertyId viene del JWT).
 */
import { apiClient } from "../api/apiClient";
import type { Vehicle, Pet } from "../types";
import { activeUnitStore } from "../features/resident/unit/activeUnitStore";

/**
 * Fase 2 / E2: todas las rutas de este servicio dependen de la unidad seleccionada (`X-Property-Id`). El llamador
 * puede fijar la unidad (p. ej. la de la clave de su consulta); si no, se toma la unidad activa de esta pestaña en el
 * momento de la llamada. El backend la valida y nunca la sustituye por otra.
 */
const unit = (unitId?: string | null) => ({ unitId: unitId ?? activeUnitStore.getActiveUnitId() });

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

  getMyPeople: (unitId?: string | null): Promise<any[]> =>
    apiClient.get<any[]>('/resident/me/people', undefined, unit(unitId)).then((r) => r ?? []),

  inviteResident: (data: any, unitId?: string | null): Promise<any> =>
    apiClient.post<any>('/resident/me/invitations', data, unit(unitId ?? data?.propertyId)),

  cancelInvitation: (invitationId: string, unitId?: string | null): Promise<void> =>
    apiClient.delete<void>(`/resident/me/invitations/${invitationId}`, unit(unitId)),

  /** SEC-7: el enlace solo se entrega al emitir; para volver a compartirlo, su emisor genera uno nuevo (revoca el anterior). */
  regenerateInvitation: (invitationId: string, unitId?: string | null): Promise<any> =>
    apiClient.post<any>(`/resident/me/invitations/${invitationId}/regenerate`, undefined, unit(unitId)),

  terminatePerson: (personId: string, unitId?: string | null): Promise<void> =>
    apiClient.delete<void>(`/resident/me/people/${personId}`, unit(unitId)),

  reactivatePerson: (personId: string, unitId?: string | null): Promise<void> =>
    apiClient.patch<void>(`/resident/me/people/${personId}/reactivate`, {}, unit(unitId)),


  // ─── Info y Estado ───────────────────────────────────────────────────────────

  getMyPropertyInfo: (unitId?: string | null): Promise<{
    propertyId: string;
    number: string;
    name: string;
    status: string;
    hasCompletedOnboarding: boolean;
  }> => apiClient.get<any>(`${BASE}/property-info`, undefined, unit(unitId)),

  // ─── Vehículos ───────────────────────────────────────────────────────────────

  getMyVehicles: (unitId?: string | null): Promise<Vehicle[]> =>
    apiClient.get<any>(`${BASE}/vehicles`, undefined, unit(unitId)).then((r) => r ?? []),

  addMyVehicle: (data: ResidentCreateVehicleDto, unitId?: string | null): Promise<Vehicle> =>
    apiClient.post<any>(`${BASE}/vehicles`, data, unit(unitId)),

  updateMyVehicle: (vehicleId: string, data: ResidentCreateVehicleDto, unitId?: string | null): Promise<Vehicle> =>
    apiClient.put<any>(`${BASE}/vehicles/${vehicleId}`, data, unit(unitId)),

  deleteMyVehicle: (vehicleId: string, unitId?: string | null): Promise<void> =>
    apiClient.delete<void>(`${BASE}/vehicles/${vehicleId}`, unit(unitId)),

  // ─── Mascotas ────────────────────────────────────────────────────────────────

  getMyPets: (unitId?: string | null): Promise<Pet[]> =>
    apiClient.get<any>(`${BASE}/pets`, undefined, unit(unitId)).then((r) => r ?? []),

  addMyPet: (data: ResidentCreatePetDto, unitId?: string | null): Promise<Pet> =>
    apiClient.post<any>(`${BASE}/pets`, data, unit(unitId)),

  updateMyPet: (petId: string, data: ResidentCreatePetDto, unitId?: string | null): Promise<Pet> =>
    apiClient.put<any>(`${BASE}/pets/${petId}`, data, unit(unitId)),

  deleteMyPet: (petId: string, unitId?: string | null): Promise<void> =>
    apiClient.delete<void>(`${BASE}/pets/${petId}`, unit(unitId)),

  // ─── Onboarding ──────────────────────────────────────────────────────────────

  completeOnboarding: (): Promise<void> =>
    apiClient.patch<void>(`${BASE}/onboarding`, {}),
};
