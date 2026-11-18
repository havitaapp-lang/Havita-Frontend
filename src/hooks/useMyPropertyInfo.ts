import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useActiveUnit } from './useActiveUnit';
import { residentSelfService } from '../services/residentSelfService';

/**
 * Información de la unidad del residente autenticado (GET /resident/self/property-info).
 * Query compartida: ResidentLayout y ResidentDashboard comparten la misma caché,
 * por lo que se realiza una sola petición por usuario en lugar de una por componente.
 */
export const MY_PROPERTY_INFO_KEY = 'my-property-info';

export const useMyPropertyInfo = () => {
  const { user } = useAuth();
  // Fase 2 / E2: depende de la unidad activa (clave y cabecera); sin unidad elegida no se consulta.
  const { activeUnitId } = useActiveUnit();
  return useQuery({
    queryKey: [MY_PROPERTY_INFO_KEY, user?.id, activeUnitId],
    queryFn: () => residentSelfService.getMyPropertyInfo(activeUnitId),
    enabled: !!user && user.role === 'RESIDENT' && !!activeUnitId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
};
