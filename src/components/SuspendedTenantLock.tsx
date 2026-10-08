import React from 'react';
import { AlertOctagon, LogOut, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { TenantSwitcher } from './TenantSwitcher';

export const SuspendedTenantLock: React.FC = () => {
  const { user, logout } = useAuth();
  const { currentTenant } = useTenant();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(225,29,72,0.1)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative max-w-md w-full bg-slate-900/90 border border-rose-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-6 shadow-inner">
          <AlertOctagon className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-bold uppercase tracking-wider mb-4 border border-rose-500/20">
          Acceso Suspendido
        </div>

        <h1 className="text-2xl font-black text-white tracking-tight mb-2">
          {currentTenant?.name || 'Copropiedad Suspendida'}
        </h1>

        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          El acceso a esta copropiedad se encuentra temporalmente restringido por la administración de la plataforma.
        </p>

        {currentTenant?.suspendedReason && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-6 text-left">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Motivo reportado:
            </span>
            <p className="text-xs text-rose-300 font-medium italic">
              "{currentTenant.suspendedReason}"
            </p>
          </div>
        )}

        <div className="space-y-3 pt-2 border-t border-slate-800/80">
          <div className="flex justify-center">
            <TenantSwitcher />
          </div>

          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión ({user?.name || user?.email})
          </button>
        </div>
      </div>

      <p className="mt-8 text-xs text-slate-600 font-mono">
        Havita SaaS &bull; Seguridad & Multitenancy
      </p>
    </div>
  );
};
