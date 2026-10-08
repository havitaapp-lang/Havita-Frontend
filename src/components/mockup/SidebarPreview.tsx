import React from 'react';
import { 
  LayoutDashboard, Users, Home, Megaphone, Package, 
  ShieldCheck, AlertCircle, Wrench, UserCheck, Clock, 
  Calendar, FileText, Settings 
} from 'lucide-react';

interface SidebarPreviewProps {
  activeItem?: string;
}

export const SidebarPreview: React.FC<SidebarPreviewProps> = ({ activeItem = 'Dashboard' }) => {
  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, active: true },
    { label: 'Comunidad', icon: Users },
    { label: 'Residentes', icon: Users },
    { label: 'Propiedades', icon: Home },
    { label: 'Comunicaciones', icon: Megaphone },
    { label: 'Paquetería', icon: Package },
    { label: 'Visitantes', icon: ShieldCheck },
    { label: 'PQRS', icon: AlertCircle },
    { label: 'MAINTENANCE', icon: Wrench },
    { label: 'Personal', icon: UserCheck },
    { label: 'Turnos', icon: Clock },
    { label: 'Reservas', icon: Calendar },
    { label: 'Documentos', icon: FileText },
    { label: 'Configuración', icon: Settings }
  ];

  return (
    <aside className="w-[148px] lg:w-[160px] bg-[#0c1524] text-slate-300 flex flex-col py-3 px-2 text-[10px] shrink-0 border-r border-slate-800/60 select-none">
      {/* Brand header */}
      <div className="flex items-center gap-1.5 px-2 pb-3 mb-2 border-b border-slate-800/80">
        <div className="w-4 h-4 rounded bg-gradient-to-tr from-blue-600 to-teal-400 flex items-center justify-center text-white text-[8px] font-bold">
          A
        </div>
        <span className="font-bold text-white tracking-tight text-[11px]">Havita</span>
      </div>

      {/* Menu items */}
      <div className="flex-1 space-y-0.5 overflow-hidden">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.label === activeItem;
          return (
            <div
              key={item.label}
              className={`flex items-center gap-2 px-2 py-1 rounded-md transition-colors cursor-default ${
                isActive 
                  ? 'bg-[var(--tenant-primary)] text-white font-semibold shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className="w-3 h-3 shrink-0" />
              <span className="truncate">{item.label}</span>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
