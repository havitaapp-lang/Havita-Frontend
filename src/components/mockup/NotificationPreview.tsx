import React from 'react';
import { Package, UserCheck, Wrench } from 'lucide-react';

interface NotificationItemProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  time: string;
  className?: string;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  time,
  className = ''
}) => {
  return (
    <div 
      className={`bg-white/95 backdrop-blur-md rounded-2xl p-3.5 border border-slate-100/90 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_8px_10px_-6px_rgba(0,0,0,0.04)] flex items-center gap-3 w-[230px] sm:w-[245px] select-none transition-transform hover:-translate-y-0.5 ${className}`}
    >
      <div className={`w-9 h-9 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0 shadow-sm`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-bold text-slate-900 tracking-tight leading-tight truncate">
          {title}
        </div>
        <div className="text-[10px] text-slate-600 font-medium truncate mt-0.5">
          {subtitle}
        </div>
        <div className="text-[9px] text-slate-400 mt-1 font-medium">
          {time}
        </div>
      </div>
    </div>
  );
};

export const NotificationGroup: React.FC = () => {
  return (
    <div className="flex flex-col gap-3.5">
      {/* 1. Nuevo paquete */}
      <NotificationItem
        icon={<Package className="w-4 h-4" />}
        iconBg="bg-amber-50"
        iconColor="text-amber-600"
        title="Nuevo paquete"
        subtitle="Mercado Libre · Torre 2 - Apto 504"
        time="Hace 10 min"
        className="animate-float"
      />

      {/* 2. Visitante autorizado */}
      <NotificationItem
        icon={<UserCheck className="w-4 h-4" />}
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
        title="Visitante autorizado"
        subtitle="Carlos Rodríguez · Torre 1 - Apto 101"
        time="Hace 25 min"
        className="animate-float-delayed ml-2 sm:ml-4"
      />

      {/* 3. Solicitud actualizada */}
      <NotificationItem
        icon={<Wrench className="w-4 h-4" />}
        iconBg="bg-rose-50"
        iconColor="text-rose-600"
        title="Solicitud actualizada"
        subtitle="Fuga de agua · Torre 2 - Apto 203"
        time="Hace 1 h"
        className="animate-float-fast"
      />
    </div>
  );
};
