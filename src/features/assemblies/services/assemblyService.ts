import type { Assembly, AssemblyStatus } from '../types/assembly.types';
import { apiClient } from '../../../api/apiClient';

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
    const data = await apiClient.get<any>('/assemblies');
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

  async selfRegisterAttendee(assemblyId: string, propertyId: string): Promise<any> {
    const res = await apiClient.post<any>(`/assemblies/${assemblyId}/attendees/self-register`, { propertyId });
    return res;
  }

  async registerAttendee(assemblyId: string, data: { propertyId: string; isPowerOfAttorney: boolean; representativeName?: string }): Promise<any> {
    const res = await apiClient.post<any>(`/assemblies/${assemblyId}/attendees`, data);
    return res;
  }

  async getAttendees(assemblyId: string): Promise<any[]> {
    const data = await apiClient.get<any[]>(`/assemblies/${assemblyId}/attendees`);
    return Array.isArray(data) ? data : (data as any)?.content || [];
  }
}

export const assemblyService = new AssemblyService();
