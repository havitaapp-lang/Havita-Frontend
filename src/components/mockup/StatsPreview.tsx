import React from 'react';
import { Users, Home, Package, ShieldCheck } from 'lucide-react';

export const StatsPreview: React.FC = () => {
  const stats = [
    {
      value: '428',
      label: 'Residentes',
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      value: '156',
      label: 'Propiedades',
      icon: Home,
      color: 'text-teal-600',
      bg: 'bg-teal-50'
    },
    {
      value: '23',
      label: 'Paquetes hoy',
      icon: Package,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    },
    {
      value: '47',
      label: 'Visitantes hoy',
      icon: ShieldCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    }
  ];

  return (
    <div className="grid grid-cols-4 gap-2.5">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div 
            key={stat.label} 
            className="bg-white rounded-xl p-2.5 border border-slate-100 shadow-sm flex items-center justify-between"
          >
            <div>
              <div className="text-[14px] font-black text-slate-900 tracking-tight leading-none">
                {stat.value}
              </div>
              <div className="text-[9px] text-slate-500 font-medium mt-0.5 truncate">
                {stat.label}
              </div>
            </div>
            <div className={`w-6 h-6 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
