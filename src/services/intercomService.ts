import { apiClient } from '../api/apiClient';

export type IntercomCallStatus =
  | 'INITIATING'
  | 'RINGING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'MISSED'
  | 'ENDED'
  | 'FAILED'
  | 'CANCELLED';

export interface IntercomResidentOption {
  residentId: string;
  userId: string;
  fullName: string;
  residentType: string;
  isPrimaryContact: boolean;
  propertyNumber: string;
  propertyTower?: string;
  propertyFloor?: string;
  phone?: string;
}

export interface IntercomUnitDirectory {
  propertyId: string;
  number: string;
  name?: string;
  path?: string;
  tower?: string;
  floor?: string;
  level?: string;
  type?: string;
  residentCount: number;
  residentNames?: string[];
}

export interface IntercomCallResponse {
  id?: string;
  callId: string;
  callerId?: string;
  callerUserId?: string;
  callerName: string;
  callerRole?: string;
  recipientResidentId?: string;
  recipientUserId?: string;
  recipientName: string;
  recipientRole?: string;
  propertyId: string;
  propertyUnit?: string;
  propertyNumber?: string;
  propertyTower?: string;
  status: IntercomCallStatus;
  meetingId?: string;
  realtimeMeetingId?: string;
  participantToken?: string;
  startedAt?: string;
  ringingAt?: string;
  answeredAt?: string;
  acceptedAt?: string;
  callerConnectedAt?: string;
  recipientConnectedAt?: string;
  connectedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  endReason?: string;
  createdAt?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export const intercomService = {
  searchUnits: async (query?: string, page = 0, size = 15): Promise<PageResponse<IntercomUnitDirectory>> => {
    return apiClient.get<PageResponse<IntercomUnitDirectory>>('/intercom/units', {
      query: query || '',
      page,
      size,
    });
  },

  getUnitResidents: async (propertyId: string): Promise<IntercomResidentOption[]> => {
    return apiClient.get<IntercomResidentOption[]>(`/intercom/units/${propertyId}/residents`);
  },

  initiateCall: async (propertyId: string, recipientResidentId: string): Promise<IntercomCallResponse> => {
    const res = await apiClient.post<IntercomCallResponse>('/intercom/calls', {
      propertyId,
      recipientResidentId,
    });
    return {
      ...res,
      callId: res.callId || (res as any).id,
    };
  },

  getCallDetail: async (callId: string): Promise<IntercomCallResponse> => {
    const res = await apiClient.get<IntercomCallResponse>(`/intercom/calls/${callId}`);
    return {
      ...res,
      callId: res.callId || (res as any).id,
    };
  },

  /**
   * P8-B: llamada que timbra AHORA para el residente (o null). Recupera una llamada cuyo evento SSE se perdió (app
   * abierta tarde, aviso push pulsado, reconexión). Nunca incluye el token de audio.
   */
  getIncomingCall: async (): Promise<IntercomCallResponse | null> => {
    const res = await apiClient.get<IntercomCallResponse | null>('/intercom/calls/incoming');
    return res ? { ...res, callId: res.callId || (res as any).id } : null;
  },

  /** @param pushEndpoint P8-B: endpoint push de este dispositivo, solo para no avisarle de su propia acción. */
  acceptCall: async (callId: string, pushEndpoint?: string | null): Promise<IntercomCallResponse> => {
    const res = await apiClient.post<IntercomCallResponse>(`/intercom/calls/${callId}/accept`,
      pushEndpoint ? { pushEndpoint } : undefined);
    return {
      ...res,
      callId: res.callId || (res as any).id,
    };
  },

  /** P8-A3 (bandera): token del residente llamado mientras timbra; la reunión sigue INACTIVE hasta aceptar. */
  prepareCall: async (callId: string): Promise<IntercomCallResponse> => {
    const res = await apiClient.post<IntercomCallResponse>(`/intercom/calls/${callId}/prepare`);
    return {
      ...res,
      callId: res.callId || (res as any).id,
    };
  },

  markConnected: async (callId: string): Promise<IntercomCallResponse> => {
    const res = await apiClient.post<IntercomCallResponse>(`/intercom/calls/${callId}/connected`);
    return {
      ...res,
      callId: res.callId || (res as any).id,
    };
  },

  rejectCall: async (callId: string, pushEndpoint?: string | null): Promise<IntercomCallResponse> => {
    return apiClient.post<IntercomCallResponse>(`/intercom/calls/${callId}/reject`,
      pushEndpoint ? { pushEndpoint } : undefined);
  },

  cancelCall: async (callId: string): Promise<IntercomCallResponse> => {
    return apiClient.post<IntercomCallResponse>(`/intercom/calls/${callId}/cancel`);
  },

  endCall: async (callId: string): Promise<IntercomCallResponse> => {
    return apiClient.post<IntercomCallResponse>(`/intercom/calls/${callId}/end`);
  },

  getHistory: async (page = 0, size = 15): Promise<PageResponse<IntercomCallResponse>> => {
    return apiClient.get<PageResponse<IntercomCallResponse>>('/intercom/history', {
      page,
      size,
    });
  },
};
