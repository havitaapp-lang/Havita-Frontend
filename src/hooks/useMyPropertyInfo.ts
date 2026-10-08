import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { residentSelfService } from '../services/residentSelfService';

/**
 * Información de la unidad del residente autenticado (GET /resident/self/property-info).
 * Query compartida: ResidentLayout y ResidentDashboard comparten la misma caché,
 * por lo que se realiza una sola petición por usuario en lugar de una por componente.
 */
export const MY_PROPERTY_INFO_KEY = 'my-property-info';

export const useMyPropertyInfo = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: [MY_PROPERTY_INFO_KEY, user?.id],
    queryFn: () => residentSelfService.getMyPropertyInfo(),
    enabled: !!user && user.role === 'RESIDENT',
    staleTime: 5 * 60 * 1000,
    // Un error aquí significa posible revocación de acceso: no reintentar (ver ResidentLayout).
    retry: false,
  });
};
