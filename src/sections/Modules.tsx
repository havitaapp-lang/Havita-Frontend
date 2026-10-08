import React from 'react';
import { ModuleCard } from '../components/ModuleCard';
import { 
  Users, ShieldCheck, Package, Wrench, 
  Calendar, Megaphone, HardHat, HeartHandshake,
  QrCode, Box, BellRing, Sparkles
} from 'lucide-react';

interface ModulesProps {
  onOpenDemo?: () => void;
}

export const Modules: React.FC<ModulesProps> = ({ onOpenDemo }) => {
  return (
    <section id="modules" className="py-20 sm:py-28 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-black text-[#16345F] tracking-tight mb-4 leading-tight">
            Todo lo que ocurre en tu comunidad
          </h2>
          <p className="text-base sm:text-lg text-[#667085] leading-relaxed">
            Un solo lugar para administrar, comunicar y conectar a todos los actores de tu unidad residencial.
          </p>
        </div>

        {/* 8 Module Cards Grid (4 columns on lg) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* CARD 1: Gestión de Residentes */}
          <ModuleCard
            onClick={onOpenDemo}
            icon={<Users className="w-6 h-6" />}
            iconBg="bg-blue-50"
            iconColor="text-[var(--tenant-primary)]"
            arrowHoverBg="bg-[var(--tenant-primary)]"
            title="Gestión de Residentes"
            description="Administra la información de propietarios y arrendatarios de forma simple y segura."
            visualGraphic={
              <div className="w-14 h-14 rounded-2xl bg-blue-50/70 border border-blue-100/80 p-1 flex items-center justify-center overflow-hidden">
                <div className="flex -space-x-2">
                  <div className="w-7 h-7 rounded-full bg-blue-400 border-2 border-white flex items-center justify-center text-white text-[9px] font-bold shadow-xs">
                    JR
                  </div>
                  <div className="w-7 h-7 rounded-full bg-teal-400 border-2 border-white flex items-center justify-center text-white text-[9px] font-bold shadow-xs">
                    MC
                  </div>
                </div>
              </div>
            }
          />

          {/* CARD 2: Control de Visitantes */}
          <ModuleCard
            onClick={onOpenDemo}
            icon={<ShieldCheck className="w-6 h-6" />}
            iconBg="bg-emerald-50"
            iconColor="text-[#10B981]"
            arrowHoverBg="bg-[#10B981]"
            title="Control de Visitantes"
            description="Autoriza visitantes, registra ingresos y mantén un control completo."
            visualGraphic={
              <div className="w-14 h-14 rounded-2xl bg-emerald-50/70 border border-emerald-100/80 flex items-center justify-center p-2">
                <div className="w-full h-full bg-white rounded-lg border border-emerald-200 flex items-center justify-center shadow-xs">
                  <QrCode className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            }
          />

          {/* CARD 3: Paquetería */}
          <ModuleCard
            onClick={onOpenDemo}
            icon={<Package className="w-6 h-6" />}
            iconBg="bg-amber-50"
            iconColor="text-amber-500"
            arrowHoverBg="bg-amber-500"
            title="Paquetería"
            description="Registra, notifica y da seguimiento a cada paquete en tiempo real."
            visualGraphic={
              <div className="w-14 h-14 rounded-2xl bg-amber-50/70 border border-amber-100/80 flex items-center justify-center p-2">
                <div className="relative">
                  <Box className="w-7 h-7 text-amber-600 fill-amber-100/60" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full ring-2 ring-white flex items-center justify-center text-[7px] text-white font-black">
                    1
                  </span>
                </div>
              </div>
            }
          />

          {/* CARD 4: PQRS y Mantenimiento */}
          <ModuleCard
            onClick={onOpenDemo}
            icon={<Wrench className="w-6 h-6" />}
            iconBg="bg-orange-50"
            iconColor="text-orange-500"
            arrowHoverBg="bg-orange-500"
            title="PQRS y Mantenimiento"
            description="Reporta, asigna y da seguimiento a las solicitudes de tu comunidad."
            visualGraphic={
              <div className="w-14 h-14 rounded-2xl bg-orange-50/70 border border-orange-100/80 flex items-center justify-center p-2">
                <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
                  <Wrench className="w-5 h-5" />
                </div>
              </div>
            }
          />

          {/* CARD 5: Reservas */}
          <ModuleCard
            onClick={onOpenDemo}
            icon={<Calendar className="w-6 h-6" />}
            iconBg="bg-rose-50"
            iconColor="text-rose-500"
            arrowHoverBg="bg-rose-500"
            title="Reservas"
            description="Agenda salones, piscinas y zonas comunes de forma fácil y rápida."
            visualGraphic={
              <div className="w-14 h-14 rounded-2xl bg-rose-50/70 border border-rose-100/80 flex items-center justify-center p-1.5 overflow-hidden">
                <div className="w-full h-full bg-gradient-to-tr from-sky-400 to-teal-300 rounded-lg flex items-center justify-center text-white shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
            }
          />

          {/* CARD 6: Comunicaciones */}
          <ModuleCard
            onClick={onOpenDemo}
            icon={<Megaphone className="w-6 h-6" />}
            iconBg="bg-blue-50"
            iconColor="text-[var(--tenant-primary)]"
            arrowHoverBg="bg-[var(--tenant-primary)]"
            title="Comunicaciones"
            description="Envía comunicados y mantén informada a toda la comunidad."
            visualGraphic={
              <div className="w-14 h-14 rounded-2xl bg-blue-50/70 border border-blue-100/80 flex items-center justify-center p-2">
                <div className="w-8 h-8 rounded-full bg-[var(--tenant-primary)] text-white flex items-center justify-center shadow-xs">
                  <BellRing className="w-4 h-4" />
                </div>
              </div>
            }
          />

          {/* CARD 7: Personal y Turnos */}
          <ModuleCard
            onClick={onOpenDemo}
            icon={<HardHat className="w-6 h-6" />}
            iconBg="bg-teal-50"
            iconColor="text-[#18B89A]"
            arrowHoverBg="bg-[#18B89A]"
            title="Personal y Turnos"
            description="Controla trabajadores, turnos y asistencia de forma simple."
            visualGraphic={
              <div className="w-14 h-14 rounded-2xl bg-teal-50/70 border border-teal-100/80 flex items-center justify-center p-2">
                <div className="w-9 h-9 rounded-xl bg-[#18B89A] text-white flex items-center justify-center shadow-xs">
                  <HardHat className="w-5 h-5" />
                </div>
              </div>
            }
          />

          {/* CARD 8: Comunidad */}
          <ModuleCard
            onClick={onOpenDemo}
            icon={<HeartHandshake className="w-6 h-6" />}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
            arrowHoverBg="bg-purple-600"
            title="Comunidad"
            description="Marketplace, mascotas, vehículos y más, en un solo lugar."
            visualGraphic={
              <div className="w-14 h-14 rounded-2xl bg-purple-50/70 border border-purple-100/80 flex items-center justify-center p-2">
                <span className="text-xl">🐕</span>
              </div>
            }
          />

        </div>

      </div>
    </section>
  );
};
