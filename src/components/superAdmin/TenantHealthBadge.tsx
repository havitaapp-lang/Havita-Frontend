import React from 'react';
import type { TenantHealthBreakdown } from '../../types/superAdmin';
import { Activity, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

interface TenantHealthBadgeProps {
  health: TenantHealthBreakdown;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export const TenantHealthBadge: React.FC<TenantHealthBadgeProps> = ({
  health,
  size = 'md',
  showDetails = false,
}) => {
  const getBadgeStyle = () => {
    switch (health.label) {
      case 'Excelente':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case 'Bueno':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
          icon: <Activity className="w-3.5 h-3.5 text-blue-600" />,
        };
      case 'En Riesgo':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
        };
      case 'Crítico':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />,
        };
    }
  };

  const style = getBadgeStyle();

  return (
    <div className="inline-flex flex-col gap-1">
      <div
        className={`inline-flex items-center gap-1.5 font-bold rounded-full border ${style.bg} ${
          size === 'sm'
            ? 'px-2 py-0.5 text-[10px]'
            : size === 'lg'
            ? 'px-3.5 py-1.5 text-sm'
            : 'px-2.5 py-1 text-xs'
        }`}
        title={`Salud del tenant: ${health.score}/100 (${health.label})`}
      >
        {style.icon}
        <span>
          {health.score}/100 · {health.label}
        </span>
      </div>

      {showDetails && (
        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
          <div>
            Usuarios Activos: <strong className="text-slate-800">{health.activeUsersRate}%</strong>
          </div>
          <div>
            Adopción Módulos: <strong className="text-slate-800">{health.moduleAdoptionRate}%</strong>
          </div>
          <div>
            Configuración: <strong className="text-slate-800">{health.configCompletion}%</strong>
          </div>
          <div>
            Tasa de Error: <strong className="text-slate-800">{health.errorRate}%</strong>
          </div>
        </div>
      )}
    </div>
  );
};
