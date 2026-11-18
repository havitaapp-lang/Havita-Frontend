import { apiClient, ApiError } from '../api/apiClient';
import type { PanicAlert, AlertType } from '../types';

const BASE = '/realtime/panic';

export const panicService = {
  /**
   * Residente: crear alerta de emergencia para la unidad indicada (Fase 2 / E2, D6). La unidad es obligatoria: sin ella
   * no se envía nada (nunca se usa la "primera" unidad). El backend la vuelve a validar y responde 409 si no es suya.
   */
  createAlert: async (alertType: AlertType, notes: string | undefined, unitId: string | null): Promise<PanicAlert> => {
    if (!unitId) {
      throw new ApiError('Selecciona tu unidad antes de enviar una alerta.', 409, { code: 'UNIT_SELECTION_REQUIRED' });
    }
    const res = await apiClient.post<any>(BASE, { alertType, notes }, { unitId });
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
