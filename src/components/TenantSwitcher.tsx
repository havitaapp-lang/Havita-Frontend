import React, { useState } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Check, ChevronDown, MapPin } from 'lucide-react';
import { cn } from '../utils/cn';

interface TenantSwitcherProps {
  className?: string;
  showDetails?: boolean;
}

export const TenantSwitcher: React.FC<TenantSwitcherProps> = ({ 
  className,
  showDetails = true 
}) => {
  const { currentTenant, availableTenants, setCurrentTenant } = useTenant();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Restrict tenants based on user role
  const displayedTenants = user?.role === 'SUPER_ADMIN' 
    ? availableTenants 
    : availableTenants.filter(t => user?.memberships?.some(m => m.tenantId === t.id));

  return (
    <div className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div 
          className="w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0"
          style={{ backgroundColor: currentTenant?.primaryColor || '#1849A9' }}
        >
          {currentTenant?.logo || <Building2 className="w-4 h-4" />}
        </div>

        {showDetails && (
          <div className="text-left leading-tight pr-1">
            <div className="text-xs font-semibold text-slate-900 truncate max-w-[170px]">
              {currentTenant?.name || 'Seleccionar Copropiedad'}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate max-w-[140px]">{currentTenant?.city} • {currentTenant?.unitsCount} unds</span>
            </div>
          </div>
        )}

        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform ml-auto", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
            aria-hidden="true" 
          />
          <div className="absolute left-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl bg-white shadow-xl border border-slate-100 z-50 py-2 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Copropiedades Disponibles ({displayedTenants.length})
              </p>
            </div>
            <div className="py-1 max-h-72 overflow-y-auto">
              {displayedTenants.map((tenant) => {
                const isSelected = currentTenant?.id === tenant.id;
                return (
                  <button
                    key={tenant.id}
                    type="button"
                    onClick={() => {
                      setCurrentTenant(tenant);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors",
                      isSelected && "bg-blue-50/60"
                    )}
                  >
                    <div 
                      className="w-7 h-7 rounded flex items-center justify-center font-bold text-xs text-white shrink-0"
                      style={{ backgroundColor: tenant.primaryColor }}
                    >
                      {tenant.logo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-medium truncate", isSelected ? "text-blue-700 font-semibold" : "text-slate-700")}>
                        {tenant.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {tenant.city} • Estrato {tenant.stratum || 4} • {tenant.unitsCount} unds
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="p-2 bg-slate-50 text-[11px] text-slate-500 rounded-b-xl flex items-center justify-between">
              <span>Modo Multi-Tenant Activo</span>
              <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">Tenant DB</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
