/**
 * Servicio para consultar y actualizar la configuración de horarios de visitas del tenant.
 *
 * Endpoints:
 *   GET  /api/v1/access/visitor-settings  → VisitorSettings (admin y residente)
 *   PUT  /api/v1/access/visitor-settings  → VisitorSettings (solo admin)
 */
import { apiClient } from '../api/apiClient';
import type { VisitorSettings, UpdateVisitorSettingsPayload } from '../types/visitorSettings';

export const visitorSettingsService = {
  /**
   * Obtiene la configuración de horarios de visitas del tenant autenticado.
   * Disponible para COMMUNITY_ADMIN, SUPER_ADMIN y RESIDENT.
   * Si el tenant no tiene configuración, el backend devuelve mode=HOURS_24.
   */
  getVisitorSettings: async (): Promise<VisitorSettings> => {
    return apiClient.get<VisitorSettings>('/access/visitor-settings');
  },

  /**
   * Actualiza la configuración de horarios de visitas del tenant autenticado.
   * Solo disponible para COMMUNITY_ADMIN y SUPER_ADMIN.
   */
  updateVisitorSettings: async (
    payload: UpdateVisitorSettingsPayload
  ): Promise<VisitorSettings> => {
    return apiClient.put<VisitorSettings>('/access/visitor-settings', payload);
  },
};
