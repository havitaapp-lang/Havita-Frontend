import React from 'react';
import { ArrowRight, MessageCircle, CheckCircle2, ShieldCheck, Sparkles, Smartphone, PhoneCall } from 'lucide-react';
import { ProductMockup } from '../components/mockup/ProductMockup';
import { getWhatsAppUrl } from '../config/contactConfig';

interface HeroProps {
  onOpenDemo?: () => void;
  onScrollToHowItWorks?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenDemo }) => {
  const whatsappUrl = getWhatsAppUrl(
    'Hola Havita, soy administrador de una copropiedad en Colombia y quiero solicitar información sobre la plataforma y el programa de prueba.'
  );

  return (
    <section className="relative overflow-hidden pt-8 sm:pt-14 pb-14 sm:pb-20 bg-gradient-to-b from-[#F8FAFC]/90 via-white to-white">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-emerald-100/30 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* LEFT COLUMN: Main copy & triggers (5 cols on lg) */}
          <div className="lg:col-span-5 text-center lg:text-left z-10">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs sm:text-sm font-semibold mb-6 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Programa Conjuntos Pioneros 2026 • Cupos Limitados</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[2.9rem] xl:text-[3.35rem] font-black text-[#16345F] tracking-tight leading-[1.12] mb-5">
              El software para administrar tu conjunto con tranquilidad,{' '}
              <span className="text-[#10B981] block sm:inline">
                sin cables obsoletos ni planillas de papel.
              </span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-[#667085] leading-relaxed mb-7 max-w-xl mx-auto lg:mx-0 font-normal">
              Automatiza las asambleas con quórum por coeficientes bajo la <strong>Ley 675</strong>, moderniza la portería con <strong>citofonía virtual en la nube</strong> y autoriza visitas con códigos QR desde el celular.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 mb-8">
              <button
                onClick={() => onOpenDemo?.()}
                className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#16345F] hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm sm:text-base shadow-lg shadow-blue-900/10 hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <span>Solicitar demostración o piloto</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200 text-emerald-800 font-semibold text-sm sm:text-base transition-all shadow-xs flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Hablar por WhatsApp</span>
              </a>
            </div>

            {/* 3 Trust Triggers Under Buttons */}
            <div className="pt-4 border-t border-slate-100/80 flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Migración desde Excel sin costo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Sin cláusulas de permanencia</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Soporte prioritario en Colombia</span>
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
