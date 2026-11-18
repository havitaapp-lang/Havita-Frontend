import type { Assembly, AssemblyStatus } from '../types/assembly.types';
import { apiClient } from '../../../api/apiClient';

/** Fase 2 / E5: una unidad del residente frente a una asamblea (GET /assemblies/{id}/my-attendance-units). */
export interface MyAttendanceUnit {
  propertyId: string;
  label: string;
  number: string;
  relations: string[];
  status: 'REGISTERED' | 'PENDING' | 'NOT_ELIGIBLE' | 'CLOSED';
  registered: boolean;
  registeredByMe: boolean;
  canRegister: boolean;
  reasonCode?: string | null;
  reasonMessage?: string | null;
  /** Cierre E5 / D14: nombre de quien representa a la unidad (null si la asistencia no identifica a nadie). */
  representativeName?: string | null;
}

/** Cierre E5 / D14: persona de la unidad que la administración puede registrar como representante. */
export interface EligibleRepresentative {
  residentId: string;
  name: string;
  type: string;
  eligible: boolean;
  reasonCode?: string | null;
  reasonMessage?: string | null;
}

/** Fase 2 / E5: clave de React Query del estado de asistencia de las unidades del residente en una asamblea. */
export const myAttendanceUnitsKey = (assemblyId: string) => ['myAttendanceUnits', assemblyId] as const;

class AssemblyService {
  private mapAssembly(data: any): Assembly {
    return {
      ...data,
      date: data.assemblyDate,
      time: data.startTime
    };
  }

  async getAssemblies(): Promise<Assembly[]> {
    const data = await apiClient.get<any>('/assemblies');
    const list = data?.content || [];
    return list.map((a: any) => this.mapAssembly(a));
  }

  async getAssemblyById(id: string): Promise<Assembly | undefined> {
    const data = await apiClient.get<any>(/assemblies/ + id);
    return data ? this.mapAssembly(data) : undefined;
  }

  // Devuelve null (no undefined) cuando no hay asamblea en curso: en TanStack Query v5
  // un queryFn que retorna undefined se trata como error y no se guarda en caché.
  async getActiveAssembly(): Promise<Assembly | null> {
    // Cierre E5: la asamblea en curso se pide filtrada por estado (antes se buscaba solo en la primera página).
    const data = await apiClient.get<any>('/assemblies', { status: 'IN_PROGRESS', size: 1 });
    const list = data?.content || [];
    const active = list.find((a: any) => a.status === 'IN_PROGRESS');
    return active ? this.mapAssembly(active) : null;
  }

  async createAssembly(
    data: any
  ): Promise<Assembly> {
    const req = {
      title: data.title,
      type: data.type,
      modality: data.modality,
      assemblyDate: data.date,
      startTime: data.time + ':00', // Backend expects LocalTime, e.g. "HH:mm:ss"
      description: data.description
    };
    const newAssembly = await apiClient.post<any>('/assemblies', req);
    return this.mapAssembly(newAssembly);
  }

  async updateAssemblyStatus(id: string, status: AssemblyStatus): Promise<boolean> {
    if (status === 'IN_PROGRESS') {
      await apiClient.post(`/assemblies/${id}/start`, {});
      return true;
    } else if (status === 'ENDED') {
      await apiClient.post(`/assemblies/${id}/finish`, {});
      return true;
    }
    return false;
  }

  async incrementPollCount(assemblyId: string): Promise<void> {
    // This is handled by the backend automatically when a poll is created.
  }

  async getVotingRights(assemblyId: string): Promise<any[]> {
    const data = await apiClient.get<any[]>(`/assemblies/${assemblyId}/voting-rights`);
    return Array.isArray(data) ? data : (data as any)?.content || [];
  }

  /** Fase 2 / E5: unidades del residente y su estado de asistencia en la asamblea (fuente de verdad: backend). */
  async getMyAttendanceUnits(assemblyId: string): Promise<MyAttendanceUnit[]> {
    const data = await apiClient.get<MyAttendanceUnit[]>(`/assemblies/${assemblyId}/my-attendance-units`);
    return Array.isArray(data) ? data : [];
  }

  async selfRegisterAttendee(assemblyId: string, propertyId: string): Promise<any> {
    const res = await apiClient.post<any>(`/assemblies/${assemblyId}/attendees/self-register`, { propertyId });
    return res;
  }

  async registerAttendee(assemblyId: string, data: { propertyId: string; residentId: string; isPowerOfAttorney: boolean }): Promise<any> {
    const res = await apiClient.post<any>(`/assemblies/${assemblyId}/attendees`, data);
    return res;
  }

  /** Cierre E5 / D14: personas de la unidad y si pueden representarla (el backend decide). */
  async getEligibleRepresentatives(assemblyId: string, propertyId: string): Promise<EligibleRepresentative[]> {
    const data = await apiClient.get<EligibleRepresentative[]>(`/assemblies/${assemblyId}/attendees/eligible-representatives`, { propertyId });
    return Array.isArray(data) ? data : [];
  }

  /** Cierre E5 / D14: asigna el representante de una asistencia anterior sin persona identificada. */
  async assignRepresentative(assemblyId: string, attendeeId: string, residentId: string): Promise<any> {
    return apiClient.put<any>(`/assemblies/${assemblyId}/attendees/${attendeeId}/representative`, { residentId });
  }

  async getAttendees(assemblyId: string): Promise<any[]> {
    const data = await apiClient.get<any[]>(`/assemblies/${assemblyId}/attendees`);
    return Array.isArray(data) ? data : (data as any)?.content || [];
  }
}

export const assemblyService = new AssemblyService();
