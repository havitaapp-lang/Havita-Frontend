import React from 'react';
import { AlertTriangle, Clock, ShieldAlert, PackageCheck } from 'lucide-react';

export const ActivityPreview: React.FC = () => {
  const alerts = [
    { label: '3 PQRS críticas', icon: AlertTriangle, color: 'text-rose-600 bg-rose-50 border-rose-200/60' },
    { label: '2 documentos por vencer', icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200/60' },
    { label: '1 turno sin cubrir', icon: ShieldAlert, color: 'text-orange-600 bg-orange-50 border-orange-200/60' },
    { label: '5 paquetes pendientes', icon: PackageCheck, color: 'text-blue-600 bg-blue-50 border-blue-200/60' },
  ];

  return (
    <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-slate-900 tracking-tight">Atención requerida</span>
        <span className="text-[9px] font-semibold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full">
          4 alertas
        </span>
      </div>

      <div className="space-y-1.5">
        {alerts.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div 
              key={idx}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9.5px] font-medium transition-all ${item.color}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
              <Icon className="w-3 h-3 shrink-0" />
              <span className="truncate">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
