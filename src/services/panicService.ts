import { apiClient } from '../api/apiClient';
import type { PanicAlert, AlertType } from '../types';

const BASE = '/realtime/panic';

export const panicService = {
  /** Residente: crear alerta de emergencia */
  createAlert: async (alertType: AlertType, notes?: string): Promise<PanicAlert> => {
    const res = await apiClient.post<any>(BASE, { alertType, notes });
    return res.data ?? res;
  },

  /** Portería/Admin: alertas activas */
  getActiveAlerts: async (): Promise<PanicAlert[]> => {
    const res = await apiClient.get<any>(`${BASE}/active`);
    if (Array.isArray(res)) return res;
    return res.data ?? [];
  },

  /** Admin: historial paginado */
  getAllAlerts: async (page = 0, size = 20): Promise<{ content: PanicAlert[]; totalPages: number; totalElements: number }> => {
    return apiClient.get(`${BASE}?page=${page}&size=${size}&sort=createdAt,desc`);
  },

  /** Residente: mis alertas */
  getMyAlerts: async (): Promise<PanicAlert[]> => {
    const res = await apiClient.get<any>(`${BASE}/my`);
    if (Array.isArray(res)) return res;
    return res.data ?? [];
  },

  /** Portería/Admin: tomar alerta */
  acknowledgeAlert: async (id: string): Promise<PanicAlert> => {
    const res = await apiClient.post<any>(`${BASE}/${id}/acknowledge`, {});
    return res.data ?? res;
  },

  /** Portería/Admin: resolver alerta */
  resolveAlert: async (
    id: string,
    finalStatus: 'RESOLVED' | 'FALSE_ALARM',
    resolutionNotes?: string
  ): Promise<PanicAlert> => {
    const res = await apiClient.post<any>(`${BASE}/${id}/resolve`, { finalStatus, resolutionNotes });
    return res.data ?? res;
  },
};
