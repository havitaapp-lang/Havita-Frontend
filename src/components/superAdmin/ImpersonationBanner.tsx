import { ShieldAlert, ArrowLeft, Eye } from 'lucide-react';
import { Button } from '../ui/Button';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { getBaseDomain } from '../../utils/domainUtils';

export const ImpersonationBanner = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  // Si no hay tenant actual, o si el usuario NO es SUPER_ADMIN, no mostrar el banner.
  // Solo los SUPER_ADMIN que entran al portal de un tenant (impersonate) deben ver este banner.
  if (!currentTenant || user?.role !== 'SUPER_ADMIN') return null;

  const handleExitSupportMode = () => {
    // Navigate back to the Super Admin Customer 360 view for this tenant on the global portal
    const currentHost = window.location.hostname;
    const baseDomain = getBaseDomain(currentHost);
    
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : '';
    const newHost = `admin.${baseDomain}`;

    window.location.href = `${protocol}//${newHost}${port}/super-admin/tenants/${currentTenant.id}`;
  };

  return (
    <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white px-4 py-2 text-xs shadow-lg border-b border-amber-500/40 sticky top-0 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-white/20 text-white font-bold flex items-center gap-1 shrink-0">
            <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
            MODO SOPORTE ACTIVO
          </span>
          <span className="flex items-center gap-1 font-medium">
            <Eye className="w-3.5 h-3.5 text-amber-200 shrink-0" />
            Estás visualizando como Administrador la comunidad:{' '}
            <strong className="font-bold underline underline-offset-2">
              {currentTenant.name}
            </strong>
          </span>
        </div>

        <Button
          onClick={handleExitSupportMode}
          className="bg-white hover:bg-amber-50 text-amber-950 font-black rounded-xl text-xs h-8 px-3.5 shadow-sm shrink-0 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-amber-800" />
          Salir del modo soporte y volver al Backoffice
        </Button>
      </div>
    </div>
  );
};
