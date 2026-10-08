import React from 'react';
import { ArrowRight, Play, CheckCircle2, FileText, MessageSquare, ShieldCheck } from 'lucide-react';
import { ProductMockup } from '../components/mockup/ProductMockup';

interface HeroProps {
  onOpenDemo?: () => void;
  onScrollToHowItWorks?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenDemo, onScrollToHowItWorks }) => {
  return (
    <section className="relative overflow-hidden pt-8 sm:pt-14 pb-16 sm:pb-24 bg-gradient-to-b from-[#F8FAFC]/90 via-white to-white">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-teal-100/30 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* LEFT COLUMN: Main copy & triggers (5 cols on lg) */}
          <div className="lg:col-span-5 text-center lg:text-left z-10">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EAF2FF] text-[var(--tenant-primary)] text-xs sm:text-sm font-semibold mb-6 shadow-xs">
              <span>Plataforma SaaS para propiedad horizontal</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-[3.75rem] font-black text-[#16345F] tracking-tight leading-[1.08] mb-6">
              Tu unidad residencial,<br />
              <span className="text-[#18B89A] block sm:inline">
                ahora en un solo lugar.
              </span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-[#667085] leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0 font-normal">
              Comunicación, visitantes, paquetes, mantenimiento, trabajadores y reservas. Todo desde una plataforma fácil de usar.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10">
              <button
                onClick={onOpenDemo}
                className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[var(--tenant-primary)] hover:bg-blue-600 active:bg-blue-700 text-white font-semibold text-sm sm:text-base shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <span>Solicitar una demo</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onScrollToHowItWorks}
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white border border-[#E5EAF0] hover:bg-slate-50 active:bg-slate-100 text-[#16345F] font-semibold text-sm sm:text-base transition-all shadow-xs flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-slate-700 text-slate-700" />
                <span>Ver cómo funciona</span>
              </button>
            </div>

            {/* 4 Hero Quick Benefits (under buttons) */}
            <div className="pt-2 border-t border-slate-100/80">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                {/* 1. Más orden */}
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#16345F] leading-tight">Más orden</div>
                  </div>
                </div>

                {/* 2. Menos trabajo */}
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-blue-50 text-[var(--tenant-primary)] flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#16345F] leading-tight">Menos trabajo administrativo</div>
                  </div>
                </div>

                {/* 3. Mejor comunicación */}
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-teal-50 text-[#18B89A] flex items-center justify-center shrink-0">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#16345F] leading-tight">Mejor comunicación</div>
                  </div>
                </div>

                {/* 4. Mayor seguridad */}
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#16345F] leading-tight">Mayor seguridad</div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Realistic Interactive Mockup (7 cols on lg) */}
          <div className="lg:col-span-7 flex justify-center lg:justify-end">
            <ProductMockup />
          </div>

        </div>
      </div>
    </section>
  );
};
