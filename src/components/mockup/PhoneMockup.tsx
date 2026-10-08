import React from 'react';
import { 
  Package, UserCheck, AlertCircle, Megaphone, 
  UserPlus, Wrench, Calendar, Home, Users, Clock, User 
} from 'lucide-react';

export const PhoneMockup: React.FC = () => {
  return (
    <div className="relative w-[215px] sm:w-[235px] h-[450px] sm:h-[480px] bg-slate-900 rounded-[2.75rem] p-2.5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.1)] border-[3px] border-slate-700/80 select-none">
      
      {/* Side physical buttons (simulated) */}
      <div className="absolute -left-1 top-24 w-1 h-7 bg-slate-700 rounded-l-sm" />
      <div className="absolute -left-1 top-34 w-1 h-7 bg-slate-700 rounded-l-sm" />
      <div className="absolute -right-1 top-28 w-1 h-10 bg-slate-700 rounded-r-sm" />

      {/* Screen container */}
      <div className="relative w-full h-full bg-[#f8fafc] rounded-[2.25rem] overflow-hidden flex flex-col font-sans text-left border border-slate-200/50">
        
        {/* Notch / Dynamic Island */}
        <div className="absolute top-2 inset-x-0 mx-auto w-24 h-4 bg-slate-900 rounded-full z-30 flex items-center justify-end px-2">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
        </div>

        {/* Status bar */}
        <div className="pt-2 px-5 flex justify-between items-center text-[9px] font-semibold text-slate-800 z-20">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-1.5 bg-slate-800 rounded-xs" />
          </div>
        </div>

        {/* Resident App Body */}
        <div className="flex-1 p-3.5 pt-4 flex flex-col justify-between overflow-hidden">
          
          {/* Header Greeting */}
          <div>
            <div className="text-[13px] font-bold text-slate-900 tracking-tight leading-tight">
              Buenos días, Sebastián
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              Torre 2 · Apto 504
            </div>
          </div>

          {/* 4 Colored Metric Cards (2x2) */}
          <div className="grid grid-cols-2 gap-2 my-1">
            {/* Green: Paquetes */}
            <div className="bg-emerald-50/90 border border-emerald-100/90 rounded-xl p-2.5 flex flex-col justify-between">
              <div className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1">
                <Package className="w-3 h-3" />
              </div>
              <div>
                <div className="text-[12px] font-black text-emerald-950 leading-none">2 nuevos</div>
                <div className="text-[8.5px] text-emerald-700 font-medium mt-0.5">Paquetes</div>
              </div>
            </div>

            {/* Yellow: Visitante */}
            <div className="bg-amber-50/90 border border-amber-100/90 rounded-xl p-2.5 flex flex-col justify-between">
              <div className="w-5 h-5 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mb-1">
                <UserCheck className="w-3 h-3" />
              </div>
              <div>
                <div className="text-[12px] font-black text-amber-950 leading-none">1 activo</div>
                <div className="text-[8.5px] text-amber-700 font-medium mt-0.5">Visitantes</div>
              </div>
            </div>

            {/* Rose: Solicitudes */}
            <div className="bg-rose-50/90 border border-rose-100/90 rounded-xl p-2.5 flex flex-col justify-between">
              <div className="w-5 h-5 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center mb-1">
                <AlertCircle className="w-3 h-3" />
              </div>
              <div>
                <div className="text-[12px] font-black text-rose-950 leading-none">1 en proceso</div>
                <div className="text-[8.5px] text-rose-700 font-medium mt-0.5">Mis solicitudes</div>
              </div>
            </div>

            {/* Blue: Comunicados */}
            <div className="bg-blue-50/90 border border-blue-100/90 rounded-xl p-2.5 flex flex-col justify-between">
              <div className="w-5 h-5 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-1">
                <Megaphone className="w-3 h-3" />
              </div>
              <div>
                <div className="text-[12px] font-black text-blue-950 leading-none">2 sin leer</div>
                <div className="text-[8.5px] text-blue-700 font-medium mt-0.5">Comunicados</div>
              </div>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div>
            <div className="text-[10px] font-bold text-slate-800 mb-2">
              Acciones rápidas
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-teal-600 mb-1">
                  <UserPlus className="w-3.5 h-3.5" />
                </div>
                <span className="text-[7.5px] text-slate-600 font-medium leading-tight">Registrar visitante</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-rose-600 mb-1">
                  <Wrench className="w-3.5 h-3.5" />
                </div>
                <span className="text-[7.5px] text-slate-600 font-medium leading-tight">Reportar problema</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-indigo-600 mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <span className="text-[7.5px] text-slate-600 font-medium leading-tight">Reservar zona</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-amber-600 mb-1">
                  <Package className="w-3.5 h-3.5" />
                </div>
                <span className="text-[7.5px] text-slate-600 font-medium leading-tight">Ver paquetes</span>
              </div>
            </div>
          </div>

          {/* Bottom Navigation Bar */}
          <div className="h-10 bg-white border-t border-slate-100 -mx-3.5 -mb-3.5 px-4 flex items-center justify-around text-[8px] text-slate-400">
            <div className="flex flex-col items-center text-[var(--tenant-primary)] font-semibold">
              <Home className="w-3.5 h-3.5" />
              <span>Inicio</span>
            </div>
            <div className="flex flex-col items-center hover:text-slate-600">
              <Users className="w-3.5 h-3.5" />
              <span>Comunidad</span>
            </div>
            <div className="flex flex-col items-center hover:text-slate-600">
              <Clock className="w-3.5 h-3.5" />
              <span>Actividad</span>
            </div>
            <div className="flex flex-col items-center hover:text-slate-600">
              <User className="w-3.5 h-3.5" />
              <span>Perfil</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
