import { apiClient } from '../../../api/apiClient';
import type {
  AssemblyProxy,
  AssemblyProxyEvent,
  MyAssemblyProxy,
  ParticipationAudit,
  ParticipationResult,
  ProxyDocumentType,
  ProxyLimitHistoryPage,
  ProxyLimitSetting,
  EvidenceType,
} from './proxyTypes';

/**
 * Fase 2 / P6 — llamadas a los contratos REALES del backend (P6_API_CONTRACT_AUDIT.md). La comunidad la pone el
 * cliente de la API (X-Tenant-ID del usuario); nunca se envía en el cuerpo. No se guarda nada en almacenamiento local:
 * ni documentos, ni números de identificación.
 */
export interface ProxyRequestData {
  propertyId: string;
  proxyFullName: string;
  proxyDocumentType: ProxyDocumentType;
  proxyDocumentNumber: string;
  proxyUserId?: string | null;
  grantorResidentId?: string | null;
  /** P7 (G3): solo en el registro por la administración. */
  evidenceType?: EvidenceType | null;
  grantorConsentAttested?: boolean | null;
}

function multipart(data: ProxyRequestData, document: File): FormData {
  const form = new FormData();
  const json = {
    propertyId: data.propertyId,
    proxyFullName: data.proxyFullName.trim(),
    proxyDocumentType: data.proxyDocumentType,
    proxyDocumentNumber: data.proxyDocumentNumber.trim(),
    ...(data.proxyUserId ? { proxyUserId: data.proxyUserId } : {}),
    ...(data.grantorResidentId ? { grantorResidentId: data.grantorResidentId } : {}),
    ...(data.evidenceType ? { evidenceType: data.evidenceType } : {}),
    ...(data.grantorConsentAttested != null ? { grantorConsentAttested: data.grantorConsentAttested } : {}),
  };
  form.append('data', new Blob([JSON.stringify(json)], { type: 'application/json' }));
  form.append('document', document);
  return form;
}

const base = (assemblyId: string) => `/assemblies/${assemblyId}/proxies`;

export const proxyKeys = {
  mine: (assemblyId: string) => ['proxies', 'mine', assemblyId] as const,
  admin: (assemblyId: string) => ['proxies', 'admin', assemblyId] as const,
  events: (proxyId: string) => ['proxies', 'events', proxyId] as const,
  history: (pollId: string) => ['participations', pollId] as const,
  limit: ['proxySettings'] as const,
};

export const proxyService = {
  mine: (assemblyId: string) => apiClient.get<MyAssemblyProxy[]>(`${base(assemblyId)}/mine`),
  listForAdmin: (assemblyId: string) => apiClient.get<AssemblyProxy[]>(base(assemblyId)),
  events: (assemblyId: string, proxyId: string) => apiClient.get<AssemblyProxyEvent[]>(`${base(assemblyId)}/${proxyId}/events`),

  request: (assemblyId: string, data: ProxyRequestData, document: File) =>
    apiClient.post<AssemblyProxy>(base(assemblyId), multipart(data, document)),
  registerByAdmin: (assemblyId: string, data: ProxyRequestData, document: File) =>
    apiClient.post<AssemblyProxy>(`${base(assemblyId)}/admin`, multipart(data, document)),

  approve: (assemblyId: string, proxyId: string) => apiClient.post<AssemblyProxy>(`${base(assemblyId)}/${proxyId}/approve`, {}),
  reject: (assemblyId: string, proxyId: string, reason: string) =>
    apiClient.post<AssemblyProxy>(`${base(assemblyId)}/${proxyId}/reject`, { reason }),
  revoke: (assemblyId: string, proxyId: string, reason?: string) =>
    apiClient.post<AssemblyProxy>(`${base(assemblyId)}/${proxyId}/revoke`, reason ? { reason } : {}),

  /** Descarga autorizada por el backend (sin URL pública): el archivo se entrega como adjunto. */
  downloadDocument: (assemblyId: string, proxy: Pick<AssemblyProxy, 'id' | 'documentContentType'>) => {
    const ext = proxy.documentContentType === 'application/pdf' ? 'pdf' : proxy.documentContentType === 'image/png' ? 'png' : 'jpg';
    return apiClient.downloadFile(`${base(assemblyId)}/${proxy.id}/document`, `poder-${proxy.id.slice(0, 8)}.${ext}`);
  },

  attendSelf: (assemblyId: string, proxyId: string) => apiClient.post<unknown>(`${base(assemblyId)}/${proxyId}/attendance/self`, {}),
  attendByAdmin: (assemblyId: string, proxyId: string, documentType: ProxyDocumentType, documentNumber: string) =>
    apiClient.post<unknown>(`${base(assemblyId)}/${proxyId}/attendance`, { documentType, documentNumber: documentNumber.trim() }),

  proxyVote: (pollId: string, proxyId: string, optionIds: string[]) =>
    apiClient.post<ParticipationResult>(`/assemblies/polls/${pollId}/proxy-vote`, { proxyId, optionIds }),
  assistedVote: (pollId: string, body: {
    proxyId: string; documentType: ProxyDocumentType; documentNumber: string; expressedByProxyConfirmed: boolean; optionIds: string[];
  }) => apiClient.post<ParticipationResult>(`/assemblies/polls/${pollId}/assisted-vote`, { ...body, documentNumber: body.documentNumber.trim() }),
  voidParticipation: (pollId: string, participationId: string, reason: string) =>
    apiClient.post<ParticipationResult>(`/assemblies/polls/${pollId}/participations/${participationId}/void`, { reason: reason.trim() }),
  history: (pollId: string) => apiClient.get<ParticipationAudit[]>(`/assemblies/polls/${pollId}/participations`),

  limit: () => apiClient.get<ProxyLimitSetting>('/assemblies/proxy-settings'),
  setLimit: (maxUnitsPerProxy: number | null) => apiClient.put<ProxyLimitSetting>('/assemblies/proxy-settings', { maxUnitsPerProxy }),
  /** P7 (G4): historial del límite de la comunidad actual, paginado (del más reciente al más antiguo). */
  limitHistory: (page = 0, size = 10) =>
    apiClient.get<ProxyLimitHistoryPage>(`/assemblies/proxy-settings/history?page=${page}&size=${size}`),
};
