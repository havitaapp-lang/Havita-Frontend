import React from 'react';
import { FileSpreadsheet, UserCheck, Smartphone, ArrowRight, CheckCircle2 } from 'lucide-react';

interface HowItWorksProps {
  onOpenDemo?: () => void;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ onOpenDemo }) => {
  const steps = [
    {
      step: '01',
      icon: FileSpreadsheet,
      title: 'Diagnóstico y Migración desde Excel',
      description: 'Nos envías tu listado actual de copropietarios, unidades y coeficientes de escritura. Nuestro equipo valida y carga la información en menos de 48 horas sin costo.',
      badge: 'Carga inicial gratuita'
    },
    {
      step: '02',
      icon: UserCheck,
      title: 'Configuración y Capacitación Guiada',
      description: 'Personalizamos las reglas de tu copropiedad (aforos de zonas comunes, reglas de citofonía) y capacitamos al administrador y al personal de vigilancia en portería.',
      badge: 'Inducción personalizada'
    },
    {
      step: '03',
      icon: Smartphone,
      title: 'Activación y Soporte Directo',
      description: 'Los residentes reciben su invitación e ingresan a la app PWA con un toque sin descargas en tiendas. Cuentas con soporte prioritario por WhatsApp en Colombia.',
      badge: 'Cero fricción de adopción'
    }
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-[#F8FAFC] border-y border-slate-200/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-4">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Implementación Acompañada sin Estrés
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-black text-[#16345F] tracking-tight mb-4 leading-tight">
            En 3 pasos simples, tu conjunto modernizado y sin cables
          </h2>
          <p className="text-base sm:text-lg text-[#667085] leading-relaxed">
            Sabemos que el tiempo del administrador es escaso. Nos encargamos del trabajo operativo para que tu comunidad comience a funcionar desde el primer día.
          </p>
        </div>

        {/* 3 Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={item.step} 
                className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group"
              >
                <div>
                  {/* Top Header: Step Number & Icon */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-3xl font-black text-slate-200 group-hover:text-blue-500/30 transition-colors">
                      {item.step}
                    </span>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>

                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full mb-3">
                    {item.badge}
                  </span>

                  <h3 className="text-lg font-bold text-[#16345F] mb-3 leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Connecting arrow indicator for desktop */}
                {idx < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 -translate-y-1/2 z-20 text-slate-300">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom CTA bar */}
        <div className="mt-14 text-center">
          <button
            onClick={() => onOpenDemo?.()}
            className="px-8 py-4 rounded-full bg-[#16345F] hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-900/10 hover:shadow-xl transition-all inline-flex items-center gap-2"
          >
            <span>Iniciar proceso de demostración</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </section>
  );
};
