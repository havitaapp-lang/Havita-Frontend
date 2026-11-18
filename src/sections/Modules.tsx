import React, { useState } from 'react';
import { ModuleCard } from '../components/ModuleCard';
import { 
  Vote, PhoneCall, QrCode, Package, 
  Calendar, Megaphone, ShoppingBag, Clock,
  CheckCircle2, Volume2, ShieldCheck, Box,
  Sparkles, BellRing, Store, UserCheck, Laptop, Smartphone, Shield
} from 'lucide-react';

interface ModulesProps {
  onOpenDemo?: (moduleTitle?: string) => void;
}

type RoleTab = 'admin' | 'security' | 'resident' | 'all';

export const Modules: React.FC<ModulesProps> = ({ onOpenDemo }) => {
  const [activeTab, setActiveTab] = useState<RoleTab>('admin');

  return (
    <section id="modules" className="py-20 sm:py-28 bg-slate-50/70 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Módulos Diseñados para Copropiedades en Colombia
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-black text-[#16345F] tracking-tight mb-4 leading-tight">
            Todo el ecosistema de tu copropiedad en una sola plataforma
          </h2>
          <p className="text-base sm:text-lg text-[#667085] leading-relaxed">
            Elimina el desorden de planillas físicas, aparatos costosos y canales informales. Explora las soluciones diseñadas para cada actor de la comunidad:
          </p>
        </div>

        {/* Role Tabs Navigation */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xs gap-1 max-w-full overflow-x-auto">
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'admin'
                  ? 'bg-[#16345F] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Laptop className="w-4 h-4" />
              <span>Para la Administración</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'security'
                  ? 'bg-[#16345F] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Para la Portería</span>
            </button>

            <button
              onClick={() => setActiveTab('resident')}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'resident'
                  ? 'bg-[#16345F] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Para los Residentes</span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-[#16345F] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>Ver Todos (8)</span>
            </button>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          
          {/* CARD 1: Asambleas y Votaciones Digitales (Admin) */}
          {(activeTab === 'admin' || activeTab === 'all') && (
            <ModuleCard
              onClick={() => onOpenDemo?.('Asambleas y Votaciones')}
              theme="blue"
              badge="Ley 675 • Coeficientes"
              icon={<Vote className="w-6 h-6" />}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              title="Asambleas y Votaciones"
              description="Cálculo de quórum automático y votaciones ponderadas en tiempo real por coeficiente de copropiedad. Actas auditables con validez jurídica."
              visualGraphic={
                <div className="w-14 h-14 rounded-2xl bg-blue-50/90 border border-blue-200/80 p-2 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-black text-blue-700">74.8%</span>
                  <span className="text-[8px] font-semibold text-blue-500 uppercase tracking-tighter">Quórum</span>
                </div>
              }
            />
          )}

          {/* CARD 2: Citofonía Virtual WebRTC (Security / Admin) */}
          {(activeTab === 'security' || activeTab === 'all') && (
            <ModuleCard
              onClick={() => onOpenDemo?.('Citofonía Virtual WebRTC')}
              theme="emerald"
              badge="WebRTC • Cero Cables"
              icon={<PhoneCall className="w-6 h-6" />}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              title="Citofonía Virtual"
              description="Llamadas de voz en tiempo real entre la portería y los celulares de los residentes. Sin cableado, sin aparatos que se dañan y con Cloudflare."
              visualGraphic={
                <div className="w-14 h-14 rounded-2xl bg-emerald-50/90 border border-emerald-200/80 flex items-center justify-center p-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs animate-pulse">
                    <Volume2 className="w-4 h-4" />
                  </div>
                </div>
              }
            />
          )}

          {/* CARD 3: Control de Acceso y Visitas QR (Security / Resident) */}
          {(activeTab === 'security' || activeTab === 'resident' || activeTab === 'all') && (
            <ModuleCard
              onClick={() => onOpenDemo?.('Accesos y Pases QR')}
              theme="cyan"
              badge="Seguridad Ágil"
              icon={<ShieldCheck className="w-6 h-6" />}
              iconBg="bg-cyan-50"
              iconColor="text-cyan-600"
              title="Accesos y Pases QR"
              description="Invitaciones temporales con código QR para visitas, contratistas y domicilios. Validación instantánea desde la portería con control de ingresos."
              visualGraphic={
                <div className="w-14 h-14 rounded-2xl bg-cyan-50/90 border border-cyan-200/80 flex items-center justify-center p-2">
                  <div className="w-8 h-8 rounded-lg bg-white border border-cyan-300 flex items-center justify-center shadow-xs">
                    <QrCode className="w-5 h-5 text-cyan-700" />
                  </div>
                </div>
              }
            />
          )}

          {/* CARD 4: Paquetería con Alerta Push (Security / Resident) */}
          {(activeTab === 'security' || activeTab === 'resident' || activeTab === 'all') && (
            <ModuleCard
              onClick={() => onOpenDemo?.('Recepción de Paquetes')}
              theme="amber"
              badge="Notificación Push"
              icon={<Package className="w-6 h-6" />}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              title="Recepción de Paquetes"
              description="Registro fotográfico de correspondencia en portería y alerta push instantánea al residente con código único de retiro seguro."
              visualGraphic={
                <div className="w-14 h-14 rounded-2xl bg-amber-50/90 border border-amber-200/80 flex items-center justify-center p-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Box className="w-4 h-4" />
                  </div>
                </div>
              }
            />
          )}

          {/* CARD 5: Reservas de Zonas Comunes (Resident / Admin) */}
          {(activeTab === 'resident' || activeTab === 'all') && (
            <ModuleCard
              onClick={() => onOpenDemo?.('Reservas de Zonas Comunes')}
              theme="purple"
              badge="Autogestión 24/7"
              icon={<Calendar className="w-6 h-6" />}
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
              title="Reservas de Zonas Comunes"
              description="Disponibilidad en vivo de salón social, zona BBQ, canchas y gimnasio. Gestión automatizada de horarios, aforos y comprobantes de depósito."
              visualGraphic={
                <div className="w-14 h-14 rounded-2xl bg-purple-50/90 border border-purple-200/80 flex flex-col items-center justify-center p-1">
                  <span className="text-[10px] font-bold text-purple-700">Zona BBQ</span>
                  <span className="text-[8px] bg-purple-200 text-purple-800 px-1.5 py-0.2 rounded-full font-semibold">18:00</span>
                </div>
              }
            />
          )}

          {/* CARD 6: PQRS y Comunicados Oficiales (Admin / Resident) */}
          {(activeTab === 'admin' || activeTab === 'all') && (
            <ModuleCard
              onClick={() => onOpenDemo?.('PQRS y Comunicados')}
              theme="indigo"
              badge="Radicado y Trazabilidad"
              icon={<Megaphone className="w-6 h-6" />}
              iconBg="bg-indigo-50"
              iconColor="text-indigo-600"
              title="PQRS y Comunicados"
              description="Canal formal de solicitudes y reclamos con radicado consecutivo, semáforo de respuesta y muro institucional con confirmación de lectura."
              visualGraphic={
                <div className="w-14 h-14 rounded-2xl bg-indigo-50/90 border border-indigo-200/80 flex items-center justify-center p-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <BellRing className="w-4 h-4" />
                  </div>
                </div>
              }
            />
          )}

          {/* CARD 7: Marketplace y Directorio Comunitario (Resident) */}
          {(activeTab === 'resident' || activeTab === 'all') && (
            <ModuleCard
              onClick={() => onOpenDemo?.('Marketplace Vecinal')}
              theme="rose"
              badge="Comunidad Segura"
              icon={<ShoppingBag className="w-6 h-6" />}
              iconBg="bg-rose-50"
              iconColor="text-rose-600"
              title="Marketplace Vecinal"
              description="Directorio de emprendimientos y servicios profesionales entre vecinos verificados. Fomenta la confianza y el comercio local seguro."
              visualGraphic={
                <div className="w-14 h-14 rounded-2xl bg-rose-50/90 border border-rose-200/80 flex items-center justify-center p-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-xs">
                    <Store className="w-4 h-4" />
                  </div>
                </div>
              }
            />
          )}

          {/* CARD 8: Personal y Bitácora de Portería (Admin / Security) */}
          {(activeTab === 'admin' || activeTab === 'security' || activeTab === 'all') && (
            <ModuleCard
              onClick={() => onOpenDemo?.('Personal y Turnos de Portería')}
              theme="violet"
              badge="Control Operativo"
              icon={<Clock className="w-6 h-6" />}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
              title="Personal y Turnos de Portería"
              description="Control de turnos diurnos y nocturnos para guardas de seguridad, bitácora digital de novedades de relevo y registro de rondas."
              visualGraphic={
                <div className="w-14 h-14 rounded-2xl bg-violet-50/90 border border-violet-200/80 flex flex-col items-center justify-center p-1">
                  <span className="text-[10px] font-black text-violet-700">Turno B</span>
                  <span className="text-[8px] text-violet-500 font-semibold">06:00 - 18:00</span>
                </div>
              }
            />
          )}

        </div>

      </div>
    </section>
  );
};
