import React from 'react';
import { ArrowRight, CheckCircle2, Headphones, ShieldCheck, MessageCircle } from 'lucide-react';
import { getWhatsAppUrl } from '../config/contactConfig';

interface CTAProps {
  onOpenDemo?: () => void;
}

export const CTA: React.FC<CTAProps> = ({ onOpenDemo }) => {
  const whatsappUrl = getWhatsAppUrl(
    'Hola Havita, me gustaría coordinar una demostración personalizada para mi copropiedad.'
  );

  return (
    <div className="relative bg-[#0B192C] rounded-[2.25rem] p-8 sm:p-12 lg:p-14 overflow-hidden shadow-2xl border border-slate-800">
      {/* Background soft ambient radial lighting */}
      <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
        
        {/* Left Side Copy */}
        <div className="max-w-xl text-center lg:text-left">
          <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-emerald-400 mb-3">
            ¿LISTO PARA MODERNIZAR TU COPROPIEDAD?
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-black text-white leading-tight tracking-tight mb-4">
            Solicita una demostración y comprueba la diferencia en vivo.
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Te mostramos en 20 minutos cómo eliminar cables viejos de citofonía, automatizar votaciones de asamblea y dar orden a tu portería sin costos de instalación.
          </p>
        </div>

        {/* Right Side Action & Value Props */}
        <div className="flex flex-col sm:flex-row items-center gap-6 lg:gap-8 shrink-0">
          <div className="flex flex-col gap-3 w-full sm:w-auto">
            <button
              onClick={() => onOpenDemo?.()}
              className="px-8 py-4 rounded-full bg-white hover:bg-slate-100 active:bg-slate-200 text-[#16345F] font-bold text-base shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2.5 group"
            >
              <span>Solicitar una demo guiada</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2.5 rounded-full bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 font-semibold text-xs transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              O escríbenos directamente por WhatsApp
            </a>
          </div>

          {/* Value props indicators */}
          <div className="flex flex-col gap-2.5 text-xs text-slate-300 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Migración gratuita desde Excel</span>
            </div>
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Soporte local en Colombia</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Cumplimiento Ley 675 y 1581</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
