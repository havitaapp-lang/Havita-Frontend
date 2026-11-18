import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { portalForRole } from './appLaunchPaths';

/**
 * P8-B — punto de arranque de la PWA instalada (`start_url: /app` del manifiesto).
 *
 * iOS y Android abren la app instalada siempre en `start_url`. Antes era «/», la página comercial, que no tiene acceso a
 * «Iniciar sesión»: el residente quedaba sin forma de entrar. Ahora la app instalada abre `/app`, que lleva al portal del
 * rol si hay sesión o al inicio de sesión si no la hay. No cambia «/» para quien visita la web desde el navegador.
 */
export const AppLaunch = () => {
  const { user } = useAuth();
  return <Navigate to={user ? portalForRole(user.role) : '/login'} replace />;
};
