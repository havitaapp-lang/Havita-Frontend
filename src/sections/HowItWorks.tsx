import React from 'react';
import { Building2, UserPlus, Smartphone, ArrowRight } from 'lucide-react';

interface HowItWorksProps {
  onOpenDemo?: () => void;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ onOpenDemo }) => {
  const steps = [
    {
      step: '1',
      icon: Building2,
      title: 'Configura tu comunidad',
      description: 'Personalizamos la plataforma con la información de tu unidad.'
    },
    {
      step: '2',
      icon: UserPlus,
      title: 'Invita a tus usuarios',
      description: 'Agrega residentes, personal y administradores.'
    },
    {
      step: '3',
      icon: Smartphone,
      title: 'Empieza a usar',
      description: 'Todo tu conjunto en un solo lugar, desde cualquier dispositivo.'
    }
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-[#F8FAFC] border-y border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left: Text & Action Button (5 cols) */}
          <div className="lg:col-span-5 text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EAF2FF] text-[var(--tenant-primary)] text-xs font-bold uppercase tracking-wider mb-5">
              ¿Cómo funciona?
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-[#16345F] tracking-tight leading-tight mb-4">
              En pocos pasos, tu comunidad digitalizada.
            </h2>

            <p className="text-base sm:text-lg text-[#667085] leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
              Implementación rápida y sencilla. Nos adaptamos a la estructura de tu unidad y te acompañamos en todo el proceso.
            </p>

            <button
              onClick={onOpenDemo}
              className="px-7 py-3.5 rounded-full bg-[var(--tenant-primary)] hover:bg-blue-600 active:bg-blue-700 text-white font-semibold text-sm sm:text-base shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 inline-flex items-center gap-2"
            >
              <span>Solicitar una demo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right: 3 Steps Stepper (7 cols) */}
          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              
              {steps.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={item.step} className="flex flex-col items-center text-center relative group">
                    
                    {/* Top small numbered badge */}
                    <div className="w-7 h-7 rounded-full bg-[var(--tenant-primary)] text-white text-xs font-black flex items-center justify-center shadow-md mb-4 group-hover:scale-110 transition-transform">
                      {item.step}
                    </div>

                    {/* Circular Icon Container */}
                    <div className="w-20 h-20 rounded-full bg-white border border-[#E5EAF0] shadow-sm flex items-center justify-center text-[var(--tenant-primary)] mb-5 group-hover:border-blue-300 group-hover:shadow-md transition-all">
                      <Icon className="w-8 h-8" />
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-[#16345F] mb-2 leading-tight">
                      {item.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-[#667085] leading-relaxed max-w-[190px]">
                      {item.description}
                    </p>

                    {/* Connecting Arrow between steps on desktop */}
                    {idx < steps.length - 1 && (
                      <div className="hidden md:flex absolute top-14 -right-4 translate-x-1/2 text-slate-300">
                        <ArrowRight className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                  </div>
                );
              })}

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
