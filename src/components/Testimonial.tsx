import React from 'react';
import { 
  ShieldCheck, Award, Users, CheckCircle2, 
  Sparkles, ArrowRight, FileSpreadsheet, Headphones, Lock
} from 'lucide-react';

interface PioneerProgramProps {
  onOpenDemo?: () => void;
}

export const Testimonial: React.FC<PioneerProgramProps> = ({ onOpenDemo }) => {
  return (
    <div className="space-y-12 max-w-6xl mx-auto">
      
      {/* PIONEER PROGRAM CARD */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#16345F] to-[#0A2540] text-white p-8 sm:p-12 border border-slate-700/60 shadow-2xl overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-4 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Convocatoria Abierta • Colombia 2026
            </div>

            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-4 text-white leading-tight">
              Programa Conjuntos Pioneros: Digitaliza tu comunidad con acompañamiento total
            </h3>

            <p className="text-sm sm:text-base text-slate-300 mb-6 leading-relaxed">
              Buscamos administradores y consejos de administración comprometidos con la modernización de su copropiedad en Bogotá, Medellín, Cali, Barranquilla y principales ciudades.
            </p>

            {/* 4 Pillars of Pioneer Program */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">Migración Gratuita desde Excel</h4>
                  <p className="text-[11px] text-slate-300">Cargamos unidades, residentes y coeficientes sin costo.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
                <Headphones className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">Capacitación Ilimitada</h4>
                  <p className="text-[11px] text-slate-300">Acompañamos a administradores y guardas de portería.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
                <Award className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">Tarifa Especial Congelada</h4>
                  <p className="text-[11px] text-slate-300">Precio preferencial garantizado durante todo el primer año.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
                <Lock className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">Soporte VIP por WhatsApp</h4>
                  <p className="text-[11px] text-slate-300">Línea directa con ingenieros de producto en Colombia.</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Box */}
          <div className="w-full lg:w-72 bg-white/10 border border-white/15 rounded-3xl p-6 text-center backdrop-blur-md shrink-0 flex flex-col justify-center">
            <span className="text-xs uppercase font-bold tracking-wider text-amber-400 mb-2">Cupos Limitados</span>
            <div className="text-3xl font-black text-white mb-1">Primeras 20</div>
            <p className="text-xs text-slate-300 mb-6">Copropiedades seleccionadas para onboarding guiado prioritario.</p>

            <button
              onClick={() => onOpenDemo?.()}
              className="w-full py-3 px-5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2"
            >
              Postular mi Copropiedad <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* REGULATORY COMPLIANCE & LEGAL ASSURANCE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Compliance 1: Ley 675 */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 transition-all hover:bg-white hover:shadow-md">
          <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center mb-4">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="text-base font-bold text-[#16345F] mb-2">
            Alineado con la Ley 675 de 2001
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Algoritmo de cálculo de quórum y votaciones electrónicas ponderadas por coeficientes de copropiedad registrados en la escritura pública.
          </p>
        </div>

        {/* Compliance 2: Habeas Data */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 transition-all hover:bg-white hover:shadow-md">
          <div className="w-10 h-10 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center mb-4">
            <Lock className="w-5 h-5" />
          </div>
          <h4 className="text-base font-bold text-[#16345F] mb-2">
            Habeas Data (Ley 1581 de 2012)
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Custodia de datos personales, registro de autorizaciones de residentes y estricta separación de información privada entre copropiedades.
          </p>
        </div>

        {/* Compliance 3: SLA & Respaldo */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 transition-all hover:bg-white hover:shadow-md">
          <div className="w-10 h-10 rounded-xl bg-purple-100/80 text-purple-700 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h4 className="text-base font-bold text-[#16345F] mb-2">
            Cero Cables y Alta Disponibilidad
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Sin costos ocultos de cables rotos o reparaciones de citófonos en portería. Respaldado por Cloudflare y Railway con 99.9% de operatividad.
          </p>
        </div>
      </div>

    </div>
  );
};
