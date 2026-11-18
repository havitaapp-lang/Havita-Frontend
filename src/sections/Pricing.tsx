import React, { useState } from 'react';
import { Check, Sparkles, MessageCircle, ArrowRight, ShieldCheck, Headphones, Calculator } from 'lucide-react';
import { getWhatsAppUrl } from '../config/contactConfig';

interface PricingProps {
  onOpenDemo?: (plan?: string) => void;
}

export const Pricing: React.FC<PricingProps> = ({ onOpenDemo }) => {
  const [units, setUnits] = useState<number>(80);

  // Calculation: Base minimum 180,000 COP (covers up to 60 units), then 3,000 COP per unit
  const calculatedPrice = units <= 60 ? 180000 : units * 3000;
  const formattedPrice = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(calculatedPrice);

  const allModules = [
    { title: 'Asambleas y Votaciones Digitales', desc: 'Quórum automático por coeficientes (Ley 675) y actas jurídicas.' },
    { title: 'Citofonía Virtual WebRTC', desc: 'Llamadas de voz en la nube entre portería y residentes sin cables.' },
    { title: 'Control de Accesos y Visitas QR', desc: 'Pases temporales para invitados y domiciliarios validados en portería.' },
    { title: 'Recepción de Paquetería', desc: 'Notificación push inmediata al residente y confirmación de entrega.' },
    { title: 'Reservas de Zonas Comunes', desc: 'Autogestión 24/7 de salón social, zona BBQ, canchas y zonas húmedas.' },
    { title: 'PQRS y Comunicados Oficiales', desc: 'Radicado formal, tiempos de respuesta medibles y boletines push.' },
    { title: 'Marketplace Comunitario', desc: 'Directorio de servicios y comercio seguro entre vecinos verificados.' },
    { title: 'Personal y Turnos de Portería', desc: 'Control de asistencia, cobertura de turnos y bitácora de novedades.' },
    { title: 'App PWA Móvil para Residentes', desc: 'Acceso inmediato sin ocupar memoria ni descargas en tiendas.' },
    { title: 'Migración Inicial Gratuita', desc: 'Cargamos unidades, residentes y coeficientes desde tu Excel actual.' },
    { title: 'Soporte Directo por WhatsApp', desc: 'Línea prioritaria con respuesta en vivo para administración y guardas.' },
    { title: 'Infraestructura Cloud Segura', desc: 'Respaldado por Cloudflare y Railway con alta disponibilidad 99.9%.' },
  ];

  const whatsappQuoteUrl = getWhatsAppUrl(
    `Hola Havita, me gustaría cotizar la plataforma para mi copropiedad de aproximadamente ${units} unidades residenciales.`
  );

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-[#F8FAFC] relative border-t border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Transparencia Total • Sin Costos Ocultos
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-black text-[#16345F] tracking-tight mb-4 leading-tight">
            Tarifa justa y predecible para tu copropiedad
          </h2>
          <p className="text-base sm:text-lg text-[#667085] leading-relaxed">
            Sin cobros adicionales por módulos separados ni sorpresas en la factura. Todos los módulos activos incluidos con soporte prioritario.
          </p>
        </div>

        {/* Pricing Main Card with Interactive Calculator */}
        <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-blue-200 shadow-[0_20px_50px_-12px_rgba(22,52,95,0.12)] p-6 sm:p-10 lg:p-12 relative overflow-hidden">
          {/* Top highlight gradient border element */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />
          
          {/* Interactive Calculator Block */}
          <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-200/80 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#16345F]">Calcula la tarifa para tu conjunto</h4>
                  <p className="text-xs text-slate-500">Desliza o selecciona el número de apartamentos o casas</p>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-2xl sm:text-3xl font-black text-[#16345F]">{units}</span>
                <span className="text-xs font-bold text-slate-500 ml-1">unidades</span>
              </div>
            </div>

            {/* Slider */}
            <input 
              type="range"
              min={30}
              max={300}
              step={10}
              value={units}
              onChange={(e) => setUnits(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-3"
            />

            <div className="flex justify-between text-[11px] text-slate-400 font-semibold mb-4">
              <span>30 unidades</span>
              <span>100 unidades</span>
              <span>200 unidades</span>
              <span>300+ unidades</span>
            </div>

            {/* Price Output Display */}
            <div className="pt-4 border-t border-slate-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-slate-500 block">
                  Inversión mensual estimada
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-600">
                    {formattedPrice}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">COP / mes</span>
                </div>
              </div>

              <div className="text-xs text-slate-500 bg-white px-3 py-2 rounded-xl border border-slate-200">
                <span className="font-bold text-[#16345F]">$3.000 COP</span> por apartamento al mes
                {units <= 60 && (
                  <span className="block text-[10px] text-slate-400 mt-0.5">
                    (Tarifa base mínima de $180.000 COP hasta 60 unidades)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Grid of all included modules */}
          <div className="py-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-5">
              Todos los módulos y servicios incluidos sin costo adicional:
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {allModules.map((item) => (
                <div key={item.title} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/60 hover:bg-slate-50 transition-colors border border-slate-100">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-[#16345F] leading-snug">{item.title}</h5>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Online Payments Disclaimer Note */}
          <div className="mt-6 p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-slate-600 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              <strong>Nota sobre recaudos:</strong> Los pagos de cuotas de administración en línea están proyectados para la Fase 2. Havita no realiza cobro de comisiones financieras en la actualidad.
            </span>
          </div>

          {/* Actions Footer */}
          <div className="pt-6 mt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => onOpenDemo?.(`Cotización ${units} unidades`)}
                className="w-full sm:w-auto py-3.5 px-8 rounded-full bg-[#16345F] hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-lg shadow-blue-900/10 hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <span>Solicitar cotización formal ({units} aptos)</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href={whatsappQuoteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto py-3.5 px-6 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Consultar por WhatsApp</span>
              </a>
            </div>

            <span className="text-xs text-slate-400 font-medium">
              Sin permanencia forzada · Facturación legal mensual
            </span>
          </div>

        </div>

      </div>
    </section>
  );
};
