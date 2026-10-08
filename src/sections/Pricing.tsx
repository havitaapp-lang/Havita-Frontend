import React from 'react';
import { Check, Sparkles } from 'lucide-react';

interface PricingProps {
  onOpenDemo?: () => void;
}

export const Pricing: React.FC<PricingProps> = ({ onOpenDemo }) => {
  const plans = [
    {
      name: 'Básico',
      desc: 'Ideal para condominios pequeños o etapas iniciales.',
      price: '$180.000',
      period: '/ mes por conjunto',
      features: [
        'Hasta 80 unidades residenciales',
        'Directorio digital de residentes',
        'Control de visitantes en portería',
        'Bitácora de paquetería',
        'Soporte por correo y WhatsApp'
      ],
      highlight: false,
      btnText: 'Comenzar con Básico'
    },
    {
      name: 'Profesional',
      desc: 'El plan más elegido para conjuntos medianos y grandes.',
      price: '$320.000',
      period: '/ mes por conjunto',
      features: [
        'Unidades ilimitadas',
        'Todo lo del plan Básico',
        'App PWA para residentes',
        'PQRS y gestión de mantenimiento',
        'Reserva online de zonas comunes',
        'Control de turnos y personal',
        'Soporte prioritario 24/7'
      ],
      highlight: true,
      badge: 'Más popular',
      btnText: 'Solicitar demostración'
    },
    {
      name: 'Personalizado',
      desc: 'Para macro-proyectos, agrupaciones o constructoras.',
      price: 'A convenir',
      period: 'según requerimientos',
      features: [
        'Múltiples torres y porterías',
        'Integración con torniquetes y talanqueras',
        'Subdominios y marca propia',
        'Capacitación presencial al personal',
        'Gerente de cuenta dedicado'
      ],
      highlight: false,
      btnText: 'Hablar con un asesor'
    }
  ];

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-[#F8FAFC] border-t border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--tenant-primary)] bg-blue-50 px-3 py-1 rounded-full">
            Planes transparentes
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#16345F] mt-3 tracking-tight">
            Inversión clara adaptada a tu copropiedad
          </h2>
          <p className="text-base text-[#667085] mt-3 leading-relaxed">
            Sin costos ocultos ni contratos de permanencia obligatorios. Incluye actualizaciones continuas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 relative ${
                plan.highlight
                  ? 'bg-white border-2 border-[var(--tenant-primary)] shadow-xl shadow-blue-500/10 md:-translate-y-2'
                  : 'bg-white border border-[#E5EAF0] shadow-sm hover:shadow-md'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-[var(--tenant-primary)] text-white text-xs font-bold shadow-sm flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {plan.badge}
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold text-[#16345F] mb-1.5">{plan.name}</h3>
                <p className="text-xs text-[#667085] mb-6 min-h-[36px] leading-relaxed">{plan.desc}</p>
                
                <div className="mb-6 pb-6 border-b border-slate-100">
                  <span className="text-3xl font-black text-[#16345F] tracking-tight">{plan.price}</span>
                  <span className="text-xs text-slate-500 ml-1 font-medium">{plan.period}</span>
                </div>

                <div className="space-y-3 mb-8">
                  {plan.features.map((feat) => (
                    <div key={feat} className="flex items-start gap-2.5 text-xs text-slate-700">
                      <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={onOpenDemo}
                className={`w-full py-3 rounded-full font-semibold text-sm transition-all ${
                  plan.highlight
                    ? 'bg-[var(--tenant-primary)] hover:bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-50 hover:bg-slate-100 text-[#16345F] border border-slate-200/80'
                }`}
              >
                {plan.btnText}
              </button>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
